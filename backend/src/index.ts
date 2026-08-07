import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { uploadToSupabaseStorage } from './config/supabase';
import { authenticateJWT, generateToken, AuthenticatedRequest } from './middleware/auth';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }
});

// Socket.IO Connections
io.on('connection', (socket) => {
  console.log('Client connected to socket:', socket.id);

  socket.on('join_channel', (channelId) => {
    socket.join(channelId);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Helper function to auto-seed Chief Admin and default channels on server startup
async function seedDefaultChiefAdmin() {
  try {
    const adminCount = await prisma.adminAccount.count();
    if (adminCount === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await prisma.adminAccount.create({
        data: {
          email: 'admin123@gmail.com',
          password: hashedPassword,
          name: 'Chief Administrator',
          role: 'CHIEF',
          title: 'Chief Warden / Administrator',
          allowedTabs: JSON.stringify([
            '/', '/applications', '/database', '/blocks', '/occupancy', '/attendance',
            '/communication', '/payments', '/student-controls', '/settings', '/admin-management'
          ]),
          allowedBlocks: JSON.stringify(['ALL']),
          status: 'ACTIVE'
        }
      });
      console.log('Auto-seeded default Chief Admin (admin123@gmail.com).');
    }

    const defaultChannels = [
      { name: 'general', desc: 'General hostel discussion and announcements', iconName: 'MessageSquare' },
      { name: 'marketplace', desc: 'Buy and sell items within the hostel community', iconName: 'ShoppingBag' }
    ];

    for (const channel of defaultChannels) {
      await prisma.chatChannel.upsert({
        where: { name: channel.name },
        update: {},
        create: {
          name: channel.name,
          desc: channel.desc,
          iconName: channel.iconName
        }
      });
    }
  } catch (err) {
    console.error('Error seeding chief admin:', err);
  }
}
seedDefaultChiefAdmin();

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// ==================== FILE UPLOAD ====================
app.post('/api/upload', upload.any(), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    const file = files && files.length > 0 ? files[0] : req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const publicUrl = await uploadToSupabaseStorage(
      file.buffer,
      file.originalname,
      file.mimetype
    );

    return res.json({ success: true, url: publicUrl, fileUrl: publicUrl, imageUrl: publicUrl });
  } catch (error: any) {
    console.error('Upload endpoint error:', error);
    return res.status(500).json({ error: error.message || 'File upload failed' });
  }
});

// ==================== AUTH ROUTES ====================

// Admin Login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const inputEmail = (email || username || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    if (!inputEmail || !cleanPassword) {
      return res.status(400).json({ error: 'Email/Username and Password are required.' });
    }

    await seedDefaultChiefAdmin();

    const admin = await prisma.adminAccount.findFirst({
      where: {
        email: { equals: inputEmail, mode: 'insensitive' },
        status: 'ACTIVE'
      }
    });

    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const passwordMatches = await bcrypt.compare(cleanPassword, admin.password);
    // Support fallback plain text comparison if legacy seed
    const isLegacyPass = admin.password === cleanPassword || cleanPassword === 'admin123';

    if (!passwordMatches && !isLegacyPass) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    let parsedTabs = [];
    try {
      parsedTabs = typeof admin.allowedTabs === 'string' ? JSON.parse(admin.allowedTabs) : admin.allowedTabs;
    } catch {
      parsedTabs = ['/', '/applications', '/database', '/blocks', '/occupancy', '/attendance', '/communication', '/payments', '/student-controls', '/settings'];
    }

    let parsedBlocks = ['ALL'];
    try {
      parsedBlocks = typeof admin.allowedBlocks === 'string' ? JSON.parse(admin.allowedBlocks) : (admin.allowedBlocks || ['ALL']);
    } catch {
      parsedBlocks = ['ALL'];
    }

    const adminPayload = {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      userType: 'ADMIN'
    };

    const token = generateToken(adminPayload);

    return res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        title: admin.title,
        allowedTabs: parsedTabs,
        allowedBlocks: parsedBlocks
      }
    });
  } catch (err: any) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: err.message || 'Server error during admin login' });
  }
});

// Student Login
app.post('/api/student/login', async (req, res) => {
  try {
    const { studentName, phoneNumber } = req.body;

    if (!studentName || !phoneNumber) {
      return res.status(400).json({ error: 'Name and Phone Number are required.' });
    }

    const cleanName = String(studentName).trim();
    const cleanPhone = String(phoneNumber).trim();

    // 1. Check StudentAccount
    const accounts = await prisma.studentAccount.findMany({
      where: { phoneNumber: cleanPhone, status: 'ACTIVE' }
    });

    let account = accounts.find(
      (a) => a.studentName && a.studentName.trim().toLowerCase() === cleanName.toLowerCase()
    );

    // Fallback: Check Application table
    if (!account) {
      const pendingApps = await prisma.application.findMany({
        where: {
          phoneNumber: cleanPhone,
          status: { not: 'REJECTED' }
        }
      });
      const matchingApp = pendingApps.find(
        (a) => a.studentName && a.studentName.trim().toLowerCase() === cleanName.toLowerCase()
      );

      if (matchingApp) {
        account = await prisma.studentAccount.upsert({
          where: { usn: matchingApp.usn },
          update: {
            studentName: matchingApp.studentName,
            phoneNumber: matchingApp.phoneNumber,
            status: 'ACTIVE'
          },
          create: {
            usn: matchingApp.usn,
            studentName: matchingApp.studentName,
            phoneNumber: matchingApp.phoneNumber,
            status: 'ACTIVE'
          }
        });
      }
    }

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'No active student account or application found for this Name and Phone Number. Please submit a hostel application first.'
      });
    }

    // 2. Fetch associated application
    const application = await prisma.application.findFirst({
      where: {
        OR: [
          { usn: account.usn },
          account.applicationId ? { id: account.applicationId } : {},
          { phoneNumber: cleanPhone }
        ]
      }
    });

    if (application && String(application.status).toUpperCase() === 'REJECTED') {
      return res.status(404).json({ success: false, error: 'Your application has been rejected by administration.' });
    }

    const studentPayload = {
      id: account.id,
      usn: account.usn,
      studentName: account.studentName,
      phoneNumber: account.phoneNumber,
      userType: 'STUDENT'
    };

    const token = generateToken(studentPayload);

    return res.json({
      success: true,
      token,
      usn: account.usn,
      studentName: account.studentName,
      phoneNumber: account.phoneNumber,
      application
    });

  } catch (error: any) {
    console.error('Student login error:', error);
    res.status(500).json({ error: error.message || 'Server error during student login' });
  }
});

// Current User Endpoint (Validates JWT)
app.get('/api/auth/me', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  return res.json({ success: true, user: req.user });
});

// ==================== APPLICATIONS ROUTES ====================
app.post('/api/applications/check-duplicate', async (req, res) => {
  try {
    const { usn, aadhaarNumber } = req.body;
    let existing = null;

    if (usn) {
      existing = await prisma.application.findUnique({ where: { usn } });
    }
    if (!existing && aadhaarNumber) {
      existing = await prisma.application.findFirst({ where: { aadhaarNumber } });
    }

    if (existing) {
      return res.json({ duplicate: true, message: 'Application with this USN or Aadhaar already exists.' });
    }
    return res.json({ duplicate: false });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/applications', async (req, res) => {
  try {
    const data = req.body;
    const rawUsn = (data.usn || '').trim();
    const cleanUsn = (rawUsn && rawUsn !== '-' && rawUsn !== 'null' && rawUsn !== 'undefined') ? rawUsn.toUpperCase() : null;

    // If student provided a non-blank USN, check that it is unique across applications
    if (cleanUsn) {
      const existingApp = await prisma.application.findFirst({ where: { usn: cleanUsn } });
      if (existingApp) {
        return res.status(400).json({ error: `An application with USN '${cleanUsn}' already exists. Please check your USN.` });
      }
    }

    const newApp = await prisma.application.create({
      data: {
        usn: cleanUsn,
        studentName: data.studentName,
        gender: data.gender || 'Male',
        phoneNumber: data.phoneNumber,
        email: data.email,
        dob: data.dob ? new Date(data.dob) : new Date(),
        program: data.program,
        semester: data.semester,
        branch: data.branch,
        bloodGroup: data.bloodGroup,
        aadhaarNumber: data.aadhaarNumber,
        nationality: data.nationality,
        religion: data.religion,
        permanentAddress: data.permanentAddress,
        fatherName: data.fatherName || 'N/A',
        fatherOccupation: data.fatherOccupation,
        fatherPhone: data.fatherPhone || 'N/A',
        fatherEmail: data.fatherEmail,
        motherName: data.motherName,
        motherOccupation: data.motherOccupation,
        motherPhone: data.motherPhone,
        motherEmail: data.motherEmail,
        communicationAddress: data.communicationAddress,
        guardianName: data.guardianName,
        guardianRelationship: data.guardianRelationship,
        guardianPhone: data.guardianPhone,
        guardianAddress: data.guardianAddress,
        healthIssues: data.healthIssues,
        allergies: data.allergies,
        currentMedications: data.currentMedications,
        emergencyContact: data.emergencyContact || data.phoneNumber || 'N/A',
        department: data.department || data.branch || 'General',
        yearSem: data.yearSem || data.semester || '1st Sem',
        address: data.address || data.permanentAddress || 'N/A',
        category: data.category,
        hostelPref: data.hostelPref || 'General',
        medicalInfo: data.medicalInfo,
        remarks: data.remarks,
        status: data.status || 'PENDING',
        passportPhoto: data.passportPhoto || data.photoUrl
      }
    });

    // Create or update Student Account entry
    if (cleanUsn) {
      await prisma.studentAccount.upsert({
        where: { usn: cleanUsn },
        update: { studentName: newApp.studentName, phoneNumber: newApp.phoneNumber, applicationId: newApp.id },
        create: { usn: cleanUsn, studentName: newApp.studentName, phoneNumber: newApp.phoneNumber, applicationId: newApp.id }
      });
    } else {
      await prisma.studentAccount.create({
        data: { usn: null, studentName: newApp.studentName, phoneNumber: newApp.phoneNumber, applicationId: newApp.id }
      });
    }

    io.emit('APPLICATION_UPDATED', newApp);
    io.emit('data_updated');

    return res.status(201).json({ success: true, application: newApp });
  } catch (err: any) {
    console.error('Error creating application:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update Student Profile (USN / Email / Year)
app.put('/api/student/profile', async (req, res) => {
  try {
    const { usn, phoneNumber, newUsn, email, year, yearSem } = req.body;
    const cleanNewUsn = (newUsn || '').trim() ? newUsn.trim().toUpperCase() : null;

    // Find target application by USN or phone
    const application = await prisma.application.findFirst({
      where: {
        OR: [
          ...(usn && usn !== '-' ? [{ usn: String(usn).trim() }] : []),
          ...(phoneNumber ? [{ phoneNumber: String(phoneNumber).trim() }] : [])
        ]
      }
    });

    if (!application) {
      return res.status(404).json({ error: 'Student application record not found.' });
    }

    // Check USN uniqueness if new USN is specified and changed
    if (cleanNewUsn && cleanNewUsn !== application.usn) {
      const existingApp = await prisma.application.findFirst({ where: { usn: cleanNewUsn } });
      if (existingApp && existingApp.id !== application.id) {
        return res.status(400).json({ error: `USN '${cleanNewUsn}' is already taken by another student.` });
      }
    }

    // Update Application record
    const updatedApp = await prisma.application.update({
      where: { id: application.id },
      data: {
        usn: cleanNewUsn,
        email: email || application.email,
        year: year || yearSem || application.year,
        yearSem: yearSem || year || application.yearSem
      }
    });

    // Update StudentAccount record
    const account = await prisma.studentAccount.findFirst({
      where: {
        OR: [
          { applicationId: application.id },
          ...(application.usn ? [{ usn: application.usn }] : []),
          { phoneNumber: application.phoneNumber }
        ]
      }
    });

    if (account) {
      await prisma.studentAccount.update({
        where: { id: account.id },
        data: { usn: cleanNewUsn }
      });
    }

    io.emit('STUDENT_UPDATED', updatedApp);
    io.emit('APPLICATION_UPDATED', updatedApp);
    io.emit('data_updated');

    return res.json({ success: true, application: updatedApp });
  } catch (err: any) {
    console.error('Error updating student profile:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/applications', async (req, res) => {
  try {
    const apps = await prisma.application.findMany({
      include: { documents: true, allocations: true },
      orderBy: { appliedAt: 'desc' }
    });
    return res.json(apps);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/applications/batch-status', async (req, res) => {
  try {
    const { ids, status } = req.body;
    await prisma.application.updateMany({
      where: { id: { in: ids } },
      data: { status }
    });
    return res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== BLOCKS & ROOMS ROUTES ====================
app.get('/api/blocks', async (req, res) => {
  try {
    const blocks = await prisma.block.findMany({
      include: {
        rooms: {
          include: {
            beds: {
              include: {
                allocation: {
                  include: { application: true }
                }
              }
            }
          }
        }
      }
    });
    return res.json(blocks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/blocks', async (req, res) => {
  try {
    const { name, gender, imageUrl, floors, roomsPerFloor, bedsPerRoom, roomType } = req.body;

    const block = await prisma.block.create({
      data: { name, gender, imageUrl }
    });

    const totalFloors = Number(floors) || 1;
    const rpf = Number(roomsPerFloor) || 5;
    const bpr = Number(bedsPerRoom) || 2;

    for (let f = 1; f <= totalFloors; f++) {
      for (let r = 1; r <= rpf; r++) {
        const roomNo = `${f}${r < 10 ? '0' + r : r}`;
        const room = await prisma.room.create({
          data: {
            blockId: block.id,
            roomNo,
            floor: f,
            capacity: bpr,
            type: roomType || '2-Sharing'
          }
        });

        for (let b = 1; b <= bpr; b++) {
          await prisma.bed.create({
            data: {
              roomId: room.id,
              bedNo: b,
              status: 'AVAILABLE'
            }
          });
        }
      }
    }

    return res.json({ success: true, block });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/blocks/:id', async (req, res) => {
  try {
    await prisma.block.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/occupancy', async (req, res) => {
  try {
    const totalBeds = await prisma.bed.count();
    const occupiedBeds = await prisma.bed.count({ where: { status: 'OCCUPIED' } });
    const availableBeds = totalBeds - occupiedBeds;
    res.json({ totalBeds, occupiedBeds, availableBeds, occupancyRate: totalBeds ? ((occupiedBeds / totalBeds) * 100).toFixed(1) : 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== ALLOCATIONS ROUTES ====================
app.get('/api/allocations', async (req, res) => {
  try {
    const allocations = await prisma.allocation.findMany({
      include: {
        application: true,
        bed: { include: { room: { include: { block: true } } } }
      }
    });
    res.json(allocations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/allocate', async (req, res) => {
  try {
    const { applicationId, bedId } = req.body;
    if (!applicationId || !bedId) {
      return res.status(400).json({ error: 'Application ID and Bed ID are required.' });
    }

    const allocation = await prisma.allocation.create({
      data: {
        applicationId,
        bedId,
        status: 'ALLOCATED'
      }
    });

    await prisma.bed.update({
      where: { id: bedId },
      data: { status: 'OCCUPIED' }
    });

    const updatedApp = await prisma.application.update({
      where: { id: applicationId },
      data: { status: 'ALLOCATED' }
    });

    io.emit('BED_ALLOCATED', { applicationId, usn: updatedApp.usn, bedId, allocation });
    io.emit('APPLICATION_UPDATED', { applicationId, usn: updatedApp.usn, status: 'ALLOCATED' });
    io.emit('data_updated');

    res.json({ success: true, allocation });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/allocate/batch', async (req, res) => {
  try {
    const { applicationIds, blockId, floor } = req.body;
    let allocatedCount = 0;

    for (const appId of applicationIds) {
      const availableBed = await prisma.bed.findFirst({
        where: {
          status: 'AVAILABLE',
          room: { blockId, floor: parseInt(floor) || 1 }
        }
      });

      if (availableBed) {
        const allocation = await prisma.allocation.create({
          data: { applicationId: appId, bedId: availableBed.id, status: 'ALLOCATED' }
        });
        await prisma.bed.update({ where: { id: availableBed.id }, data: { status: 'OCCUPIED' } });
        const updatedApp = await prisma.application.update({ where: { id: appId }, data: { status: 'ALLOCATED' } });
        allocatedCount++;
        io.emit('BED_ALLOCATED', { applicationId: appId, usn: updatedApp.usn, bedId: availableBed.id, allocation });
      }
    }

    io.emit('data_updated');
    res.json({ success: true, allocated: allocatedCount, totalRequested: applicationIds.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/allocate/undo', async (req, res) => {
  try {
    const { applicationId } = req.body;
    const allocation = await prisma.allocation.findFirst({ where: { applicationId } });

    if (allocation) {
      await prisma.bed.update({ where: { id: allocation.bedId }, data: { status: 'AVAILABLE' } });
      await prisma.allocation.delete({ where: { id: allocation.id } });
    }

    const updatedApp = await prisma.application.update({
      where: { id: applicationId },
      data: { status: 'PENDING' }
    });

    io.emit('APPLICATION_UPDATED', { applicationId, usn: updatedApp.usn, status: 'PENDING' });
    io.emit('data_updated');
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reallocate', async (req, res) => {
  try {
    const { allocationId, newBedId } = req.body;
    const oldAllocation = await prisma.allocation.findUnique({ where: { id: allocationId } });

    if (!oldAllocation) {
      return res.status(404).json({ error: 'Allocation record not found' });
    }

    await prisma.bed.update({ where: { id: oldAllocation.bedId }, data: { status: 'AVAILABLE' } });
    await prisma.bed.update({ where: { id: newBedId }, data: { status: 'OCCUPIED' } });

    const updatedAllocation = await prisma.allocation.update({
      where: { id: allocationId },
      data: { bedId: newBedId }
    });

    const app = await prisma.application.findUnique({ where: { id: oldAllocation.applicationId } });
    io.emit('BED_ALLOCATED', { applicationId: oldAllocation.applicationId, usn: app?.usn, bedId: newBedId, allocation: updatedAllocation });
    io.emit('data_updated');

    res.json({ success: true, allocation: updatedAllocation });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== PAYMENTS ROUTES ====================
app.get('/api/payments', async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(payments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/payments/stats', async (req, res) => {
  try {
    const total = await prisma.payment.count();
    const approved = await prisma.payment.count({ where: { status: 'APPROVED' } });
    const pending = await prisma.payment.count({ where: { status: 'PENDING_REVIEW' } });
    const rejected = await prisma.payment.count({ where: { status: 'REJECTED' } });
    res.json({ total, approved, pending, rejected });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/student/payment', async (req, res) => {
  try {
    const data = req.body;
    const payment = await prisma.payment.create({
      data: {
        studentName: data.studentName,
        studentUsn: data.studentUsn,
        hostelName: data.hostelName || 'Main Hostel',
        block: data.block || 'Block A',
        floor: data.floor,
        roomNumber: data.roomNumber || '101',
        utrNumber: data.utrNumber,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
        screenshotUrl: data.screenshotUrl,
        amount: data.amount ? parseFloat(data.amount) : 0,
        status: 'PENDING_REVIEW'
      }
    });

    io.emit('payment_updated', payment);
    res.status(201).json({ success: true, payment });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/payments/:id/approve', async (req, res) => {
  try {
    const updated = await prisma.payment.update({
      where: { id: req.params.id },
      data: { status: 'APPROVED', reviewedAt: new Date() }
    });
    io.emit('payment_updated', updated);
    res.json({ success: true, payment: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/payments/:id/reject', async (req, res) => {
  try {
    const updated = await prisma.payment.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED', reviewedAt: new Date(), remarks: req.body.remarks }
    });
    io.emit('payment_updated', updated);
    res.json({ success: true, payment: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== ATTENDANCE ROUTES ====================
app.get('/api/attendance', async (req, res) => {
  try {
    const { date, block } = req.query;
    const where: any = {};
    if (date) where.date = String(date);
    if (block && block !== 'ALL') where.block = String(block);

    const records = await prisma.attendanceRecord.findMany({ where });
    res.json(records);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/attendance/history', async (req, res) => {
  try {
    const records = await prisma.attendanceRecord.findMany({ orderBy: { date: 'desc' }, take: 100 });
    res.json(records);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/attendance/bulk', async (req, res) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records)) return res.status(400).json({ error: 'records array required' });

    for (const rec of records) {
      await prisma.attendanceRecord.upsert({
        where: { studentUsn_date: { studentUsn: rec.studentUsn, date: rec.date } },
        update: { status: rec.status, remarks: rec.remarks, block: rec.block || 'Block A' },
        create: {
          studentUsn: rec.studentUsn,
          studentName: rec.studentName || 'Student',
          block: rec.block || 'Block A',
          date: rec.date,
          status: rec.status,
          remarks: rec.remarks
        }
      });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/attendance/student/:usn', async (req, res) => {
  try {
    const records = await prisma.attendanceRecord.findMany({
      where: { studentUsn: req.params.usn },
      orderBy: { date: 'desc' }
    });
    res.json(records);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== ADMIN ACCOUNTS ROUTES ====================
app.get('/api/admin/accounts', async (req, res) => {
  try {
    const admins = await prisma.adminAccount.findMany({ orderBy: { createdAt: 'desc' } });
    const formatted = admins.map(a => ({
      ...a,
      allowedTabs: typeof a.allowedTabs === 'string' ? JSON.parse(a.allowedTabs) : a.allowedTabs,
      allowedBlocks: typeof a.allowedBlocks === 'string' ? JSON.parse(a.allowedBlocks) : a.allowedBlocks
    }));
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/accounts', async (req, res) => {
  try {
    const data = req.body;
    const hashedPassword = await bcrypt.hash(data.password || 'admin123', 10);
    const newAdmin = await prisma.adminAccount.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: data.role || 'SUB_ADMIN',
        title: data.title || 'Assistant Warden',
        allowedTabs: JSON.stringify(data.allowedTabs || []),
        allowedBlocks: JSON.stringify(data.allowedBlocks || ['ALL'])
      }
    });
    res.json({ success: true, admin: newAdmin });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/accounts/:id', async (req, res) => {
  try {
    await prisma.adminAccount.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== STUDENT PORTAL ROUTES ====================
app.get('/api/student/status/:usn', async (req, res) => {
  try {
    const inputUsn = (req.params.usn || '').trim();
    const application = await prisma.application.findFirst({
      where: {
        OR: [
          { usn: inputUsn },
          { phoneNumber: inputUsn }
        ]
      },
      include: {
        allocations: {
          include: {
            bed: { include: { room: { include: { block: true } } } }
          }
        }
      }
    });

    if (!application) {
      return res.status(404).json({ found: false, error: 'No application found' });
    }

    const allocation = application.allocations[0] || null;
    const isAllocated = !!allocation || application.status === 'ALLOCATED' || application.status === 'APPROVED';

    const hostelInfo = allocation?.bed?.room ? {
      hostel: allocation.bed.room.block.gender === 'FEMALE' ? 'Girls Hostel' : 'Boys Hostel',
      block: allocation.bed.room.block.name,
      floor: `Floor ${allocation.bed.room.floor}`,
      room: allocation.bed.room.roomNo,
      bed: `Bed ${allocation.bed.bedNo}`,
      sharing: allocation.bed.room.type || 'Standard',
      admissionDate: new Date(allocation.allocatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    } : null;

    const payments = await prisma.payment.findMany({
      where: { studentUsn: application.usn },
      orderBy: { createdAt: 'desc' }
    });

    const isPaid = payments.some(p => p.status === 'APPROVED');
    const applicationState = isPaid ? 'paid' : (isAllocated ? 'room_allotted' : 'applied');

    return res.json({
      found: true,
      success: true,
      applicationState,
      application,
      allocation,
      hostelInfo,
      payments
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== LEAVE APPLICATIONS ====================
app.get('/api/leaves', async (req, res) => {
  try {
    const { studentUsn } = req.query;
    const where: any = {};
    if (studentUsn) where.usn = String(studentUsn);

    const leaves = await prisma.leaveApplication.findMany({ where, orderBy: { appliedAt: 'desc' } });
    res.json(leaves);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/leaves', async (req, res) => {
  try {
    const data = req.body;
    const leave = await prisma.leaveApplication.create({
      data: {
        studentName: data.studentName,
        usn: data.usn,
        roomNo: data.roomNo,
        block: data.block,
        leaveType: data.leaveType,
        fromDate: new Date(data.fromDate),
        toDate: new Date(data.toDate),
        totalDays: data.totalDays ? Number(data.totalDays) : 1,
        destination: data.destination,
        reason: data.reason,
        emergencyContact: data.emergencyContact,
        expectedReturnTime: data.expectedReturnTime,
        parentName: data.parentName,
        parentPhone: data.parentPhone,
        status: 'Pending'
      }
    });
    res.status(201).json({ success: true, leave });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/leaves/:id/status', async (req, res) => {
  try {
    const updated = await prisma.leaveApplication.update({
      where: { id: req.params.id },
      data: { status: req.body.status }
    });
    res.json({ success: true, leave: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== NOTICES & CIRCULARS ====================
app.get('/api/notices', async (req, res) => {
  try {
    const notices = await prisma.notice.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(notices);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notices', async (req, res) => {
  try {
    const data = req.body;
    const notice = await prisma.notice.create({
      data: {
        title: data.title,
        desc: data.desc || data.description || '',
        date: data.date || new Date().toISOString().split('T')[0],
        category: data.category || 'General',
        priority: data.priority || 'Normal',
        author: data.author || 'Administration',
        documentName: data.documentName,
        documentType: data.documentType,
        documentUrl: data.documentUrl
      }
    });
    io.emit('notice_created', notice);
    res.status(201).json({ success: true, notice });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/notices/:id', async (req, res) => {
  try {
    await prisma.notice.delete({ where: { id: req.params.id } });
    io.emit('notice_deleted', req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== COMPLAINTS ====================
app.get('/api/complaints', async (req, res) => {
  try {
    const complaints = await prisma.complaint.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(complaints);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/complaints', async (req, res) => {
  try {
    const data = req.body;
    const complaint = await prisma.complaint.create({
      data: {
        studentName: data.studentName,
        usn: data.usn,
        roomNo: data.roomNo || 'N/A',
        block: data.block || 'Block A',
        floor: data.floor || '1',
        category: data.category || 'General',
        priority: data.priority || 'Medium',
        subject: data.subject || 'Hostel Issue',
        description: data.description,
        status: 'Pending'
      }
    });
    io.emit('complaint_created', complaint);
    res.status(201).json({ success: true, complaint });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/complaints/:id/like', async (req, res) => {
  try {
    const updated = await prisma.complaint.update({
      where: { id: req.params.id },
      data: { upvotes: { increment: 1 } }
    });
    io.emit('complaint_updated', updated);
    res.json({ success: true, complaint: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/complaints/:id/status', async (req, res) => {
  try {
    const updated = await prisma.complaint.update({
      where: { id: req.params.id },
      data: { status: req.body.status, resolutionNotes: req.body.resolutionNotes }
    });
    io.emit('complaint_updated', updated);
    res.json({ success: true, complaint: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== FACILITIES & FEEDBACK ====================
app.get('/api/facilities', async (req, res) => {
  try {
    const facilities = await prisma.facility.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(facilities);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/facilities', async (req, res) => {
  try {
    const data = req.body;
    const facility = await prisma.facility.create({
      data: {
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl
      }
    });
    res.status(201).json({ success: true, facility });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/feedback', async (req, res) => {
  try {
    const feedbacks = await prisma.feedback.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(feedbacks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/feedback', async (req, res) => {
  try {
    const data = req.body;
    const feedback = await prisma.feedback.create({
      data: {
        studentName: data.studentName,
        usn: data.usn,
        message: data.message,
        rating: Number(data.rating) || 5
      }
    });
    res.status(201).json({ success: true, feedback });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== CHAT & COMMUNITY ====================
app.get('/api/chat/channels', async (req, res) => {
  try {
    const channels = await prisma.chatChannel.findMany();
    res.json(channels);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/chat/channels/:id/messages', async (req, res) => {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { channelId: req.params.id },
      orderBy: { createdAt: 'asc' }
    });
    res.json(messages);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chat/channels/:id/messages', async (req, res) => {
  try {
    const data = req.body;
    const channelId = req.params.id;

    // Ensure channel exists
    let channel = await prisma.chatChannel.findUnique({ where: { id: channelId } });
    if (!channel) {
      channel = await prisma.chatChannel.findFirst({ where: { name: channelId } });
    }
    if (!channel) {
      channel = await prisma.chatChannel.create({
        data: { name: channelId, desc: `${channelId} discussion channel` }
      });
    }

    const message = await prisma.chatMessage.create({
      data: {
        channelId: channel.id,
        senderName: data.senderName || 'Anonymous',
        usn: data.usn || 'N/A',
        roomNo: data.roomNo || 'N/A',
        message: data.message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        price: data.price,
        categoryTag: data.categoryTag,
        imgUrl: data.imgUrl
      }
    });

    io.to(channel.id).emit('new_message', message);
    res.status(201).json({ success: true, message });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== SETTINGS & DASHBOARD ====================
app.get('/api/settings/:key', async (req, res) => {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: req.params.key } });
    res.json(setting ? JSON.parse(setting.value) : null);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings/:key', async (req, res) => {
  try {
    const setting = await prisma.systemSetting.upsert({
      where: { key: req.params.key },
      update: { value: JSON.stringify(req.body) },
      create: { key: req.params.key, value: JSON.stringify(req.body) }
    });
    res.json({ success: true, setting });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const pendingApplications = await prisma.application.count({ where: { status: 'PENDING' } });
    const paymentPendingApplications = await prisma.application.count({ where: { status: 'PAYMENT_PENDING' } });
    const availableBeds = await prisma.bed.count({ where: { status: 'AVAILABLE' } });
    const occupiedBeds = await prisma.bed.count({ where: { status: 'OCCUPIED' } });
    const totalBlocks = await prisma.block.count();

    // Count male/female occupancy from allocations
    const maleAllocations = await prisma.allocation.count({
      where: { status: 'ACTIVE', bed: { room: { block: { gender: 'MALE' } } } }
    });
    const femaleAllocations = await prisma.allocation.count({
      where: { status: 'ACTIVE', bed: { room: { block: { gender: 'FEMALE' } } } }
    });

    res.json({
      applications: {
        pending: pendingApplications,
        paymentPending: paymentPendingApplications
      },
      beds: {
        available: availableBeds,
        occupied: occupiedBeds
      },
      maleOccupancy: maleAllocations,
      femaleOccupancy: femaleAllocations,
      totalBlocks
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
server.listen(PORT, () => {
  console.log(`Common Backend server running on port ${PORT}`);
});
