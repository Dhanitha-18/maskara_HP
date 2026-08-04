import { motion } from 'framer-motion';
import { Bell, Shield, Paintbrush, Database, Users, Link as LinkIcon } from 'lucide-react';

export default function Settings() {
  const settingsCards = [
    {
      title: 'Notifications & Alerts',
      desc: 'Configure email and SMS alerts for new applications and allocation statuses.',
      icon: Bell,
      color: 'text-amber-500',
      bg: 'bg-amber-50'
    },
    {
      title: 'Security & Access',
      desc: 'Manage admin roles, password policies, and two-factor authentication.',
      icon: Shield,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50'
    },
    {
      title: 'Appearance',
      desc: 'Customize the portal theme, colors, and layout preferences.',
      icon: Paintbrush,
      color: 'text-pink-500',
      bg: 'bg-pink-50'
    },
    {
      title: 'Database Backup',
      desc: 'Schedule automated database backups and export allocation history.',
      icon: Database,
      color: 'text-blue-500',
      bg: 'bg-blue-50'
    },
    {
      title: 'User Management',
      desc: 'Add, remove, or modify privileges for hostel wardens and staff.',
      icon: Users,
      color: 'text-indigo-500',
      bg: 'bg-indigo-50'
    },
    {
      title: 'Integrations',
      desc: 'Manage connections to the university main student database and payment gateways.',
      icon: LinkIcon,
      color: 'text-purple-500',
      bg: 'bg-purple-50'
    }
  ];

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-800">System Settings</h2>
        <p className="text-slate-500 font-medium mt-1">Configure your hostel administration preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingsCards.map((card, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: idx * 0.1 }}
            className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all flex flex-col h-full"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${card.bg} ${card.color}`}>
              <card.icon className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-slate-800 text-lg">{card.title}</h3>
            <p className="text-sm text-slate-500 mt-2 font-medium leading-relaxed flex-1">{card.desc}</p>
            <div className="mt-6">
              <button className="px-4 py-2 w-full bg-slate-50 text-slate-600 font-bold rounded-xl text-sm border border-slate-200 hover:bg-slate-100 transition-colors">
                Configure
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
