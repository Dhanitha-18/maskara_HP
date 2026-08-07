import { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, CheckCircle2, XCircle, Users, RefreshCw, Search, Save, AlertCircle, ChevronLeft, ChevronRight, Check, X, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../store/useAuthStore';
import { socket } from '../lib/socket';

interface AttendanceItem {
  id: string;
  studentUsn: string;
  studentName: string;
  phoneNumber: string;
  gender: string;
  block: string;
  roomNo: string;
  date: string;
  status: 'PRESENT' | 'ABSENT';
  remarks?: string | null;
}

export default function AttendanceManagement() {
  const { role, allowedBlocks } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedBlock, setSelectedBlock] = useState<string>('ALL');
  const [attendanceList, setAttendanceList] = useState<AttendanceItem[]>([]);
  const [systemBlocks, setSystemBlocks] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<'MARK' | 'EDIT' | 'HISTORY'>('MARK');
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyBlockFilter, setHistoryBlockFilter] = useState('ALL');

  // Selected Student for Calendar Popup Modal
  const [selectedCalendarStudent, setSelectedCalendarStudent] = useState<{ usn: string; name: string; block?: string; roomNo?: string } | null>(null);
  const [calendarHistory, setCalendarHistory] = useState<any[]>([]);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());

  const fetchHistory = async () => {
    setIsHistoryLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/attendance/history');
      const data = await res.json();
      if (res.ok && data.history) {
        setHistoryList(data.history);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'HISTORY') {
      fetchHistory();
    }
  }, [activeTab]);

  // Fetch student attendance calendar records when modal opens
  useEffect(() => {
    if (selectedCalendarStudent) {
      setIsCalendarLoading(true);
      fetch(`http://localhost:5000/api/attendance/student/${encodeURIComponent(selectedCalendarStudent.usn)}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.history) {
            setCalendarHistory(data.history);
          }
        })
        .catch(err => console.error('Failed to load student calendar', err))
        .finally(() => setIsCalendarLoading(false));
    }
  }, [selectedCalendarStudent]);

  // Fetch available blocks
  useEffect(() => {
    fetch('http://localhost:5000/api/blocks')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          let names = data.map((b: any) => b.name);
          if (role !== 'CHIEF' && allowedBlocks && !allowedBlocks.includes('ALL')) {
            names = names.filter((n: string) => allowedBlocks.includes(n));
          }
          setSystemBlocks(names);
          if (names.length > 0 && !names.includes(selectedBlock) && selectedBlock !== 'ALL') {
            setSelectedBlock(names[0]);
          }
        }
      })
      .catch(() => {});
  }, [role, allowedBlocks]);

  // Fetch ALL students for selected date from backend
  const fetchAttendance = async () => {
    if (attendanceList.length === 0) setIsLoading(true);
    try {
      const url = `http://localhost:5000/api/attendance?date=${selectedDate}&block=ALL`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.attendance) {
        setAttendanceList(data.attendance);
        setHasUnsavedChanges(false);
      }
    } catch (err) {
      console.error('Fetch attendance error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate]);

  // Real-time socket sync
  useEffect(() => {
    const handleUpdate = () => { 
      if (!hasUnsavedChanges) fetchAttendance(); 
      if (activeTab === 'HISTORY') fetchHistory();
    };
    socket.on('ATTENDANCE_UPDATED', handleUpdate);
    socket.on('data_updated', handleUpdate);
    return () => {
      socket.off('ATTENDANCE_UPDATED', handleUpdate);
      socket.off('data_updated', handleUpdate);
    };
  }, [selectedDate, hasUnsavedChanges, activeTab]);

  // Bulk set status locally
  const handleBulkSetStatus = (status: 'PRESENT' | 'ABSENT') => {
    setAttendanceList(prev => prev.map(a => {
      if (selectedBlock !== 'ALL') {
        const reqBlock = selectedBlock.toLowerCase().replace(/[^a-z0-9]/g, '');
        const b = (a.block || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!b.includes(reqBlock) && !reqBlock.includes(b)) {
          return a;
        }
      }
      return { ...a, status };
    }));
    setHasUnsavedChanges(true);
    toast.info(`Marked residents in ${selectedBlock} as ${status} locally. Click "Save Attendance Changes" to update!`);
  };

  // Toggle individual student status
  const handleToggleIndividualStatus = (item: AttendanceItem) => {
    const newStatus = item.status === 'PRESENT' ? 'ABSENT' : 'PRESENT';
    setAttendanceList(prev => prev.map(a => a.studentUsn === item.studentUsn ? { ...a, status: newStatus } : a));
    setHasUnsavedChanges(true);
  };

  // Submit attendance updates (for both Mark & Edit tabs) with realtime socket broadcast
  const handleSubmitAttendance = async () => {
    if (attendanceList.length === 0) {
      toast.error('No attendance records to submit.');
      return;
    }

    setHasUnsavedChanges(false);
    toast.success(`Attendance updated successfully for ${attendanceList.length} residents!`);

    setIsSubmitting(true);
    try {
      await fetch('http://localhost:5000/api/attendance/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          records: attendanceList
        })
      });
    } catch (err) {
      console.error('Submit error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered list for Mark and Edit tabs
  const filteredList = useMemo(() => {
    return attendanceList.filter(item => {
      if (role !== 'CHIEF' && allowedBlocks && !allowedBlocks.includes('ALL')) {
        const itemB = (item.block || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const isAllowed = allowedBlocks.some(ab => {
          const normAb = ab.toLowerCase().replace(/[^a-z0-9]/g, '');
          return itemB.includes(normAb) || normAb.includes(itemB);
        });
        if (!isAllowed) return false;
      }

      if (selectedBlock && selectedBlock.toUpperCase() !== 'ALL') {
        const reqBlock = selectedBlock.toLowerCase().replace(/[^a-z0-9]/g, '');
        const b = (item.block || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!b.includes(reqBlock) && !reqBlock.includes(b)) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.studentName.toLowerCase().includes(q) ||
          item.studentUsn.toLowerCase().includes(q) ||
          item.roomNo.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [attendanceList, selectedBlock, searchQuery, role, allowedBlocks]);

  // Group history records by unique student USN for Attendance History tab with Search & Block filtering
  const uniqueStudentHistory = useMemo(() => {
    const map = new Map<string, any>();
    historyList.forEach(rec => {
      if (rec.studentUsn && !map.has(rec.studentUsn)) {
        map.set(rec.studentUsn, rec);
      }
    });
    const allUnique = Array.from(map.values());

    return allUnique.filter(rec => {
      if (historyBlockFilter !== 'ALL') {
        const recBlock = String(rec.block || rec.hostelBlock || '').trim().toLowerCase();
        if (recBlock !== historyBlockFilter.trim().toLowerCase()) return false;
      }
      if (historySearchQuery.trim()) {
        const q = historySearchQuery.toLowerCase().trim();
        const nameMatch = String(rec.studentName || '').toLowerCase().includes(q);
        const usnMatch = String(rec.studentUsn || '').toLowerCase().includes(q);
        const blockMatch = String(rec.block || '').toLowerCase().includes(q);
        const roomMatch = String(rec.roomNo || '').toLowerCase().includes(q);
        return nameMatch || usnMatch || blockMatch || roomMatch;
      }
      return true;
    });
  }, [historyList, historyBlockFilter, historySearchQuery]);

  // Calendar calculations for selected student popup modal
  const cYear = calendarDate.getFullYear();
  const cMonth = calendarDate.getMonth();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const firstDayOfMonth = new Date(cYear, cMonth, 1).getDay();
  const daysInMonth = new Date(cYear, cMonth + 1, 0).getDate();

  const calendarMap = useMemo(() => {
    const map = new Map<string, any>();
    calendarHistory.forEach(rec => {
      if (rec.date) map.set(rec.date, rec);
    });
    return map;
  }, [calendarHistory]);

  const presentCount = filteredList.filter(a => a.status === 'PRESENT').length;
  const absentCount = filteredList.filter(a => a.status === 'ABSENT').length;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-400/30 px-3 py-1 rounded-full text-xs font-bold text-indigo-200">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Daily Student Attendance Tracking</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight">Attendance Management</h1>
            <p className="text-sm font-semibold text-slate-300 max-w-xl">
              Mark or edit daily student attendance by block and view individual attendance calendars in real-time.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/20">
            <div className="text-center">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Present</span>
              <span className="text-2xl font-black text-emerald-400">{presentCount}</span>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="text-center">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Absent</span>
              <span className="text-2xl font-black text-rose-400">{absentCount}</span>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="text-center">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Total</span>
              <span className="text-2xl font-black text-white">{attendanceList.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs (3 options: Mark Daily Attendance | Edit Attendance | Attendance History) */}
      <div className="flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-2xl w-fit border border-slate-200">
        <button
          onClick={() => setActiveTab('MARK')}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'MARK' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Mark Daily Attendance
        </button>
        <button
          onClick={() => setActiveTab('EDIT')}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'EDIT' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Edit Attendance
        </button>
        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'HISTORY' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Attendance History
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ATTENDANCE HISTORY TAB (Without Date Column, View button opens Calendar)   */}
      {/* ========================================================================= */}
      {activeTab === 'HISTORY' && (
        <div className="bg-white/80 backdrop-blur-2xl border border-white/60 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900">Attendance History Logs</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Click "View" to open individual student attendance calendar.</p>
            </div>
            <button
              onClick={fetchHistory}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isHistoryLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {/* Search & Block Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={historySearchQuery}
                onChange={e => setHistorySearchQuery(e.target.value)}
                placeholder="Search history by Student Name, USN, Room..."
                className="w-full pl-10 pr-4 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:border-indigo-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Filter Block:</span>
              <select
                value={historyBlockFilter}
                onChange={e => setHistoryBlockFilter(e.target.value)}
                className="bg-white border border-slate-200 text-slate-800 text-xs font-bold px-3 py-2 rounded-xl outline-none cursor-pointer w-full sm:w-48"
              >
                <option value="ALL">All Hostel Blocks</option>
                {systemBlocks.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          {isHistoryLoading ? (
            <div className="py-12 text-center text-slate-400 font-semibold text-xs">Loading history logs...</div>
          ) : uniqueStudentHistory.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-semibold text-xs">No attendance history records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 text-white font-bold uppercase text-[10px] tracking-wider">
                    <th className="p-3.5 rounded-tl-xl">Student Details</th>
                    <th className="p-3.5">Block & Room</th>
                    <th className="p-3.5 text-center rounded-tr-xl">Attendance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {uniqueStudentHistory.map((rec: any, idx: number) => {
                    return (
                      <tr key={rec.id || rec.studentUsn || idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black uppercase text-xs">
                              {rec.studentName?.charAt(0) || 'S'}
                            </div>
                            <div>
                              <div className="font-extrabold text-slate-900">{rec.studentName}</div>
                              <div className="text-[10px] text-slate-400 font-normal">{rec.phoneNumber || 'Student Resident'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-700 font-semibold">{rec.block || 'Main Block'} • Room {rec.roomNo || 'N/A'}</td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => setSelectedCalendarStudent({ usn: rec.studentUsn, name: rec.studentName, block: rec.block, roomNo: rec.roomNo })}
                            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Calendar</span>
                          </button>
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

      {/* ========================================================================= */}
      {/* MARK & EDIT ATTENDANCE TABS                                               */}
      {/* ========================================================================= */}
      {(activeTab === 'MARK' || activeTab === 'EDIT') && (
        <>
          {/* Control Bar & Actions */}
          <div className="bg-white/80 backdrop-blur-2xl border border-white/60 rounded-3xl p-6 shadow-[10px_10px_40px_-10px_rgba(0,0,0,0.05)] space-y-4">
            {hasUnsavedChanges && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2 text-amber-900 text-xs font-bold">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>You have unsaved attendance edits. Click <strong>"Save Attendance Changes"</strong> below to persist and sync.</span>
              </div>
            )}

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              
              {/* Date & Block Selectors */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Select Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Filter Block</label>
                  <select
                    value={selectedBlock}
                    onChange={e => setSelectedBlock(e.target.value)}
                    className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  >
                    {(role === 'CHIEF' || (allowedBlocks && allowedBlocks.includes('ALL'))) && (
                      <option value="ALL">All Assigned Blocks</option>
                    )}
                    {systemBlocks.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 flex-1 min-w-[200px]">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Search Student</label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search student or room..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 lg:pt-0">
                <button
                  onClick={() => handleBulkSetStatus('PRESENT')}
                  className="px-3.5 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Mark All Present</span>
                </button>

                <button
                  onClick={() => handleBulkSetStatus('ABSENT')}
                  className="px-3.5 py-2.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>Mark All Absent</span>
                </button>

                <button
                  onClick={handleSubmitAttendance}
                  disabled={isSubmitting}
                  className={`px-5 py-2.5 rounded-xl font-black text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer ${
                    hasUnsavedChanges
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30 scale-105 animate-pulse'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                  } disabled:opacity-50`}
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{isSubmitting ? 'Saving...' : activeTab === 'EDIT' ? `Save Edits (${attendanceList.length})` : `Submit Attendance (${attendanceList.length})`}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Attendance List Table */}
          <div className="bg-white/80 backdrop-blur-2xl border border-white/60 rounded-3xl p-6 shadow-[10px_10px_40px_-10px_rgba(0,0,0,0.05)] overflow-hidden">
            {isLoading ? (
              <div className="py-16 text-center text-slate-400 font-semibold text-sm">
                Loading attendance records for {selectedDate}...
              </div>
            ) : filteredList.length === 0 ? (
              <div className="py-16 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-600">No allocated residents found</p>
                <p className="text-xs text-slate-400 mt-1">There are no allocated students in the selected block.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/70 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <th className="p-4 rounded-tl-xl">Student Details</th>
                      <th className="p-4">Block & Room</th>
                      <th className="p-4">Date</th>
                      <th className="p-4 text-center rounded-tr-xl">
                        {activeTab === 'EDIT' ? 'Edit Attendance Status' : 'Toggle Action'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {filteredList.map((item) => {
                      const isPresent = item.status === 'PRESENT';
                      return (
                        <tr key={item.studentUsn} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                                isPresent ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                              }`}>
                                {item.studentName.charAt(0)}
                              </div>
                              <div>
                                <p className="font-extrabold text-slate-900 text-sm">{item.studentName}</p>
                                <p className="text-[10px] text-slate-400">{item.phoneNumber || 'No phone'}</p>
                              </div>
                            </div>
                          </td>

                          <td className="p-4">
                            <span className="font-bold text-slate-800">{item.block}</span>
                            <span className="text-slate-400 text-[11px] block font-normal">Room {item.roomNo}</span>
                          </td>

                          <td className="p-4 font-mono text-slate-500">
                            {item.date}
                          </td>

                          <td className="p-4">
                            <div className="flex items-center justify-center gap-3">
                              <span className={`text-[11px] font-black uppercase tracking-wider ${isPresent ? 'text-slate-300' : 'text-rose-600'}`}>
                                Absent
                              </span>
                              <button
                                onClick={() => handleToggleIndividualStatus(item)}
                                className={`relative w-14 h-7 rounded-full transition-all duration-300 ease-in-out cursor-pointer shadow-inner focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                                  isPresent
                                    ? 'bg-emerald-500 focus:ring-emerald-400'
                                    : 'bg-rose-500 focus:ring-rose-400'
                                }`}
                                title={isPresent ? 'Currently Present — click to edit to Absent' : 'Currently Absent — click to edit to Present'}
                              >
                                <span
                                  className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ease-in-out flex items-center justify-center ${
                                    isPresent ? 'left-[30px]' : 'left-0.5'
                                  }`}
                                >
                                  {isPresent
                                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    : <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                  }
                                </span>
                              </button>
                              <span className={`text-[11px] font-black uppercase tracking-wider ${isPresent ? 'text-emerald-600' : 'text-slate-300'}`}>
                                Present
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* STUDENT ATTENDANCE CALENDAR MODAL                                         */}
      {/* ========================================================================= */}
      {selectedCalendarStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 border border-slate-200 shadow-2xl">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-black text-slate-900">{selectedCalendarStudent.name}</h3>
                </div>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  {selectedCalendarStudent.block} Room {selectedCalendarStudent.roomNo || 'N/A'}
                </p>
              </div>
              <button
                onClick={() => setSelectedCalendarStudent(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 font-bold flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Calendar Controls */}
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <button
                onClick={() => setCalendarDate(new Date(cYear, cMonth - 1, 1))}
                className="p-1.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="text-center">
                <span className="text-sm font-black text-slate-900">{monthNames[cMonth]} {cYear}</span>
                <span className="text-[9.5px] font-bold text-slate-400 block">Attendance History Log</span>
              </div>

              <button
                onClick={() => setCalendarDate(new Date(cYear, cMonth + 1, 1))}
                className="p-1.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Calendar Grid */}
            {isCalendarLoading ? (
              <div className="py-12 text-center text-slate-400 font-semibold text-xs">Loading student calendar records...</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-7 gap-1 text-center">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="py-1 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                      {d}
                    </div>
                  ))}

                  {/* Blank Offset Tiles */}
                  {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                    <div key={`blank-${i}`} className="h-10 bg-slate-50/50 rounded-lg border border-dashed border-slate-100" />
                  ))}

                  {/* Month Day Tiles */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const formattedDay = String(dayNum).padStart(2, '0');
                    const formattedMonth = String(cMonth + 1).padStart(2, '0');
                    const dateKey = `${cYear}-${formattedMonth}-${formattedDay}`;

                    const rec = calendarMap.get(dateKey);
                    const isPresent = rec?.status === 'PRESENT';
                    const isAbsent = rec?.status === 'ABSENT';

                    return (
                      <div
                        key={dayNum}
                        title={rec ? `${dateKey}: ${rec.status}` : `${dateKey}: No record logged`}
                        className={`h-10 rounded-xl border flex flex-col items-center justify-center relative transition-all ${
                          isPresent
                            ? 'bg-emerald-500 text-white border-emerald-600 font-black shadow-xs'
                            : isAbsent
                            ? 'bg-rose-500 text-white border-rose-600 font-black shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 font-semibold'
                        }`}
                      >
                        <span className="text-xs font-extrabold">{dayNum}</span>
                        {isPresent && <Check className="w-3 h-3 text-white absolute bottom-0.5" />}
                        {isAbsent && <X className="w-3 h-3 text-white absolute bottom-0.5" />}
                      </div>
                    );
                  })}
                </div>

                {/* Calendar Status Legend */}
                <div className="flex items-center justify-center gap-6 pt-2 text-xs font-bold border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 rounded-md bg-emerald-500 border border-emerald-600 flex items-center justify-center text-white">
                      <Check className="w-2.5 h-2.5 font-bold" />
                    </div>
                    <span className="text-slate-700">Present</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 rounded-md bg-rose-500 border border-rose-600 flex items-center justify-center text-white">
                      <X className="w-2.5 h-2.5 font-bold" />
                    </div>
                    <span className="text-slate-700">Absent</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 rounded-md bg-white border border-slate-300" />
                    <span className="text-slate-400">No Record</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
