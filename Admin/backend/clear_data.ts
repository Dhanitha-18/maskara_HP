import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Clearing dummy data...');

  // Delete all allocations first (due to foreign key to Bed and Application)
  await prisma.allocation.deleteMany();
  console.log('Cleared Allocations');

  // Delete all documents related to applications
  await prisma.document.deleteMany();
  console.log('Cleared Documents');

  // Delete all applications
  await prisma.application.deleteMany();
  console.log('Cleared Applications');

  // Delete all allocation history
  await prisma.allocationHistory.deleteMany();
  console.log('Cleared Allocation History');

  // Delete all payments
  await prisma.payment.deleteMany();
  console.log('Cleared Payments');

  // Delete all feedback
  await prisma.feedback.deleteMany();
  console.log('Cleared Feedback');

  // Delete all complaints
  await prisma.complaint.deleteMany();
  console.log('Cleared Complaints');

  // Delete all leave applications
  await prisma.leaveApplication.deleteMany();
  console.log('Cleared Leave Applications');

  // Reset all beds to AVAILABLE
  await prisma.bed.updateMany({
    data: {
      status: 'AVAILABLE'
    }
  });
  console.log('Reset all beds to AVAILABLE');

  console.log('Dummy data cleared successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
