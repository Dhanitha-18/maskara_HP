import React, { useState, useEffect } from 'react';
import { HeroBanner } from '../../components/layout/HeroBanner';
import { MESS_HERO_IMAGE } from '../../assets/heroBanners';
import { 
  Coffee, Sun, Clock, Moon, Star, ShoppingBag, 
  Utensils, CheckCircle2, Flame,
  Sandwich, Loader2
} from 'lucide-react';
import { apiRequest } from '../../services/api';
import { io } from 'socket.io-client';

interface MealDetail {
  name: string;
  desc: string;
  img: string;
  time: string;
  calories: number;
  protein: string;
  rating: number;
  ratingCount: number;
  allergens: string[];
}

interface DayMenu {
  Breakfast: MealDetail;
  Lunch?: MealDetail;
  Snacks: MealDetail;
  Dinner: MealDetail;
}

interface BookedGuestPass {
  id: string;
  mealType: string;
  count: number;
  amount: number;
  day: string;
  date: string;
  qrCode: string;
}

export const Mess: React.FC = () => {
  const [activeDay, setActiveDay] = useState<string>('Monday');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'nutrition'>('cards');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cmsData, setCmsData] = useState<any>(null);

  useEffect(() => {
    let active = true;
    const fetchMessMenu = () => {
      apiRequest('/api/settings/mess-menu', { cache: 'no-store' })
        .then(res => {
          if (active && res) {
            const data = res.menu || (res.Monday ? res : null);
            if (data) {
              setCmsData(data);
            }
          }
        })
        .catch(err => {
          console.warn('Using default mess menu layout:', err);
        });
    };

    fetchMessMenu();

    const socketUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const socket = io(socketUrl);
    socket.on('MESS_MENU_UPDATED', (updatedMenu: any) => {
      if (active && updatedMenu) {
        setCmsData(updatedMenu);
      }
    });

    return () => {
      active = false;
      socket.disconnect();
    };
  }, []);

  // Interactive Guest Pass State
  const [showGuestPassModal, setShowGuestPassModal] = useState(false);
  const [showMyPassesModal, setShowMyPassesModal] = useState(false);
  const [guestMealType, setGuestMealType] = useState('Breakfast');
  const [guestCount, setGuestCount] = useState(1);
  const [passGenerated, setPassGenerated] = useState(false);
  const [currentGeneratedPass, setCurrentGeneratedPass] = useState<BookedGuestPass | null>(null);

  // Persistent Guest Passes List
  const [guestPassList, setGuestPassList] = useState<BookedGuestPass[]>(() => {
    try {
      const saved = localStorage.getItem('mess_guest_passes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Interactive Meal Rating & Feedback Modal
  const [ratingMeal, setRatingMeal] = useState<{ title: string; day: string } | null>(null);
  const [userStars, setUserStars] = useState(5);
  const [userComment, setUserComment] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  // Meal opt-out counter (Save Food) with persistence
  const [optedOutMeals, setOptedOutMeals] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('mess_opted_out_meals');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [rebatePoints, setRebatePoints] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('mess_rebate_points');
      return saved ? JSON.parse(saved) : 240;
    } catch {
      return 240;
    }
  });

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  const defaultFallbackMenu: Record<string, any> = {
    Monday: {
      Breakfast: { name: 'Idli, Vada, Sambar, and Chutney', time: '8:00 AM - 9:30 AM', img: '/menu/1.png', desc: 'Includes Bread, Jam, Butter, Egg, Corn flakes, Tea, Coffee, Milk & Fruit' },
      Lunch: { name: 'Dum aloo & carrot palya', time: '1:00 PM - 2:30 PM', img: '/menu/2.png', desc: 'Includes Chapati, Rice, Sambar, Dal & Urid Pappad' },
      Snacks: { name: 'French fries, peri peri masala, Tomato sauce, Mayonnaise', time: '5:00 PM - 6:00 PM', img: '/menu/3.png', desc: 'Includes Tea, Coffee & Milk' },
      Dinner: { name: 'CholeMasala + Rave unde + Vangi Bath', time: '8:00 PM - 9:30 PM', img: '/menu/4.png', desc: 'Includes Chapati, Salad, Pickle, Curd, Ghee, Rice & Sambar' }
    },
    Tuesday: {
      Breakfast: { name: 'Bisibele bath and Upma with veg', time: '8:00 AM - 9:30 AM', img: '/menu/5.png', desc: 'Includes Bread, Jam, Butter, Egg, Corn flakes, Tea, Coffee, Milk & Fruit' },
      Lunch: { name: 'Mixed grain curry (lobia, green moong, brown Channa, Green peas) + beetroot palya', time: '1:00 PM - 2:30 PM', img: '/menu/6.png', desc: 'Includes Chapati, Rice, Sambar, Dal & Urid Pappad' },
      Snacks: { name: 'Maggi (TCM)', time: '5:00 PM - 6:00 PM', img: '/menu/7.png', desc: 'Includes Tea, Coffee & Milk' },
      Dinner: { name: 'Aloo Capsicum + Egg curry + Pudina Palav + Kulfi/Cone ice cream mini', time: '8:00 PM - 9:30 PM', img: '/menu/8.png', desc: 'Includes Chapati, Salad, Pickle, Curd, Ghee, Rice & Sambar' }
    },
    Wednesday: {
      Breakfast: { name: 'Set dosa Veg sagu & Chutney', time: '8:00 AM - 9:30 AM', img: '/menu/9.png', desc: 'Includes Bread, Jam, Butter, Egg, Corn flakes, Tea, Coffee, Milk & Fruit' },
      Lunch: { name: 'Black channa masala & Aloo dry (Bhujiya)', time: '1:00 PM - 2:30 PM', img: '/menu/10.png', desc: 'Includes Chapati, Rice, Sambar, Dal & Urid Pappad' },
      Snacks: { name: 'Pani Puri, mashed masala aloo, sweet water, spicy water, boondi khara', time: '5:00 PM - 6:00 PM', img: '/menu/11.png', desc: 'Includes Tea, Coffee & Milk' },
      Dinner: { name: 'Chicken chilly / Chicken curry, Chilly Paneer with Ghee Rice', time: '8:00 PM - 9:30 PM', img: '/menu/12.png', desc: 'Includes Chapati, Salad, Pickle, Curd, Ghee, Rice & Sambar' }
    },
    Thursday: {
      Breakfast: { name: 'Aloo paratha + Dahi, Plain Chutney', time: '8:00 AM - 9:30 AM', img: '/menu/13.png', desc: 'Includes Bread, Jam, Butter, Egg, Corn flakes, Tea, Coffee, Milk & Fruit' },
      Lunch: { name: 'Rajma and Jerkins kabuli channa', time: '1:00 PM - 2:30 PM', img: '/menu/14.png', desc: 'Includes Chapati, Rice, Sambar, Dal & Urid Pappad' },
      Snacks: { name: 'Vadapav', time: '5:00 PM - 6:00 PM', img: '/menu/15.png', desc: 'Includes Tea, Coffee & Milk' },
      Dinner: { name: 'Cabbage Manchurian / veg kofta gravy + roti, Peas pulav', time: '8:00 PM - 9:30 PM', img: '/menu/16.png', desc: 'Includes Chapati, Salad, Pickle, Curd, Ghee, Rice & Sambar' }
    },
    Friday: {
      Breakfast: { name: 'Bread omlette + Tomato bath', time: '8:00 AM - 9:30 AM', img: '/menu/17.png', desc: 'Includes Bread, Jam, Butter, Egg, Corn flakes, Tea, Coffee, Milk & Fruit' },
      Lunch: { name: 'Aloo Gobi & Moong', time: '1:00 PM - 2:30 PM', img: '/menu/18.png', desc: 'Includes Chapati, Rice, Sambar, Dal & Urid Pappad' },
      Snacks: { name: 'Onion Pakoda / Sweet corn', time: '5:00 PM - 6:00 PM', img: '/menu/19.png', desc: 'Includes Tea, Coffee & Milk' },
      Dinner: { name: 'Bhindi gravy + Mudde + Bassaru, Soppina palya + Custard', time: '8:00 PM - 9:30 PM', img: '/menu/20.png', desc: 'Includes Chapati, Salad, Pickle, Curd, Ghee, Rice & Sambar' }
    },
    Saturday: {
      Breakfast: { name: 'Rava Idli + Poha namkeen', time: '8:00 AM - 9:30 AM', img: '/menu/21.png', desc: 'Includes Bread, Jam, Butter, Egg, Corn flakes, Tea, Coffee, Milk & Fruit' },
      Lunch: { name: 'Mushroom pulao raitha, Paneer Butter masala, Gulab jamun', time: '1:00 PM - 2:30 PM', img: '/menu/22.png', desc: 'Includes Chapati, Rice, Sambar, Dal & Urid Pappad' },
      Snacks: { name: 'Cream Biscuit (Oreo/bourbon) + TCM', time: '5:00 PM - 6:00 PM', img: '/menu/23.png', desc: 'Includes Tea, Coffee & Milk' },
      Dinner: { name: 'Puliyogare / Chitranna + Egg burji + White rice, Puri with chole + dal', time: '8:00 PM - 9:30 PM', img: '/menu/19.png', desc: 'Includes Chapati, Salad, Pickle, Curd & Ghee' }
    },
    Sunday: {
      Breakfast: { name: 'Masala Dosa, Shenga chutney and Sambar & Aloo Palya', time: '8:00 AM - 9:30 AM', img: '/menu/20.png', desc: 'Includes Bread, Jam, Butter, Corn flakes, Tea, Coffee, Milk & Fruit' },
      Lunch: { name: 'Gobi-Manchurian (Dry) + Cone Ice cream', time: '1:00 PM - 2:30 PM', img: '/menu/21.png', desc: 'Includes Chapati, Rice, Sambar, Dal & Urid Pappad' },
      Snacks: { name: 'Fruits Seasonal & TCM', time: '5:00 PM - 6:00 PM', img: '/menu/22.png', desc: 'Includes Tea, Coffee & Milk' },
      Dinner: { name: 'Chicken Biryani + Kebab + Veg biryani & Paneer Gravy', time: '8:00 PM - 9:30 PM', img: '/menu/23.png', desc: 'Includes Chapati, Salad, Pickle, Curd, Ghee, Rice & Sambar' }
    }
  };

  const rawWeekly = (cmsData?.menu && (cmsData.menu.Monday || cmsData.menu.Tuesday)) 
    ? cmsData.menu 
    : (cmsData?.Monday ? cmsData : (cmsData?.menu?.menu || cmsData?.menu || {}));
  const weeklyMenu = (rawWeekly && Object.keys(rawWeekly).length > 0) ? rawWeekly : defaultFallbackMenu;
  const dayMenu = weeklyMenu[activeDay] || defaultFallbackMenu[activeDay] || {};

  useEffect(() => {
    try {
      localStorage.setItem('mess_opted_out_meals', JSON.stringify(optedOutMeals));
    } catch (e) {
      console.error(e);
    }
  }, [optedOutMeals]);

  useEffect(() => {
    try {
      localStorage.setItem('mess_rebate_points', JSON.stringify(rebatePoints));
    } catch (e) {
      console.error(e);
    }
  }, [rebatePoints]);

  useEffect(() => {
    try {
      localStorage.setItem('mess_guest_passes', JSON.stringify(guestPassList));
    } catch (e) {
      console.error(e);
    }
  }, [guestPassList]);

  const handleToggleOptOut = (mealKey: string) => {
    if (optedOutMeals.includes(mealKey)) {
      setOptedOutMeals(optedOutMeals.filter(m => m !== mealKey));
      setRebatePoints(prev => Math.max(0, prev - 20));
    } else {
      setOptedOutMeals([...optedOutMeals, mealKey]);
      setRebatePoints(prev => prev + 20);
    }
  };

  const handleCreateGuestPass = () => {
    const unitPrice = guestMealType === 'Breakfast' ? 60 : guestMealType === 'Snacks' ? 40 : 100;
    const total = unitPrice * guestCount;
    const passId = `GUEST-${Math.floor(10000 + Math.random() * 90000)}`;
    const newPass: BookedGuestPass = {
      id: passId,
      mealType: guestMealType,
      count: guestCount,
      amount: total,
      day: activeDay,
      date: new Date().toISOString().split('T')[0],
      qrCode: passId
    };
    setCurrentGeneratedPass(newPass);
    setGuestPassList([newPass, ...guestPassList]);
    setPassGenerated(true);
  };

  const handleCancelGuestPass = (id: string) => {
    setGuestPassList(guestPassList.filter(p => p.id !== id));
  };

  const handleSubmitRating = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackSuccess(true);
    setTimeout(() => {
      setFeedbackSuccess(false);
      setRatingMeal(null);
      setUserComment('');
    }, 1500);
  };

  const calculateTotalNutrition = () => {
    const meals = [dayMenu.Breakfast, dayMenu.Lunch, dayMenu.Snacks, dayMenu.Dinner].filter((m): m is MealDetail => Boolean(m));
    const totalCal = meals.reduce((acc, m) => acc + (m.calories || 0), 0);
    const totalProt = meals.reduce((acc, m) => acc + (m.protein ? parseInt(m.protein) || 0 : 0), 0);
    return { totalCal, totalProt };
  };

  const filterMatches = (name: string, desc: string) => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchesName = name.toLowerCase().includes(q);
      const matchesDesc = desc.toLowerCase().includes(q);
      if (!matchesName && !matchesDesc) return false;
    }
    return true;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm font-semibold text-slate-500">Loading mess menu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-center max-w-md">
          <p className="text-sm font-bold text-red-700">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { totalCal, totalProt } = calculateTotalNutrition();

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      <HeroBanner 
        image={MESS_HERO_IMAGE}
        title={cmsData?.header?.title || "Mess & Dining Portal"}
      />

      {/* Main Toolbar & View Controllers */}
      <div className="bg-white border border-border p-4 rounded-2xl shadow-soft space-y-4 overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Day Switcher */}
          <div className="flex items-center flex-wrap gap-1.5">
            {days.map(d => (
              <button
                key={d}
                onClick={() => { setActiveDay(d); setSearchTerm(''); }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold tracking-wide transition-all whitespace-nowrap ${
                  activeDay === d 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'bg-slate-50 border border-border text-slate-700 hover:bg-slate-100'
                }`}
                type="button"
              >
                {d}
              </button>
            ))}
          </div>



          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'cards' ? 'bg-white text-primary shadow-sm' : 'text-text-muted hover:text-slate-800'
              }`}
            >
              Meal Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'table' ? 'bg-white text-primary shadow-sm' : 'text-text-muted hover:text-slate-800'
              }`}
            >
              Weekly Schedule
            </button>
          </div>

        </div>

      </div>

      {/* VIEW MODE 1: Meal Cards */}
      {viewMode === 'cards' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-black text-text uppercase tracking-wider">{activeDay}'s Menu Schedule</h3>
            </div>
            <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-bold border border-slate-200">
              Showing {activeDay}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Meal Items */}
            {([
              { key: 'Breakfast', icon: Coffee, data: dayMenu.Breakfast },
              { key: 'Lunch', icon: Sun, data: dayMenu.Lunch },
              { key: 'Snacks', icon: Sandwich, data: dayMenu.Snacks },
              { key: 'Dinner', icon: Moon, data: dayMenu.Dinner },
            ] as { key: string; icon: any; data: any }[])
            .filter(item => item.data != null)
            .map(({ key, icon: MealIcon, data }) => {
              const activeData = (typeof data === 'function' ? data(dayMenu) : data);
              const isFilteredOut = !filterMatches(activeData.name, activeData.desc);

              if (isFilteredOut) return null;

              return (
                <div 
                  key={key}
                  className="bg-white border border-border rounded-2xl overflow-hidden shadow-soft flex flex-col sm:flex-row hover:border-primary/40 transition-all"
                >
                  <div className="w-full sm:w-48 h-48 shrink-0 overflow-hidden relative group bg-slate-100">
                    {activeData.img ? (
                      <img 
                        src={activeData.img.startsWith('http') || activeData.img.startsWith('data:') ? activeData.img : `http://localhost:5000${activeData.img.startsWith('/') ? '' : '/'}${activeData.img}`} 
                        alt={key} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 group-hover:scale-105 transition-transform duration-500">
                        <MealIcon className="w-12 h-12 stroke-[1.5]" />
                      </div>
                    )}
                    
                    <div className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <MealIcon className="w-3.5 h-3.5 text-warning" />
                      {key}
                    </div>
                  </div>

                  <div className="p-5 flex flex-col justify-between flex-grow space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="text-xs sm:text-sm font-black text-slate-800 leading-snug">{activeData.name}</h4>
                      </div>

                      <p className="text-[11px] text-text-muted leading-relaxed font-semibold">{activeData.desc}</p>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 gap-2">
                      <div className="flex items-center gap-1 text-[10px] text-text-muted font-bold">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        <span>{activeData.time}</span>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}

            

          </div>
        </div>
      )}

      {/* VIEW MODE 2: Weekly Schedule Table */}
      {viewMode === 'table' && (
        <div className="bg-white border border-border rounded-2xl p-6 shadow-soft overflow-x-auto">
          <div className="mb-4 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-black text-text uppercase tracking-wider">Full 7-Day BMSIT Mess Schedule Matrix</h3>
              <p className="text-[11px] text-text-muted mt-0.5 font-semibold">Overview of breakfast, lunch, tea snacks, and dinner across the week.</p>
            </div>
            <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
              BMSIT Common Menu (A & B Block)
            </span>
          </div>

          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white font-bold uppercase text-[9.5px] tracking-wider">
                <th className="p-3.5 rounded-tl-xl">Day</th>
                <th className="p-3.5">Breakfast (7:30 AM)</th>
                <th className="p-3.5">Lunch (12:30 PM)</th>
                <th className="p-3.5">Snacks (5:00 PM)</th>
                <th className="p-3.5 rounded-tr-xl">Dinner (7:30 PM)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-semibold text-slate-700">
              {days.map(d => {
                const menu = weeklyMenu[d] || { Breakfast: { name: '', desc: '', img: '', time: '' }, Snacks: { name: '', desc: '', img: '', time: '' }, Dinner: { name: '', desc: '', img: '', time: '' } };
                const isSelected = activeDay === d;
                return (
                  <tr 
                    key={d} 
                    onClick={() => setActiveDay(d)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary/5 font-bold text-primary' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="p-3.5 font-black text-slate-900 border-r border-border">{d}</td>
                    <td className="p-3.5 border-r border-border">
                      <div className="font-bold text-slate-800">{menu.Breakfast.name}</div>
                    </td>
                    <td className="p-3.5 border-r border-border">
                      {menu.Lunch ? (
                        <div className="font-bold text-slate-800">{menu.Lunch.name}</div>
                      ) : (
                        <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded-md inline-block">
                          Provided in College Mess
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 border-r border-border">
                      <div className="font-bold text-slate-800">{menu.Snacks.name}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-800">{menu.Dinner.name}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* OFFICIAL BMSIT MESS DIRECTIVES & NOTES */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-blue-950 text-white p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-700 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-200">
          <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-xl space-y-2">
            <span className="text-blue-300 font-black uppercase text-[10px] tracking-wider block">{cmsData?.policy?.title || cmsData?.policies?.title || "📍 Campus Lunch & Grand Dinner Policy"}</span>
            <ul className="space-y-1.5 text-[11px] text-slate-300 list-disc pl-4 leading-relaxed font-medium">
              {(cmsData?.policy?.points || cmsData?.policies?.points || []).map((point: string, idx: number) => (
                <li key={idx}>{point}</li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-xl space-y-2">
            <span className="text-amber-400 font-black uppercase text-[10px] tracking-wider block">{cmsData?.supplierNotes?.title || cmsData?.supplier?.title || "🍦 Desserts & Supplier Note"}</span>
            <ul className="space-y-1.5 text-[11px] text-slate-300 list-disc pl-4 leading-relaxed font-medium">
              {(cmsData?.supplierNotes?.points || cmsData?.supplier?.points || []).map((point: string, idx: number) => (
                <li key={idx}>{point}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl space-y-2 text-xs">
          <span className="text-emerald-400 font-black uppercase text-[10px] tracking-wider block">📋 Daily Meal Inclusions Chart</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[11px] text-slate-300 font-medium">
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/50">
              <strong className="text-white block mb-1">{cmsData?.inclusions?.Breakfast?.title || "🍳 Breakfast Includes:"}</strong>
              {cmsData?.inclusions?.Breakfast?.desc || "Bread, Jam, Butter, Egg (Except Sunday), Corn Flakes, Tea, Coffee, Milk, Fruit all days. Sprouts on alternate days."}
            </div>
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/50">
              <strong className="text-white block mb-1">{cmsData?.inclusions?.Lunch?.title || "🍚 Lunch Includes:"}</strong>
              {cmsData?.inclusions?.Lunch?.desc || "Chapati, Rice, Sambar, Dal (all days), Urid Pappad."}
            </div>
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/50">
              <strong className="text-white block mb-1">{cmsData?.inclusions?.Snacks?.title || "☕ Snacks Includes:"}</strong>
              {cmsData?.inclusions?.Snacks?.desc || "Tea, Coffee, and Milk (TCM) on all days."}
            </div>
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/50">
              <strong className="text-white block mb-1">{cmsData?.inclusions?.Dinner?.title || "🍲 Dinner Includes:"}</strong>
              {cmsData?.inclusions?.Dinner?.desc || "Chapati, Salad, Pickle, Curd, *Ghee all days, Rice, and Sambar (except on Saturday)."}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Guest Meal Voucher Booking */}
      {showGuestPassModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-border">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-black text-slate-900">Guest Meal Pass Booking</h3>
                <p className="text-xs text-text-muted mt-0.5 font-semibold">Instant digital pass for parents & friends visiting mess</p>
              </div>
              <button 
                onClick={() => setShowGuestPassModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {!passGenerated ? (
              <div className="space-y-4 text-xs font-semibold">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Select Meal Slot</label>
                  <select 
                    value={guestMealType}
                    onChange={e => setGuestMealType(e.target.value)}
                    className="w-full border border-border rounded-xl p-2.5 bg-white font-bold outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="Breakfast">Breakfast (₹60)</option>
                    <option value="Lunch">Lunch Special (₹100)</option>
                    <option value="Snacks">Evening Snacks (₹40)</option>
                    <option value="Dinner">Dinner (₹100)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Number of Guests</label>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                      className="w-8 h-8 rounded-lg bg-slate-100 font-black text-slate-700 flex items-center justify-center hover:bg-slate-200"
                    >
                      -
                    </button>
                    <span className="font-mono text-sm font-black text-slate-900">{guestCount}</span>
                    <button 
                      onClick={() => setGuestCount(guestCount + 1)}
                      className="w-8 h-8 rounded-lg bg-slate-100 font-black text-slate-700 flex items-center justify-center hover:bg-slate-200"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-1 font-semibold text-xs">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Pass Amount:</span>
                    <span className="font-mono font-bold">₹{(guestMealType === 'Breakfast' ? 60 : guestMealType === 'Snacks' ? 40 : 100) * guestCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Date:</span>
                    <span className="font-bold">{activeDay} Menu</span>
                  </div>
                </div>

                <button
                  onClick={handleCreateGuestPass}
                  className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-xl shadow flex items-center justify-center gap-2 transition-colors"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Generate QR Guest Pass</span>
                </button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto border border-success/20">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">Guest Pass Generated!</h4>
                  <p className="text-xs text-text-muted mt-1 font-semibold">Scan this voucher at the mess entry coupon counter.</p>
                </div>
                
                {/* Simulated QR Code */}
                <div className="bg-slate-900 text-white p-6 rounded-2xl w-48 h-48 mx-auto flex flex-col items-center justify-center space-y-2 border border-slate-800">
                  <div className="w-32 h-32 bg-white p-2 rounded-lg flex items-center justify-center text-slate-900 font-mono font-black text-[10.5px] text-center break-all">
                    {currentGeneratedPass?.id || 'GUEST-PASS'}
                  </div>
                  <span className="font-mono text-[9px] text-slate-400">VALID: {currentGeneratedPass?.day} ({currentGeneratedPass?.mealType})</span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs text-left space-y-1">
                  <div><strong>Slot:</strong> {currentGeneratedPass?.mealType} ({currentGeneratedPass?.day})</div>
                  <div><strong>Count:</strong> {currentGeneratedPass?.count} Guest(s)</div>
                  <div><strong>Total Paid:</strong> ₹{currentGeneratedPass?.amount}</div>
                </div>

                <button
                  onClick={() => setShowGuestPassModal(false)}
                  className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-xl text-xs hover:bg-slate-800 transition-colors"
                >
                  Close & Done
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* MODAL 2: Meal Review / Rating */}
      {ratingMeal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-border">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-black text-slate-900">Rate Meal: {ratingMeal.title}</h3>
                <p className="text-xs text-text-muted mt-0.5 font-semibold">Your rating helps chefs improve daily menu quality</p>
              </div>
              <button 
                onClick={() => setRatingMeal(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {feedbackSuccess ? (
              <div className="text-center py-6 space-y-2">
                <div className="w-12 h-12 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-black text-slate-900">Feedback Submitted!</h4>
                <p className="text-xs text-text-muted font-semibold">Thank you for rating today's meal.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitRating} className="space-y-4 text-xs font-semibold">
                <div className="space-y-1.5 text-center">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Your Star Rating</label>
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setUserStars(star)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star className={`w-7 h-7 ${star <= userStars ? 'fill-warning text-warning' : 'text-slate-300'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Comments / Suggestions</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Taste was great, but sambar was a little cold..."
                    value={userComment}
                    onChange={e => setUserComment(e.target.value)}
                    className="w-full border border-border rounded-xl p-3 font-semibold focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2.5 rounded-xl shadow transition-colors"
                >
                  Submit Meal Review
                </button>
              </form>
            )}

          </div>
        </div>
      )}

      {/* MODAL 3: My Booked Passes list */}
      {showMyPassesModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-border">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-black text-slate-900">My Booked Guest Passes</h3>
                <p className="text-xs text-text-muted mt-0.5 font-semibold">Active and past guest dining vouchers</p>
              </div>
              <button 
                onClick={() => setShowMyPassesModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-3 pr-1 scrollbar-thin">
              {guestPassList.length === 0 ? (
                <div className="text-center py-8 text-xs text-text-muted font-bold">
                  No guest passes booked yet.
                </div>
              ) : (
                guestPassList.map(pass => (
                  <div key={pass.id} className="bg-slate-50 border border-border p-3.5 rounded-xl flex items-center justify-between text-xs font-semibold gap-3">
                    <div className="space-y-1 text-left">
                      <div className="font-black text-slate-900">{pass.mealType} Pass ({pass.count} guests)</div>
                      <div className="text-[10px] text-text-muted">
                        Day: {pass.day} • Date: {pass.date}
                      </div>
                      <div className="font-mono text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded w-fit">
                        {pass.id}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-slate-800 font-mono">₹{pass.amount}</div>
                      <button
                        onClick={() => handleCancelGuestPass(pass.id)}
                        className="text-[10px] text-danger hover:underline mt-1 block font-black"
                      >
                        Cancel Pass
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setShowMyPassesModal(false)}
              className="w-full bg-slate-950 hover:bg-slate-900 text-white font-bold py-2.5 rounded-xl text-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
