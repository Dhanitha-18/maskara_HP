import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnose() {
  console.log('=== USN MISMATCH DIAGNOSIS ===\n');

  const studentAccounts = await prisma.studentAccount.findMany();
  console.log(`StudentAccount count: ${studentAccounts.length}`);
  console.log('StudentAccounts:');
  studentAccounts.forEach(a => {
    console.log(`  id=${a.id.slice(0,8)} | usn="${a.usn}" | name="${a.studentName}" | appId=${a.applicationId?.slice(0,8) ?? 'null'}`);
  });

  const usnCounts: Record<string, number> = {};
  studentAccounts.forEach(acc => {
    if (acc.usn && acc.usn.trim()) {
      const u = acc.usn.trim().toUpperCase();
      usnCounts[u] = (usnCounts[u] || 0) + 1;
    }
  });

  const duplicateUsns = Object.entries(usnCounts).filter(([, c]) => c > 1).map(([u]) => u);
  console.log(`\nDuplicate USNs: ${duplicateUsns.length > 0 ? duplicateUsns.join(', ') : 'None'}`);

  const nullUsnAccounts = studentAccounts.filter(a => !a.usn || !a.usn.trim());
  console.log(`StudentAccounts with null/blank USN: ${nullUsnAccounts.length}`);
  nullUsnAccounts.forEach(a => {
    console.log(`  id=${a.id.slice(0,8)} | name="${a.studentName}"`);
  });

  console.log('\n--- Complaint USNs vs StudentAccount USNs ---');
  const complaints = await prisma.complaint.findMany();
  const accountByUsn = new Map<string, string>();
  studentAccounts.forEach(a => {
    if (a.usn && usnCounts[a.usn.trim().toUpperCase()] === 1) {
      accountByUsn.set(a.usn.trim().toUpperCase(), a.id);
    }
  });

  complaints.forEach(c => {
    const u = c.usn?.trim().toUpperCase() || '';
    const found = accountByUsn.has(u);
    console.log(`  Complaint USN="${c.usn}" | match=${found ? accountByUsn.get(u)!.slice(0,8) : 'NOT FOUND'} | name="${c.studentName}"`);
  });

  console.log('\n--- Application to StudentAccount mapping ---');
  const applications = await prisma.application.findMany({ include: { studentAccount: true } });
  const accByAppId = new Map<string, string>();
  studentAccounts.forEach(a => {
    if (a.applicationId) accByAppId.set(a.applicationId, a.id);
  });

  applications.forEach(app => {
    const match = accByAppId.get(app.id);
    console.log(`  App id=${app.id.slice(0,8)} | usn="${app.usn}" | studentAccountId=${app.studentAccountId?.slice(0,8) ?? 'null'} | SA match=${match?.slice(0,8) ?? 'NONE'}`);
  });

  console.log('\n--- LeaveApplication USNs ---');
  const leaves = await prisma.leaveApplication.findMany();
  leaves.forEach(l => {
    const u = l.usn?.trim().toUpperCase() || '';
    const found = accountByUsn.has(u);
    console.log(`  Leave USN="${l.usn}" | match=${found ? 'FOUND' : 'NOT FOUND'} | studentAccountId=${l.studentAccountId?.slice(0,8) ?? 'null'}`);
  });

  await prisma.$disconnect();
}

diagnose().catch(console.error);
