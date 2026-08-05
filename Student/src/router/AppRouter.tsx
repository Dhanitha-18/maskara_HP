import React from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePayment } from '../context/PaymentContext';
import { MainLayout } from '../components/layout/MainLayout';
import { Login } from '../pages/Login/Login';
import { Overview } from '../pages/Overview/Overview';
import { ApplicationForm } from '../pages/ApplicationForm/ApplicationForm';
import { Facilities } from '../pages/Facilities/Facilities';
import { Payment } from '../pages/Payment/Payment';
import { Circulars } from '../pages/Circulars/Circulars';
import { Mess } from '../pages/Mess/Mess';
import { Complaints } from '../pages/Complaints/Complaints';
import { SocialConnect } from '../pages/SocialConnect/SocialConnect';
import { Attendance } from '../pages/Attendance/Attendance';
import { LeaveApplication } from '../pages/LeaveApplication/LeaveApplication';
import { Profile } from '../pages/Profile/Profile';
import { Notifications } from '../pages/Notifications/Notifications';
import { Feedback } from '../pages/Feedback/Feedback';
import { Lock, ArrowRight, ShieldAlert } from 'lucide-react';

// Guard: requires student login AND completed room allocation for protected tabs.
const RequireApplicationGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn } = useAuth();
  const { applicationState } = usePayment();

  const isAllocationCompleted = applicationState === 'room_allotted' || applicationState === 'paid';

  if (!isLoggedIn) {
    return (
      <div className="bg-white border border-border rounded-2xl shadow-card p-8 md:p-12 text-center max-w-2xl mx-auto my-12 space-y-6 animate-fadeIn">
        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto border border-amber-200 shadow-sm">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 bg-amber-100/70 text-amber-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            <Lock className="w-3.5 h-3.5" />
            <span>Awaiting Hostel Allocation</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Feature Currently Locked</h2>
          <p className="text-xs font-semibold text-slate-600 leading-relaxed max-w-md mx-auto">
            This feature is currently locked. It will become available after your hostel room has been allocated by the hostel administration. Please wait until your allocation is completed.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            to="/login"
            className="bg-primary hover:bg-primary-dark text-white font-bold py-2.5 px-6 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all"
          >
            <span>Student Login</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/apply"
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 px-5 rounded-xl text-xs transition-all border border-slate-200"
          >
            Apply to Join
          </Link>
        </div>
      </div>
    );
  }

  if (!isAllocationCompleted) {
    return (
      <div className="bg-white border border-border rounded-2xl shadow-card p-8 md:p-12 text-center max-w-2xl mx-auto my-12 space-y-6 animate-fadeIn">
        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto border border-amber-200 shadow-sm">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 bg-amber-100/70 text-amber-800 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-amber-200">
            <Lock className="w-3.5 h-3.5" />
            <span>Awaiting Hostel Allocation</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Feature Currently Locked</h2>
          <p className="text-sm font-semibold text-slate-600 leading-relaxed max-w-lg mx-auto">
            This feature is currently locked. It will become available after your hostel room has been allocated by the hostel administration. Please wait until your allocation is completed.
          </p>
        </div>
        <div className="pt-2">
          <Link
            to="/"
            className="bg-primary hover:bg-primary-dark text-white font-bold py-2.5 px-6 rounded-xl text-xs inline-flex items-center gap-2 shadow-sm transition-all"
          >
            <span>Back to Overview</span>
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* Login Page */}
      <Route path="/login" element={<Login />} />

      {/* Main Website Layout */}
      <Route path="/" element={<MainLayout />}>
        {/* Always accessible (Overview, Facilities, Mess, Apply) */}
        <Route index element={<Overview />} />
        <Route path="facilities" element={<Facilities />} />
        <Route path="mess" element={<Mess />} />
        <Route path="apply" element={<ApplicationForm />} />

        {/* Require application submission & login */}
        <Route path="payment" element={<RequireApplicationGuard><Payment /></RequireApplicationGuard>} />
        <Route path="circulars" element={<RequireApplicationGuard><Circulars /></RequireApplicationGuard>} />
        <Route path="complaints" element={<RequireApplicationGuard><Complaints /></RequireApplicationGuard>} />
        <Route path="social-connect" element={<RequireApplicationGuard><SocialConnect /></RequireApplicationGuard>} />
        <Route path="attendance" element={<RequireApplicationGuard><Attendance /></RequireApplicationGuard>} />
        <Route path="leave-application" element={<RequireApplicationGuard><LeaveApplication /></RequireApplicationGuard>} />
        <Route path="profile" element={<RequireApplicationGuard><Profile /></RequireApplicationGuard>} />
        <Route path="notifications" element={<RequireApplicationGuard><Notifications /></RequireApplicationGuard>} />
        <Route path="feedback" element={<RequireApplicationGuard><Feedback /></RequireApplicationGuard>} />

        {/* Redirect unknown routes to Overview */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};
