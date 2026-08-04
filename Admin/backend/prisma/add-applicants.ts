import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Adding 50 more mock applications...')

  const firstNames = ['Omar', 'Lisa', 'Tom', 'Alice', 'Bruce', 'Diana', 'Clark', 'Barry', 'Arthur', 'Victor', 'Karan', 'Pooja', 'Anjali', 'Vikram'];
  const lastNames = ['Wayne', 'Kent', 'Allen', 'Curry', 'Stone', 'Prince', 'Singh', 'Kapoor', 'Mehta', 'Reddy'];
  const departments = ['CSE', 'ISE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AI', 'DS'];
  const genders = ['MALE', 'FEMALE'];

  for (let i = 1; i <= 50; i++) {
    const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const gender = genders[Math.floor(Math.random() * genders.length)];
    const dept = departments[Math.floor(Math.random() * departments.length)];
    
    const uniqueId = Math.floor(Math.random() * 10000) + i * 10000;
    
    await prisma.application.create({
      data: {
        studentName: `${fName} ${lName}`,
        phoneNumber: `9${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`,
        fatherName: `Mr. ${lName}`,
        fatherPhone: `9${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`,
        gender: gender,
        usn: `1BM21${dept.substring(0,2)}${uniqueId}`,
        department: dept,
        yearSem: `${Math.floor(Math.random() * 4) + 1} Year`,
        dob: new Date(2000 + Math.floor(Math.random() * 5), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        address: `${Math.floor(Math.random() * 999) + 1} New St, Bengaluru`,
        email: `${fName.toLowerCase()}.${lName.toLowerCase()}@bmsit.in`,
        hostelPref: '4 Sharing',
        emergencyContact: `9${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`,
        status: 'PENDING'
      }
    });
  }

  console.log('Finished adding applicants.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
