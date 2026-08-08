import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Building2, 
  CreditCard, 
  Megaphone,
  Utensils,
  Star,
  MessageSquare,
  Users,
  UserCheck,
  FileText,
  LogOut,
  X,
  Lock,
  User
} from 'lucide-react';
import { usePayment } from '../../context/PaymentContext';
import { useAuth } from '../../context/AuthContext';

interface LeftSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// Tabs accessible WITHOUT login
const PUBLIC_PATHS = ['/', '/facilities', '/mess'];
const AUTH_ACCESSIBLE_PATHS: string[] = [];

export const LeftSidebar: React.FC<LeftSidebarProps> = ({ isOpen, onClose }) => {
  const { resetPayment, applicationState } = usePayment();
  const { logout, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const isAllocationCompleted = applicationState === 'room_allotted' || applicationState === 'paid';

  const navItems = [
    { name: 'Overview', path: '/', icon: Home },
    { name: 'Facilities', path: '/facilities', icon: Building2 },
    { name: 'Payment Gateway', path: '/payment', icon: CreditCard },
    { name: 'Circulars', path: '/circulars', icon: Megaphone },
    { name: 'Mess Menu', path: '/mess', icon: Utensils },
    { name: 'Student Feedback', path: '/feedback', icon: Star },
    { name: 'Complaints', path: '/complaints', icon: MessageSquare },
    { name: 'Attendance', path: '/attendance', icon: UserCheck },
    { name: 'Leave Application', path: '/leave-application', icon: FileText },
    { name: 'My Profile', path: '/profile', icon: User },
  ];


  const handleLogoutClick = () => {
    resetPayment();
    logout();
    onClose();
    navigate('/');
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300 font-sans select-none">
      {/* Sidebar Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-950">
        <div className="flex items-center gap-2">
          <div>
            <span className="text-white font-bold text-sm uppercase tracking-wide">OM SAI PG</span>
            <span className="text-[10px] text-primary-light block font-semibold tracking-wider">STUDENT PORTAL</span>
          </div>
        </div>
        
        <button 
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
          aria-label="Close Sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
        {navItems.map(item => {
          const isPublic = PUBLIC_PATHS.includes(item.path);
          const isAuthOnly = AUTH_ACCESSIBLE_PATHS.includes(item.path);
          const isLocked = isAuthOnly ? !isLoggedIn : (!isPublic && (!isLoggedIn || !isAllocationCompleted));

          return (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) => `
                flex items-center justify-between px-4 py-3 rounded-lg text-xs font-semibold tracking-wide transition-all duration-150 group
                ${isActive 
                  ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]' 
                  : 'hover:bg-slate-800 hover:text-white text-slate-400'
                }
              `}
            >
              <div className="flex items-center gap-3.5">
                <item.icon className="w-4.5 h-4.5 shrink-0 transition-transform group-hover:scale-110" />
                <span>{item.name}</span>
              </div>
              {isLocked && (
                <Lock className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 shrink-0" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Sidebar Footer with Logout */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/50">
        {isLoggedIn && (
          <button
            onClick={handleLogoutClick}
            className="flex items-center gap-3.5 px-4 py-3 rounded-lg text-xs font-semibold tracking-wide text-danger hover:bg-red-950/20 hover:text-red-400 w-full transition-all duration-150"
          >
            <LogOut className="w-4.5 h-4.5 shrink-0" />
            <span>Logout</span>
          </button>
        )}
        <div className="text-[10px] text-slate-600 text-center mt-3 font-mono">
          v1.0.4 (Client-Side)
        </div>
      </div>
    </div>
  );

  return (
    <>
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 transition-opacity no-print"
        />
      )}

      <aside className={`
        fixed top-0 bottom-0 left-0 w-72 bg-slate-900 z-50 shadow-2xl transition-transform duration-300 ease-in-out no-print
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {sidebarContent}
      </aside>
    </>
  );
};
