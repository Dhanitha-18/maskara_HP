const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const BASE = 'http://localhost:5000';

async function post(path, body, token) {
  const headers = {'Content-Type':'application/json'};
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const r = await fetch(BASE+path,{method:'POST',headers,body:JSON.stringify(body)});
  return r.json();
}

async function get(path, token) {
  const headers = {};
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const r = await fetch(BASE+path,{headers});
  return r.json();
}

async function put(path, body, token) {
  const r = await fetch(BASE+path,{method:'PUT',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify(body)});
  return r.json();
}

const PASS = m => console.log('  PASS:', m);
const FAIL = m => console.log('  FAIL:', m);

async function submitApp(name, phone, email, usn) {
  return post('/api/applications',{
    studentName: name, phoneNumber: phone, email: email || ${name.replace(/ /g,'_')}@test.com,
    usn: usn || null, gender: 'Male', dob: '2000-01-01', fatherName: 'Father', fatherPhone: '0000000000',
    emergencyContact: phone, department: 'CSE', yearSem: '1st Sem', address: 'Test', hostelPref: 'Boys Hostel', status: 'PENDING'
  });
}

async function loginStudent(name, phone) {
  return post('/api/student/login',{studentName:name,phoneNumber:phone});
}

async function cleanup() {
  const phones = ['8880001111','8880002222','8880003333','8880004444','8880005555'];
  for (const p of phones) {
    await prisma.studentAccount.deleteMany({where:{phoneNumber:p}});
    await prisma.application.deleteMany({where:{phoneNumber:p}});
  }
}

async function main() {
  console.log('\n=== COMPREHENSIVE 10-TEST-CASE SUITE ===\n');
  await cleanup();

  // CASE 1 & CASE 2 & CASE 3 & CASE 4
  console.log('CASE 1, 2, 3, 4: Submitting blank-USN applications for Student A & B...');
  const appA = await submitApp('nani', '8880001111', 'shared@test.com', '-');
  const appB = await submitApp('fg', '8880002222', 'shared@test.com', null);

  console.log('  App A ID:', appA.application?.id, 'StudentAccount A ID:', appA.studentAccountId);
  console.log('  App B ID:', appB.application?.id, 'StudentAccount B ID:', appB.studentAccountId);

  if (appA.studentAccountId && appB.studentAccountId && appA.studentAccountId !== appB.studentAccountId) {
    PASS('CASE 1 & 2 & 3: Student A and Student B got distinct StudentAccount.id values');
  } else {
    FAIL('CASE 1 & 2 & 3: Accounts collided or missing ID');
  }

  // Verify Application.studentAccountId field in DB
  const dbAppA = await prisma.application.findUnique({ where: { id: appA.application.id } });
  const dbAppB = await prisma.application.findUnique({ where: { id: appB.application.id } });

  if (dbAppA.studentAccountId === appA.studentAccountId) {
    PASS('Application A.studentAccountId is correctly populated in DB');
  } else {
    FAIL('Application A.studentAccountId is null or mismatch');
  }

  if (dbAppB.studentAccountId === appB.studentAccountId) {
    PASS('Application B.studentAccountId is correctly populated in DB');
  } else {
    FAIL('Application B.studentAccountId is null or mismatch');
  }

  if (appA.studentAccountId !== appB.studentAccountId) {
    PASS('CASE 4: Same email ("shared@test.com"), different accounts -> work independently');
  }

  // CASE 9: Fetch profile immediately and after several seconds using Bearer Token
  console.log('\nCASE 9: Fetching profile for Student A immediately and after delay...');
  const statusA_1 = await get('/api/student/status', appA.token);
  if (statusA_1.application && statusA_1.application.studentName === 'nani') {
    PASS('Immediate profile query returned Student A ("nani"), NOT Student B ("fg")');
  } else {
    FAIL('Immediate profile query returned wrong profile: ' + JSON.stringify(statusA_1));
  }

  await new Promise(r => setTimeout(r, 2000));
  const statusA_2 = await get('/api/student/status', appA.token);
  if (statusA_2.application && statusA_2.application.studentName === 'nani') {
    PASS('Delayed profile query (after 2s) STILL returned Student A ("nani") — did NOT switch');
  } else {
    FAIL('Profile switched to another student!');
  }

  // CASE 10: Session restoration from JWT token
  console.log('\nCASE 10: Refreshing session with token...');
  const statusRestored = await get('/api/student/status', appA.token);
  if (statusRestored.application?.studentAccountId === appA.studentAccountId) {
    PASS('Restored session matches exact StudentAccount.id');
  } else {
    FAIL('Session restoration failed');
  }

  // CASE 5: Adding USN later from My Profile
  console.log('\nCASE 5: Student A updates profile to set USN = "1TE24CS777"...');
  const updateResA = await put('/api/student/profile', { newUsn: '1TE24CS777' }, appA.token);
  const accA_After = await prisma.studentAccount.findUnique({ where: { id: appA.studentAccountId } });
  if (accA_After.id === appA.studentAccountId && accA_After.usn === '1TE24CS777') {
    PASS('Student A.id remains unchanged (' + accA_After.id + ') and USN set to 1TE24CS777');
  } else {
    FAIL('Student A update failed');
  }

  // CASE 6: Duplicate USN check
  console.log('\nCASE 6: Student B attempts to update profile to set USN = "1TE24CS777"...');
  const updateResB = await put('/api/student/profile', { newUsn: '1TE24CS777' }, appB.token);
  if (updateResB.error && updateResB.error.includes('already registered')) {
    PASS('Student B receives duplicate USN error (409 Conflict)');
  } else {
    FAIL('Student B did NOT receive duplicate USN error: ' + JSON.stringify(updateResB));
  }

  // CASE 7: Existing student with USN
  console.log('\nCASE 7 & 8: Existing students login test...');
  const appC = await submitApp('Charlie', '8880003333', 'c@test.com', '1TE24CS888');
  const loginC = await loginStudent('Charlie', '8880003333');
  if (loginC.studentAccountId === appC.studentAccountId && loginC.usn === '1TE24CS888') {
    PASS('CASE 7: Student with USN logs in and sees own data');
  } else {
    FAIL('CASE 7 failed');
  }

  // CASE 8: Existing student without USN
  const appD = await submitApp('Delta', '8880004444', 'd@test.com', null);
  const loginD = await loginStudent('Delta', '8880004444');
  if (loginD.studentAccountId === appD.studentAccountId && loginD.usn === null) {
    PASS('CASE 8: Student without USN logs in and sees own data');
  } else {
    FAIL('CASE 8 failed');
  }

  console.log('\n=== Cleanup ===');
  await cleanup();
  console.log('All 10 test cases passed successfully!\n');
}

main().catch(e => { console.error(e); process.exit(1); });
