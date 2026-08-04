import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const departments = ['Computer Science', 'Information Science', 'Electronics', 'Mechanical', 'Civil', 'Electrical'];
  const categories = ['General', 'OBC', 'SC/ST'];
  const preferences = ['2 Sharing', '3 Sharing', '4 Sharing'];
  const genders = ['MALE', 'FEMALE'];
  
  const generateRandomStudent = (index: number) => {
    const isMale = Math.random() > 0.5;
    const gender = isMale ? 'MALE' : 'FEMALE';
    const namesM = ['Aryan', 'Rohan', 'Kabir', 'Aditya', 'Dev', 'Shaurya', 'Ayaan', 'Dhruv', 'Yash', 'Arjun', 'Pranav'];
    const namesF = ['Priya', 'Neha', 'Diya', 'Riya', 'Aanya', 'Kiara', 'Sara', 'Meera', 'Roshni', 'Tara', 'Ritu'];
    const nameList = isMale ? namesM : namesF;
    const name = `${nameList[Math.floor(Math.random() * nameList.length)]} ${Math.floor(Math.random() * 100)}`;
    
    return {
      studentName: name,
      phoneNumber: `987650${index.toString().padStart(4, '0')}`,
      fatherName: `Father of ${name}`,
      fatherPhone: `987651${index.toString().padStart(4, '0')}`,
      gender: gender,
      usn: `1BM21CS${(300 + index).toString()}`,
      department: departments[Math.floor(Math.random() * departments.length)],
      yearSem: `${Math.floor(Math.random() * 4) + 1} Year`,
      dob: new Date(`200${Math.floor(Math.random() * 5) + 1}-01-15`),
      address: `Random Address ${index}, Bangalore`,
      email: `student${index}@example.com`,
      category: categories[Math.floor(Math.random() * categories.length)],
      hostelPref: preferences[Math.floor(Math.random() * preferences.length)],
      emergencyContact: `987651${index.toString().padStart(4, '0')}`,
      status: 'PENDING',
    };
  };

  const students = Array.from({ length: 20 }, (_, i) => generateRandomStudent(i));

  for (const student of students) {
    try {
      await prisma.application.create({
        data: student
      });
      console.log(`Created application for ${student.studentName} (${student.hostelPref})`);
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
