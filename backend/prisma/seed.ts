import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const defaultAdminEmail = 'admin123@gmail.com';
  const defaultAdminPassword = 'admin123';
  const hashedPassword = await bcrypt.hash(defaultAdminPassword, 10);

  const defaultAdmin = await prisma.adminAccount.upsert({
    where: { email: defaultAdminEmail },
    update: {
      password: hashedPassword,
      name: 'Chief Administrator',
      role: 'CHIEF',
      title: 'Chief Warden / Administrator',
      allowedTabs: JSON.stringify([
        '/',
        '/applications',
        '/database',
        '/blocks',
        '/occupancy',
        '/attendance',
        '/communication',
        '/payments',
        '/student-controls',
        '/settings',
        '/admin-management'
      ]),
      allowedBlocks: JSON.stringify(['ALL']),
      status: 'ACTIVE'
    },
    create: {
      email: defaultAdminEmail,
      password: hashedPassword,
      name: 'Chief Administrator',
      role: 'CHIEF',
      title: 'Chief Warden / Administrator',
      allowedTabs: JSON.stringify([
        '/',
        '/applications',
        '/database',
        '/blocks',
        '/occupancy',
        '/attendance',
        '/communication',
        '/payments',
        '/student-controls',
        '/settings',
        '/admin-management'
      ]),
      allowedBlocks: JSON.stringify(['ALL']),
      status: 'ACTIVE'
    }
  });

  console.log('Default Chief Admin seeded:', defaultAdmin.email);

  // Initialize default chat channels if not present
  const defaultChannels = [
    { name: 'general', desc: 'General hostel discussion and announcements', iconName: 'MessageSquare' },
    { name: 'marketplace', desc: 'Buy and sell items within the hostel community', iconName: 'ShoppingBag' }
  ];

  for (const channel of defaultChannels) {
    await prisma.chatChannel.upsert({
      where: { name: channel.name },
      update: {},
      create: {
        name: channel.name,
        desc: channel.desc,
        iconName: channel.iconName
      }
    });
  }

  console.log('Default channels seeded.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
