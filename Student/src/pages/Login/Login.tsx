import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../services/api';
import { Building2, ArrowRight, ArrowLeft, User, Phone } from 'lucide-react';

export const Login: React.FC = () => {
  const [studentName, setStudentNameInput] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = studentName.trim();
    const trimmedPhone = phoneNumber.trim();

    if (!trimmedName || !trimmedPhone) {
      setError('Please enter both your exact Student Name and Phone Number.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await apiRequest('/api/student/login', {
        method: 'POST',
        body: JSON.stringify({
          studentName: trimmedName,
          phoneNumber: trimmedPhone
        })
      });

      if (data.success && data.usn) {
        login(data.usn, data.studentName, data.phoneNumber, data.token);
        navigate('/');
      } else {
        setError(data.error || 'No account exists');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'No account exists');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      {/* Top Bar */}
      <header className="bg-white border-b border-border h-16 flex items-center justify-between px-4 sm:px-8 shadow-sm">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-sm sm:text-base font-bold text-primary tracking-tight leading-tight uppercase">
              OM SAI LUXURY PGS
            </h1>
            <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider">
              Partnered with BMSIT&M
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 relative max-w-lg mx-auto w-full">
        {/* Back to Overview Button */}
        <button
          onClick={() => navigate('/')}
          className="self-start mb-4 inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-extrabold text-xs sm:text-sm rounded-xl border border-slate-200 shadow-sm transition-all group cursor-pointer"
          type="button"
        >
          <ArrowLeft className="w-4 h-4 text-primary transition-transform group-hover:-translate-x-1" />
          <span>Back to Overview</span>
        </button>

        <div className="w-full">
          {/* Login Card */}
          <div className="bg-white border border-border rounded-2xl shadow-card p-8 space-y-6">
            
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto border border-primary/20 shadow-inner">
                <Building2 className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-black text-text uppercase tracking-tight">Student Portal Login</h2>
              <p className="text-xs text-text-muted font-semibold">
                Enter your exact Name and Phone Number used during application
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-primary" />
                  Exact Student Full Name *
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentNameInput(e.target.value)}
                  placeholder="e.g. Kavitha Raj"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm font-bold text-text placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-slate-50/50"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-primary" />
                  Registered Phone Number *
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="10-digit mobile number"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm font-bold text-text placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-slate-50/50 font-mono tracking-wider"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-danger text-xs font-bold p-3 rounded-xl">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 px-6 rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed group"
              >
                {isLoading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Sign In to Portal</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            {/* Helpful Info */}
            <div className="border-t border-slate-100 pt-4 space-y-2">
              <p className="text-[10px] text-text-muted font-semibold text-center leading-relaxed">
                <strong className="text-slate-700">First time here?</strong> Click below to submit your hostel application. Your Name and Phone Number will become your login credentials.
              </p>
              <button
                onClick={() => navigate('/apply')}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2 px-4 rounded-xl text-xs transition-colors"
                type="button"
              >
                Apply to Join OM SAI PG
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="h-14 bg-white border-t border-border flex items-center justify-between px-6 text-text-muted text-[10px] sm:text-xs font-semibold">
        <span>© 2026 BMS INSTITUTE OF TECHNOLOGY & MANAGEMENT. All Rights Reserved.</span>
        <span>Security Certified (SSL/256-Bit)</span>
      </footer>
    </div>
  );
};