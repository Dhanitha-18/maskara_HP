import { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, CheckCircle2, XCircle, Users, RefreshCw, Search, Save, AlertCircle
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
  const [activeTab, setActiveTab] = useState<'MARK' | 'HISTORY'>('MARK');
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

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

  // Fetch blocks
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

  // Fetch ALL students for selected date from backend once
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

  // Re-fetch ONLY when selectedDate changes (not when switching block filter)
  useEffect(() => {
    fetchAttendance();
  }, [selectedDate]);

  // Real-time socket sync (only if user hasn't made unsaved edits)
  useEffect(() => {
    const handleUpdate = () => { 
      if (!hasUnsavedChanges) fetchAttendance(); 
    };
    socket.on('ATTENDANCE_UPDATED', handleUpdate);
    socket.on('data_updated', handleUpdate);
    return () => {
      socket.off('ATTENDANCE_UPDATED', handleUpdate);
      socket.off('data_updated', handleUpdate);
    };
  }, [selectedDate, hasUnsavedChanges]);

  // Mark all students in the currently selected block locally in UI state
  const handleBulkSetStatus = (status: 'PRESENT' | 'ABSENT') => {
    setAttendanceList(prev => prev.map(a => {
      if (selectedBlock !== 'ALL') {
        const reqBlock = selectedBlock.toLowerCase().replace(/[^a-z0-9]/g, '');
        const b = (a.block || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!b.includes(reqBlock) && !reqBlock.includes(b)) {
          return a; // Keep unchanged if not in selected block
        }
      }
      return { ...a, status };
    }));
    setHasUnsavedChanges(true);
    toast.info(`Marked residents in ${selectedBlock} as ${status} locally. Click "Submit Attendance" to save!`);
  };

  // Toggle individual student locally in UI state without auto-saving
  const handleToggleIndividualStatus = (item: AttendanceItem) => {
    const newStatus = item.status === 'PRESENT' ? 'ABSENT' : 'PRESENT';
    setAttendanceList(prev => prev.map(a => a.studentUsn === item.studentUsn ? { ...a, status: newStatus } : a));
    setHasUnsavedChanges(true);
  };

  // Explicit Submit Attendance action button (Instant 0ms Optimistic Feedback)
  const handleSubmitAttendance = async () => {
    if (attendanceList.length === 0) {
      toast.error('No attendance records to submit.');
      return;
    }

    // Optimistic UI response (0ms wait)
    setHasUnsavedChanges(false);
    toast.success(`Attendance submitted successfully for ${attendanceList.length} residents!`);

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

  // Ultra-fast in-memory filtering by block, search query, and sub-admin block permissions
  const filteredList = useMemo(() => {
    return attendanceList.filter(item => {
      // Sub-admin Block Jurisdiction check
      if (role !== 'CHIEF' && allowedBlocks && !allowedBlocks.includes('ALL')) {
        const itemB = (item.block || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const isAllowed = allowedBlocks.some(ab => {
          const normAb = ab.toLowerCase().replace(/[^a-z0-9]/g, '');
          return itemB.includes(normAb) || normAb.includes(itemB);
        });
        if (!isAllowed) return false;
      }

      // Block filter dropdown check
      if (selectedBlock && selectedBlock.toUpperCase() !== 'ALL') {
        const reqBlock = selectedBlock.toLowerCase().replace(/[^a-z0-9]/g, '');
        const b = (item.block || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!b.includes(reqBlock) && !reqBlock.includes(b)) {
          return false;
        }
      }

      // Search query check
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
              Mark attendance by blocks and click "Submit Attendance" to persist changes to database and student portal.
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

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-2xl w-fit border border-slate-200">
        <button
          onClick={() => setActiveTab('MARK')}
          className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'MARK' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Mark Daily Attendance
        </button>
        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'HISTORY' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Attendance History
        </button>
      </div>

      {activeTab === 'HISTORY' && (
        <div className="bg-white/80 backdrop-blur-2xl border border-white/60 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900">Attendance History Logs</h3>
            <button
              onClick={fetchHistory}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isHistoryLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {isHistoryLoading ? (
            <div className="py-12 text-center text-slate-400 font-semibold text-xs">Loading history logs...</div>
          ) : historyList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-semibold text-xs">No attendance history records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 text-white font-bold uppercase text-[10px] tracking-wider">
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Student Details</th>
                    <th className="p-3.5">USN</th>
                    <th className="p-3.5">Block & Room</th>
                    <th className="p-3.5 text-center">Attendance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {historyList.map((rec: any, idx: number) => {
                    const isPresent = rec.status === 'PRESENT';
                    return (
                      <tr key={rec.id || idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-slate-800">{rec.date}</td>
                        <td className="p-3.5 font-bold text-slate-900">{rec.studentName}</td>
                        <td className="p-3.5 font-mono font-bold text-indigo-600">{rec.studentUsn}</td>
                        <td className="p-3.5 text-slate-700 font-semibold">{rec.block} • Room {rec.roomNo}</td>
                        <td className="p-3.5 text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isPresent ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-rose-100 text-rose-700 border border-rose-200'
                          }`}>
                            {rec.status}
                          </span>
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

      {activeTab === 'MARK' && (
        <>

      {/* Control Bar & Action Buttons */}
      <div className="bg-white/80 backdrop-blur-2xl border border-white/60 rounded-3xl p-6 shadow-[10px_10px_40px_-10px_rgba(0,0,0,0.05)] space-y-4">
        {hasUnsavedChanges && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2 text-amber-900 text-xs font-bold">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>You have unsaved attendance edits. Click <strong>"Submit Attendance"</strong> below to save changes.</span>
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

          {/* Action & Submit Buttons */}
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

            {/* EXPLICIT SUBMIT ATTENDANCE BUTTON */}
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
              <span>{isSubmitting ? 'Submitting...' : `Submit Attendance (${attendanceList.length})`}</span>
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
                  <th className="p-4">USN</th>
                  <th className="p-4">Block & Room</th>
                  <th className="p-4">Date</th>
                  <th className="p-4 text-center rounded-tr-xl">Toggle Action</th>
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

                      <td className="p-4 font-mono font-bold text-slate-800 uppercase">
                        {item.studentUsn}
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
                            title={isPresent ? 'Currently Present — click to mark Absent' : 'Currently Absent — click to mark Present'}
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
    </div>
  );
}
