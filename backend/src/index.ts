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
    }  } catch (err) {
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

    // ── STEP 1: Match StudentAccount by phone + name ─────────────────────────
    // Name + phone are AUTHENTICATION CREDENTIALS only, not identity.
    // StudentAccount.id is the permanent identity once matched.
    const allAccounts = await prisma.studentAccount.findMany({
      where: { status: 'ACTIVE' }
    });

    let account = allAccounts.find((a) => {
      const aPhoneDigits = (a.phoneNumber || '').replace(/\D/g, '').slice(-10);
      const aName = (a.studentName || '').trim().toLowerCase();
      return (aPhoneDigits === cleanPhone10 || a.phoneNumber?.trim() === String(phoneNumber).trim()) && aName === cleanName;
    });

    // ── STEP 2: Fallback — search Application table by phone + name ──────────
    // Only used when no StudentAccount matched directly.
    // After finding the matching Application, resolve its StudentAccount
    // ONLY via Application.id (applicationId linkage). NEVER via USN.
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
        // Always look up by applicationId — NEVER by USN (USN may be null).
        const existingAcc = await prisma.studentAccount.findFirst({
          where: { applicationId: matchingApp.id }
        });

        if (existingAcc) {
          // Sync name/phone in case they changed, but never change the id.
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
          // No StudentAccount for this application yet — create one.
          // USN is stored as null when missing; never use empty string.
          account = await prisma.studentAccount.create({
            data: {
              usn: (matchingApp.usn && matchingApp.usn.trim() !== '') ? matchingApp.usn.trim() : null,
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

    // ── STEP 3: Fetch associated Application via applicationId ONLY ──────────
    // Do NOT fall back to USN or phone number.
    // StudentAccount.id → StudentAccount.applicationId → Application.id
    const application = account.applicationId
      ? await prisma.application.findUnique({ where: { id: account.applicationId } })
      : null;

    if (application && String(application.status).toUpperCase() === 'REJECTED') {
      return res.status(404).json({ success: false, error: 'Your application has been rejected by administration.' });
    }

    // ── STEP 4: Build JWT ────────────────────────────────────────────────────
    // StudentAccount.id is the permanent identity.
    // USN is an optional profile attribute — may be null.
    // NEVER substitute phone number or name for a missing USN.
    const studentPayload = {
      id: account.id,
      studentAccountId: account.id,
      usn: account.usn ?? null,          // null when not provided — no fallback
      studentName: account.studentName,
      phoneNumber: account.phoneNumber,
      userType: 'STUDENT'
    };

    const token = generateToken(studentPayload);

    return res.json({
      success: true,
      token,
      studentAccountId: account.id,
      usn: account.usn ?? null,
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
// Protected: requires a valid student JWT. The authenticated StudentAccount.id
// is the identity — no USN, phone number, or name is used to identify the student.
app.put('/api/student/profile', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const { newUsn, email, collegeEmail, year, yearSem } = req.body;
    const studentAccountId: string | undefined = req.user?.studentAccountId;

    if (!studentAccountId) {
      return res.status(401).json({ error: 'Authentication required. Could not determine student identity.' });
    }

    // ── Resolve the student's application via the authenticated identity chain ──
    // StudentAccount.id → StudentAccount.applicationId → Application.id
    // NEVER use USN, phone number, or name to look up the application.
    const studentAccount = await prisma.studentAccount.findUnique({
      where: { id: studentAccountId }
    });

    if (!studentAccount) {
      return res.status(404).json({ error: 'Student account not found.' });
    }

    if (!studentAccount.applicationId) {
      return res.status(404).json({ error: 'No application linked to this student account.' });
    }

    const application = await prisma.application.findUnique({
      where: { id: studentAccount.applicationId }
    });

    if (!application) {
      return res.status(404).json({ error: 'Student application not found.' });
    }

    // ── If a new USN is being set, validate it is not already taken ────────────
    const cleanNewUsn = newUsn ? String(newUsn).trim().toUpperCase() : null;
    if (cleanNewUsn && cleanNewUsn !== '') {
      // Check for USN conflict on a DIFFERENT account
      const usnConflict = await prisma.studentAccount.findFirst({
        where: {
          usn: cleanNewUsn,
          id: { not: studentAccountId }
        }
      });
      if (usnConflict) {
        return res.status(409).json({
          error: `USN ${cleanNewUsn} is already registered to another student. Do not share or transfer USNs.`
        });
      }
    }

    const updatedYear = yearSem || year;

    // ── Update Application record ─────────────────────────────────────────────
    const updatedApp = await prisma.application.update({
      where: { id: application.id },
      data: {
        ...(cleanNewUsn !== null ? { usn: cleanNewUsn || null } : {}),
        ...(email ? { email } : {}),
        ...(collegeEmail !== undefined ? { collegeEmail: collegeEmail || null } : {}),
        ...(updatedYear ? { yearSem: updatedYear, year: updatedYear } : {})
      }
    });

    // ── Sync USN on StudentAccount (USN is a display attribute, not identity) ──
    // StudentAccount.id never changes. Only the usn attribute is updated.
    if (cleanNewUsn !== null) {
      await prisma.studentAccount.update({
        where: { id: studentAccountId },
        data: { usn: cleanNewUsn || null }
      });
    }

    // Broadcast socket events so Admin Portal reflects updated student data instantly
    io.emit('data_updated', { type: 'STUDENT_PROFILE_UPDATED', id: application.id });
    io.emit('APPLICATION_UPDATED', { id: application.id });
    io.emit('STUDENT_UPDATED', { id: application.id, studentAccountId });

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

    // Normalize USN: null when not provided or when provided as '-' / empty whitespace
    const userUsn = data.usn ? String(data.usn).trim() : '';
    const normalizedUsn = (userUsn !== '' && userUsn !== '-') ? userUsn.toUpperCase() : null;

    // ── Atomically create Application + StudentAccount and link both bidirectional IDs ──
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Application
      const newApp = await tx.application.create({
        data: {
          usn: normalizedUsn,
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

      // 2. Create NEW StudentAccount linked to newApp.id
      const finalAccount = await tx.studentAccount.create({
        data: {
          usn: normalizedUsn,
          studentName: newApp.studentName,
          phoneNumber: newApp.phoneNumber,
          applicationId: newApp.id,
          status: 'ACTIVE'
        }
      });

      // 3. Update Application to set studentAccountId = finalAccount.id
      const updatedApp = await tx.application.update({
        where: { id: newApp.id },
        data: { studentAccountId: finalAccount.id }
      });

      return { app: updatedApp, account: finalAccount };
    });

    // ── Issue JWT containing the new StudentAccount.id ────────────────────────
    const studentPayload = {
      id: result.account.id,
      studentAccountId: result.account.id,
      usn: result.account.usn ?? null,
      studentName: result.account.studentName,
      phoneNumber: result.account.phoneNumber,
      userType: 'STUDENT'
    };
    const studentToken = generateToken(studentPayload);

    return res.status(201).json({
      success: true,
      application: result.app,
      studentAccountId: result.account.id,
      token: studentToken,
      studentName: result.account.studentName,
      phoneNumber: result.account.phoneNumber,
      usn: result.account.usn ?? null
    });
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

app.put('/api/applications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const application = await prisma.application.findFirst({
      where: {
        OR: [
          { id },
          ...(id && id !== '-' ? [{ studentAccountId: id }] : []),
          ...(id && id !== '-' ? [{ usn: id }] : [])
        ]
      },
      include: {
        studentAccount: true
      }
    });

    if (!application) {
      return res.status(404).json({ error: 'Student application record not found' });
    }

    const appId = application.id;

    // Normalize USN if provided
    let normalizedUsn = updateData.usn !== undefined 
      ? (updateData.usn && String(updateData.usn).trim() !== '-' && String(updateData.usn).trim() !== '' ? String(updateData.usn).trim() : null)
      : application.usn;

    const appFields: any = {};
    if (updateData.studentName !== undefined) appFields.studentName = updateData.studentName;
    if (updateData.usn !== undefined) appFields.usn = normalizedUsn;
    if (updateData.phoneNumber !== undefined) appFields.phoneNumber = updateData.phoneNumber;
    if (updateData.email !== undefined) appFields.email = updateData.email;
    if (updateData.gender !== undefined) appFields.gender = updateData.gender;
    if (updateData.dob !== undefined && updateData.dob) appFields.dob = new Date(updateData.dob);
    if (updateData.program !== undefined) appFields.program = updateData.program;
    if (updateData.semester !== undefined) appFields.semester = updateData.semester;
    if (updateData.branch !== undefined) appFields.branch = updateData.branch;
    if (updateData.department !== undefined) appFields.department = updateData.department;
    if (updateData.yearSem !== undefined) appFields.yearSem = updateData.yearSem;
    if (updateData.bloodGroup !== undefined) appFields.bloodGroup = updateData.bloodGroup;
    if (updateData.aadhaarNumber !== undefined) appFields.aadhaarNumber = updateData.aadhaarNumber;
    if (updateData.nationality !== undefined) appFields.nationality = updateData.nationality;
    if (updateData.religion !== undefined) appFields.religion = updateData.religion;
    if (updateData.permanentAddress !== undefined) appFields.permanentAddress = updateData.permanentAddress;
    if (updateData.address !== undefined) appFields.address = updateData.address;
    if (updateData.fatherName !== undefined) appFields.fatherName = updateData.fatherName;
    if (updateData.fatherOccupation !== undefined) appFields.fatherOccupation = updateData.fatherOccupation;
    if (updateData.fatherPhone !== undefined) appFields.fatherPhone = updateData.fatherPhone;
    if (updateData.fatherEmail !== undefined) appFields.fatherEmail = updateData.fatherEmail;
    if (updateData.motherName !== undefined) appFields.motherName = updateData.motherName;
    if (updateData.motherOccupation !== undefined) appFields.motherOccupation = updateData.motherOccupation;
    if (updateData.motherPhone !== undefined) appFields.motherPhone = updateData.motherPhone;
    if (updateData.motherEmail !== undefined) appFields.motherEmail = updateData.motherEmail;
    if (updateData.communicationAddress !== undefined) appFields.communicationAddress = updateData.communicationAddress;
    if (updateData.guardianName !== undefined) appFields.guardianName = updateData.guardianName;
    if (updateData.guardianRelationship !== undefined) appFields.guardianRelationship = updateData.guardianRelationship;
    if (updateData.guardianPhone !== undefined) appFields.guardianPhone = updateData.guardianPhone;
    if (updateData.guardianAddress !== undefined) appFields.guardianAddress = updateData.guardianAddress;
    if (updateData.guardianEmail !== undefined) appFields.guardianEmail = updateData.guardianEmail;
    if (updateData.healthIssues !== undefined) appFields.healthIssues = updateData.healthIssues;
    if (updateData.medicalInfo !== undefined) appFields.medicalInfo = updateData.medicalInfo;
    if (updateData.allergies !== undefined) appFields.allergies = updateData.allergies;
    if (updateData.currentMedications !== undefined) appFields.currentMedications = updateData.currentMedications;
    if (updateData.emergencyContact !== undefined) appFields.emergencyContact = updateData.emergencyContact;
    if (updateData.status !== undefined) appFields.status = updateData.status;

    const updatedApp = await prisma.application.update({
      where: { id: appId },
      data: appFields
    });

    // Sync StudentAccount if linked
    const accFields: any = {};
    if (updateData.studentName !== undefined) accFields.studentName = updateData.studentName;
    if (updateData.usn !== undefined) accFields.usn = normalizedUsn;
    if (updateData.phoneNumber !== undefined) accFields.phoneNumber = updateData.phoneNumber;

    if (Object.keys(accFields).length > 0) {
      if (application.studentAccountId) {
        await prisma.studentAccount.update({
          where: { id: application.studentAccountId },
          data: accFields
        }).catch(() => {});
      } else {
        await prisma.studentAccount.updateMany({
          where: { applicationId: appId },
          data: accFields
        }).catch(() => {});
      }
    }

    // Sync Payments if USN changed
    if (normalizedUsn && application.usn && application.usn !== normalizedUsn) {
      await prisma.payment.updateMany({
        where: { studentUsn: application.usn },
        data: { studentUsn: normalizedUsn, studentName: updateData.studentName || application.studentName }
      }).catch(() => {});
    }

    // Broadcast real-time socket events
    io.emit('data_updated', { type: 'APPLICATION_UPDATED', id: appId });
    io.emit('APPLICATION_UPDATED', { id: appId });
    io.emit('STUDENT_UPDATED', { id: appId, studentAccountId: application.studentAccountId });

    return res.json({ success: true, application: updatedApp });
  } catch (err: any) {
    console.error('Error updating student application:', err);
    return res.status(500).json({ error: err.message || 'Failed to update student application' });
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

    // Check for occupied beds before deleting
    const rooms = await prisma.room.findMany({ where: { blockId: id } });
    const roomIds = rooms.map(r => r.id);

    if (roomIds.length > 0) {
      const occupiedBeds = await prisma.bed.findMany({
        where: {
          roomId: { in: roomIds },
          status: 'OCCUPIED'
        },
        include: {
          allocation: {
            include: { application: { select: { studentName: true } } }
          }
        }
      });

      if (occupiedBeds.length > 0) {
        const names = occupiedBeds
          .map(b => b.allocation?.application?.studentName || 'Unknown')
          .slice(0, 5)
          .join(', ');
        const extra = occupiedBeds.length > 5 ? ` and ${occupiedBeds.length - 5} more` : '';
        return res.status(409).json({
          error: `Cannot delete block — ${occupiedBeds.length} bed(s) are currently occupied by students: ${names}${extra}. Please deallocate all students first before deleting this block.`
        });
      }
    }

    await prisma.bed.deleteMany({ where: { roomId: { in: roomIds } } });
    await prisma.room.deleteMany({ where: { blockId: id } });
    await prisma.block.delete({ where: { id } });

    io.emit('data_updated');
    io.emit('BED_DEALLOCATED');

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

    // Resolve studentAccountId from authenticated JWT session if present
    let resolvedAccountId: string | undefined = undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = await import('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'maskara_jwt_secret_key_2026_super_secure';
        const decoded: any = jwt.default.verify(authHeader.split(' ')[1], JWT_SECRET);
        if (decoded.userType === 'STUDENT' && decoded.studentAccountId) {
          resolvedAccountId = decoded.studentAccountId;
        }
      } catch (_) {}
    }

    const payment = await prisma.payment.create({
      data: {
        ...(resolvedAccountId ? { studentAccountId: resolvedAccountId } : {}),
        studentName: data.studentName,
        studentUsn: data.studentUsn || '',
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
    // Key existing records by studentAccountId for O(1) lookup
    const existingMap = new Map<string, any>();
    existingRecords.forEach(r => existingMap.set(r.studentAccountId, r));

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
        // studentUsn: display-only — real USN or "-", never phone/appId
        const displayUsn = (app.usn && app.usn.trim() !== '' && app.usn.trim() !== '-') ? app.usn.trim() : '-';
        // studentAccountId: the real unique identity
        const accountId = app.studentAccountId || app.id;
        const blockName = bed?.room?.block?.name || 'Main Block';
        const roomNo = bed?.room?.roomNo ? `Room ${bed.room.roomNo}` : '101';

        // Find existing record keyed by studentAccountId
        const existing = existingMap.get(accountId);

        return existing
          ? {
              ...existing,
              studentUsn: displayUsn,
              studentAccountId: accountId,
              studentName: app.studentName,
              block: blockName,
              roomNo,
              phoneNumber: app.phoneNumber,
              gender: app.gender
            }
          : {
              id: `pending-${accountId}-${targetDate}`,
              studentUsn: displayUsn,
              studentAccountId: accountId,
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
      // Must have a studentAccountId — it is the real unique identity
      const targetAccountId = rec.studentAccountId;
      if (!targetAccountId) continue;

      // studentUsn: real USN or "-" — never phone/appId
      const displayUsn = (rec.studentUsn && rec.studentUsn !== '-') ? rec.studentUsn : '-';
      const targetDate = String(rec.date || date || new Date().toISOString().split('T')[0]);

      await prisma.attendanceRecord.upsert({
        where: {
          studentAccountId_date: { studentAccountId: targetAccountId, date: targetDate }
        },
        update: {
          status: rec.status,
          remarks: rec.remarks || null,
          block: rec.block || 'Main Block',
          studentName: rec.studentName || 'Student',
          studentUsn: displayUsn
        },
        create: {
          studentAccountId: targetAccountId,
          studentUsn: displayUsn,
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

app.get('/api/attendance/student/:id', async (req, res) => {
  try {
    const rawId = decodeURIComponent(req.params.id || '').trim();

    // Find student app by studentAccountId, id, USN, or phone number
    const studentApp = await prisma.application.findFirst({
      where: {
        OR: [
          { studentAccountId: rawId },
          { id: rawId },
          { usn: rawId },
          { phoneNumber: rawId }
        ]
      }
    });

    const idSet = new Set<string>();
    if (rawId) idSet.add(rawId);
    if (studentApp?.studentAccountId) idSet.add(studentApp.studentAccountId);
    if (studentApp?.usn && studentApp.usn !== '-') idSet.add(studentApp.usn);
    if (studentApp?.phoneNumber) idSet.add(studentApp.phoneNumber);

    const records = await prisma.attendanceRecord.findMany({
      where: {
        studentUsn: { in: Array.from(idSet) }
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
app.get(['/api/student/status/:usn?', '/api/student/status'], async (req, res) => {
  try {
    let targetAccountId: string | null = null;

    // 1. Resolve student identity from Bearer token if present
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = await import('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'maskara_jwt_secret_key_2026_super_secure';
        const decoded: any = jwt.default.verify(authHeader.split(' ')[1], JWT_SECRET);
        if (decoded.userType === 'STUDENT' && decoded.studentAccountId) {
          targetAccountId = decoded.studentAccountId;
        }
      } catch (_) {}
    }

    const inputParam = (req.params.usn || '').trim();
    let application = null;

    // 2. Query application by authenticated studentAccountId (PRIMARY AUTHORITY)
    if (targetAccountId) {
      application = await prisma.application.findFirst({
        where: {
          OR: [
            { studentAccountId: targetAccountId },
            { id: targetAccountId },
            { studentAccount: { id: targetAccountId } }
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
    }

    // 3. Fallback only if no authenticated application found AND inputParam is a valid non-dash identifier
    if (!application && inputParam && inputParam !== '-' && inputParam !== 'null' && inputParam !== 'undefined') {
      application = await prisma.application.findFirst({
        where: {
          OR: [
            { studentAccountId: inputParam },
            { id: inputParam },
            { usn: inputParam }
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
    }

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

    const paymentWhere: any[] = [];
    if (application.studentAccountId) paymentWhere.push({ studentAccountId: application.studentAccountId });
    if (application.usn) paymentWhere.push({ studentUsn: application.usn });

    const payments = await prisma.payment.findMany({
      where: paymentWhere.length > 0 ? { OR: paymentWhere } : { id: 'impossible_id' },
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
    const { studentUsn, studentAccountId } = req.query;
    const where: any = {};
    if (studentAccountId) {
      where.studentAccountId = String(studentAccountId);
    } else if (studentUsn) {
      where.usn = String(studentUsn);
    }

    const leaves = await prisma.leaveApplication.findMany({ where, orderBy: { appliedAt: 'desc' } });
    res.json(leaves);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/leaves', async (req, res) => {
  try {
    const data = req.body;
    let resolvedAccountId: string | undefined = undefined;

    // Resolve studentAccountId from authenticated JWT session if present
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = await import('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'maskara_jwt_secret_key_2026_super_secure';
        const decoded: any = jwt.default.verify(authHeader.split(' ')[1], JWT_SECRET);
        if (decoded.userType === 'STUDENT' && decoded.studentAccountId) {
          resolvedAccountId = decoded.studentAccountId;
        }
      } catch (_) {}
    }

    const leave = await prisma.leaveApplication.create({
      data: {
        ...(resolvedAccountId ? { studentAccountId: resolvedAccountId } : {}),
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
    const leaveApp = await prisma.leaveApplication.findUnique({
      where: { id: req.params.id }
    });

    if (!leaveApp) {
      return res.status(404).json({ error: 'Leave application not found.' });
    }

    const newStatus = req.body.status;
    const updated = await prisma.leaveApplication.update({
      where: { id: req.params.id },
      data: { status: newStatus }
    });

    const isPermanent = String(leaveApp.leaveType || '').toUpperCase().includes('PERMANENT') || 
                        String(leaveApp.leaveType || '').toUpperCase().includes('EXIT');

    if (newStatus === 'APPROVED' && isPermanent) {
      const targetUsn = leaveApp.usn;
      const app = await prisma.application.findFirst({
        where: {
          OR: [
            ...(targetUsn && targetUsn !== '-' ? [{ usn: targetUsn }, { phoneNumber: targetUsn }] : []),
            { studentName: leaveApp.studentName }
          ]
        }
      });

      if (app) {
        // 1. Deallocate bed (set bed.status = 'AVAILABLE')
        const allocations = await prisma.allocation.findMany({
          where: { applicationId: app.id }
        });
        const bedIds = allocations.map(a => a.bedId);

        if (bedIds.length > 0) {
          await prisma.bed.updateMany({
            where: { id: { in: bedIds } },
            data: { status: 'AVAILABLE' }
          });
        }

        const studentAccountId = app.studentAccountId;

        // 2. Cascade delete all linked student records in atomic transaction
        await prisma.$transaction([
          prisma.allocation.deleteMany({ where: { applicationId: app.id } }),
          prisma.payment.deleteMany({
            where: {
              OR: [
                ...(app.usn ? [{ studentUsn: app.usn }] : []),
                ...(app.phoneNumber ? [{ studentUsn: app.phoneNumber }] : [])
              ]
            }
          }),
          prisma.complaint.deleteMany({
            where: {
              OR: [
                ...(app.studentAccountId ? [{ studentAccountId: app.studentAccountId }] : []),
                ...(app.usn ? [{ usn: app.usn }] : [])
              ]
            }
          }),
          prisma.leaveApplication.deleteMany({ where: { usn: leaveApp.usn } }),
          prisma.application.delete({ where: { id: app.id } }),
          ...(studentAccountId ? [prisma.studentAccount.delete({ where: { id: studentAccountId } })] : [])
        ]);

        // 3. Emit Socket events for real-time reflection across both portals
        io.emit('BED_DEALLOCATED');
        io.emit('STUDENT_UPDATED', { applicationId: app.id, studentAccountId });
        if (studentAccountId) {
          io.emit('student_account_deleted', { accountIds: [studentAccountId] });
        }
        io.emit('data_updated');
      }
    } else {
      io.emit('data_updated');
    }

    res.json({ success: true, leave: updated });
  } catch (err: any) {
    console.error('Leave status update error:', err);
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

// Startup Backfill Function
async function backfillApplicationStudentAccountIds() {
  try {
    // 1. For every StudentAccount with an applicationId, ensure Application.studentAccountId is set
    const accounts = await prisma.studentAccount.findMany({
      where: { applicationId: { not: null } }
    });

    for (const acc of accounts) {
      if (acc.applicationId) {
        await prisma.application.updateMany({
          where: {
            id: acc.applicationId,
            studentAccountId: null
          },
          data: { studentAccountId: acc.id }
        });
      }
    }

    // 2. For every Application with a studentAccountId, ensure StudentAccount.applicationId is set
    const apps = await prisma.application.findMany({
      where: { studentAccountId: { not: null } }
    });

    for (const app of apps) {
      if (app.studentAccountId) {
        await prisma.studentAccount.updateMany({
          where: {
            id: app.studentAccountId,
            applicationId: null
          },
          data: { applicationId: app.id }
        });
      }
    }
  } catch (err) {
    console.error('Error during studentAccountId backfill:', err);
  }
}

// Start Server
backfillApplicationStudentAccountIds().then(() => {
  server.listen(PORT, () => {
    console.log(`Common Backend server running on port ${PORT}`);
  });
});
