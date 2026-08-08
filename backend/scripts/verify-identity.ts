/**
 * Identity Verification Script - Tests all 9 required test cases
 * Run: npx ts-node scripts/verify-identity.ts
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const BASE = 'http://localhost:5000';

async function post(path: string, body: object, token?: string): Promise<any> {
  const headers: Record<string,string> = {'Content-Type':'application/json'};
  if (token) headers['Authorization'] = Bearer ;
  const r = await fetch(${BASE},{method:'POST',headers,body:JSON.stringify(body)});
  return r.json();
}
async function put(path: string, body: object, token: string): Promise<any> {
  const r = await fetch(${BASE},{method:'PUT',headers:{'Content-Type':'application/json','Authorization':Bearer },body:JSON.stringify(body)});
  return r.json();
}
const PASS = (m: string) => console.log(  PASS: );
const FAIL = (m: string) => console.log(  FAIL: );
const INFO = (m: string) => console.log(  INFO: );

async function submitApp(name: string, phone: string, usn?: string): Promise<any> {
  return post('/api/applications',{studentName:name,phoneNumber:phone,usn:usn||null,gender:'Male',email:${name.replace(/ /g,'_')}@test.com,dob:'2000-01-01',fatherName:'Father',fatherPhone:'0000000000',emergencyContact:phone,department:'CSE',yearSem:'1st Sem',address:'Test',hostelPref:'Boys Hostel',status:'PENDING'});
}
async function loginStudent(name: string, phone: string): Promise<any> {
  return post('/api/student/login',{studentName:name,phoneNumber:phone});
}
async function cleanup() {
  const phones = ['9991110001','9991110002','9991110003','9991110004','9991110005','9991110006','9991110007','9991110008'];
  for (const p of phones) {
    await prisma.studentAccount.deleteMany({where:{phoneNumber:p}});
    await prisma.application.deleteMany({where:{phoneNumber:p}});
  }
}

async function main() {
  console.log('\n=== STUDENT IDENTITY VERIFICATION (9 cases) ===\n');
  await cleanup();

  // CASE 1
  console.log('CASE 1: Two NULL-USN students get separate accounts');
  const r1a = await submitApp('Test Alice','9991110001');
  const r1b = await submitApp('Test Bob','9991110002');
  if (!r1a.studentAccountId || !r1b.studentAccountId || r1a.studentAccountId===r1b.studentAccountId) FAIL('Same account or missing id');
  else PASS('Separate account IDs');
  const dbA = await prisma.studentAccount.findUnique({where:{id:r1a.studentAccountId}});
  const dbB = await prisma.studentAccount.findUnique({where:{id:r1b.studentAccountId}});
  if (dbA?.usn!==null) FAIL(Alice USN="" (should be null)); else PASS('Alice USN=null in DB');
  if (dbB?.usn!==null) FAIL(Bob USN="" (should be null)); else PASS('Bob USN=null in DB');
  const la1=await loginStudent('Test Alice','9991110001');
  const lb1=await loginStudent('Test Bob','9991110002');
  if (la1.studentAccountId!==r1a.studentAccountId) FAIL(Alice login -> wrong account); else PASS('Alice login -> Alice account');
  if (lb1.studentAccountId!==r1b.studentAccountId) FAIL(Bob login -> wrong account); else PASS('Bob login -> Bob account');
  if (la1.studentAccountId===lb1.studentAccountId) FAIL('Same login result!'); else PASS('Login results distinct');
  console.log();

  // CASE 2
  console.log('CASE 2: NULL-USN + USN student -> separate accounts');
  const r2a=await submitApp('Test Carol','9991110003');
  const r2b=await submitApp('Test Dave','9991110004','1TE24CS001');
  if (!r2a.studentAccountId||!r2b.studentAccountId||r2a.studentAccountId===r2b.studentAccountId) FAIL('Collision'); else PASS('Separate accounts');
  const dbD=await prisma.studentAccount.findUnique({where:{id:r2b.studentAccountId}});
  if (dbD?.usn==='1TE24CS001') PASS('Dave USN stored correctly'); else FAIL(Dave USN="");
  console.log();

  // CASE 3
  console.log('CASE 3: USN student + new NULL-USN student -> separate accounts');
  const r3a=await submitApp('Test Eve','9991110005','1TE24CS002');
  const r3b=await submitApp('Test Frank','9991110006');
  if (r3a.studentAccountId===r3b.studentAccountId) FAIL('Collision'); else PASS('Separate accounts');
  console.log();

  // CASE 4
  console.log('CASE 4: Same name, NULL USN, different phones -> separate accounts');
  const r4a=await submitApp('Test Grace','9991110007');
  const r4b=await submitApp('Test Grace','9991110008');
  if (r4a.studentAccountId===r4b.studentAccountId) FAIL('Collision on same-name null-USN!'); else PASS('Separate accounts');
  const lg1=await loginStudent('Test Grace','9991110007');
  const lg2=await loginStudent('Test Grace','9991110008');
  if (lg1.studentAccountId===lg2.studentAccountId) FAIL('Login collision!'); else PASS('Login routes to separate accounts');
  console.log();

  // CASE 5
  console.log('CASE 5: Two students trying same non-empty USN');
  const loginCarol=await loginStudent('Test Carol','9991110003');
  if (!loginCarol.token) { INFO('Carol login failed - skip'); }
  else {
    const res=await put('/api/student/profile',{newUsn:'1TE24CS001'},loginCarol.token);
    if (res.error&&res.error.includes('already registered')) PASS('Duplicate USN rejected'); else FAIL(Should have rejected: );
  }
  console.log();

  // CASE 6
  console.log('CASE 6: Student adds USN later via profile update');
  const loginAlice=await loginStudent('Test Alice','9991110001');
  if (!loginAlice.token) { FAIL('Alice login failed'); }
  else {
    const idBefore=loginAlice.studentAccountId;
    const res=await put('/api/student/profile',{newUsn:'1TE24CS999'},loginAlice.token);
    if (!res.success) { FAIL(Profile update failed: ); }
    else {
      const acc=await prisma.studentAccount.findUnique({where:{id:idBefore}});
      if (acc?.id!==idBefore) FAIL('StudentAccount.id changed!'); else PASS('StudentAccount.id unchanged');
      if (acc?.usn==='1TE24CS999') PASS('USN updated correctly'); else FAIL(USN="");
    }
  }
  console.log();

  // CASE 7
  console.log('CASE 7: Login still works after adding USN');
  const la7=await loginStudent('Test Alice','9991110001');
  if (!la7.token) FAIL('Alice cannot login after USN update'); else PASS('Login works');
  INFO(Alice USN in JWT: );
  console.log();

  // CASE 8
  console.log('CASE 8: Existing student profile unchanged');
  const lb8=await loginStudent('Test Bob','9991110002');
  const accB8=await prisma.studentAccount.findUnique({where:{id:lb8.studentAccountId}});
  if (accB8?.studentName==='Test Bob') PASS('Bob name unchanged'); else FAIL(Bob name="");
  if (accB8?.usn===null) PASS('Bob USN still null'); else FAIL(Bob USN="");
  console.log();

  // CASE 9
  console.log('CASE 9: New student never sees existing student data');
  const la9=await loginStudent('Test Alice','9991110001');
  const ld9=await loginStudent('Test Dave','9991110004');
  if (la9.studentAccountId===ld9.studentAccountId) FAIL('Shared account!'); else PASS('Distinct accounts');
  if (la9.studentName==='Test Alice') PASS('Alice sees own name'); else FAIL(Alice sees: );
  if (ld9.studentName==='Test Dave') PASS('Dave sees own name'); else FAIL(Dave sees: );
  console.log();

  console.log('=== Cleanup ===');
  await cleanup();
  await prisma.$disconnect();
  console.log('Done.\n');
}
main().catch(e=>{console.error(e);prisma.$disconnect();process.exit(1);});
