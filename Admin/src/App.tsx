import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import ApplicationsQueue from './pages/ApplicationsQueue';
import DashboardStats from './pages/DashboardStats';
import BlockOverview from './pages/BlockOverview';
import RoomOccupancy from './pages/RoomOccupancy';
import CommunicationCenter from './pages/CommunicationCenter';
import PaymentDashboard from './pages/PaymentDashboard';
import StudentControlsIndex from './pages/StudentControls';
import StudentDatabase from './pages/StudentDatabase';
import AdminLogin from './pages/AdminLogin';
import { LayoutDashboard, ClipboardList, Building, LogOut, User, Users, ChevronLeft, ChevronRight, Mail, CreditCard, Monitor, Database } from 'lucide-react';
import { Toaster } from 'sonner';
import { useAuthStore } from './store/useAuthStore';
import { useState, useCallback } from 'react';
import { socket, initSocket } from './lib/socket';
import { PresenceProvider, usePresence } from './context/PresenceContext';
import CommandPalette from './components/CommandPalette';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity, // Keep data fresh until explicitly invalidated/updated
    },
  },
});

// Initialize socket connection
initSocket();

socket.on('BED_ALLOCATED', (data) => {
  console.log('Real-time: BED_ALLOCATED', data);
  queryClient.invalidateQueries({ queryKey: ['applications'] });
  queryClient.invalidateQueries({ queryKey: ['applications_all'] });
  queryClient.invalidateQueries({ queryKey: ['allocations'] });
  queryClient.invalidateQueries({ queryKey: ['rooms'] });
  queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
});

socket.on('APPLICATION_UPDATED', (data) => {
  console.log('Real-time: APPLICATION_UPDATED', data);
  queryClient.invalidateQueries({ queryKey: ['applications'] });
  queryClient.invalidateQueries({ queryKey: ['applications_all'] });
  queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
});

socket.on('data_updated', () => {
  console.log('Real-time data update received (legacy)');
  queryClient.invalidateQueries();
});

import AdminManagement from './pages/AdminManagement';
import AttendanceManagement from './pages/AttendanceManagement';
import { ShieldCheck, UserCheck } from 'lucide-react';

function PresenceList() {
  const { onlineAdmins } = usePresence();
  
  if (onlineAdmins.length === 0) return null;

  return (
    <div className="space-y-2 mt-2 max-h-32 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
      {onlineAdmins.map((admin) => (
        <div key={admin.socketId} className="flex items-center space-x-2 text-xs">
          <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0">
            {admin.adminName.charAt(0)}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="font-semibold text-slate-700 truncate">{admin.adminName}</p>
            <p className="text-[10px] text-slate-400 truncate">{admin.currentModule}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function Sidebar() {
  const location = useLocation();
  const path = location.pathname;
  const { role, name, title, allowedTabs, logout } = useAuthStore();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const allNavItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Applications Queue', path: '/applications', icon: ClipboardList },
    { name: 'Student Database', path: '/database', icon: Database },
    { name: 'Block Overview', path: '/blocks', icon: Building },
    { name: 'Live Occupancy', path: '/occupancy', icon: Users },
    { name: 'Communication Center', path: '/communication', icon: Mail },
    { name: 'Payments', path: '/payments', icon: CreditCard },
    { name: 'Student Controls', path: '/student-controls', icon: Monitor },
    { name: 'Admin Management', path: '/admin-management', icon: ShieldCheck, chiefOnly: true }
  ];

  const navItems = allNavItems.filter(item => {
    if (role === 'CHIEF') return true;
    if (item.chiefOnly) return false;
    return allowedTabs && allowedTabs.includes(item.path);
  });

  return (
    <aside className={`${isCollapsed ? 'w-[96px]' : 'w-[280px]'} m-4 mr-0 rounded-[2rem] bg-white/60 backdrop-blur-3xl border border-white/60 shadow-[10px_10px_40px_-10px_rgba(0,0,0,0.05),-1px_-1px_2px_rgba(255,255,255,0.5)] hidden md:flex flex-col h-[calc(100vh-2rem)] sticky top-4 transition-all duration-300 z-20 overflow-visible relative shrink-0`}>
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3.5 top-12 w-7 h-7 bg-white border border-slate-200/60 rounded-full flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.1)] text-slate-500 hover:text-indigo-600 hover:scale-110 transition-all z-50 cursor-pointer"
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4 ml-0.5" /> : <ChevronLeft className="w-4 h-4 mr-0.5" />}
      </button>

      <div className={`flex flex-col items-center justify-center border-b border-slate-100/50 shrink-0 transition-all duration-300 ${isCollapsed ? 'p-4' : 'p-5'}`}>
        <div className="flex flex-col items-center justify-center w-full">
          <div className={`bg-indigo-600 rounded-[1rem] flex items-center justify-center shadow-lg shadow-indigo-600/30 transition-all duration-300 shrink-0 ${isCollapsed ? 'w-10 h-10 mb-0' : 'w-12 h-12 mb-2'}`}>
            <Building className={`text-white transition-all duration-300 ${isCollapsed ? 'w-5 h-5' : 'w-7 h-7'}`} />
          </div>
          
          <div className={`flex flex-col items-center overflow-hidden transition-all duration-300 ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-24 opacity-100'}`}>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 text-center whitespace-nowrap">
              OM SAI <span className="text-indigo-600">PG</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1.5 text-center whitespace-nowrap">
              Management System
            </p>
          </div>
        </div>
      </div>
      
      <nav className={`space-y-1 mt-2 flex-1 overflow-y-auto overflow-x-hidden scrollbar-none ${isCollapsed ? 'px-3' : 'px-5'}`}>
        {navItems.map((item) => {
          const isActive = path === item.path;
          const Icon = item.icon;
          return (
            <Link 
              key={item.path}
              to={item.path} 
              title={isCollapsed ? item.name : undefined}
              className={`relative flex items-center py-2 mb-0.5 text-sm font-bold transition-all duration-300 rounded-2xl group outline-none hover:-translate-y-0.5 ${!isActive && 'hover:bg-white/50 hover:shadow-sm'} ${isCollapsed ? 'px-0 justify-center' : 'px-4'}`}
            >
              {isActive && (
                <motion.div 
                  layoutId="active-nav" 
                  className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl shadow-[0_8px_16px_-6px_rgba(99,102,241,0.5)] z-0" 
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <Icon className={`relative z-10 transition-colors duration-300 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'} ${isCollapsed ? 'w-5 h-5 mx-auto' : 'w-5 h-5 mr-3.5'}`} />
              <span className={`relative z-10 transition-all duration-300 whitespace-nowrap overflow-hidden ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-800'} ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className={`mt-auto transition-all duration-300 ${isCollapsed ? 'p-2' : 'p-3'}`}>

         <div 
           onClick={() => {
             if (confirm('Are you sure you want to logout?')) {
               logout();
               window.location.reload();
             }
           }}
           className={`flex items-center bg-white/40 backdrop-blur-md rounded-[1.5rem] border border-white/60 transition-all hover:bg-white hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.05)] hover:-translate-y-1 cursor-pointer group ${isCollapsed ? 'p-2 justify-center' : 'p-4'}`}
           title={isCollapsed ? "Logout" : "Click to logout"}
         >
           <div className={`rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 border border-white flex items-center justify-center text-indigo-600 font-bold shadow-sm group-hover:scale-105 transition-all duration-300 shrink-0 ${isCollapsed ? 'w-10 h-10' : 'w-12 h-12'}`}>
             <User className={`transition-all duration-300 ${isCollapsed ? 'w-5 h-5' : 'w-6 h-6'}`} />
           </div>
           
           <div className={`flex items-center justify-between overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 ml-0' : 'w-full opacity-100 ml-3'}`}>
             <div className="flex-1 overflow-hidden">
               <p className="text-sm font-extrabold text-slate-800 truncate">{name}</p>
               <p className="text-xs font-bold text-slate-500 truncate mt-0.5">{title}</p>
             </div>
             <div className="w-8 h-8 rounded-full bg-slate-100/50 flex items-center justify-center group-hover:bg-rose-50 transition-colors ml-2 shrink-0">
               <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-600 transition-colors translate-x-0 group-hover:translate-x-0.5" />
             </div>
           </div>
         </div>
      </div>
    </aside>
  );
}

function RouteGuard({ children, path }: { children: React.ReactNode, path: string }) {
  const { role, allowedTabs } = useAuthStore();
  if (role === 'CHIEF') return <>{children}</>;
  
  if (allowedTabs && allowedTabs.includes(path)) {
    return <>{children}</>;
  }

  // Redirect to first allowed tab
  const firstAllowed = (allowedTabs && allowedTabs.length > 0) ? allowedTabs[0] : '/';
  return <Navigate to={firstAllowed} replace />;
}

import { ErrorBoundary } from './components/ErrorBoundary';

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-full h-full"
      >
        <ErrorBoundary>
          <Routes location={location}>
            <Route path="/" element={<RouteGuard path="/"><ErrorBoundary fallbackTitle="Dashboard Overview Error"><DashboardStats /></ErrorBoundary></RouteGuard>} />
            <Route path="/applications" element={<RouteGuard path="/applications"><ErrorBoundary fallbackTitle="Applications Queue Error"><ApplicationsQueue /></ErrorBoundary></RouteGuard>} />
            <Route path="/database" element={<RouteGuard path="/database"><ErrorBoundary fallbackTitle="Student Database Error"><StudentDatabase /></ErrorBoundary></RouteGuard>} />
            <Route path="/blocks" element={<RouteGuard path="/blocks"><ErrorBoundary fallbackTitle="Block Overview Error"><BlockOverview /></ErrorBoundary></RouteGuard>} />
            <Route path="/occupancy" element={<RouteGuard path="/occupancy"><ErrorBoundary fallbackTitle="Live Occupancy Error"><RoomOccupancy /></ErrorBoundary></RouteGuard>} />
            <Route path="/attendance" element={<RouteGuard path="/attendance"><ErrorBoundary fallbackTitle="Attendance Error"><AttendanceManagement /></ErrorBoundary></RouteGuard>} />
            <Route path="/communication" element={<RouteGuard path="/communication"><ErrorBoundary fallbackTitle="Communication Center Error"><CommunicationCenter /></ErrorBoundary></RouteGuard>} />
            <Route path="/payments" element={<RouteGuard path="/payments"><ErrorBoundary fallbackTitle="Payment Dashboard Error"><PaymentDashboard /></ErrorBoundary></RouteGuard>} />
            <Route path="/student-controls" element={<RouteGuard path="/student-controls"><ErrorBoundary fallbackTitle="Student Controls Error"><StudentControlsIndex /></ErrorBoundary></RouteGuard>} />
            <Route path="/admin-management" element={<RouteGuard path="/admin-management"><ErrorBoundary fallbackTitle="Admin Management Error"><AdminManagement /></ErrorBoundary></RouteGuard>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  // Restore auth state from localStorage so page refresh doesn't log the admin out
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('admin_authenticated') === 'true' &&
           !!localStorage.getItem('admin_token') &&
           !!localStorage.getItem('admin_user');
  });

  const handleLogin = useCallback(() => {
    setIsAuthenticated(true);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('admin_authenticated');
    setIsAuthenticated(false);
  }, []);

  if (!isAuthenticated) {
    return (
      <QueryClientProvider client={queryClient}>
        <Toaster position="top-right" richColors />
        <AdminLogin onLogin={handleLogin} />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" richColors />
      <Router>
        <PresenceProvider>
          <div className="min-h-screen text-slate-900 flex transition-colors duration-500 bg-[#f8fafc] relative overflow-hidden">
            
            {/* Lively Background Pattern */}
            <div className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden">
              
              {/* Subtle Abstract Wave/Topographic Pattern */}
              <div 
                className="absolute inset-0 opacity-[0.02]"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54.627 0l.83.83v58.34h-58.34v-.83l57.51-58.34zM53.41 0l.83.83v58.34h-58.34v-.83l57.51-58.34zM52.2 0l.83.83v58.34h-58.34v-.83l57.51-58.34zM51 0l.83.83v58.34h-58.34v-.83l57.51-58.34z' fill='%230f172a' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
                }}
              />

              {/* Concentric Delicate Circles */}
              <div className="absolute w-[800px] h-[800px] border border-slate-300/30 rounded-full flex items-center justify-center opacity-70">
                <div className="w-[600px] h-[600px] border border-slate-300/30 rounded-full flex items-center justify-center">
                  <div className="w-[400px] h-[400px] border border-slate-300/30 rounded-full" />
                </div>
              </div>

              {/* Glowing Orbs (Indigo, Cyan, Violet theme) */}
              <motion.div 
                animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.25, 0.15] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute w-[500px] h-[500px] bg-indigo-500 rounded-full blur-[120px] -translate-x-1/4 -translate-y-1/4 mix-blend-multiply" 
              />
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute w-[400px] h-[400px] bg-cyan-400 rounded-full blur-[100px] translate-x-1/3 translate-y-1/4 mix-blend-multiply" 
              />
              <motion.div 
                animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.25, 0.15] }}
                transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                className="absolute w-[450px] h-[450px] bg-violet-500 rounded-full blur-[120px] translate-x-1/4 -translate-y-1/3 mix-blend-multiply" 
              />

              {/* Large Outline Text watermark */}
              <div className="absolute z-10 flex items-center justify-center w-full h-full">
                <h1 
                  className="text-[12rem] md:text-[16rem] lg:text-[22rem] font-black tracking-tighter select-none"
                  style={{
                    WebkitTextStroke: '2px rgba(148, 163, 184, 0.2)', // slate-400 with low opacity
                    color: 'transparent'
                  }}
                >
                  OM SAI
                </h1>
              </div>

            </div>

            <Sidebar />

            {/* Main Content */}
            <main className="flex-1 p-8 md:p-10 lg:p-12 h-screen overflow-y-auto relative z-10">
              <AnimatedRoutes />
            </main>
            
            <CommandPalette />
          </div>
        </PresenceProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
