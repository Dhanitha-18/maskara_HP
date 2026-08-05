import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { TopNavbar } from './TopNavbar';
import { LeftSidebar } from './LeftSidebar';
import { usePayment } from '../../context/PaymentContext';
import { Loader2 } from 'lucide-react';

export const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isLoadingStatus } = usePayment();
  const { pathname } = useLocation();

  // Scroll to top of the page on every navigation / route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans overflow-x-hidden">
      {/* Top Navigation */}
      <TopNavbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      {/* Sidebar Navigation */}
      <LeftSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main Viewport Grid */}
      <div className="flex-1 pt-16 flex flex-col min-h-screen">
        <main className="flex-grow px-4 sm:px-6 lg:px-10 py-6 max-w-[1440px] w-full mx-auto pb-24">
          <Outlet />
        </main>
        
        {/* Footer (No-Print) */}
        <footer className="h-14 bg-white border-t border-border flex items-center justify-between px-6 text-text-muted text-[10px] sm:text-xs font-semibold no-print">
          <span>© 2026  BMS INSTITUTE OF TECHNOLOGY & MANAGEMENT. All Rights Reserved.</span>
          <span>Security Certified (SSL/256-Bit)</span>
        </footer>
      </div>

    </div>
  );
};
