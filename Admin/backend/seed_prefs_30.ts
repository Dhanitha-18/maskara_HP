import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const departments = ['Computer Science', 'Information Science', 'Electronics', 'Mechanical', 'Civil', 'Electrical', 'Architecture', 'Biotechnology'];
  const categories = ['General', 'OBC', 'SC/ST', 'Management'];
  const preferences = ['2 Sharing', '3 Sharing', '4 Sharing'];
  
  const generateRandomStudent = (index: number) => {
    const isMale = Math.random() > 0.5;
    const gender = isMale ? 'MALE' : 'FEMALE';
    const namesM = ['Krishna', 'Siddharth', 'Nikhil', 'Ravi', 'Gaurav', 'Manish', 'Kunal', 'Ayush', 'Harsh', 'Mohit', 'Varun', 'Ritik', 'Abhinav', 'Sahil', 'Pratyush'];
    const namesF = ['Anjali', 'Simran', 'Shruti', 'Kriti', 'Pooja', 'Sneha', 'Tanya', 'Vanshika', 'Isha', 'Avni', 'Muskan', 'Nandini', 'Rhea', 'Anushka', 'Ishita'];
    const nameList = isMale ? namesM : namesF;
    const name = `${nameList[Math.floor(Math.random() * nameList.length)]} ${Math.floor(Math.random() * 1000)}`;
    
    return {
      studentName: name,
      phoneNumber: `987652${index.toString().padStart(4, '0')}`,
      fatherName: `Father of ${name}`,
      fatherPhone: `987653${index.toString().padStart(4, '0')}`,
      gender: gender,
      usn: `1BM21IS${(400 + index).toString()}`,
      department: departments[Math.floor(Math.random() * departments.length)],
      yearSem: `${Math.floor(Math.random() * 4) + 1} Year`,
      dob: new Date(`200${Math.floor(Math.random() * 5) + 1}-0${Math.floor(Math.random() * 8) + 1}-15`),
      address: `Random Block ${index}, MG Road, Bangalore`,
      email: `student_new_${index}@example.com`,
      category: categories[Math.floor(Math.random() * categories.length)],
      hostelPref: preferences[Math.floor(Math.random() * preferences.length)],
      emergencyContact: `987653${index.toString().padStart(4, '0')}`,
      status: 'PENDING',
    };
  };

  const students = Array.from({ length: 30 }, (_, i) => generateRandomStudent(i));

  for (const student of students) {
    try {
      await prisma.application.create({
        data: student
      });
      console.log(`Created application for ${student.studentName} (${student.gender}, ${student.hostelPref})`);
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
