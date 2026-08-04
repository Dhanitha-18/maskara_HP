import React, { useState } from 'react';
import { HeroBanner } from '../../components/layout/HeroBanner';
import { ATTENDANCE_HERO_IMAGE } from '../../assets/heroBanners';
import { 
  CheckCircle, Clock, Calendar, UserCheck, ShieldCheck, MapPin, 
  QrCode, Camera, FileText, Download, CheckCircle2, Send, Smartphone
} from 'lucide-react';

interface AttendanceRecord {
  date: string;
  status: 'Present' | 'Absent' | 'On Approved Leave' | 'Late Entry';
  time: string;
  method: string;
  verificationDetails?: string;
}

interface OutpassRequest {
  id: string;
  type: 'Late Night Pass' | 'Weekend Outpass';
  fromDate: string;
  toDate: string;
  reason: string;
  status: 'Approved' | 'Pending Warden Review' | 'Rejected';
}

const INITIAL_RECORDS: AttendanceRecord[] = [
  { date: '18 July 2026', status: 'Present', time: '9:12 PM', method: 'GPS Geofence App', verificationDetails: 'Perimeter Verified (Room 304)' },
  { date: '17 July 2026', status: 'Present', time: '8:55 PM', method: 'QR Door Scan', verificationDetails: 'Door QR #PG-304' },
  { date: '16 July 2026', status: 'Present', time: '9:04 PM', method: 'GPS Geofence App', verificationDetails: 'Perimeter Verified' },
  { date: '15 July 2026', status: 'On Approved Leave', time: '--', method: 'Outpass Approved', verificationDetails: 'Ticket #OUT-8890' },
  { date: '14 July 2026', status: 'Present', time: '9:15 PM', method: 'GPS Geofence App', verificationDetails: 'Perimeter Verified' },
  { date: '13 July 2026', status: 'Late Entry', time: '10:05 PM', method: 'Late Night Pass', verificationDetails: 'Special Gate Pass #LP-102' },
  { date: '12 July 2026', status: 'Present', time: '8:40 PM', method: 'QR Door Scan', verificationDetails: 'Door QR #PG-304' }
];

const INITIAL_OUTPASSES: OutpassRequest[] = [
  {
    id: 'OUT-8890',
    type: 'Weekend Outpass',
    fromDate: '15 July 2026',
    toDate: '16 July 2026',
    reason: 'Visiting hometown for family function',
    status: 'Approved'
  }
];

export const Attendance: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>(() => {
    try {
      const saved = localStorage.getItem('attendance_records');
      return saved ? JSON.parse(saved) : INITIAL_RECORDS;
    } catch {
      return INITIAL_RECORDS;
    }
  });

  const [outpasses, setOutpasses] = useState<OutpassRequest[]>(() => {
    try {
      const saved = localStorage.getItem('attendance_outpasses');
      return saved ? JSON.parse(saved) : INITIAL_OUTPASSES;
    } catch {
      return INITIAL_OUTPASSES;
    }
  });
  
  // Verification check-in simulator modes
  const [simulatedTimeMode, setSimulatedTimeMode] = useState<'before' | 'active' | 'after'>('active');
  const [checkInMethod, setCheckInMethod] = useState<'GPS' | 'QR' | 'Selfie'>('GPS');
  
  const [isCheckedInToday, setIsCheckedInToday] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('attendance_is_checked_in');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const [checkInTime, setCheckInTime] = useState<string>(() => {
    return localStorage.getItem('attendance_check_in_time') || '';
  });

  // Interactive QR Scanner Modal
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrScanning, setQrScanning] = useState(false);

  // Interactive Selfie Scanner Modal
  const [showSelfieModal, setShowSelfieModal] = useState(false);
  const [selfieScanning, setSelfieScanning] = useState(false);

  // Interactive Gate Pass QR Modal
  const [selectedOutpassForQR, setSelectedOutpassForQR] = useState<OutpassRequest | null>(null);

  // Parent SMS Log Modal
  const [showParentSMSModal, setShowParentSMSModal] = useState(false);

  // Outpass Modal
  const [showOutpassModal, setShowOutpassModal] = useState(false);
  const [outpassType, setOutpassType] = useState<'Late Night Pass' | 'Weekend Outpass'>('Late Night Pass');
  const [outpassReason, setOutpassReason] = useState('');
  const [outpassFromDate, setOutpassFromDate] = useState('2026-07-22');
  const [outpassToDate, setOutpassToDate] = useState('2026-07-22');
  const [outpassSuccessToast, setOutpassSuccessToast] = useState(false);

  // Effects to persist states
  React.useEffect(() => {
    try {
      localStorage.setItem('attendance_records', JSON.stringify(records));
    } catch (e) {
      console.error(e);
    }
  }, [records]);

  React.useEffect(() => {
    try {
      localStorage.setItem('attendance_outpasses', JSON.stringify(outpasses));
    } catch (e) {
      console.error(e);
    }
  }, [outpasses]);

  React.useEffect(() => {
    try {
      localStorage.setItem('attendance_is_checked_in', JSON.stringify(isCheckedInToday));
    } catch (e) {
      console.error(e);
    }
  }, [isCheckedInToday]);

  React.useEffect(() => {
    try {
      localStorage.setItem('attendance_check_in_time', checkInTime);
    } catch (e) {
      console.error(e);
    }
  }, [checkInTime]);

  const handleMarkPresent = (methodUsed: string) => {
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    setIsCheckedInToday(true);
    setCheckInTime(timeStr);

    const newRecord: AttendanceRecord = {
      date: dateStr,
      status: 'Present',
      time: timeStr,
      method: methodUsed,
      verificationDetails: 'Authenticated via Portal'
    };

    setRecords([newRecord, ...records]);
    setShowQRModal(false);
    setShowSelfieModal(false);
  };

  const handleSimulateQRScan = () => {
    setQrScanning(true);
    setTimeout(() => {
      setQrScanning(false);
      handleMarkPresent('QR Door Scan (#PG-304)');
    }, 1800);
  };

  const handleSimulateSelfieScan = () => {
    setSelfieScanning(true);
    setTimeout(() => {
      setSelfieScanning(false);
      handleMarkPresent('Selfie Face ID Check');
    }, 1800);
  };

  const handleApplyOutpass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!outpassReason) return;

    const newPass: OutpassRequest = {
      id: `OUT-${Math.floor(1000 + Math.random() * 9000)}`,
      type: outpassType,
      fromDate: outpassFromDate,
      toDate: outpassToDate,
      reason: outpassReason,
      status: 'Approved' // Instant auto-approval for demo
    };

    setOutpasses([newPass, ...outpasses]);
    setOutpassReason('');
    setOutpassSuccessToast(true);
    setTimeout(() => {
      setOutpassSuccessToast(false);
      setShowOutpassModal(false);
    }, 1500);
  };

  const getStatusStyle = (s: string) => {
    switch (s) {
      case 'Present': return 'bg-success/10 text-success border-success/20';
      case 'Absent': return 'bg-danger/10 text-danger border-danger/20';
      case 'On Approved Leave': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Late Entry': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Stats calculation
  const totalDays = 30;
  const presentCount = records.filter(r => r.status === 'Present' || r.status === 'Late Entry').length;
  const leaveCount = records.filter(r => r.status === 'On Approved Leave').length;
  const attendancePercentage = ((presentCount / (totalDays - leaveCount)) * 100).toFixed(1);

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      <HeroBanner 
        image={ATTENDANCE_HERO_IMAGE}
        title="Night Roll-Call & Outpass Portal"
      />

      {/* KPI Stats Header */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-border p-4 rounded-2xl shadow-soft flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Attendance Rate</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-black text-slate-900 font-mono">{attendancePercentage}%</span>
              <span className="text-[9.5px] bg-success/10 text-success font-bold px-1.5 py-0.5 rounded">Eligible (&gt;85%)</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-border p-4 rounded-2xl shadow-soft flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Days Present</span>
            <span className="text-xl font-black text-success font-mono mt-0.5 block">{presentCount} Days</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-success/10 text-success flex items-center justify-center font-bold">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-border p-4 rounded-2xl shadow-soft flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Approved Outpasses</span>
            <span className="text-xl font-black text-blue-600 font-mono mt-0.5 block">{leaveCount} Days</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-border p-4 rounded-2xl shadow-soft flex items-center justify-center">
          <button
            onClick={() => setShowOutpassModal(true)}
            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>Apply Gate / Outpass</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Attendance Check-In Controller */}
        <div className="space-y-6">
          <div className="bg-white border border-border p-6 rounded-2xl shadow-soft space-y-5">
            <div>
              <h3 className="text-sm font-black text-text uppercase tracking-wider">Tonight Roll-Call Desk</h3>
              <p className="text-[11px] text-text-muted mt-0.5 font-semibold">Strict window: 7:30 PM to 9:30 PM daily</p>
            </div>

            {/* Time Window Simulator Switcher */}
            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl space-y-1.5">
              <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider block">Time Window Simulator:</span>
              <div className="grid grid-cols-3 gap-1 text-[9.5px] font-bold">
                <button
                  onClick={() => { setSimulatedTimeMode('before'); setIsCheckedInToday(false); }}
                  className={`p-1.5 rounded-lg border transition-all ${simulatedTimeMode === 'before' ? 'bg-primary text-white border-primary' : 'bg-white text-slate-700 border-border'}`}
                  type="button"
                >
                  Before 7:30 PM
                </button>
                <button
                  onClick={() => { setSimulatedTimeMode('active'); }}
                  className={`p-1.5 rounded-lg border transition-all ${simulatedTimeMode === 'active' ? 'bg-primary text-white border-primary' : 'bg-white text-slate-700 border-border'}`}
                  type="button"
                >
                  7:30 - 9:30 PM
                </button>
                <button
                  onClick={() => { setSimulatedTimeMode('after'); setIsCheckedInToday(false); }}
                  className={`p-1.5 rounded-lg border transition-all ${simulatedTimeMode === 'after' ? 'bg-primary text-white border-primary' : 'bg-white text-slate-700 border-border'}`}
                  type="button"
                >
                  After 9:30 PM
                </button>
              </div>
            </div>

            {/* Check-in Method Selector */}
            {!isCheckedInToday && simulatedTimeMode === 'active' && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Verification Method:</span>
                <div className="grid grid-cols-3 gap-2 text-[10px] font-bold">
                  <button
                    onClick={() => setCheckInMethod('GPS')}
                    className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                      checkInMethod === 'GPS' ? 'bg-primary/10 border-primary text-primary' : 'bg-slate-50 text-slate-700 border-border'
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                    <span>GPS Geofence</span>
                  </button>

                  <button
                    onClick={() => setCheckInMethod('QR')}
                    className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                      checkInMethod === 'QR' ? 'bg-primary/10 border-primary text-primary' : 'bg-slate-50 text-slate-700 border-border'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Door QR Scan</span>
                  </button>

                  <button
                    onClick={() => setCheckInMethod('Selfie')}
                    className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                      checkInMethod === 'Selfie' ? 'bg-primary/10 border-primary text-primary' : 'bg-slate-50 text-slate-700 border-border'
                    }`}
                  >
                    <Camera className="w-4 h-4" />
                    <span>Selfie Check</span>
                  </button>
                </div>
              </div>
            )}

            {/* Status Display Card */}
            <div className="bg-slate-50 border border-slate-100 p-5 rounded-xl flex flex-col items-center justify-center text-center space-y-3">
              {isCheckedInToday ? (
                <>
                  <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center text-success border border-success/20">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Tonight Roll-Call</span>
                    <span className="text-success font-black text-base uppercase mt-0.5 block">Marked Present</span>
                    <p className="text-[10.5px] text-text-muted font-bold mt-1">Logged at {checkInTime} via Portal App</p>
                  </div>
                </>
              ) : (
                <>
                  {simulatedTimeMode === 'before' && (
                    <>
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 border border-slate-200">
                        <Clock className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Window Closed</span>
                        <span className="text-primary font-black text-xs uppercase mt-1 block">Roll-Call opens at 7:30 PM</span>
                      </div>
                    </>
                  )}

                  {simulatedTimeMode === 'active' && (
                    <>
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary border border-primary/20">
                        <Clock className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Roll-Call Active</span>
                        <span className="text-warning font-black text-xs uppercase mt-0.5 block">Awaiting Confirmation</span>
                        <p className="text-[10.5px] text-text-muted font-semibold mt-1 leading-relaxed">
                          Verify location or scan door QR code before 9:30 PM.
                        </p>
                      </div>
                    </>
                  )}

                  {simulatedTimeMode === 'after' && (
                    <>
                      <div className="w-12 h-12 bg-danger/10 rounded-full flex items-center justify-center text-danger border border-danger/20">
                        <Clock className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Window Closed</span>
                        <span className="text-danger font-black text-sm uppercase mt-0.5 block">Marked Absent</span>
                        <p className="text-[10.5px] text-danger/80 font-bold mt-1 leading-relaxed">
                          Window closed at 9:30 PM. Automatic SMS dispatched to parent.
                        </p>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Check-In Action Button */}
            {simulatedTimeMode === 'active' && !isCheckedInToday && (
              <button
                onClick={() => {
                  if (checkInMethod === 'QR') {
                    setShowQRModal(true);
                  } else if (checkInMethod === 'GPS') {
                    handleMarkPresent('GPS Geofence Verified');
                  } else {
                    setShowSelfieModal(true);
                    setSelfieScanning(false);
                  }
                }}
                className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-xl text-xs shadow flex items-center justify-center gap-2 transition-colors"
                type="button"
              >
                <UserCheck className="w-4.5 h-4.5" />
                <span>Mark Present ({checkInMethod} Check)</span>
              </button>
            )}

            {/* Parent SMS Alert Status Box */}
            <div className="bg-slate-900 text-slate-300 p-4 rounded-xl text-[10.5px] leading-relaxed font-semibold border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-primary-light font-black uppercase text-[9px] tracking-wider">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Automated Parent Alert</span>
                </div>
                <button
                  onClick={() => setShowParentSMSModal(true)}
                  className="text-[9px] bg-primary/20 text-primary-light hover:bg-primary/30 font-bold px-2 py-0.5 rounded transition-all"
                >
                  View Logs
                </button>
              </div>
              <p>SMS notifications are automatically dispatched to registered parent phone numbers at 9:35 PM if roll-call is missed.</p>
            </div>
          </div>

          {/* 30-Day Monthly Attendance Calendar Card */}
          <div className="bg-white border border-border p-5 rounded-2xl shadow-soft space-y-4">
            <div>
              <h3 className="text-xs font-black text-text uppercase tracking-wider">Monthly Roll-Call Calendar</h3>
              <p className="text-[10px] text-text-muted mt-0.5 font-semibold">Visual grid of July 2026 check-ins</p>
            </div>

            <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold text-slate-500 border-b border-slate-100 pb-2">
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(dayName => (
                <div key={dayName}>{dayName}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {/* Blank days for Wednesday start */}
              <div />
              <div />
              {Array.from({ length: 31 }, (_, i) => {
                const dayNum = i + 1;
                const dateStr = `${dayNum} July 2026`;
                const found = records.find(r => r.date === dateStr);
                const status = found ? found.status : 'None';
                
                let bgStyle = 'bg-slate-50 text-slate-400 hover:bg-slate-100';
                if (status === 'Present') bgStyle = 'bg-success/15 text-success border border-success/30 hover:bg-success/20';
                if (status === 'Absent') bgStyle = 'bg-danger/15 text-danger border border-danger/30 hover:bg-danger/20';
                if (status === 'On Approved Leave') bgStyle = 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100';
                if (status === 'Late Entry') bgStyle = 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100';

                return (
                  <button
                    key={dayNum}
                    onClick={() => {
                      if (found) {
                        alert(`Roll-call details for ${dateStr}:\nStatus: ${status}\nTime: ${found.time}\nMethod: ${found.method}\nDetails: ${found.verificationDetails}`);
                      } else {
                        alert(`No roll-call record logged for ${dateStr}.`);
                      }
                    }}
                    className={`h-7 w-full rounded-lg font-mono font-bold flex items-center justify-center transition-all ${bgStyle}`}
                    title={status !== 'None' ? `${dateStr} - ${status}` : dateStr}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between text-[8.5px] font-bold text-slate-500 pt-2 border-t border-slate-100 gap-2">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-success/20 border border-success/40" /> Present</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-danger/20 border border-danger/40" /> Absent</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-100 border border-blue-300" /> Outpass</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-100 border border-amber-300" /> Late</span>
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Attendance History Logs & Outpass Status */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* History Table */}
          <div className="bg-white border border-border p-6 rounded-2xl shadow-soft space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-text uppercase tracking-wider">Attendance Audit Logs</h3>
                <p className="text-[11px] text-text-muted mt-0.5 font-semibold">Detailed logs of roll-call authentication and outpasses</p>
              </div>

              <button 
                onClick={() => alert("Downloading official monthly attendance PDF statement...")}
                className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Report</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-semibold">
                <thead>
                  <tr className="border-b border-border bg-slate-50 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                    <th className="p-3">Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Logged Time</th>
                    <th className="p-3">Method & Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {records.map((rec, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 font-bold flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-text-muted" />
                        {rec.date}
                      </td>
                      <td className="p-3">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${getStatusStyle(rec.status)}`}>
                          {rec.status}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-800">{rec.time}</td>
                      <td className="p-3 text-text-muted font-medium">
                        <span className="font-bold text-slate-800 block">{rec.method}</span>
                        <span className="text-[10px] text-slate-500">{rec.verificationDetails}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active Gate & Outpasses List */}
          <div className="bg-white border border-border p-6 rounded-2xl shadow-soft space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-text uppercase tracking-wider">Gate Passes & Outpass Requests</h3>
                <p className="text-[11px] text-text-muted mt-0.5 font-semibold">Active late-entry passes and weekend leave approvals</p>
              </div>

              <button
                onClick={() => setShowOutpassModal(true)}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-1.5 rounded-xl border border-slate-200"
              >
                + New Request
              </button>
            </div>

            <div className="space-y-3">
              {outpasses.map(pass => (
                <div 
                  key={pass.id} 
                  onClick={() => setSelectedOutpassForQR(pass)}
                  className="border border-border rounded-xl p-4 flex justify-between items-center bg-white hover:border-primary/40 transition-all cursor-pointer group"
                >
                  <div className="space-y-1 text-left">
                    <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-text-muted">
                      <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded">{pass.id}</span>
                      <span>{pass.type}</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 group-hover:text-primary transition-colors">{pass.reason}</h4>
                    <p className="text-[10px] text-text-muted font-semibold">Valid: {pass.fromDate} to {pass.toDate}</p>
                    <span className="text-[9.5px] text-primary hover:underline font-bold mt-1 block">View Gate QR Pass</span>
                  </div>

                  <span className="text-[9.5px] font-black uppercase px-2.5 py-1 rounded-full bg-success/10 text-success border border-success/20">
                    {pass.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* MODAL 1: Door QR Code Camera Simulator */}
      {showQRModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-border text-center">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-black text-slate-900">Scan Room Door QR Code</h3>
                <p className="text-xs text-text-muted font-semibold mt-0.5">Point camera at QR code on Room 304 frame</p>
              </div>
              <button 
                onClick={() => setShowQRModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Simulated Camera Viewfinder */}
            <div className="bg-slate-900 text-white rounded-2xl h-56 flex flex-col items-center justify-center relative overflow-hidden border border-slate-800">
              <div className="w-36 h-36 border-2 border-dashed border-primary rounded-xl flex items-center justify-center relative">
                {qrScanning ? (
                  <div className="absolute inset-0 bg-primary/20 animate-pulse flex items-center justify-center font-mono text-xs text-white font-bold">
                    Scanning Code...
                  </div>
                ) : (
                  <QrCode className="w-16 h-16 text-primary animate-bounce" />
                )}
              </div>
              <span className="text-[10px] text-slate-400 mt-2 font-mono">ALIGN QR WITHIN BOUNDS</span>
            </div>

            <button
              onClick={handleSimulateQRScan}
              disabled={qrScanning}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-xl shadow transition-colors text-xs flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" />
              <span>{qrScanning ? 'Scanning...' : 'Simulate Scan Door QR'}</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: Outpass & Late Night Pass Form */}
      {showOutpassModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-border">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-black text-slate-900">Request Gate Pass / Outpass</h3>
                <p className="text-xs text-text-muted font-semibold mt-0.5">Required for late returns (&gt;10 PM) or weekend travel</p>
              </div>
              <button 
                onClick={() => setShowOutpassModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {outpassSuccessToast && (
              <div className="bg-success/10 border border-success/30 text-success p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Outpass approved by Warden! Ticket generated.</span>
              </div>
            )}

            <form onSubmit={handleApplyOutpass} className="space-y-3 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Pass Type *</label>
                <select
                  value={outpassType}
                  onChange={e => setOutpassType(e.target.value as any)}
                  className="w-full border border-border rounded-xl p-2.5 font-bold bg-white outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="Late Night Pass">Late Night Pass (Return after 10:00 PM)</option>
                  <option value="Weekend Outpass">Weekend Outpass (Home / Travel Stay)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">From Date</label>
                  <input
                    type="date"
                    value={outpassFromDate}
                    onChange={e => setOutpassFromDate(e.target.value)}
                    className="w-full border border-border rounded-xl p-2.5 font-bold outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">To Date</label>
                  <input
                    type="date"
                    value={outpassToDate}
                    onChange={e => setOutpassToDate(e.target.value)}
                    className="w-full border border-border rounded-xl p-2.5 font-bold outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Reason for Pass *</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Lab project work in campus library / Family function..."
                  value={outpassReason}
                  onChange={e => setOutpassReason(e.target.value)}
                  required
                  className="w-full border border-border rounded-xl p-2.5 font-semibold outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-xl shadow flex items-center justify-center gap-1.5 transition-colors mt-2"
              >
                <Send className="w-4 h-4" />
                <span>Submit Outpass Request</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Selfie Scanner Modal */}
      {showSelfieModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-border text-center">
            <div className="flex justify-between items-start text-left">
              <div>
                <h3 className="text-base font-black text-slate-900">Selfie Roll-Call Check-in</h3>
                <p className="text-xs text-text-muted font-semibold mt-0.5">Simulate face verification roll-call entry</p>
              </div>
              <button 
                onClick={() => setShowSelfieModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Camera Viewfinder */}
            <div className="bg-slate-950 text-white rounded-2xl h-56 flex flex-col items-center justify-center relative overflow-hidden border border-slate-900 shadow-inner">
              {selfieScanning ? (
                <div className="absolute inset-0 bg-primary/20 flex flex-col items-center justify-center space-y-2">
                  <div className="w-20 h-20 border-2 border-primary rounded-full animate-ping flex items-center justify-center">
                    <Camera className="w-8 h-8 text-primary" />
                  </div>
                  <span className="font-mono text-[10px] text-white font-bold animate-pulse">DETECTING FACE ID...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="w-24 h-24 rounded-full border border-slate-700 bg-slate-900 flex items-center justify-center relative overflow-hidden">
                    <span className="text-slate-500 text-4xl font-mono">👤</span>
                    <div className="absolute inset-0 border-2 border-dashed border-primary rounded-full animate-spin duration-1000" />
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">CAMERA VIEWFINDER</span>
                </div>
              )}
            </div>

            <button
              onClick={handleSimulateSelfieScan}
              disabled={selfieScanning}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-xl shadow transition-colors text-xs flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" />
              <span>{selfieScanning ? 'Scanning...' : 'Simulate Camera Snapshot'}</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL 4: Digital Gate Pass / QR Code Passcard */}
      {selectedOutpassForQR && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-5 shadow-2xl border border-border">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-black text-slate-900">Digital Gate Pass</h3>
                <p className="text-xs text-text-muted mt-0.5 font-semibold">Scan at PG entry security gate</p>
              </div>
              <button 
                onClick={() => setSelectedOutpassForQR(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Gate Pass Card */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-4 border border-slate-800 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-success/15 rounded-bl-full flex items-center justify-center text-success text-xs font-black">
                PASS
              </div>

              <div className="space-y-1.5 text-xs text-left">
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">{selectedOutpassForQR.type}</span>
                <h4 className="text-sm font-black text-slate-100">{selectedOutpassForQR.reason}</h4>
                <div className="text-[10.5px] text-slate-300 font-mono mt-1">ID: {selectedOutpassForQR.id}</div>
              </div>

              {/* QR Code */}
              <div className="bg-white p-3.5 rounded-xl w-36 h-36 mx-auto flex items-center justify-center shadow-lg border border-slate-200">
                <div className="text-slate-950 font-mono font-black text-[10px] text-center break-all flex flex-col justify-center items-center gap-1.5">
                  <QrCode className="w-20 h-20 text-slate-950" />
                  <span>{selectedOutpassForQR.id}</span>
                </div>
              </div>

              {/* Signatures / Validity */}
              <div className="grid grid-cols-2 gap-3 text-[9.5px] border-t border-slate-800 pt-3 text-left">
                <div>
                  <span className="text-slate-400 block">Warden Sign-off:</span>
                  <span className="font-bold text-success">✓ APPROVED (Smith)</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Validity Range:</span>
                  <span className="font-mono text-slate-200">{selectedOutpassForQR.fromDate}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedOutpassForQR(null)}
              className="w-full bg-slate-950 hover:bg-slate-900 text-white font-bold py-2.5 rounded-xl text-xs transition-colors"
            >
              Close Gate Pass
            </button>
          </div>
        </div>
      )}

      {/* MODAL 5: Parent SMS Dispatch Log Modal */}
      {showParentSMSModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-border">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-black text-slate-900">Parent SMS Dispatch Logs</h3>
                <p className="text-xs text-text-muted mt-0.5 font-semibold">Real-time log of security SMS alerts sent to parents</p>
              </div>
              <button 
                onClick={() => setShowParentSMSModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[320px] overflow-y-auto space-y-3 pr-1 scrollbar-thin text-xs text-left">
              {[
                { 
                  date: '18 July 2026', 
                  time: '9:15 PM', 
                  status: 'SENT', 
                  msg: 'Dear Parent, your ward Anish Deshpande (Room 304) has checked in successfully for tonight roll-call via GPS Geofence app.' 
                },
                { 
                  date: '17 July 2026', 
                  time: '8:58 PM', 
                  status: 'SENT', 
                  msg: 'Dear Parent, your ward Anish Deshpande (Room 304) has checked in successfully for tonight roll-call via QR Door scanner.' 
                },
                { 
                  date: '16 July 2026', 
                  time: '9:08 PM', 
                  status: 'SENT', 
                  msg: 'Dear Parent, your ward Anish Deshpande (Room 304) has checked in successfully for tonight roll-call via GPS Geofence app.' 
                },
                { 
                  date: '15 July 2026', 
                  time: '12:00 PM', 
                  status: 'SENT', 
                  msg: 'Dear Parent, weekend outpass out-of-campus stay (Ticket #OUT-8890) has been approved for your ward Anish Deshpande starting 15 July.' 
                },
                { 
                  date: '13 July 2026', 
                  time: '10:10 PM', 
                  status: 'SENT', 
                  msg: 'Dear Parent, your ward Anish Deshpande (Room 304) checked in LATE for night roll-call at 10:05 PM. Approved late entry pass used.' 
                }
              ].map((sms, i) => (
                <div key={i} className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2 border-l-4 border-l-primary">
                  <div className="flex justify-between items-center text-[10px] font-bold text-text-muted">
                    <span className="font-mono">{sms.date} @ {sms.time}</span>
                    <span className="bg-success/10 text-success px-1.5 py-0.5 rounded text-[8.5px] uppercase font-black tracking-wider">
                      {sms.status}
                    </span>
                  </div>
                  <p className="text-slate-700 leading-relaxed font-semibold text-[11px] bg-white p-2.5 rounded-lg border border-slate-150">
                    "{sms.msg}"
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowParentSMSModal(false)}
              className="w-full bg-slate-950 hover:bg-slate-900 text-white font-bold py-2.5 rounded-xl text-xs transition-colors"
            >
              Close Alert Log
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
