import { useState } from 'react';
import { Building, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

// Sample login credentials
const VALID_CREDENTIALS = {
  username: 'admin',
  password: 'omsai@2026'
};

interface AdminLoginProps {
  onLogin: () => void;
}

export default function AdminLogin({ onLogin }: AdminLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      if (username === VALID_CREDENTIALS.username && password === VALID_CREDENTIALS.password) {
        localStorage.setItem('admin_authenticated', 'true');
        onLogin();
      } else {
        setError('Invalid username or password');
      }
      setIsLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] relative overflow-hidden font-sans">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54.627 0l.83.83v58.34h-58.34v-.83l57.51-58.34z' fill='%230f172a' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          }}
        />
        <div className="absolute w-[800px] h-[800px] border border-slate-300/30 rounded-full flex items-center justify-center opacity-70">
          <div className="w-[600px] h-[600px] border border-slate-300/30 rounded-full flex items-center justify-center">
            <div className="w-[400px] h-[400px] border border-slate-300/30 rounded-full" />
          </div>
        </div>

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

        <div className="absolute z-10 flex items-center justify-center w-full h-full">
          <h1 
            className="text-[12rem] md:text-[16rem] lg:text-[22rem] font-black tracking-tighter select-none"
            style={{
              WebkitTextStroke: '2px rgba(148, 163, 184, 0.15)',
              color: 'transparent'
            }}
          >
            OM SAI
          </h1>
        </div>
      </div>

      {/* Login Card */}
      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-20 w-full max-w-md mx-4"
      >
        <div className="bg-white/80 backdrop-blur-2xl border border-white/60 rounded-[2rem] shadow-[10px_10px_40px_-10px_rgba(0,0,0,0.1)] p-10">
          
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="bg-indigo-600 rounded-[1.25rem] w-16 h-16 flex items-center justify-center shadow-lg shadow-indigo-600/30 mb-4">
              <Building className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 text-center">
              OM SAI <span className="text-indigo-600">PG</span>
            </h1>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1.5 text-center">
              Admin Management Portal
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(''); }}
                placeholder="Enter admin username"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all placeholder:text-slate-300"
                autoFocus
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="Enter password"
                  className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all placeholder:text-slate-300"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:shadow-xl hover:shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-[10px] text-slate-400 font-semibold">
              Protected access — Authorized administrators only
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
