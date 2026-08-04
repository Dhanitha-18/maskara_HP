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

// Guard: requires student login AND application submission. If not, renders restricted access page.
const RequireApplicationGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn } = useAuth();
  const { applicationState } = usePayment();

  const hasSubmittedApp = isLoggedIn && applicationState !== 'not_applied';

  if (!hasSubmittedApp) {
    return (
      <div className="bg-white border border-border rounded-2xl shadow-soft p-8 md:p-12 text-center max-w-2xl mx-auto my-12 space-y-6 animate-fadeIn">
        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto border border-rose-100 shadow-sm">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Restricted Page Access</h2>
          <p className="text-xs font-semibold text-slate-600 leading-relaxed">
            This dashboard feature is accessible only after submitting the Hostel Application Form. Please complete your application to unlock full student portal features.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            to="/apply"
            className="bg-primary hover:bg-primary-dark text-white font-bold py-2.5 px-6 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all"
          >
            <span>Fill Application Form</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          {!isLoggedIn && (
            <Link
              to="/login"
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 px-5 rounded-xl text-xs transition-all border border-slate-200"
            >
              Student Login
            </Link>
          )}
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
