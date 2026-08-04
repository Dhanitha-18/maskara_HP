const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const INITIAL_NOTICES = [
  {
    title: 'Revised Mess Timings & Exam Week Special Dining Schedule',
    desc: 'Mess dinner schedules have been extended by 45 minutes to facilitate student arrival during the ongoing mid-semester examinations. Special high-protein snacks will be served during evening hours at Block A cafeteria.',
    date: '18 July 2026',
    category: 'Mess Rules',
    priority: 'Urgent',
    author: 'Chief Warden Dr. R. K. Sharma',
    fileSize: '240 KB'
  },
  {
    title: 'Mandatory Biometric Access & Facial Recognition Update Notice',
    desc: 'All newly admitted residents of Block A and Block B must register their biometrics and updated emergency contacts with the Warden office by Friday. Failure to comply will restrict late-hour gate access.',
    date: '15 July 2026',
    category: 'Security',
    priority: 'High',
    author: 'Head of Hostel Security Capt. M. Singh',
    fileSize: '150 KB'
  }
];

const WEEKLY_MENU = {
  Monday: {
    Breakfast: {
      name: 'Steamed Idli & Crispy Vada',
      desc: 'Traditional South Indian steamed rice cakes and fried lentil donuts, served with fresh coconut chutney and hot sambar.',
      img: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=500&q=80',
      time: '7:30 AM - 9:00 AM',
      type: 'Veg'
    },
    Lunch: {
      name: 'Paneer Butter Masala & Chapatis',
      desc: 'Soft cottage cheese cubes in a rich tomato cream butter gravy, served with fresh hand-rolled chapatis, jeera rice, and papad.',
      img: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=500&q=80',
      time: '12:30 PM - 2:00 PM',
      type: 'Veg'
    },
    Snacks: {
      name: 'Aloo Samosa & Masala Chai',
      desc: 'Fried pastry shells with spiced potato-pea stuffings, accompanied by authentic hot ginger cardamom milk tea.',
      img: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?auto=format&fit=crop&w=500&q=80',
      time: '4:30 PM - 5:30 PM',
      type: 'Veg'
    },
    Dinner: {
      name: 'Homestyle Dal Fry & Steamed Rice',
      desc: 'Yellow lentils tempered with garlic, cumin, and ghee, served with basmati rice, curd, and seasonal vegetable dry sabzi.',
      img: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=500&q=80',
      time: '7:30 PM - 9:00 PM',
      type: 'Veg'
    }
  },
  Tuesday: {
    Breakfast: {
      name: 'Aloo Paratha & Fresh Curd',
      desc: 'Whole wheat flatbreads stuffed with spiced mashed potatoes, roasted on a griddle, served with butter and homemade yogurt.',
      img: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=500&q=80',
      time: '7:30 AM - 9:00 AM',
      type: 'Veg'
    },
    Lunch: {
      name: 'Himachali Rajma & Ghee Rice',
      desc: 'Red kidney beans slow-cooked in a tangy onion-tomato gravy, served with aromatic long-grain rice, green salad, and pickle.',
      img: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=500&q=80',
      time: '12:30 PM - 2:00 PM',
      type: 'Veg'
    },
    Snacks: {
      name: 'Onion Pakoda & Filter Coffee',
      desc: 'Crispy deep-fried sliced onions coated in seasoned chickpea batter, served with South Indian hot filter coffee.',
      img: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?auto=format&fit=crop&w=500&q=80',
      time: '4:30 PM - 5:30 PM',
      type: 'Veg'
    },
    Dinner: {
      name: 'Mixed Veg Curry & Phulkas',
      desc: 'Seasonal vegetables cooked in a blended onion gravy, served with light puff phulka flatbreads and comforting curd rice.',
      img: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=500&q=80',
      time: '7:30 PM - 9:00 PM',
      type: 'Veg'
    }
  },
  Wednesday: {
    Breakfast: {
      name: 'South Indian Rava Kitchari',
      desc: 'Roasted semolina cooked with mixed garden vegetables, mustard seeds, and cashews, served with mint chutney.',
      img: 'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?auto=format&fit=crop&w=500&q=80',
      time: '7:30 AM - 9:00 AM',
      type: 'Veg'
    },
    Lunch: {
      name: 'Chicken Korma / Veg Kofta & Rice',
      desc: 'Classic chicken drumsticks in rich cashew poppy seed gravy (or spiced vegetable dumplings for veg), served with peas pulao.',
      img: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=500&q=80',
      time: '12:30 PM - 2:00 PM',
      type: 'Veg'
    },
    Snacks: {
      name: 'Aloo Samosa & Masala Chai',
      desc: 'Fried pastry shells with spiced potato-pea stuffings, accompanied by authentic hot ginger cardamom milk tea.',
      img: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?auto=format&fit=crop&w=500&q=80',
      time: '4:30 PM - 5:30 PM',
      type: 'Veg'
    },
    Dinner: {
      name: 'Homestyle Dal Fry & Steamed Rice',
      desc: 'Yellow lentils tempered with garlic, cumin, and ghee, served with basmati rice, curd, and seasonal vegetable dry sabzi.',
      img: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=500&q=80',
      time: '7:30 PM - 9:00 PM',
      type: 'Veg'
    }
  }
};

const FULL_SEED_DATA = {
  header: {
    title: 'Mess & Dining Portal',
    subtitle: 'Hygienic, nutritionally balanced food menu & guest dining management',
    badge: 'WEF 2026 • Official Menu'
  },
  menu: WEEKLY_MENU,
  policy: {
    title: '📍 Campus Lunch & Grand Dinner Policy',
    points: [
      'Monday to Friday Lunch: Provided in the College Mess facility and for special campus events.',
      'Grand Dinners: Special grand dinners provided in the hostel mess periodically.'
    ]
  },
  supplierNotes: {
    title: '🍦 Desserts & Supplier Note',
    points: [
      'Kulfi / Cone Ice Cream: Served according to availability from verified suppliers.',
      'Tea / Coffee / Milk (TCM): Served fresh every evening during snacks slot.'
    ]
  },
  inclusions: {
    Breakfast: {
      title: '🍳 Breakfast Includes:',
      desc: 'Bread, Jam, Butter, Egg (Except Sunday), Corn Flakes, Tea, Coffee, Milk, Fruit all days. Sprouts on alternate days.'
    },
    Lunch: {
      title: '🍚 Lunch Includes:',
      desc: 'Chapati, Rice, Sambar, Dal (all days), Urid Pappad.'
    },
    Snacks: {
      title: '☕ Snacks Includes:',
      desc: 'Tea, Coffee, and Milk (TCM) on all days.'
    },
    Dinner: {
      title: '🍲 Dinner Includes:',
      desc: 'Chapati, Salad, Pickle, Curd, *Ghee all days, Rice, and Sambar (except on Saturday).'
    }
  }
};

async function main() {
  await prisma.systemSetting.upsert({
    where: { key: 'MESS_MENU' },
    update: { value: JSON.stringify(FULL_SEED_DATA) },
    create: { key: 'MESS_MENU', value: JSON.stringify(FULL_SEED_DATA) }
  });
  console.log('Mess menu seeded');

  const count = await prisma.notice.count();
  if (count === 0) {
    for (const n of INITIAL_NOTICES) {
      await prisma.notice.create({ data: n });
    }
    console.log('Notices seeded');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
