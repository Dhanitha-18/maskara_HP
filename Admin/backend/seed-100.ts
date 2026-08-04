import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

const firstNamesMale = ['Aarav', 'Vihaan', 'Vivaan', 'Ananya', 'Diya', 'Advik', 'Kabir', 'Ansh', 'Aryan', 'Dhruv', 'Ishaan', 'Rudra', 'Arjun', 'Ayaan', 'Atharv', 'Sai', 'Krishna', 'Shiva', 'Pranav', 'Rishi', 'Karan', 'Dev', 'Kunal', 'Yash', 'Rahul', 'Rohit', 'Sanjay', 'Amit', 'Anil', 'Sunil', 'Vijay', 'Ajay', 'Rajesh', 'Suresh', 'Ramesh', 'Rakesh', 'Mahesh', 'Ganesh', 'Dinesh', 'Mukesh', 'Prakash', 'Deepak', 'Manoj', 'Ashok', 'Sanjay', 'Rajiv', 'Sanjeev', 'Naveen', 'Praveen', 'Sandeep'];
const firstNamesFemale = ['Aditi', 'Aisha', 'Amrita', 'Anjali', 'Anushka', 'Anya', 'Asha', 'Avni', 'Bhavya', 'Chhavi', 'Diya', 'Divya', 'Diya', 'Esha', 'Fatima', 'Gauri', 'Geeta', 'Isha', 'Ishita', 'Jiya', 'Kajal', 'Kavya', 'Khushi', 'Kirti', 'Kriti', 'Mahi', 'Manya', 'Meera', 'Megha', 'Naina', 'Nandini', 'Neha', 'Nidhi', 'Nikita', 'Nisha', 'Palak', 'Pooja', 'Poonam', 'Prachi', 'Priya', 'Priyanka', 'Radhika', 'Riya', 'Roshni', 'Ruchi', 'Sakshi', 'Sanjana', 'Shreya', 'Shruti', 'Simran'];
const lastNames = ['Sharma', 'Singh', 'Kumar', 'Patel', 'Gupta', 'Jain', 'Shah', 'Verma', 'Yadav', 'Rao', 'Reddy', 'Chauhan', 'Thakur', 'Mishra', 'Pandey', 'Dubey', 'Tiwari', 'Shukla', 'Singh', 'Kaur', 'Das', 'Sen', 'Bose', 'Dutta', 'Banerjee', 'Chatterjee', 'Mukherjee', 'Roy', 'Nair', 'Menon', 'Pillai', 'Iyer', 'Murthy', 'Gowda', 'Desai', 'Joshi', 'Kulkarni', 'Deshpande', 'Patil', 'Pawar', 'Chavan', 'Kadam', 'Bhosale', 'Jadhav', 'More', 'Shirke', 'Surve', 'Sawant', 'Mane', 'Mohite'];

const departments = ['CSE', 'ISE', 'ECE', 'MECH', 'CIVIL', 'EEE', 'AIML', 'DS'];

async function main() {
  console.log('Clearing existing applications (excluding already allocated)...');
  await prisma.application.deleteMany({
    where: { status: 'PENDING' }
  });

  console.log('Generating 100 new student applications...');
  
  const applications = [];
  
  for (let i = 0; i < 100; i++) {
    const isMale = i % 2 === 0;
    const firstName = isMale ? firstNamesMale[Math.floor(Math.random() * firstNamesMale.length)] : firstNamesFemale[Math.floor(Math.random() * firstNamesFemale.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const usn = `1BM23${departments[Math.floor(Math.random() * departments.length)]}${String(Math.floor(Math.random() * 900) + 100)}`;
    const phone = `9${Math.floor(Math.random() * 900000000) + 100000000}`;
    
    applications.push({
      usn,
      studentName: `${firstName} ${lastName}`,
      phoneNumber: phone,
      email: `${firstName.toLowerCase()}.${usn.toLowerCase()}@example.com`,
      fatherName: `${firstNamesMale[Math.floor(Math.random() * firstNamesMale.length)]} ${lastName}`,
      fatherPhone: `9${Math.floor(Math.random() * 900000000) + 100000000}`,
      emergencyContact: `9${Math.floor(Math.random() * 900000000) + 100000000}`,
      address: `${Math.floor(Math.random() * 100)} Main St, City`,
      yearSem: String(Math.floor(Math.random() * 8) + 1),
      department: departments[Math.floor(Math.random() * departments.length)],
      hostelPref: isMale ? 'BOYS' : 'GIRLS',
      gender: isMale ? 'MALE' : 'FEMALE',
      category: ['GM', 'OBC', 'SC/ST'][Math.floor(Math.random() * 3)],
      dob: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365 * 18 - Math.floor(Math.random() * 100000000000)), // ~18-21 years old
      status: 'PENDING',
      appliedAt: new Date(Date.now() - Math.floor(Math.random() * 10000000000)), // Random past date for FCFS
    });
  }

  // Sort by appliedAt for realistic FCFS
  applications.sort((a, b) => a.appliedAt.getTime() - b.appliedAt.getTime());

  for (const app of applications) {
    await prisma.application.create({ data: app });
  }

  console.log('100 students seeded successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
