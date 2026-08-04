import React, { useState } from 'react';
import { usePayment } from '../../context/PaymentContext';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Wallet, 
  Check, 
  ShieldCheck,
  ArrowLeft
} from 'lucide-react';
import { HeroBanner } from '../../components/layout/HeroBanner';

export const Notifications: React.FC = () => {
  const { notifications, markNotificationRead, markAllNotificationsRead } = usePayment();
  const [filter, setFilter] = useState<'all' | 'unread' | 'payment' | 'approval' | 'general'>('all');
  const navigate = useNavigate();

  // Filter items
  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread') return !notif.read;
    if (filter === 'payment') return notif.category === 'payment';
    if (filter === 'approval') return notif.category === 'approval';
    if (filter === 'general') return notif.category === 'general';
    return true; // 'all'
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'payment':
        return Wallet;
      case 'approval':
        return ShieldCheck;
      default:
        return Bell;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'payment':
        return 'bg-blue-50 border-blue-200 text-primary';
      case 'approval':
        return 'bg-emerald-50 border-emerald-200 text-emerald-600';
      default:
        return 'bg-slate-50 border-slate-200 text-slate-600';
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 font-sans pb-12">
      <HeroBanner 
        image="/facilities/block2.jpeg" 
        title="Notification Center" 
      />

      {/* Back Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-wider group"
          type="button"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          <span>Back</span>
        </button>
        
        {notifications.some(n => !n.read) && (
          <button
            onClick={markAllNotificationsRead}
            className="self-start sm:self-auto bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 px-3.5 rounded-xl flex items-center gap-1.5 transition-colors border border-border"
          >
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Mark All Read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs - Fits text perfectly with horizontal scrolling and no wrap distortion */}
      <div className="flex flex-nowrap items-center gap-2 border-b border-slate-100 pb-4 overflow-x-auto scrollbar-none">
        {[
          { key: 'all', label: 'All Notifications' },
          { key: 'unread', label: 'Unread' },
          { key: 'payment', label: 'Payments' },
          { key: 'general', label: 'General Announcement' },
        ].map(tab => {
          const count = tab.key === 'unread' 
            ? notifications.filter(n => !n.read).length
            : tab.key === 'all'
            ? notifications.length
            : notifications.filter(n => n.category === tab.key).length;

          const isSelected = filter === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key as any)}
              className={`px-3.5 sm:px-4 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
                isSelected 
                  ? 'bg-primary border-primary text-white shadow-sm font-black' 
                  : 'bg-white border-border text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>{tab.label}</span>
              {count > 0 && (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                  isSelected ? 'bg-white text-primary' : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {filteredNotifications.length === 0 ? (
            <div className="bg-white border border-border rounded-2xl py-12 px-6 text-center shadow-soft space-y-3">
              <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center text-slate-400 mx-auto">
                <Bell className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-slate-800">You're all caught up!</h4>
                <p className="text-[11px] text-text-muted font-medium">No new notifications in this category.</p>
              </div>
            </div>
          ) : (
            filteredNotifications.map(notif => {
              const Icon = getCategoryIcon(notif.category);
              const colorClass = getCategoryColor(notif.category);
              
              return (
                <div
                  key={notif.id}
                  onClick={() => !notif.read && markNotificationRead(notif.id)}
                  className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-soft transition-all flex gap-3.5 sm:gap-4 cursor-pointer hover:border-slate-300 ${
                    !notif.read ? 'border-l-4 border-l-primary bg-blue-50/20' : 'border-border'
                  }`}
                >
                  {/* Category Icon */}
                  <div className={`p-2.5 rounded-xl border shrink-0 self-start ${colorClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  
                  {/* Notification Content Box */}
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1.5 sm:gap-4">
                      <h4 className={`text-xs sm:text-sm font-black text-slate-900 leading-snug break-words ${!notif.read ? 'text-primary' : ''}`}>
                        {notif.title}
                      </h4>
                      <span className="text-[10px] font-bold text-slate-500 shrink-0 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80 whitespace-nowrap self-start sm:self-auto">
                        {notif.date} • {notif.time}
                      </span>
                    </div>
                    
                    <p className="text-xs text-text-muted leading-relaxed font-semibold break-words">
                      {notif.description}
                    </p>

                    {!notif.read && (
                      <div className="flex justify-end pt-1">
                        <span className="text-[10px] font-bold text-primary flex items-center gap-1 uppercase tracking-wider bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-lg border border-blue-200 transition-colors shadow-xs">
                          <Check className="w-3.5 h-3.5" />
                          Mark read
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

    </div>
  );
};