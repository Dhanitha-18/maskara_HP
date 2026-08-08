import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Save, Utensils, Loader2, Upload, Trash2, Plus, 
  ArrowUp, ArrowDown, X, Edit, Edit3, Image, 
  Coffee, Sun, Clock, Moon, Star, Sandwich, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../lib/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEALS = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];
const MESS_HERO_IMAGE = "/banners/mess-hero.png";

export default function MessMenuControl() {
  const queryClient = useQueryClient();
  const [activeDay, setActiveDay] = useState('Monday');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  
  // Local editable state
  const [cmsData, setCmsData] = useState<any>(null);

  // Inline editing targets
  const [editingHeader, setEditingHeader] = useState(false);
  const [headerTitle, setHeaderTitle] = useState('');
  const [headerSubtitle, setHeaderSubtitle] = useState('');
  const [headerBadge, setHeaderBadge] = useState('');

  const [editingMealKey, setEditingMealKey] = useState<string | null>(null);
  const [mealName, setMealName] = useState('');
  const [mealDesc, setMealDesc] = useState('');
  const [mealTime, setMealTime] = useState('');

  const [editingPolicy, setEditingPolicy] = useState(false);
  const [policyTitle, setPolicyTitle] = useState('');
  const [policyPoints, setPolicyPoints] = useState<string[]>([]);

  const [editingSupplier, setEditingSupplier] = useState(false);
  const [supplierTitle, setSupplierTitle] = useState('');
  const [supplierPoints, setSupplierPoints] = useState<string[]>([]);

  const [editingInclusionKey, setEditingInclusionKey] = useState<string | null>(null);
  const [inclusionTitle, setInclusionTitle] = useState('');
  const [inclusionDesc, setInclusionDesc] = useState('');

  // Table-view cell inline editing
  const [editingTableCell, setEditingTableCell] = useState<{ day: string; meal: string } | null>(null);
  const [tableMealName, setTableMealName] = useState('');

  const { data: serverData, isLoading } = useQuery({
    queryKey: ['mess-menu'],
    queryFn: async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/settings/mess-menu`, { cache: 'no-store' });
        if (!res.ok) return null;
        const data = await res.json();
        return data?.menu || data || null;
      } catch (e) {
        return null;
      }
    }
  });

  // Load data into local state with default fallbacks
  useEffect(() => {
    const defaultStructure = {
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
    setCmsData(serverData || defaultStructure);
  }, [serverData]);

  const mutation = useMutation({
    mutationFn: async (updatedCMS: any) => {
      const res = await fetch(`${API_BASE_URL}/api/settings/mess-menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menu: updatedCMS })
      });
      if (!res.ok) throw new Error('Failed to save menu');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mess-menu'] });
      toast.success('Mess CMS saved and synchronized successfully!');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update Mess CMS')
  });

  const handleGlobalSave = () => {
    if (!cmsData) return;
    mutation.mutate(cmsData);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, mealKey: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);

    const toastId = toast.loading('Uploading meal image...');
    try {
      const res = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      
      const rawUrl = data.url || data.imageUrl || data.fileUrl || '';
      const uploadedUrl = rawUrl.startsWith('http') || rawUrl.startsWith('data:') ? rawUrl : `${API_BASE_URL}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
      
      const copy = JSON.parse(JSON.stringify(cmsData || {}));
      const weekly = copy.menu && typeof copy.menu === 'object' ? copy.menu : copy;
      if (!weekly[activeDay]) weekly[activeDay] = {};
      if (!weekly[activeDay][mealKey]) weekly[activeDay][mealKey] = {};
      weekly[activeDay][mealKey].img = uploadedUrl;

      setCmsData(copy);
      mutation.mutate(copy);
      toast.success('Image uploaded and synced live to Student Portal!', { id: toastId });
    } catch (error: any) {
      toast.error(error.message || 'Upload failed', { id: toastId });
    }
  };

  const handleImageDelete = (mealKey: string) => {
    const copy = JSON.parse(JSON.stringify(cmsData || {}));
    const weekly = copy.menu && typeof copy.menu === 'object' ? copy.menu : copy;
    if (weekly[activeDay] && weekly[activeDay][mealKey]) {
      weekly[activeDay][mealKey].img = '';
    }
    setCmsData(copy);
    mutation.mutate(copy);
    toast.success('Image deleted and synced live to Student Portal!');
  };

  // Header Editors
  const startEditHeader = () => {
    if (!cmsData) return;
    setHeaderTitle(cmsData.header?.title || '');
    setHeaderSubtitle(cmsData.header?.subtitle || '');
    setHeaderBadge(cmsData.header?.badge || '');
    setEditingHeader(true);
  };

  const saveHeader = () => {
    const copy = {
      ...cmsData,
      header: { title: headerTitle, subtitle: headerSubtitle, badge: headerBadge }
    };
    setCmsData(copy);
    mutation.mutate(copy);
    setEditingHeader(false);
    toast.success('Header details updated and saved to server.');
  };

  // Meal Editors
  const startEditMeal = (key: string, data: any) => {
    setMealName(data.name || '');
    setMealDesc(data.desc || '');
    setMealTime(data.time || '');
    setEditingMealKey(key);
  };

  const saveMeal = (key: string) => {
    const copy = JSON.parse(JSON.stringify(cmsData || {}));
    const weekly = copy.menu && typeof copy.menu === 'object' ? copy.menu : copy;
    if (!weekly[activeDay]) weekly[activeDay] = {};
    weekly[activeDay][key] = {
      ...weekly[activeDay][key],
      name: mealName,
      desc: mealDesc,
      time: mealTime
    };
    setCmsData(copy);
    mutation.mutate(copy);
    setEditingMealKey(null);
    toast.success(`${key} card updated and saved to server.`);
  };

  const deleteMeal = (key: string) => {
    if (confirm(`Are you sure you want to delete ${key} from ${activeDay}'s menu?`)) {
      const copy = JSON.parse(JSON.stringify(cmsData || {}));
      const weekly = copy.menu && typeof copy.menu === 'object' ? copy.menu : copy;
      if (weekly[activeDay]) {
        delete weekly[activeDay][key];
      }
      setCmsData(copy);
      mutation.mutate(copy);
      toast.success(`${key} deleted from ${activeDay} and saved to server.`);
    }
  };

  const addMealSlot = (key: string) => {
    const copy = JSON.parse(JSON.stringify(cmsData || {}));
    const weekly = copy.menu && typeof copy.menu === 'object' ? copy.menu : copy;
    if (!weekly[activeDay]) weekly[activeDay] = {};
    weekly[activeDay][key] = {
      name: `New ${key} Dish`,
      desc: 'New meal description...',
      time: key === 'Breakfast' ? '7:30 AM - 9:00 AM' : key === 'Lunch' ? '12:30 PM - 2:00 PM' : key === 'Snacks' ? '5:00 PM - 6:00 PM' : '7:30 PM - 9:00 PM',
      img: '',
      type: 'Veg'
    };
    setCmsData(copy);
    mutation.mutate(copy);
    toast.success(`${key} slot added to ${activeDay} and saved to server.`);
  };

  // Policies / Guidelines
  const startEditPolicy = () => {
    if (!cmsData) return;
    setPolicyTitle(cmsData.policy?.title || cmsData.policies?.title || '');
    setPolicyPoints(cmsData.policy?.points || cmsData.policies?.points || []);
    setEditingPolicy(true);
  };

  const savePolicy = () => {
    const policyObj = { title: policyTitle, points: policyPoints };
    const copy = {
      ...cmsData,
      policy: policyObj,
      policies: policyObj
    };
    setCmsData(copy);
    mutation.mutate(copy);
    setEditingPolicy(false);
    toast.success('Dining policies updated and saved to server.');
  };

  // Supplier info
  const startEditSupplier = () => {
    if (!cmsData) return;
    setSupplierTitle(cmsData.supplierNotes?.title || cmsData.supplier?.title || '');
    setSupplierPoints(cmsData.supplierNotes?.points || cmsData.supplier?.points || []);
    setEditingSupplier(true);
  };

  const saveSupplier = () => {
    const supplierObj = { title: supplierTitle, points: supplierPoints };
    const copy = {
      ...cmsData,
      supplier: supplierObj,
      supplierNotes: supplierObj
    };
    setCmsData(copy);
    mutation.mutate(copy);
    setEditingSupplier(false);
    toast.success('Supplier information updated and saved to server.');
  };

  // Inclusions
  const startEditInclusion = (key: string, data: any) => {
    setInclusionTitle(data.title || '');
    setInclusionDesc(data.desc || '');
    setEditingInclusionKey(key);
  };

  const saveInclusion = (key: string) => {
    const copy = JSON.parse(JSON.stringify(cmsData || {}));
    if (!copy.inclusions) copy.inclusions = {};
    copy.inclusions[key] = { title: inclusionTitle, desc: inclusionDesc };
    setCmsData(copy);
    mutation.mutate(copy);
    setEditingInclusionKey(null);
    toast.success('Service inclusion updated and saved to server.');
  };

  // Table-view cell editing
  const startEditTableCell = (day: string, meal: string, currentName: string) => {
    setEditingTableCell({ day, meal });
    setTableMealName(currentName);
  };

  const saveTableCell = () => {
    if (!editingTableCell) return;
    const { day, meal } = editingTableCell;
    const copy = JSON.parse(JSON.stringify(cmsData || {}));
    const weekly = copy.menu && typeof copy.menu === 'object' ? copy.menu : copy;
    if (!weekly[day]) weekly[day] = {};
    if (!weekly[day][meal]) {
      weekly[day][meal] = {
        name: '',
        desc: 'Meal configured via weekly grid view.',
        time: meal === 'Breakfast' ? '7:30 AM - 9:00 AM' : meal === 'Lunch' ? '12:30 PM - 2:00 PM' : meal === 'Snacks' ? '5:00 PM - 6:00 PM' : '7:30 PM - 9:00 PM',
        img: '',
        type: 'Veg'
      };
    }
    weekly[day][meal].name = tableMealName;
    setCmsData(copy);
    mutation.mutate(copy);
    setEditingTableCell(null);
    toast.success(`Grid schedule cell updated and saved to server.`);
  };

  const getMealIcon = (key: string) => {
    switch (key) {
      case 'Breakfast': return Coffee;
      case 'Lunch': return Sun;
      case 'Snacks': return Sandwich;
      case 'Dinner': return Moon;
      default: return Utensils;
    }
  };

  if (isLoading || !cmsData) {
    return <div className="p-12 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>;
  }

  const weeklyMenu = cmsData?.menu || cmsData || {};
  const dayMenu = weeklyMenu[activeDay] || {};

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16 relative">
      {/* Top CMS Banner Controls */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between gap-4 text-white shadow-lg sticky top-0 z-30 backdrop-blur-md bg-opacity-95">
        <div>
          <h2 className="text-base font-black uppercase tracking-wider text-indigo-400 flex items-center gap-2">
            <Utensils className="w-5 h-5 text-indigo-500" />
            Mess & Dining Portal CMS
          </h2>
          <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
            Synchronize and edit real-time dining data for the Student Portal.
          </p>
        </div>
        {mutation.isPending && (
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Saving changes...</span>
          </div>
        )}
      </div>



      {/* Main Toolbar & View Controllers */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-4 overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Day Switcher */}
          <div className="flex items-center flex-wrap gap-1.5">
            {DAYS.map(d => (
              <button
                key={d}
                onClick={() => { setActiveDay(d); setSearchTerm(''); }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold tracking-wide transition-all whitespace-nowrap cursor-pointer ${
                  activeDay === d 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {d}
              </button>
            ))}
          </div>



          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'cards' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Meal Cards CMS
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Weekly Schedule Grid
            </button>
          </div>

        </div>
      </div>

      {/* VIEW MODE 1: Meal Cards CMS */}
      {viewMode === 'cards' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">{activeDay}'s Menu Cards Config</h3>
              <p className="text-[11px] text-slate-400 mt-0.5 font-semibold">Click edit on cards to upload photos, adjust timing, and customize meal plans.</p>
            </div>
            <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-bold border border-slate-200">
              Editing: {activeDay}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Meal Items */}
            {MEALS.map(key => {
              const data = dayMenu[key];
              const MealIcon = getMealIcon(key);

              if (!data) {
                // Render placeholder "Add Slot" card
                return (
                  <div key={key} className="bg-white border border-dashed border-slate-300 rounded-2xl overflow-hidden shadow-sm flex flex-col items-center justify-center p-8 text-center hover:bg-slate-50 transition-colors">
                    <MealIcon className="w-8 h-8 text-slate-400 mb-2 opacity-50" />
                    <h4 className="text-sm font-bold text-slate-500 mb-1">{key} Slot Available</h4>
                    <p className="text-[10px] text-slate-400 mb-4 max-w-[200px]">Add this meal to {activeDay}'s schedule.</p>
                    <button
                      onClick={() => addMealSlot(key)}
                      className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-100 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add {key}
                    </button>
                  </div>
                );
              }

              const isFilteredOut = searchTerm.trim() && 
                !data.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
                !data.desc.toLowerCase().includes(searchTerm.toLowerCase());

              if (isFilteredOut) return null;

              const isEditing = editingMealKey === key;

              return (
                <div 
                  key={key}
                  className={`bg-white border rounded-2xl overflow-hidden shadow-sm flex flex-col sm:flex-row hover:border-indigo-600/40 transition-all ${
                    isEditing ? 'ring-2 ring-indigo-500' : 'border-slate-200'
                  }`}
                >
                  {/* Image Block */}
                  <div className="w-full sm:w-48 h-48 shrink-0 overflow-hidden relative group bg-slate-100">
                    {data.img ? (
                      <>
                        <img src={data.img} alt={key} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        
                        {/* Image Controls Overlay */}
                        <div className="absolute inset-0 bg-slate-900/75 flex flex-col justify-center items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <label className="cursor-pointer bg-white text-slate-800 text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-slate-100 transition-colors">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Replace</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => handleImageUpload(e, key)}
                            />
                          </label>
                          <button
                            onClick={() => handleImageDelete(key)}
                            className="bg-red-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-red-700 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      </>
                    ) : (
                      <label className="w-full h-full flex flex-col items-center justify-center text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100/70 border-2 border-dashed border-indigo-200 cursor-pointer transition-colors p-4 text-center">
                        <Plus className="w-6 h-6 stroke-[2] mb-1 text-indigo-500" />
                        <span className="text-[10px] font-black uppercase tracking-wider">
                          + Add {key} Menu
                        </span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => handleImageUpload(e, key)}
                        />
                      </label>
                    )}
                    
                    <div className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <MealIcon className="w-3.5 h-3.5 text-warning" />
                      {key}
                    </div>
                  </div>

                  {/* Card Content & Inputs */}
                  <div className="p-4 flex flex-col justify-between flex-grow space-y-3 text-xs">
                    {!isEditing ? (
                      <div className="space-y-1.5 flex-grow">
                        <h4 className="font-black text-slate-800 leading-snug">{data.name}</h4>
                        <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">{data.desc}</p>
                      </div>
                    ) : (
                      <div className="space-y-2 flex-grow">
                        <div>
                          <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">Meal Title</label>
                          <input 
                            type="text" 
                            value={mealName}
                            onChange={e => setMealName(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded p-1 text-slate-800 font-bold outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">Description</label>
                          <textarea 
                            value={mealDesc}
                            onChange={e => setMealDesc(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded p-1 text-slate-800 text-[10px] leading-relaxed outline-none h-12"
                          />
                        </div>
                      </div>
                    )}

                    {/* Card Footer actions */}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-2 gap-2">
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold">
                        <Clock className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                        {!isEditing ? (
                          <span>{data.time}</span>
                        ) : (
                          <input 
                            type="text" 
                            value={mealTime}
                            onChange={e => setMealTime(e.target.value)}
                            className="bg-slate-50 border border-slate-300 rounded px-1 py-0.5 outline-none w-32"
                            placeholder="e.g. 7:30 AM - 9:00 AM"
                          />
                        )}
                      </div>

                      {/* Card Edit Mode buttons */}
                      <div className="flex items-center gap-1.5">
                        {!isEditing ? (
                          <>
                            <button
                              onClick={() => startEditMeal(key, data)}
                              className="text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md cursor-pointer transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteMeal(key)}
                              className="text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-md cursor-pointer transition-colors"
                            >
                              Delete
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setEditingMealKey(null)}
                              className="text-[10px] font-bold text-slate-500 hover:underline px-2"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => saveMeal(key)}
                              className="text-[10px] font-bold bg-indigo-600 text-white px-2.5 py-1 rounded-md hover:bg-indigo-700 transition shadow"
                            >
                              Save
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}

          </div>
        </div>
      )}

      {/* VIEW MODE 2: Weekly Schedule Grid CMS */}
      {viewMode === 'table' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm overflow-x-auto space-y-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Weekly Schedule Matrix Editor</h3>
            <p className="text-[11px] text-slate-400 mt-0.5 font-semibold">
              Click on any table cell to quickly update the meal name inline.
            </p>
          </div>

          <table className="w-full text-left border-collapse text-xs border border-slate-200 rounded-xl">
            <thead>
              <tr className="bg-slate-950 text-white font-bold uppercase text-[9px] tracking-wider">
                <th className="p-3.5 border border-slate-800">Day</th>
                <th className="p-3.5 border border-slate-800">Breakfast</th>
                <th className="p-3.5 border border-slate-800">Lunch</th>
                <th className="p-3.5 border border-slate-800">Snacks</th>
                <th className="p-3.5 border border-slate-800">Dinner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-semibold text-slate-700">
              {DAYS.map(day => {
                const menu = weeklyMenu[day] || {};
                const isDaySelected = activeDay === day;
                
                return (
                  <tr 
                    key={day} 
                    className={`transition-colors ${isDaySelected ? 'bg-slate-50' : 'hover:bg-slate-50/50'}`}
                  >
                    <td className="p-3.5 font-black text-slate-900 border border-slate-200 bg-slate-50">{day}</td>
                    
                    {MEALS.map(meal => {
                      const mealObj = menu[meal];
                      const isCellEditing = editingTableCell?.day === day && editingTableCell?.meal === meal;
                      
                      return (
                        <td 
                          key={meal} 
                          onClick={() => {
                            if (!isCellEditing) startEditTableCell(day, meal, mealObj?.name || '');
                          }}
                          className={`p-3.5 border border-slate-200 transition-all ${
                            isCellEditing ? 'bg-indigo-50/50 outline outline-2 outline-indigo-500' : 'cursor-pointer'
                          }`}
                        >
                          {!isCellEditing ? (
                            mealObj ? (
                              <div className="space-y-0.5">
                                <div className="font-bold text-slate-800 hover:text-indigo-600 transition-colors">{mealObj.name || <span className="italic text-slate-400">Empty Dish Name</span>}</div>
                                <div className="text-[9px] text-slate-400 font-bold">{mealObj.time}</div>
                              </div>
                            ) : (
                              <span className="text-[9px] font-extrabold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md inline-block">
                                College Mess (No Card)
                              </span>
                            )
                          ) : (
                            <div className="space-y-2" onClick={e => e.stopPropagation()}>
                              <input 
                                type="text"
                                value={tableMealName}
                                onChange={e => setTableMealName(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded p-1 text-xs outline-none"
                                autoFocus
                              />
                              <div className="flex gap-1.5 justify-end">
                                <button 
                                  onClick={() => setEditingTableCell(null)}
                                  className="text-[9px] font-bold text-slate-500 px-2 py-0.5 rounded hover:bg-slate-100"
                                >
                                  Cancel
                                </button>
                                <button 
                                  onClick={saveTableCell}
                                  className="text-[9px] font-bold bg-indigo-600 text-white px-2.5 py-0.5 rounded hover:bg-indigo-700"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Official Guidelines & Policies CMS */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-blue-950 text-white p-6 sm:p-8 rounded-3xl shadow-lg border border-slate-800 space-y-6">
        
        {/* Header Config */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold">
              <Utensils className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h4 className="text-sm font-black tracking-wide text-white uppercase">
                Provisions & Guidelines Configuration
              </h4>
              <p className="text-[11px] text-slate-400 font-medium">Customize rules and dessert policies.</p>
            </div>
          </div>
        </div>

        {/* Guidelines Bullet point managers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-semibold text-slate-200">
          
          {/* Policy manager */}
          <div className="bg-slate-800/60 border border-slate-700/50 p-5 rounded-2xl space-y-3 relative group">
            {!editingPolicy ? (
              <>
                <span className="text-indigo-300 font-black uppercase text-[10px] tracking-wider block">
                  {cmsData.policy?.title || cmsData.policies?.title || '📍 Campus Lunch & Grand Dinner Policy'}
                </span>
                <ul className="space-y-2 text-[11px] text-slate-300 list-disc pl-4 leading-relaxed font-semibold">
                  {(cmsData.policy?.points || cmsData.policies?.points || []).map((point: string, idx: number) => (
                    <li key={idx}>{point}</li>
                  ))}
                </ul>
                <button
                  onClick={startEditPolicy}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 bg-slate-700 hover:bg-slate-600 text-white p-1.5 rounded-lg transition-all cursor-pointer"
                  title="Edit Policies"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[9px] uppercase text-slate-400 font-bold mb-1">Policy Title</label>
                  <input 
                    type="text" 
                    value={policyTitle} 
                    onChange={e => setPolicyTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded p-1.5 font-bold outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[9px] uppercase text-slate-400 font-bold">Policy Bullet Points</label>
                  {policyPoints.map((point, index) => (
                    <div key={index} className="flex gap-1.5 items-center">
                      <input 
                        type="text" 
                        value={point} 
                        onChange={e => {
                          const copy = [...policyPoints];
                          copy[index] = e.target.value;
                          setPolicyPoints(copy);
                        }}
                        className="flex-1 bg-slate-900 border border-slate-700 text-white rounded p-1 text-[11px] outline-none"
                      />
                      <button 
                        onClick={() => {
                          if (index === 0) return;
                          const copy = [...policyPoints];
                          const tmp = copy[index - 1];
                          copy[index - 1] = copy[index];
                          copy[index] = tmp;
                          setPolicyPoints(copy);
                        }}
                        className="p-1 hover:bg-slate-700 rounded text-slate-300"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={() => {
                          if (index === policyPoints.length - 1) return;
                          const copy = [...policyPoints];
                          const tmp = copy[index + 1];
                          copy[index + 1] = copy[index];
                          copy[index] = tmp;
                          setPolicyPoints(copy);
                        }}
                        className="p-1 hover:bg-slate-700 rounded text-slate-300"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={() => setPolicyPoints(policyPoints.filter((_, i) => i !== index))}
                        className="p-1 hover:bg-red-950 text-red-400 rounded"
                        title="Delete Point"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={() => setPolicyPoints([...policyPoints, 'New policy point...'])}
                    className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 pt-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Point
                  </button>
                </div>
                <div className="flex gap-2 justify-end pt-2 border-t border-slate-700">
                  <button onClick={() => setEditingPolicy(false)} className="px-2.5 py-1 bg-slate-700 text-slate-300 font-bold rounded">Cancel</button>
                  <button onClick={savePolicy} className="px-2.5 py-1 bg-indigo-600 text-white font-bold rounded">Apply</button>
                </div>
              </div>
            )}
          </div>

          {/* Supplier Notes manager */}
          <div className="bg-slate-800/60 border border-slate-700/50 p-5 rounded-2xl space-y-3 relative group">
            {!editingSupplier ? (
              <>
                <span className="text-amber-400 font-black uppercase text-[10px] tracking-wider block">
                  {cmsData.supplierNotes?.title || cmsData.supplier?.title || '🍦 Desserts & Supplier Note'}
                </span>
                <ul className="space-y-2 text-[11px] text-slate-300 list-disc pl-4 leading-relaxed font-semibold">
                  {(cmsData.supplierNotes?.points || cmsData.supplier?.points || []).map((point: string, idx: number) => (
                    <li key={idx}>{point}</li>
                  ))}
                </ul>
                <button
                  onClick={startEditSupplier}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 bg-slate-700 hover:bg-slate-600 text-white p-1.5 rounded-lg transition-all cursor-pointer"
                  title="Edit Notes"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[9px] uppercase text-slate-400 font-bold mb-1">Notes Title</label>
                  <input 
                    type="text" 
                    value={supplierTitle} 
                    onChange={e => setSupplierTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded p-1.5 font-bold outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[9px] uppercase text-slate-400 font-bold">Notes Bullet Points</label>
                  {supplierPoints.map((point, index) => (
                    <div key={index} className="flex gap-1.5 items-center">
                      <input 
                        type="text" 
                        value={point} 
                        onChange={e => {
                          const copy = [...supplierPoints];
                          copy[index] = e.target.value;
                          setSupplierPoints(copy);
                        }}
                        className="flex-1 bg-slate-900 border border-slate-700 text-white rounded p-1 text-[11px] outline-none"
                      />
                      <button 
                        onClick={() => {
                          if (index === 0) return;
                          const copy = [...supplierPoints];
                          const tmp = copy[index - 1];
                          copy[index - 1] = copy[index];
                          copy[index] = tmp;
                          setSupplierPoints(copy);
                        }}
                        className="p-1 hover:bg-slate-700 rounded text-slate-300"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={() => {
                          if (index === supplierPoints.length - 1) return;
                          const copy = [...supplierPoints];
                          const tmp = copy[index + 1];
                          copy[index + 1] = copy[index];
                          copy[index] = tmp;
                          setSupplierPoints(copy);
                        }}
                        className="p-1 hover:bg-slate-700 rounded text-slate-300"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={() => setSupplierPoints(supplierPoints.filter((_, i) => i !== index))}
                        className="p-1 hover:bg-red-950 text-red-400 rounded"
                        title="Delete Point"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={() => setSupplierPoints([...supplierPoints, 'New supplier note...'])}
                    className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 pt-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Point
                  </button>
                </div>
                <div className="flex gap-2 justify-end pt-2 border-t border-slate-700">
                  <button onClick={() => setEditingSupplier(false)} className="px-2.5 py-1 bg-slate-700 text-slate-300 font-bold rounded">Cancel</button>
                  <button onClick={saveSupplier} className="px-2.5 py-1 bg-indigo-600 text-white font-bold rounded">Apply</button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Inclusion cards CMS */}
        <div className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-2xl space-y-3">
          <span className="text-emerald-400 font-black uppercase text-[10px] tracking-wider block">
            📋 Daily Meal Inclusions Chart configuration
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-[11.5px] text-slate-300 font-semibold">
            {MEALS.map(key => {
              const inclObj = cmsData.inclusions?.[key] || { title: `${key} Includes:`, desc: '' };
              const isInclEditing = editingInclusionKey === key;

              return (
                <div 
                  key={key} 
                  className={`bg-slate-900/60 p-4 rounded-xl border relative group transition-all ${
                    isInclEditing ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-700/60'
                  }`}
                >
                  {!isInclEditing ? (
                    <>
                      <strong className="text-white block mb-1">{inclObj.title}</strong>
                      <p className="leading-relaxed text-[10.5px] text-slate-400 font-medium">{inclObj.desc || <span className="italic">No inclusion description. Click edit to configure.</span>}</p>
                      <button
                        onClick={() => startEditInclusion(key, inclObj)}
                        className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 bg-slate-800 text-slate-300 p-1 rounded hover:bg-slate-700 transition"
                        title="Edit Inclusions"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[8px] uppercase text-slate-400 font-bold mb-0.5">Card Title</label>
                        <input 
                          type="text" 
                          value={inclusionTitle} 
                          onChange={e => setInclusionTitle(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 text-white rounded p-1 text-[11px] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] uppercase text-slate-400 font-bold mb-0.5">Inclusion Items</label>
                        <textarea 
                          value={inclusionDesc} 
                          onChange={e => setInclusionDesc(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 text-white rounded p-1 text-[10.5px] leading-relaxed outline-none h-16"
                        />
                      </div>
                      <div className="flex gap-1.5 justify-end pt-1">
                        <button onClick={() => setEditingInclusionKey(null)} className="text-[9px] font-bold text-slate-400 hover:underline">Cancel</button>
                        <button onClick={() => saveInclusion(key)} className="text-[9px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded">Save</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
