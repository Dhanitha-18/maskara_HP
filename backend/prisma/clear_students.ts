import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearStudentData() {
  console.log('🧹 Clearing all student data...');

  try {
    const historyCount = await prisma.allocationHistory.deleteMany({});
    console.log(`- Cleared ${historyCount.count} AllocationHistory records`);

    const allocCount = await prisma.allocation.deleteMany({});
    console.log(`- Cleared ${allocCount.count} Allocation records`);

    const docCount = await prisma.document.deleteMany({});
    console.log(`- Cleared ${docCount.count} Document records`);

    const appCount = await prisma.application.deleteMany({});
    console.log(`- Cleared ${appCount.count} Application records`);

    const studentCount = await prisma.studentAccount.deleteMany({});
    console.log(`- Cleared ${studentCount.count} StudentAccount records`);

    const payCount = await prisma.payment.deleteMany({});
    console.log(`- Cleared ${payCount.count} Payment records`);

    const complaintCount = await prisma.complaint.deleteMany({});
    console.log(`- Cleared ${complaintCount.count} Complaint records`);

    const feedbackCount = await prisma.feedback.deleteMany({});
    console.log(`- Cleared ${feedbackCount.count} Feedback records`);

    const leaveCount = await prisma.leaveApplication.deleteMany({});
    console.log(`- Cleared ${leaveCount.count} LeaveApplication records`);

    const attCount = await prisma.attendanceRecord.deleteMany({});
    console.log(`- Cleared ${attCount.count} AttendanceRecord records`);

    const chatCount = await prisma.chatMessage.deleteMany({});
    console.log(`- Cleared ${chatCount.count} ChatMessage records`);

    const emailHistCount = await prisma.emailHistory.deleteMany({});
    console.log(`- Cleared ${emailHistCount.count} EmailHistory records`);

    const deletedAdmins = await prisma.adminAccount.deleteMany({
      where: {
        email: { not: 'admin123@gmail.com' }
      }
    });
    console.log(`- Cleared ${deletedAdmins.count} Sub-Admin accounts (kept Chief Admin admin123@gmail.com)`);

    const resetBeds = await prisma.bed.updateMany({
      data: { status: 'AVAILABLE' }
    });
    console.log(`- Reset ${resetBeds.count} Beds to AVAILABLE status`);

    console.log('✅ All student data cleared successfully!');
  } catch (error) {
    console.error('❌ Error clearing student data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearStudentData();
