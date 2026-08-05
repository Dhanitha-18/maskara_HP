import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FacilitiesControl from './FacilitiesControl';
import FeedbackControl from './FeedbackControl';
import ComplaintsControl from './ComplaintsControl';
import SocialControl from './SocialControl';
import LeaveControl from './LeaveControl';
import MessMenuControl from './MessMenuControl';
import CircularsControl from './CircularsControl';
import PaymentsControl from './PaymentsControl';
import { Building2, MessageSquare, AlertTriangle, Users, Calendar, Utensils, FileText, CreditCard, Menu, ChevronDown } from 'lucide-react';

export default function StudentControlsIndex() {
  const [activeTab, setActiveTab] = useState('facilities');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const tabs = [
    { id: 'facilities', label: 'Facilities', icon: Building2 },
    { id: 'feedback', label: 'Feedback', icon: MessageSquare },
    { id: 'complaints', label: 'Complaints', icon: AlertTriangle },
    { id: 'mess_menu', label: 'Mess Menu', icon: Utensils },
    { id: 'circulars', label: 'Circulars', icon: FileText },
    { id: 'social', label: 'Social Connect', icon: Users },
    { id: 'leaves', label: 'Leave Applications', icon: Calendar },
    { id: 'payments', label: 'Payment Gateway', icon: CreditCard },
  ];

  const activeTabData = tabs.find(t => t.id === activeTab)!;
  const ActiveIcon = activeTabData.icon;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col">
      <div className="mb-6 flex items-center gap-4">
        {/* Hamburger + Active Tab Selector */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <Menu className="w-5 h-5 text-slate-500 group-hover:text-indigo-600 transition-colors" />
            <div className="flex items-center gap-2">
              <ActiveIcon className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-bold text-slate-700">{activeTabData.label}</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 py-2 overflow-hidden"
              >
                {tabs.map(tab => {
                  const isActive = activeTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setIsMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700 border-l-[3px] border-indigo-600'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 border-l-[3px] border-transparent'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                      {tab.label}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Student Dashboard Control</h1>
          <p className="text-slate-500 mt-0.5 text-sm">Manage data that reflects on the student portal.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'facilities' && <FacilitiesControl />}
            {activeTab === 'feedback' && <FeedbackControl />}
            { activeTab === 'complaints' && <ComplaintsControl /> }
            { activeTab === 'mess_menu' && <MessMenuControl /> }
            { activeTab === 'circulars' && <CircularsControl /> }
            { activeTab === 'social' && <SocialControl /> }
            { activeTab === 'leaves' && <LeaveControl /> }
            { activeTab === 'payments' && <PaymentsControl /> }
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
