import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const students = [
    {
      studentName: 'Aarav Patel',
      phoneNumber: '9876543220',
      fatherName: 'Rajesh Patel',
      fatherPhone: '9876543221',
      gender: 'MALE',
      usn: '1BM21CS200',
      department: 'Computer Science',
      yearSem: '3 Year',
      dob: new Date('2003-05-15'),
      address: '123 MG Road, Bangalore',
      email: 'aarav.p@example.com',
      category: 'General',
      hostelPref: '2 Sharing',
      emergencyContact: '9876543221',
      status: 'PENDING',
    },
    {
      studentName: 'Vihaan Kumar',
      phoneNumber: '9876543230',
      fatherName: 'Sanjay Kumar',
      fatherPhone: '9876543231',
      gender: 'MALE',
      usn: '1BM21IS201',
      department: 'Information Science',
      yearSem: '2 Year',
      dob: new Date('2004-08-22'),
      address: '456 Indiranagar, Bangalore',
      email: 'vihaan.k@example.com',
      category: 'OBC',
      hostelPref: '3 Sharing',
      emergencyContact: '9876543231',
      status: 'PENDING',
    },
    {
      studentName: 'Isha Sharma',
      phoneNumber: '9876543240',
      fatherName: 'Vikram Sharma',
      fatherPhone: '9876543241',
      gender: 'FEMALE',
      usn: '1BM21EC202',
      department: 'Electronics',
      yearSem: '3 Year',
      dob: new Date('2003-11-10'),
      address: '789 Jayanagar, Bangalore',
      email: 'isha.s@example.com',
      category: 'General',
      hostelPref: '2 Sharing',
      emergencyContact: '9876543241',
      status: 'PENDING',
    },
    {
      studentName: 'Ananya Gupta',
      phoneNumber: '9876543250',
      fatherName: 'Anil Gupta',
      fatherPhone: '9876543251',
      gender: 'FEMALE',
      usn: '1BM21ME203',
      department: 'Mechanical',
      yearSem: '4 Year',
      dob: new Date('2002-02-28'),
      address: '321 Koramangala, Bangalore',
      email: 'ananya.g@example.com',
      category: 'General',
      hostelPref: '3 Sharing',
      emergencyContact: '9876543251',
      status: 'PENDING',
    },
    {
      studentName: 'Kavya Singh',
      phoneNumber: '9876543260',
      fatherName: 'Ramesh Singh',
      fatherPhone: '9876543261',
      gender: 'FEMALE',
      usn: '1BM21CS204',
      department: 'Computer Science',
      yearSem: '1 Year',
      dob: new Date('2005-06-12'),
      address: '654 HSR Layout, Bangalore',
      email: 'kavya.s@example.com',
      category: 'General',
      hostelPref: '2 Sharing',
      emergencyContact: '9876543261',
      status: 'PENDING',
    }
  ];

  for (const student of students) {
    try {
      await prisma.application.create({
        data: student
      });
      console.log(`Created application for ${student.studentName}`);
    } catch (e: any) {
      if (e.code === 'P2002') {
        console.log(`Skipped ${student.studentName} - USN already exists.`);
      } else {
        console.error(e);
      }
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
