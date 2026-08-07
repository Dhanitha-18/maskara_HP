import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { uploadToSupabaseStorage } from './config/supabase';
import { authenticateJWT, generateToken, AuthenticatedRequest } from './middleware/auth';
import { getFeedbackStatus } from './routes/feedbackStatus';
import { submitFeedback } from './routes/feedbackSubmit';
import { getFeedbackConfig, saveFeedbackConfig } from './routes/feedbackConfig';

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

// Serve static menu images
app.use('/menu', express.static(path.join(__dirname, '../public/menu')));

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
    const inputIdentifier = (email || username || '').trim();
    const cleanPassword = (password || '').trim();

    if (!inputIdentifier || !cleanPassword) {
      return res.status(400).json({ error: 'Email/Username and Password are required.' });
    }

    await seedDefaultChiefAdmin();

    // Search by email OR name (case-insensitive) so admins can log in with either
    const admin = await prisma.adminAccount.findFirst({
      where: {
        status: 'ACTIVE',
        OR: [
          { email: { equals: inputIdentifier, mode: 'insensitive' } },
          { name: { equals: inputIdentifier, mode: 'insensitive' } }
        ]
      }
    });

    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const passwordMatches = await bcrypt.compare(cleanPassword, admin.password);

    if (!passwordMatches) {
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

    const cleanName = String(studentName).trim().toLowerCase();
    const rawPhoneDigits = String(phoneNumber).replace(/\D/g, '');
    const cleanPhone10 = rawPhoneDigits.slice(-10);

    if (!cleanName || !cleanPhone10) {
      return res.status(400).json({ error: 'Valid Name and 10-digit Phone Number are required.' });
    }

    // 1. Fetch all active student accounts and match by phone digits & name
    const allAccounts = await prisma.studentAccount.findMany({
      where: { status: 'ACTIVE' }
    });

    let account = allAccounts.find((a) => {
      const aPhoneDigits = (a.phoneNumber || '').replace(/\D/g, '').slice(-10);
      const aName = (a.studentName || '').trim().toLowerCase();
      return (aPhoneDigits === cleanPhone10 || a.phoneNumber?.trim() === String(phoneNumber).trim()) && aName === cleanName;
    });

    // 2. Fallback: Search Application table directly
    if (!account) {
      const allApps = await prisma.application.findMany({
        where: { status: { not: 'REJECTED' } }
      });

      const matchingApp = allApps.find((app) => {
        const appPhoneDigits = (app.phoneNumber || '').replace(/\D/g, '').slice(-10);
        const appName = (app.studentName || '').trim().toLowerCase();
        return (appPhoneDigits === cleanPhone10 || app.phoneNumber?.trim() === String(phoneNumber).trim()) && appName === cleanName;
      });

      if (matchingApp) {
        const existingAcc = matchingApp.usn
          ? await prisma.studentAccount.findFirst({ where: { usn: matchingApp.usn } })
          : await prisma.studentAccount.findFirst({ where: { applicationId: matchingApp.id } });

        if (existingAcc) {
          account = await prisma.studentAccount.update({
            where: { id: existingAcc.id },
            data: {
              studentName: matchingApp.studentName,
              phoneNumber: matchingApp.phoneNumber,
              applicationId: matchingApp.id,
              status: 'ACTIVE'
            }
          });
        } else {
          account = await prisma.studentAccount.create({
            data: {
              usn: matchingApp.usn || '',
              studentName: matchingApp.studentName,
              phoneNumber: matchingApp.phoneNumber,
              applicationId: matchingApp.id,
              status: 'ACTIVE'
            }
          });
        }
      }
    }

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'No active student account or application found for this Name and Phone Number. Please submit a hostel application first.'
      });
    }

    // 3. Fetch associated application
    const application = await prisma.application.findFirst({
      where: {
        OR: [
          ...(account.applicationId ? [{ id: account.applicationId }] : []),
          ...(account.usn ? [{ usn: account.usn }] : []),
          { phoneNumber: account.phoneNumber }
        ]
      }
    });

    if (application && String(application.status).toUpperCase() === 'REJECTED') {
      return res.status(404).json({ success: false, error: 'Your application has been rejected by administration.' });
    }

    const effectiveUsn = account.usn || application?.usn || account.phoneNumber;

    const studentPayload = {
      id: account.id,
      studentAccountId: account.id,  // permanent identity — same as id
      usn: effectiveUsn,
      studentName: account.studentName,
      phoneNumber: account.phoneNumber,
      userType: 'STUDENT'
    };

    const token = generateToken(studentPayload);

    return res.json({
      success: true,
      token,
      studentAccountId: account.id,
      usn: effectiveUsn,
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

// Student Profile Update
app.put('/api/student/profile', async (req, res) => {
  try {
    const { usn, newUsn, email, year, yearSem } = req.body;

    if (!usn) {
      return res.status(400).json({ error: 'Current USN or identifier is required.' });
    }

    // Find the application by usn or phone (phone used as fallback usn)
    const application = await prisma.application.findFirst({
      where: {
        OR: [
          { usn: usn },
          { phoneNumber: usn },
          { bmsitId: usn }
        ]
      }
    });

    if (!application) {
      return res.status(404).json({ error: 'Student application not found.' });
    }

    const updatedYear = yearSem || year;

    // Update Application record
    const updatedApp = await prisma.application.update({
      where: { id: application.id },
      data: {
        ...(newUsn && newUsn !== usn ? { usn: newUsn } : {}),
        ...(email ? { email } : {}),
        ...(updatedYear ? { yearSem: updatedYear, year: updatedYear } : {})
      }
    });

    // Also sync usn on StudentAccount so Admin's Student Database reflects the change
    const effectiveNewUsn = newUsn || usn;
    const studentAccount = await prisma.studentAccount.findFirst({
      where: {
        OR: [
          { usn: usn },
          { applicationId: application.id }
        ]
      }
    });

    if (studentAccount && newUsn && newUsn !== usn) {
      await prisma.studentAccount.update({
        where: { id: studentAccount.id },
        data: { usn: effectiveNewUsn }
      });
    }

    return res.json({ success: true, application: updatedApp });
  } catch (err: any) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: err.message || 'Failed to update profile.' });
  }
});

// ==================== APPLICATIONS ROUTES ====================
app.post('/api/applications/check-duplicate', async (req, res) => {
  try {
    const { usn, aadhaarNumber } = req.body;
    let existing = null;

    if (usn) {
      existing = await prisma.application.findFirst({ where: { usn } });
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
    const newApp = await prisma.application.create({
      data: {
        usn: data.usn,
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

    // Create or update Student Account entry so login works immediately
    const existingAcc = newApp.usn
      ? await prisma.studentAccount.findFirst({ where: { usn: newApp.usn } })
      : await prisma.studentAccount.findFirst({ where: { applicationId: newApp.id } });

    if (existingAcc) {
      await prisma.studentAccount.update({
        where: { id: existingAcc.id },
        data: {
          usn: newApp.usn || existingAcc.usn || '',
          studentName: newApp.studentName,
          phoneNumber: newApp.phoneNumber,
          applicationId: newApp.id,
          status: 'ACTIVE'
        }
      });
    } else {
      await prisma.studentAccount.create({
        data: {
          usn: newApp.usn || '',
          studentName: newApp.studentName,
          phoneNumber: newApp.phoneNumber,
          applicationId: newApp.id,
          status: 'ACTIVE'
        }
      });
    }

    return res.status(201).json({ success: true, application: newApp });
  } catch (err: any) {
    console.error('Error creating application:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/applications', async (req, res) => {
  try {
    const apps = await prisma.application.findMany({
      include: {
        documents: true,
        allocations: {
          include: {
            bed: {
              include: {
                room: {
                  include: {
                    block: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { appliedAt: 'asc' }
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

app.delete('/api/applications/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Find application by ID or USN
    const application = await prisma.application.findFirst({
      where: {
        OR: [
          { id },
          { usn: id }
        ]
      },
      include: {
        allocations: true
      }
    });

    if (!application) {
      return res.status(404).json({ error: 'Student application record not found' });
    }

    const appId = application.id;
    const usn = application.usn;

    // 1. Free up any allocated beds & delete allocations
    for (const alloc of application.allocations) {
      if (alloc.bedId) {
        await prisma.bed.update({
          where: { id: alloc.bedId },
          data: { status: 'AVAILABLE' }
        });
      }
      await prisma.allocation.delete({ where: { id: alloc.id } }).catch(() => {});
    }

    // Double check any remaining allocations tied to this applicationId
    const extraAllocations = await prisma.allocation.findMany({
      where: { applicationId: appId }
    });
    for (const alloc of extraAllocations) {
      if (alloc.bedId) {
        await prisma.bed.update({
          where: { id: alloc.bedId },
          data: { status: 'AVAILABLE' }
        }).catch(() => {});
      }
      await prisma.allocation.delete({ where: { id: alloc.id } }).catch(() => {});
    }

    // 2. Delete related documents
    await prisma.document.deleteMany({ where: { applicationId: appId } }).catch(() => {});

    // 3. Delete related student account
    await prisma.studentAccount.deleteMany({
      where: {
        OR: [
          { applicationId: appId },
          ...(usn ? [{ usn }] : [])
        ]
      }
    }).catch(() => {});

    // 4. Delete related payments if any
    if (usn) {
      await prisma.payment.deleteMany({ where: { studentUsn: usn } }).catch(() => {});
    }

    // 5. Delete application record
    await prisma.application.delete({ where: { id: appId } });

    // 6. Broadcast socket events to update Live Occupancy and Student Database immediately
    io.emit('BED_DEALLOCATED');
    io.emit('BED_ALLOCATED');
    io.emit('APPLICATION_UPDATED', { applicationId: appId, status: 'DELETED' });
    io.emit('STUDENT_UPDATED');
    if (usn) {
      io.emit('student_account_deleted', { usns: [usn] });
    }
    io.emit('data_updated');

    res.json({ success: true, message: 'Student record deleted and bed vacated successfully', id: appId, usn });
  } catch (err: any) {
    console.error('Error deleting student application:', err);
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
    const { name, gender, imageUrl, floors, roomsPerFloor, bedsPerRoom, roomType, floorConfigs } = req.body;

    const block = await prisma.block.create({
      data: { name, gender, imageUrl }
    });

    if (Array.isArray(floorConfigs) && floorConfigs.length > 0) {
      for (const config of floorConfigs) {
        const f = Number(config.floor) || 1;
        const cap = Number(config.capacity) || 2;
        const roomNumbers = config.roomNumbers || [];

        for (const roomNo of roomNumbers) {
          const room = await prisma.room.create({
            data: {
              blockId: block.id,
              roomNo: String(roomNo),
              floor: f,
              capacity: cap,
              type: `${cap}-Sharing`
            }
          });

          for (let b = 1; b <= cap; b++) {
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
    } else {
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
              type: roomType || `${bpr}-Sharing`
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
    }

    return res.json({ success: true, block });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add floor to block
app.post('/api/blocks/:id/floors', async (req, res) => {
  try {
    const { id } = req.params;
    const { floor, numberOfRooms, capacityPerRoom } = req.body;

    const block = await prisma.block.findUnique({ where: { id } });
    if (!block) return res.status(404).json({ error: 'Block not found' });

    const fl = Number(floor) || 1;
    const numRooms = Number(numberOfRooms) || 10;
    const cap = Number(capacityPerRoom) || 4;

    const createdRooms = [];
    for (let r = 1; r <= numRooms; r++) {
      const roomNo = `${fl}${r < 10 ? '0' + r : r}`;
      const existing = await prisma.room.findFirst({ where: { blockId: id, roomNo } });
      if (existing) continue;

      const room = await prisma.room.create({
        data: {
          blockId: id,
          roomNo,
          floor: fl,
          capacity: cap,
          type: `${cap}-Sharing`
        }
      });

      for (let b = 1; b <= cap; b++) {
        await prisma.bed.create({
          data: {
            roomId: room.id,
            bedNo: b,
            status: 'AVAILABLE'
          }
        });
      }
      createdRooms.push(room);
    }

    return res.json({ success: true, count: createdRooms.length });
  } catch (err: any) {
    console.error('Error adding floor:', err);
    res.status(500).json({ error: err.message || 'Failed to add floor' });
  }
});

// Delete floor from block
app.delete('/api/blocks/:id/floors/:floorNum', async (req, res) => {
  try {
    const { id, floorNum } = req.params;
    const fl = Number(floorNum);

    const roomsOnFloor = await prisma.room.findMany({
      where: { blockId: id, floor: fl },
      include: { beds: true }
    });

    const occupiedBeds = roomsOnFloor.flatMap(r => r.beds).filter(b => b.status === 'OCCUPIED');
    if (occupiedBeds.length > 0) {
      return res.status(400).json({ error: `Cannot delete Floor ${fl}. There are ${occupiedBeds.length} occupied bed(s) on this floor.` });
    }

    const roomIds = roomsOnFloor.map(r => r.id);
    await prisma.bed.deleteMany({ where: { roomId: { in: roomIds } } });
    await prisma.room.deleteMany({ where: { id: { in: roomIds } } });

    return res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add rooms to block floor
app.post('/api/blocks/:id/rooms', async (req, res) => {
  try {
    const { id } = req.params;
    const { floor, roomNos, capacity } = req.body;

    const fl = Number(floor) || 1;
    const cap = Number(capacity) || 4;
    const roomsToCreate: string[] = Array.isArray(roomNos) ? roomNos : [String(roomNos)];

    let addedCount = 0;
    for (const roomNo of roomsToCreate) {
      const trimmed = String(roomNo).trim();
      if (!trimmed) continue;

      const existing = await prisma.room.findFirst({ where: { blockId: id, roomNo: trimmed } });
      if (existing) continue;

      const room = await prisma.room.create({
        data: {
          blockId: id,
          roomNo: trimmed,
          floor: fl,
          capacity: cap,
          type: `${cap}-Sharing`
        }
      });

      for (let b = 1; b <= cap; b++) {
        await prisma.bed.create({
          data: {
            roomId: room.id,
            bedNo: b,
            status: 'AVAILABLE'
          }
        });
      }
      addedCount++;
    }

    return res.json({ success: true, count: addedCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update room capacity
app.put('/api/rooms/:id/capacity', async (req, res) => {
  try {
    const { id } = req.params;
    const { newCapacity } = req.body;
    const cap = Number(newCapacity);

    if (!cap || cap < 1 || cap > 10) {
      return res.status(400).json({ error: 'Capacity must be between 1 and 10' });
    }

    const room = await prisma.room.findUnique({
      where: { id },
      include: { beds: true }
    });

    if (!room) return res.status(404).json({ error: 'Room not found' });

    const occupiedBeds = room.beds.filter(b => b.status === 'OCCUPIED');
    if (cap < occupiedBeds.length) {
      return res.status(400).json({ error: `Cannot reduce capacity below ${occupiedBeds.length} (currently occupied beds)` });
    }

    const currentCap = room.capacity;
    if (cap > currentCap) {
      for (let b = currentCap + 1; b <= cap; b++) {
        await prisma.bed.create({
          data: {
            roomId: room.id,
            bedNo: b,
            status: 'AVAILABLE'
          }
        });
      }
    } else if (cap < currentCap) {
      const availableBeds = room.beds
        .filter(b => b.status === 'AVAILABLE')
        .sort((a, b) => b.bedNo - a.bedNo);
      
      const toDeleteCount = currentCap - cap;
      const bedsToDelete = availableBeds.slice(0, toDeleteCount);
      const bedIdsToDelete = bedsToDelete.map(b => b.id);

      await prisma.bed.deleteMany({ where: { id: { in: bedIdsToDelete } } });
    }

    const updatedRoom = await prisma.room.update({
      where: { id },
      data: {
        capacity: cap,
        type: `${cap}-Sharing`
      },
      include: { beds: true }
    });

    return res.json({ success: true, room: updatedRoom });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete room
app.delete('/api/rooms/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const room = await prisma.room.findUnique({
      where: { id },
      include: { beds: true }
    });

    if (!room) return res.status(404).json({ error: 'Room not found' });

    const occupied = room.beds.some(b => b.status === 'OCCUPIED');
    if (occupied) {
      return res.status(400).json({ error: 'Cannot delete room with occupied beds' });
    }

    await prisma.bed.deleteMany({ where: { roomId: id } });
    await prisma.room.delete({ where: { id } });

    return res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update block photo
app.put('/api/blocks/:id/photo', async (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl } = req.body;

    const block = await prisma.block.update({
      where: { id },
      data: { imageUrl }
    });

    return res.json({ success: true, block });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/blocks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const rooms = await prisma.room.findMany({ where: { blockId: id } });
    const roomIds = rooms.map(r => r.id);
    await prisma.bed.deleteMany({ where: { roomId: { in: roomIds } } });
    await prisma.room.deleteMany({ where: { blockId: id } });
    await prisma.block.delete({ where: { id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/occupancy', async (req, res) => {
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
    const totalBeds = await prisma.bed.count();
    const occupiedBeds = await prisma.bed.count({ where: { status: 'OCCUPIED' } });
    const availableBeds = totalBeds - occupiedBeds;
    res.json({ blocks, totalBeds, occupiedBeds, availableBeds, occupancyRate: totalBeds ? ((occupiedBeds / totalBeds) * 100).toFixed(1) : 0 });
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
      },
      include: {
        bed: { include: { room: { include: { block: true } } } }
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
          data: { applicationId: appId, bedId: availableBed.id, status: 'ALLOCATED' },
          include: {
            bed: { include: { room: { include: { block: true } } } }
          }
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
      data: { bedId: newBedId },
      include: {
        bed: { include: { room: { include: { block: true } } } }
      }
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
        paymentTitle: data.paymentTitle || null,
        semester: data.semester || null,
        transferBank: data.transferBank || null,
        accountHolderName: data.accountHolderName || null,
        accountHolderRelation: data.accountHolderRelation || null,
        accountHolderContact: data.accountHolderContact || null,
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
      data: { status: 'APPROVED', reviewedBy: req.body.reviewedBy || 'Admin', reviewedAt: new Date() }
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
      data: { status: 'REJECTED', reviewedBy: req.body.reviewedBy || 'Admin', reviewedAt: new Date(), remarks: req.body.remarks }
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
    const targetDate = String(date || new Date().toISOString().split('T')[0]);

    // Fetch all active or allocated bed allotments along with application & bed details
    const allocations = await prisma.allocation.findMany({
      where: {
        status: { in: ['ALLOCATED', 'ACTIVE'] }
      },
      include: {
        application: true,
        bed: {
          include: {
            room: {
              include: { block: true }
            }
          }
        }
      }
    });

    // Also fetch any Applications marked as ALLOCATED directly
    const allocatedApps = await prisma.application.findMany({
      where: { status: 'ALLOCATED' },
      include: {
        allocations: {
          include: {
            bed: { include: { room: { include: { block: true } } } }
          }
        }
      }
    });

    // Combine allocation items into a map keyed by applicationId to avoid duplicates
    const combinedAllocMap = new Map<string, { app: any; bed: any }>();
    allocations.forEach(alloc => {
      if (alloc.application) {
        combinedAllocMap.set(alloc.applicationId, { app: alloc.application, bed: alloc.bed });
      }
    });

    allocatedApps.forEach(app => {
      if (!combinedAllocMap.has(app.id)) {
        const alloc = app.allocations && app.allocations[0] ? app.allocations[0] : null;
        combinedAllocMap.set(app.id, { app, bed: alloc?.bed || null });
      }
    });

    // Fetch existing attendance records for target date
    const existingRecordsWhere: any = { date: targetDate };
    if (block && block !== 'ALL') existingRecordsWhere.block = String(block);
    const existingRecords = await prisma.attendanceRecord.findMany({ where: existingRecordsWhere });
    const existingMap = new Map<string, any>();
    existingRecords.forEach(r => existingMap.set(r.studentUsn, r));

    // Build attendance list from all allocated residents
    const attendance = Array.from(combinedAllocMap.values())
      .filter(({ bed }) => {
        if (block && block !== 'ALL') {
          const blockName = bed?.room?.block?.name || '';
          const targetBlock = String(block).toLowerCase();
          return blockName.toLowerCase().includes(targetBlock) || targetBlock.includes(blockName.toLowerCase());
        }
        return true;
      })
      .map(({ app, bed }) => {
        const studentUsn = (app.usn && app.usn !== '-' ? app.usn : (app.phoneNumber || app.id)).trim();
        const blockName = bed?.room?.block?.name || 'Main Block';
        const roomNo = bed?.room?.roomNo ? `Room ${bed.room.roomNo}` : '101';
        
        // Find existing record by USN or phone
        const existing = existingMap.get(studentUsn) || existingMap.get(app.usn) || existingMap.get(app.phoneNumber);

        return existing
          ? {
              ...existing,
              studentUsn,
              studentName: app.studentName,
              block: blockName,
              roomNo,
              phoneNumber: app.phoneNumber,
              gender: app.gender
            }
          : {
              id: `pending-${studentUsn}-${targetDate}`,
              studentUsn,
              studentName: app.studentName,
              phoneNumber: app.phoneNumber,
              gender: app.gender,
              block: blockName,
              roomNo,
              date: targetDate,
              status: 'ABSENT',
              remarks: null
            };
      });

    res.json({ attendance });
  } catch (err: any) {
    console.error('Get attendance error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/attendance/history', async (req, res) => {
  try {
    const records = await prisma.attendanceRecord.findMany({ orderBy: { date: 'desc' }, take: 500 });
    res.json({ history: records });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/attendance/bulk', async (req, res) => {
  try {
    const { records, date } = req.body;
    if (!Array.isArray(records)) return res.status(400).json({ error: 'records array required' });

    for (const rec of records) {
      if (!rec.studentUsn) continue;
      const targetUsn = String(rec.studentUsn).trim();
      const targetDate = String(rec.date || date || new Date().toISOString().split('T')[0]);

      await prisma.attendanceRecord.upsert({
        where: {
          studentUsn_date: { studentUsn: targetUsn, date: targetDate }
        },
        update: {
          status: rec.status,
          remarks: rec.remarks || null,
          block: rec.block || 'Main Block',
          studentName: rec.studentName || 'Student'
        },
        create: {
          studentUsn: targetUsn,
          studentName: rec.studentName || 'Student',
          block: rec.block || 'Main Block',
          date: targetDate,
          status: rec.status,
          remarks: rec.remarks || null
        }
      });
    }

    // Emit real-time update to both admin and student portals
    io.emit('ATTENDANCE_UPDATED', { date: date || records[0]?.date });
    io.emit('data_updated');

    res.json({ success: true });
  } catch (err: any) {
    console.error('Bulk attendance error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/attendance/student/:usn', async (req, res) => {
  try {
    const rawUsn = decodeURIComponent(req.params.usn || '').trim();

    // Find student app by USN or phone number to catch any aliases
    const studentApp = await prisma.application.findFirst({
      where: {
        OR: [
          { usn: rawUsn },
          { phoneNumber: rawUsn },
          { id: rawUsn }
        ]
      }
    });

    const usnSet = new Set<string>();
    if (rawUsn) usnSet.add(rawUsn);
    if (studentApp?.usn && studentApp.usn !== '-') usnSet.add(studentApp.usn);
    if (studentApp?.phoneNumber) usnSet.add(studentApp.phoneNumber);

    const records = await prisma.attendanceRecord.findMany({
      where: {
        studentUsn: { in: Array.from(usnSet) }
      },
      orderBy: { date: 'desc' }
    });

    res.json({ history: records });
  } catch (err: any) {
    console.error('Student attendance error:', err);
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

// GET /api/complaints
// - Student (Bearer token present, userType=STUDENT): returns only complaints in student's own block (DB-level filter)
// - Admin / No token: returns all complaints (admin path unchanged)
app.get('/api/complaints', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Attempt to decode to identify student vs admin
      try {
        const jwt = await import('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'maskara_jwt_secret_key_2026_super_secure';
        const decoded: any = jwt.default.verify(authHeader.split(' ')[1], JWT_SECRET);

        if (decoded.userType === 'STUDENT' && decoded.studentAccountId) {
          // Fetch the student's block from their Allocation → Room → Block chain
          const allocation = await prisma.allocation.findFirst({
            where: { application: { studentAccountId: decoded.studentAccountId } },
            include: { bed: { include: { room: { include: { block: true } } } } }
          });

          const studentBlock = allocation?.bed?.room?.block?.name || null;

          if (!studentBlock) {
            // Student has no allocated block — return empty list (not their block data)
            return res.json([]);
          }

          // DB-level filter: only complaints in this block
          const complaints = await prisma.complaint.findMany({
            where: { block: studentBlock },
            orderBy: { createdAt: 'desc' }
          });
          return res.json(complaints);
        }
      } catch (_) {
        // Token invalid or expired — fall through to return all (admin path)
      }
    }

    // Admin path: no token or admin token — return all complaints
    const complaints = await prisma.complaint.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(complaints);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/complaints
// Backend resolves studentAccountId and block from authenticated session — frontend cannot override these
app.post('/api/complaints', async (req, res) => {
  try {
    const data = req.body;
    let resolvedStudentAccountId: string | undefined = undefined;
    let resolvedBlock: string = data.block || 'Block A';
    let resolvedStudentName: string = data.studentName || 'Unknown';
    let resolvedUsn: string = data.usn || '';
    let resolvedRoomNo: string = data.roomNo || 'N/A';
    let resolvedFloor: string = data.floor || '1';

    // If student token is present, resolve identity and block from the database — do NOT trust frontend values
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = await import('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'maskara_jwt_secret_key_2026_super_secure';
        const decoded: any = jwt.default.verify(authHeader.split(' ')[1], JWT_SECRET);

        if (decoded.userType === 'STUDENT' && decoded.studentAccountId) {
          const studentAccount = await prisma.studentAccount.findUnique({
            where: { id: decoded.studentAccountId }
          });

          if (studentAccount) {
            resolvedStudentAccountId = studentAccount.id;
            resolvedStudentName = studentAccount.studentName;
            resolvedUsn = studentAccount.usn || '';

            // Resolve block from Allocation chain — backend authority, not frontend
            const allocation = await prisma.allocation.findFirst({
              where: { application: { studentAccountId: decoded.studentAccountId } },
              include: { bed: { include: { room: { include: { block: true } } } } }
            });

            if (allocation?.bed?.room?.block?.name) {
              resolvedBlock = allocation.bed.room.block.name;
              resolvedRoomNo = allocation.bed.room.roomNo || data.roomNo || 'N/A';
              resolvedFloor = String(allocation.bed.room.floor || data.floor || '1');
            }
          }
        }
      } catch (_) {
        // Token invalid — proceed with frontend-provided data (admin or unauthenticated submission)
      }
    }

    const complaint = await prisma.complaint.create({
      data: {
        ...(resolvedStudentAccountId ? { studentAccountId: resolvedStudentAccountId } : {}),
        studentName: resolvedStudentName,
        usn: resolvedUsn,
        roomNo: resolvedRoomNo,
        block: resolvedBlock,
        floor: resolvedFloor,
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

app.put('/api/complaints/:id', async (req, res) => {
  try {
    const { status, assignedTo, resolutionNotes, category, priority } = req.body;
    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
    if (resolutionNotes !== undefined) updateData.resolutionNotes = resolutionNotes;
    if (category !== undefined) updateData.category = category;
    if (priority !== undefined) updateData.priority = priority;

    if (status === 'Resolved' || status === 'Closed') {
      updateData.resolvedAt = new Date();
    } else if (status === 'Pending' || status === 'In Progress') {
      updateData.resolvedAt = null;
    }

    const updated = await prisma.complaint.update({
      where: { id: req.params.id },
      data: updateData
    });
    io.emit('complaint_updated', updated);
    io.emit('data_updated');
    res.json({ success: true, complaint: updated });
  } catch (err: any) {
    console.error('Error updating complaint:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/complaints/:id/status', async (req, res) => {
  try {
    const { status, resolutionNotes } = req.body;
    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (resolutionNotes !== undefined) updateData.resolutionNotes = resolutionNotes;
    if (status === 'Resolved' || status === 'Closed') {
      updateData.resolvedAt = new Date();
    } else if (status === 'Pending' || status === 'In Progress') {
      updateData.resolvedAt = null;
    }

    const updated = await prisma.complaint.update({
      where: { id: req.params.id },
      data: updateData
    });
    io.emit('complaint_updated', updated);
    io.emit('data_updated');
    res.json({ success: true, complaint: updated });
  } catch (err: any) {
    console.error('Error updating complaint status:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/complaints/:id', async (req, res) => {
  try {
    await prisma.complaint.delete({
      where: { id: req.params.id }
    });
    io.emit('complaint_deleted', req.params.id);
    io.emit('data_updated');
    res.json({ success: true, id: req.params.id });
  } catch (err: any) {
    console.error('Error deleting complaint:', err);
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
    io.emit('facilities_updated');
    io.emit('data_updated');
    res.status(201).json({ success: true, facility });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/facilities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const facility = await prisma.facility.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl
      }
    });
    io.emit('facilities_updated');
    io.emit('data_updated');
    res.json({ success: true, facility });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/facilities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.facility.delete({ where: { id } });
    io.emit('facilities_updated');
    io.emit('data_updated');
    res.json({ success: true });
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

app.post('/api/feedback', submitFeedback);

app.get('/api/feedback/status', getFeedbackStatus);
app.get('/api/feedback/config', getFeedbackConfig);
app.post('/api/feedback/config', async (req, res) => {
  try {
    const { googleFormUrl, enabled } = req.body;
    const existing = await prisma.feedbackConfig.findFirst();
    let config;
    if (existing) {
      config = await prisma.feedbackConfig.update({
        where: { id: existing.id },
        data: { googleFormUrl: googleFormUrl || '', enabled: enabled !== false },
      });
    } else {
      config = await prisma.feedbackConfig.create({
        data: { googleFormUrl: googleFormUrl || '', enabled: enabled !== false },
      });
    }
    // Emit real-time event so Student portal updates immediately
    io.emit('feedback_config_updated', {
      googleFormUrl: config.googleFormUrl || '',
      enabled: config.enabled,
    });
    io.emit('data_updated');
    return res.json({ success: true, config });
  } catch (err: any) {
    console.error('Error saving feedback config:', err);
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

app.post('/api/chat/channels', async (req, res) => {
  try {
    const { name, desc, iconName, badge, targetBlock } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Channel name is required' });
    }

    const cleanName = name.trim().toLowerCase().replace(/\s+/g, '-');
    const existing = await prisma.chatChannel.findFirst({
      where: { name: { equals: cleanName, mode: 'insensitive' } }
    });
    if (existing) {
      return res.status(400).json({ error: 'A channel with this name already exists' });
    }

    const channel = await prisma.chatChannel.create({
      data: {
        name: cleanName,
        desc: desc ? desc.trim() : `${cleanName} channel`,
        iconName: iconName || 'MessageSquare',
        badge: badge ? badge.trim() : null,
        targetBlock: targetBlock || 'ALL'
      }
    });

    io.emit('chat_channel_created', channel);
    res.status(201).json(channel);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/chat/channels/:id', async (req, res) => {
  try {
    const { name, desc, iconName, badge, targetBlock } = req.body;
    const updated = await prisma.chatChannel.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name: name.trim().toLowerCase().replace(/\s+/g, '-') }),
        ...(desc !== undefined && { desc: desc.trim() }),
        ...(iconName && { iconName }),
        ...(badge !== undefined && { badge: badge ? badge.trim() : null }),
        ...(targetBlock && { targetBlock })
      }
    });

    io.emit('chat_channel_updated', updated);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/chat/channels/:id', async (req, res) => {
  try {
    await prisma.chatMessage.deleteMany({
      where: { channelId: req.params.id }
    });
    await prisma.chatChannel.delete({
      where: { id: req.params.id }
    });

    io.emit('chat_channel_deleted', req.params.id);
    res.json({ success: true, id: req.params.id });
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

    if (req.params.key === 'mess-menu') {
      const menuPayload = req.body.menu || req.body;
      io.emit('MESS_MENU_UPDATED', menuPayload);
    }
    io.emit('data_updated', { type: req.params.key });

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
