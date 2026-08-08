import { API_BASE_URL } from '../lib/api';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ClipboardList, CheckCircle, BedDouble, Users, User, UserCheck, Building, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DashboardStats() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/dashboard/stats`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    refetchInterval: 3000
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !stats) {
    return <div className="text-red-500 text-center">Failed to load dashboard</div>;
  }

  const { applications, beds, maleOccupancy, femaleOccupancy } = stats;

  const totalOccupancy = maleOccupancy + femaleOccupancy;
  const malePercent = totalOccupancy === 0 ? 0 : Math.round((maleOccupancy / totalOccupancy) * 100);
  const femalePercent = totalOccupancy === 0 ? 0 : Math.round((femaleOccupancy / totalOccupancy) * 100);

  const StatCard = ({ title, value, icon: Icon, delay, accent = "blue", href = "#" }: any) => {
    const accentColors = {
      primary: "border-b-indigo-500 hover:shadow-[0_20px_40px_-15px_rgba(99,102,241,0.3)] text-indigo-600 bg-indigo-50",
      secondary: "border-b-slate-400 hover:shadow-[0_20px_40px_-15px_rgba(148,163,184,0.3)] text-slate-700 bg-slate-100",
    };
    
    const colors = accentColors[accent as keyof typeof accentColors] || accentColors.primary;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay, ease: "easeOut" }}
      >
        <Link to={href} className="block outline-none group">
          <Card className={`relative overflow-hidden bg-white/90 backdrop-blur-md shadow-sm border border-slate-100/60 transition-all duration-300 rounded-[1.5rem] border-b-4 hover:-translate-y-1 ${colors.split(' ')[0]} ${colors.split(' ')[1]}`}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 group-hover:text-slate-600 transition-colors">{title}</p>
                  <h3 className={`text-4xl font-black ${colors.split(' ')[2]} tracking-tight`}>{value}</h3>
                </div>
                <div className={`p-4 rounded-2xl shadow-inner ${colors.split(' ')[3]} ${colors.split(' ')[2]} group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-7 h-7" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </motion.div>
    );
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-800">Dashboard Overview</h2>
          <p className="text-slate-500 font-medium mt-1">Key metrics and hostel analytics</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Pending" value={applications.pending} icon={ClipboardList} delay={0.1} href="/applications" accent="secondary" />
        <StatCard title="Payment Pending" value={applications.paymentPending || 0} icon={CreditCard} delay={0.2} href="/payments" accent="primary" />
        
        <StatCard title="Avail Beds" value={beds.available} icon={BedDouble} delay={0.3} href="/occupancy" accent="secondary" />
        <StatCard title="Total Occupied" value={beds.occupied} icon={Users} delay={0.4} href="/occupancy" accent="primary" />
        <StatCard
          title="Total Blocks"
          value={stats.totalBlocks}
          icon={Building}
          delay={0.5}
          href="/blocks"
          accent="secondary"
        />
      </div>

      <div className="mt-8">
        
        {/* Boys and Girls Section - Separated out completely from charts */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
          <div className="bg-white/60 backdrop-blur-md p-8 rounded-3xl border border-slate-200/50 shadow-sm h-full">
            <h3 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center">
              <Users className="w-5 h-5 mr-3 text-[#2b509a]" />
              Hostel Demographics
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-3xl border border-blue-100 flex flex-col items-center justify-center text-center hover:shadow-[0_20px_40px_-15px_rgba(59,130,246,0.2)] hover:-translate-y-1 transition-all duration-300 group">
                <div className="w-16 h-16 bg-white text-blue-600 rounded-full flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform duration-300">
                  <User className="w-8 h-8" />
                </div>
                <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Boys Occupancy</p>
                <h4 className="text-5xl font-black text-blue-900 my-2 tracking-tight">{maleOccupancy}</h4>
                <span className="inline-block px-4 py-1.5 bg-white/60 backdrop-blur-sm text-blue-700 text-xs font-bold rounded-full mt-2 shadow-sm border border-blue-100">
                  {malePercent}% of total
                </span>
              </div>

              <div className="bg-gradient-to-br from-rose-50 to-pink-50 p-6 rounded-3xl border border-rose-100 flex flex-col items-center justify-center text-center hover:shadow-[0_20px_40px_-15px_rgba(244,63,94,0.2)] hover:-translate-y-1 transition-all duration-300 group">
                <div className="w-16 h-16 bg-white text-rose-600 rounded-full flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform duration-300">
                  <UserCheck className="w-8 h-8" />
                </div>
                <p className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-1">Girls Occupancy</p>
                <h4 className="text-5xl font-black text-rose-900 my-2 tracking-tight">{femaleOccupancy}</h4>
                <span className="inline-block px-4 py-1.5 bg-white/60 backdrop-blur-sm text-rose-700 text-xs font-bold rounded-full mt-2 shadow-sm border border-rose-100">
                  {femalePercent}% of total
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
