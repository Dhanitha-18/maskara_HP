import React, { useState, useEffect, useMemo } from 'react';
import { HeroBanner } from '../../components/layout/HeroBanner';
import { ATTENDANCE_HERO_IMAGE } from '../../assets/heroBanners';
import { 
  CheckCircle, Calendar as CalendarIcon, UserCheck, ShieldCheck, CheckCircle2, XCircle, RefreshCw, ChevronLeft, ChevronRight, ListFilter, LayoutGrid, Check, X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePayment } from '../../context/PaymentContext';
import { io } from 'socket.io-client';

interface StudentAttendanceRecord {
  id: string;
  date: string;
  status: 'PRESENT' | 'ABSENT';
  block?: string;
  remarks?: string | null;
  createdAt?: string;
}

export const Attendance: React.FC = () => {
  const { studentUsn } = useAuth();
  const { student } = usePayment();
  const usnToUse = studentUsn || student?.usn || '';

  const [history, setHistory] = useState<StudentAttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'CALENDAR' | 'LIST'>('CALENDAR');

  // Calendar State (month & year)
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDayRecord, setSelectedDayRecord] = useState<StudentAttendanceRecord | null>(null);

  const fetchAttendanceHistory = async () => {
    if (!usnToUse) return;
    setIsLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/attendance/student/${encodeURIComponent(usnToUse)}`);
      const data = await res.json();
      if (res.ok && data.history) {
        setHistory(data.history);
      }
    } catch (err) {
      console.error('Failed to fetch attendance history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceHistory();
  }, [usnToUse]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    const socket = io('http://localhost:5000');
    const handleUpdate = () => { fetchAttendanceHistory(); };
    socket.on('ATTENDANCE_UPDATED', handleUpdate);
    socket.on('data_updated', handleUpdate);
    return () => {
      socket.off('ATTENDANCE_UPDATED', handleUpdate);
      socket.off('data_updated', handleUpdate);
      socket.disconnect();
    };
  }, [usnToUse]);

  const totalDays = history.length;
  const presentDays = history.filter(h => h.status === 'PRESENT').length;
  const absentDays = history.filter(h => h.status === 'ABSENT').length;
  const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon...
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Map history records by YYYY-MM-DD date string
  const historyByDateMap = useMemo(() => {
    const map = new Map<string, StudentAttendanceRecord>();
    history.forEach(rec => {
      if (rec.date) {
        map.set(rec.date, rec);
      }
    });
    return map;
  }, [history]);

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Hero Banner */}
      <HeroBanner
        title="ATTENDANCE HISTORY"
        subtitle="View your daily presence and absence records marked by hostel administration in calendar or list view."
        bgImage={ATTENDANCE_HERO_IMAGE}
        icon={UserCheck}
        badgeText="HOSTEL ATTENDANCE RECORD"
      />

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white border border-border p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xl shrink-0">
            {percentage}%
          </div>
          <div>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Attendance Rate</span>
            <span className="text-lg font-black text-text">{percentage >= 75 ? 'Satisfactory' : 'Needs Attention'}</span>
          </div>
        </div>

        <div className="bg-white border border-border p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Days Present</span>
            <span className="text-xl font-black text-emerald-600">{presentDays} Days</span>
          </div>
        </div>

        <div className="bg-white border border-border p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Days Absent</span>
            <span className="text-xl font-black text-rose-600">{absentDays} Days</span>
          </div>
        </div>

        <div className="bg-white border border-border p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Total Recorded</span>
            <span className="text-xl font-black text-slate-800">{totalDays} Days</span>
          </div>
        </div>

      </div>

      {/* Main Container Header with View Mode Switcher */}
      <div className="bg-white border border-border rounded-2xl p-6 sm:p-8 shadow-card space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-black text-text uppercase tracking-wider flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" />
              <span>Attendance History & Calendar</span>
            </h2>
            <p className="text-xs text-text-muted mt-0.5">Logged in real-time by hostel warden</p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode('CALENDAR')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'CALENDAR'
                    ? 'bg-white text-primary shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Calendar View</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('LIST')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'LIST'
                    ? 'bg-white text-primary shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>List View</span>
              </button>
            </div>

            <button
              onClick={fetchAttendanceHistory}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
              title="Refresh History"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CALENDAR VIEW                                                             */}
        {/* ========================================================================= */}
        {viewMode === 'CALENDAR' && (
          <div className="space-y-6">
            {/* Month Navigation */}
            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <button
                onClick={prevMonth}
                className="p-2 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="text-center">
                <span className="text-base font-black text-slate-900">{monthNames[month]} {year}</span>
                <span className="text-[10px] font-bold text-slate-400 block">Click any date tile for details</span>
              </div>

              <button
                onClick={nextMonth}
                className="p-2 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1.5 text-center">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="py-2 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  {d}
                </div>
              ))}

              {/* Blank Offset Tiles */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`blank-${i}`} className="h-16 sm:h-20 bg-slate-50/40 rounded-xl border border-dashed border-slate-100" />
              ))}

              {/* Month Day Tiles */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const formattedDay = String(dayNum).padStart(2, '0');
                const formattedMonth = String(month + 1).padStart(2, '0');
                const dateKey = `${year}-${formattedMonth}-${formattedDay}`;

                const record = historyByDateMap.get(dateKey);
                const isPresent = record?.status === 'PRESENT';
                const isAbsent = record?.status === 'ABSENT';

                return (
                  <div
                    key={dayNum}
                    onClick={() => record && setSelectedDayRecord(record)}
                    className={`h-16 sm:h-20 p-1.5 rounded-2xl border transition-all flex flex-col justify-between cursor-pointer ${
                      isPresent
                        ? 'bg-emerald-50/90 border-emerald-300 text-emerald-900 hover:scale-105 shadow-xs'
                        : isAbsent
                        ? 'bg-rose-50/90 border-rose-300 text-rose-900 hover:scale-105 shadow-xs'
                        : 'bg-white border-slate-200/80 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-black ${
                        isPresent ? 'text-emerald-700' : isAbsent ? 'text-rose-700' : 'text-slate-700'
                      }`}>
                        {dayNum}
                      </span>
                      {isPresent && <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />}
                      {isAbsent && <X className="w-3.5 h-3.5 text-rose-600 font-bold" />}
                    </div>

                    <div className="text-[9.5px] font-bold text-left">
                      {isPresent && (
                        <span className="px-1.5 py-0.5 bg-emerald-200/70 text-emerald-800 rounded-md block truncate">
                          Present
                        </span>
                      )}
                      {isAbsent && (
                        <span className="px-1.5 py-0.5 bg-rose-200/70 text-rose-800 rounded-md block truncate">
                          Absent
                        </span>
                      )}
                      {!record && (
                        <span className="text-slate-300 text-[9px]">--</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Date Detail Modal / Banner */}
            {selectedDayRecord && (
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-between gap-4 animate-fadeIn">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 block">
                    Attendance Detail • {selectedDayRecord.date}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                      selectedDayRecord.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {selectedDayRecord.status}
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      Block: {selectedDayRecord.block || 'Hostel'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedDayRecord(null)}
                  className="px-3 py-1 bg-white border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-100"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* LIST VIEW                                                                */}
        {/* ========================================================================= */}
        {viewMode === 'LIST' && (
          <div>
            {isLoading ? (
              <div className="py-12 text-center text-slate-400 font-semibold text-xs">
                Loading attendance records...
              </div>
            ) : history.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-600">No attendance records logged yet</p>
                <p className="text-xs text-slate-400 mt-1">Your attendance status logged by the warden will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <th className="p-3.5 rounded-l-xl">Date</th>
                      <th className="p-3.5">Hostel Block</th>
                      <th className="p-3.5">Recorded Status</th>
                      <th className="p-3.5 rounded-r-xl">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {history.map((record) => {
                      const isPresent = record.status === 'PRESENT';
                      return (
                        <tr key={record.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3.5 font-mono font-bold text-slate-900">
                            {record.date}
                          </td>
                          <td className="p-3.5">
                            <span className="font-bold text-slate-800">{record.block || 'Hostel'}</span>
                          </td>
                          <td className="p-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                              isPresent 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {isPresent ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                              {isPresent ? 'Present' : 'Absent'}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-500 text-[11px]">
                            {record.remarks || 'Regular Daily Roll Call'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
