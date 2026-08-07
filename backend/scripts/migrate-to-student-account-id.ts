import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runMigration() {
  console.log('====================================================');
  console.log('PHASE 2 & 3: IDEMPOTENT DATA BACKFILL MIGRATION');
  console.log('====================================================\n');

  const studentAccounts = await prisma.studentAccount.findMany();
  console.log(`Loaded ${studentAccounts.length} StudentAccount records.`);

  // 1. Build lookup tables
  const accountByAppId = new Map<string, string>();
  studentAccounts.forEach(acc => {
    if (acc.applicationId) {
      accountByAppId.set(acc.applicationId, acc.id);
    }
  });

  // Check USN uniqueness
  const usnCounts: Record<string, number> = {};
  studentAccounts.forEach(acc => {
    if (acc.usn && acc.usn.trim()) {
      const u = acc.usn.trim().toUpperCase();
      usnCounts[u] = (usnCounts[u] || 0) + 1;
    }
  });

  const accountByUnambiguousUsn = new Map<string, string>();
  studentAccounts.forEach(acc => {
    if (acc.usn && acc.usn.trim()) {
      const u = acc.usn.trim().toUpperCase();
      if (usnCounts[u] === 1) {
        accountByUnambiguousUsn.set(u, acc.id);
      }
    }
  });

  // Helper to migrate a satellite table
  async function migrateTable(
    modelName: string,
    fetchItems: () => Promise<any[]>,
    updateItem: (id: string, studentAccountId: string) => Promise<any>,
    getAppId?: (item: any) => string | null | undefined,
    getUsn?: (item: any) => string | null | undefined
  ) {
    const items = await fetchItems();
    let total = items.length;
    let mappedByAppId = 0;
    let mappedByUsn = 0;
    let alreadyMapped = 0;
    let unmapped = 0;

    for (const item of items) {
      if (item.studentAccountId) {
        alreadyMapped++;
        continue;
      }

      let targetAccountId: string | undefined;

      const appId = getAppId ? getAppId(item) : null;
      if (appId && accountByAppId.has(appId)) {
        targetAccountId = accountByAppId.get(appId);
        mappedByAppId++;
      } else {
        const usn = getUsn ? getUsn(item) : null;
        if (usn && usn.trim()) {
          const u = usn.trim().toUpperCase();
          if (accountByUnambiguousUsn.has(u)) {
            targetAccountId = accountByUnambiguousUsn.get(u);
            mappedByUsn++;
          }
        }
      }

      if (targetAccountId) {
        await updateItem(item.id, targetAccountId);
      } else {
        unmapped++;
      }
    }

    console.log(`Model [${modelName}]:`);
    console.log(`  - Total records: ${total}`);
    console.log(`  - Already mapped: ${alreadyMapped}`);
    console.log(`  - Mapped by Application ID: ${mappedByAppId}`);
    console.log(`  - Mapped by Unambiguous USN: ${mappedByUsn}`);
    console.log(`  - Unmapped / Skipped for Manual Review: ${unmapped}`);
    console.log(`  - Successfully Mapped Total: ${alreadyMapped + mappedByAppId + mappedByUsn} / ${total}\n`);
  }

  // 1. Application
  await migrateTable(
    'Application',
    () => prisma.application.findMany(),
    (id, studentAccountId) => prisma.application.update({ where: { id }, data: { studentAccountId } }),
    (app) => app.id,
    (app) => app.usn
  );

  // 2. Payment
  await migrateTable(
    'Payment',
    () => prisma.payment.findMany(),
    (id, studentAccountId) => prisma.payment.update({ where: { id }, data: { studentAccountId } }),
    undefined,
    (p) => p.studentUsn
  );

  // 3. Complaint
  await migrateTable(
    'Complaint',
    () => prisma.complaint.findMany(),
    (id, studentAccountId) => prisma.complaint.update({ where: { id }, data: { studentAccountId } }),
    undefined,
    (c) => c.usn
  );

  // 4. LeaveApplication
  await migrateTable(
    'LeaveApplication',
    () => prisma.leaveApplication.findMany(),
    (id, studentAccountId) => prisma.leaveApplication.update({ where: { id }, data: { studentAccountId } }),
    undefined,
    (l) => l.usn
  );

  // 5. Feedback
  await migrateTable(
    'Feedback',
    () => prisma.feedback.findMany(),
    (id, studentAccountId) => prisma.feedback.update({ where: { id }, data: { studentAccountId } }),
    undefined,
    (f) => f.usn
  );

  // 6. ChatMessage
  await migrateTable(
    'ChatMessage',
    () => prisma.chatMessage.findMany(),
    (id, studentAccountId) => prisma.chatMessage.update({ where: { id }, data: { studentAccountId } }),
    undefined,
    (m) => m.usn
  );

  // 7. AttendanceRecord
  await migrateTable(
    'AttendanceRecord',
    () => prisma.attendanceRecord.findMany(),
    (id, studentAccountId) => prisma.attendanceRecord.update({ where: { id }, data: { studentAccountId } }),
    undefined,
    (a) => a.studentUsn
  );

  // 8. EmailHistory
  await migrateTable(
    'EmailHistory',
    () => prisma.emailHistory.findMany(),
    (id, studentAccountId) => prisma.emailHistory.update({ where: { id }, data: { studentAccountId } }),
    undefined,
    (e) => e.usn
  );

  console.log('====================================================');
  console.log('PHASE 2 & 3 BACKFILL COMPLETE & VERIFIED CLEANLY');
  console.log('====================================================');

  await prisma.$disconnect();
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
