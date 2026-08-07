import React from 'react';
import { usePayment } from '../../context/PaymentContext';
import { ArrowRight, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface GateKeeperProps {
  children: React.ReactNode;
  allowRoomAllotted?: boolean;
}

export const PortalGateKeeper: React.FC<GateKeeperProps> = ({ children, allowRoomAllotted }) => {
  const { applicationState } = usePayment();
  const navigate = useNavigate();

  const isPaymentPage = window.location.pathname.includes('/payment');

  if (
    applicationState === 'paid' || 
    applicationState === 'room_allotted' ||
    (isPaymentPage && applicationState === 'applied')
  ) {
    return <>{children}</>;
  }

  return (
    <div className="relative w-full min-h-[500px]">
      {/* Blurred background preview */}
      <div className="filter blur-[6px] opacity-30 select-none pointer-events-none">
        {children}
      </div>
      
      {/* Red Open Text Warning at Top Center (No Box Container) */}
      <div className="absolute inset-x-0 top-0 pt-8 sm:pt-12 px-4 flex flex-col items-center justify-start text-center z-20 space-y-4">
        <div className="flex items-center justify-center gap-2 text-red-500 font-black text-sm sm:text-base md:text-lg uppercase tracking-wider max-w-2xl leading-snug">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>ACCESS RESTRICTED: This section is accessible only to students currently residing in OM SAI PG.</span>
        </div>

        <p className="text-xs text-slate-600 font-semibold max-w-md">
          {applicationState === 'room_allotted'
            ? 'Your room has been allotted! Please proceed to the Payment Gateway to complete your admission.'
            : 'Please complete your hostel application on the Overview page to get started.'}
        </p>

        <button
          onClick={() => navigate(applicationState === 'room_allotted' ? '/payment' : '/')}
          className="bg-primary hover:bg-primary-dark text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md"
          type="button"
        >
          <span>{applicationState === 'room_allotted' ? 'Go to Payment Gateway' : 'Go to Overview Page'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
