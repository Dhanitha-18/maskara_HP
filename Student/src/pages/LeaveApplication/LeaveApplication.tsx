import React, { useState, useRef, useMemo, useEffect } from 'react';
import { usePayment } from '../../context/PaymentContext';
import { useAuth } from '../../context/AuthContext';
import { HeroBanner } from '../../components/layout/HeroBanner';
import { LEAVE_HERO_IMAGE } from '../../assets/heroBanners';
import { 
  CheckCircle2, AlertCircle, 
  ArrowLeft, ArrowRight, X, 
  Sparkles, Bell
} from 'lucide-react';
import { io } from 'socket.io-client';

export interface LeaveRequest {
  id: string;
  leaveType: 'Weekend Outpass' | 'Emergency Leave' | 'Vacation / Fest' | 'Academic Duty';
  fromDate: string;
  toDate: string;
  totalDays: number;
  destination: string;
  reason: string;
  emergencyContact: string;
  expectedReturnTime: string;
  // Guardian Info
  parentName: string;
  relationship: string;
  parentPhone: string;
  parentEmail: string;
  parentAddress: string;
  // Status
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'Completed';
  appliedDate: string;
}

export interface VacateRequest {
  id: string;
  vacatingDate: string;
  reason: string;
  depositAmount: number;
  accountHolder: string;
  bankName: string;
  branch: string;
  ifscCode: string;
  accountNumber: string;
  upiId?: string;
  signatureDataUrl?: string;
  dateSubmitted: string;
}

const INITIAL_VACATING: VacateRequest = {
  id: 'VAC-2026-08',
  vacatingDate: '',
  reason: '',
  depositAmount: 15000,
  accountHolder: '',
  bankName: '',
  branch: '',
  ifscCode: '',
  accountNumber: '',
  upiId: '',
  dateSubmitted: ''
};

export const LeaveApplication: React.FC = () => {
  const { student } = usePayment();
  const { studentUsn, studentName } = useAuth();
  const [activeMainTab, setActiveMainTab] = useState<'leave' | 'vacate'>('leave');

  // Persistent Leave Records state loaded from backend / localStorage
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);

  // Fetch leaves from backend & connect WebSockets for 0 latency real-time updates
  const fetchBackendLeaves = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/leaves');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setLeaves(data);
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchBackendLeaves();
    const socket = io('http://localhost:5000');

    socket.on('LEAVE_CREATED', () => fetchBackendLeaves());
    socket.on('LEAVE_UPDATED', () => fetchBackendLeaves());
    socket.on('data_updated', () => fetchBackendLeaves());

    return () => {
      socket.disconnect();
    };
  }, []);

  const [wizardStep, setWizardStep] = useState<number>(1);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [submittedLeaveId, setSubmittedLeaveId] = useState<string>('');

  // Blank Leave Form Fields - Step 1: Leave Details (No mock pre-filled data)
  const [leaveType, setLeaveType] = useState<LeaveRequest['leaveType']>('Weekend Outpass');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [destination, setDestination] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [emergencyContact, setEmergencyContact] = useState<string>('');
  const [expectedReturnTime, setExpectedReturnTime] = useState<string>('07:30 PM');

  // Step 2: Guardian Information (Blank by default)
  const [parentName, setParentName] = useState<string>('');
  const [relationship, setRelationship] = useState<string>('Father');
  const [parentPhone, setParentPhone] = useState<string>('');
  const [parentEmail, setParentEmail] = useState<string>('');
  const [parentAddress, setParentAddress] = useState<string>('');

  // Step 3: Declaration
  const [declarationChecked, setDeclarationChecked] = useState<boolean>(true);

  // Error messaging
  const [stepError, setStepError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Toast alert
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Auto-calculated days
  const calculatedDays = useMemo(() => {
    if (!fromDate || !toDate) return 1;
    const start = new Date(fromDate).getTime();
    const end = new Date(toDate).getTime();
    if (end < start) return 0;
    const diffDays = Math.ceil((end - start) / (1000 * 3600 * 24)) + 1;
    return diffDays;
  }, [fromDate, toDate]);

  // Calendar view Month & Year state for dropdown
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const years = [2025, 2026, 2027, 2028];

  const [calendarMonth, setCalendarMonth] = useState<number>(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState<number>(new Date().getFullYear());

  // Step Navigation Validation
  const handleNextStep = () => {
    setStepError(null);
    if (wizardStep === 1) {
      if (!fromDate || !toDate) {
        setStepError('Please specify valid From Date and To Date.');
        return;
      }
      if (calculatedDays <= 0) {
        setStepError('To Date must be equal to or after From Date.');
        return;
      }
      if (!destination.trim()) {
        setStepError('Please provide your Destination Address / City.');
        return;
      }
      if (!reason.trim()) {
        setStepError('Please enter a reason for leave.');
        return;
      }
      const phoneDigits = emergencyContact.replace(/\D/g, '');
      if (!phoneDigits || phoneDigits.length < 10) {
        setStepError('Please provide a valid 10-digit emergency contact phone number.');
        return;
      }
    }

    if (wizardStep === 2) {
      if (!parentName.trim()) {
        setStepError('Please specify Parent / Guardian Full Name.');
        return;
      }
      const parentDigits = parentPhone.replace(/\D/g, '');
      if (!parentDigits || parentDigits.length < 10) {
        setStepError('Please specify a valid 10-digit Parent Phone Number.');
        return;
      }
    }

    setWizardStep(prev => prev + 1);
  };

  // Submit Leave Application to Backend (0 Latency Real-time reflection in Admin Portal)
  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!declarationChecked) {
      setStepError('You must accept the mandatory declaration to submit the leave application.');
      return;
    }

    setIsSubmitting(true);
    setStepError(null);

    const newId = `LEV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const nameToUse = studentName || student?.name || 'Student';
    const usnToUse = studentUsn || student?.usn || '1BM22CS001';

    try {
      const res = await fetch('http://localhost:5000/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: nameToUse,
          usn: usnToUse,
          roomNo: student?.allocatedRoom || '',
          block: student?.allocatedBlock || '',
          leaveType,
          fromDate,
          toDate,
          totalDays: Math.max(1, calculatedDays),
          destination,
          reason,
          emergencyContact,
          expectedReturnTime,
          parentName,
          relationship,
          parentPhone,
          parentEmail,
          parentAddress,
          status: 'Pending'
        })
      });

      if (!res.ok) throw new Error('Failed to submit leave application');

      const createdLeave = await res.json();
      
      setSubmittedLeaveId(createdLeave.id || newId);
      setShowSuccessModal(true);
      triggerToast('Leave application submitted successfully! Admin notified in real-time.');
      await fetchBackendLeaves();

      // Reset Form
      setWizardStep(1);
      setFromDate('');
      setToDate('');
      setDestination('');
      setReason('');
      setEmergencyContact('');
      setParentName('');
      setParentPhone('');
      setParentEmail('');
      setParentAddress('');
    } catch (err) {
      console.error(err);
      setStepError('Failed to submit leave application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel Leave Request
  const handleCancelLeave = async (leaveId: string) => {
    try {
      await fetch(`http://localhost:5000/api/leaves/${leaveId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Cancelled' })
      });
      fetchBackendLeaves();
      triggerToast('Leave request has been cancelled.');
    } catch {
      triggerToast('Failed to cancel leave request.');
    }
  };

  // ----------------------------------------------------
  // VACATING PORTAL STATE & CANVAS SIGNATURE
  // ----------------------------------------------------
  const [vacateData, setVacateData] = useState<VacateRequest>(INITIAL_VACATING);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureMode, setSignatureMode] = useState<'draw' | 'upload'>('draw');

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // Submit Vacating Form
  const handleVacateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vacateData.vacatingDate) {
      alert('Please select your Intended Vacating Date.');
      return;
    }
    if (!vacateData.reason.trim()) {
      alert('Please specify the reason for vacating the hostel.');
      return;
    }

    setIsSubmitting(true);
    const nameToUse = studentName || student?.name || 'Student';
    const usnToUse = studentUsn || student?.usn || '1BM22CS001';

    let finalSignature = vacateData.signatureDataUrl;
    if (!finalSignature && signatureMode === 'draw' && canvasRef.current) {
      finalSignature = canvasRef.current.toDataURL();
    }

    try {
      const res = await fetch('http://localhost:5000/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: nameToUse,
          usn: usnToUse,
          roomNo: student?.allocatedRoom || '',
          block: student?.allocatedBlock || '',
          leaveType: 'Permanent Hostel Vacating',
          fromDate: vacateData.vacatingDate,
          toDate: vacateData.vacatingDate,
          totalDays: 0,
          reason: vacateData.reason.trim(),
          bankName: (vacateData.bankName || '').trim() || null,
          accountHolder: (vacateData.accountHolder || '').trim() || nameToUse,
          accountNumber: (vacateData.accountNumber || '').trim() || null,
          ifscCode: (vacateData.ifscCode || '').trim() || null,
          depositAmount: Number(vacateData.depositAmount || 15000),
          signatureDataUrl: finalSignature || '',
          status: 'Pending'
        })
      });

      if (res.ok) {
        triggerToast('Permanent Hostel Vacating Application submitted successfully! Admin notified in real-time.');
        await fetchBackendLeaves();
      } else {
        alert('Failed to submit vacating application. Please try again.');
      }
    } catch {
      alert('Failed to submit vacating application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-16 relative">

      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2.5 animate-bounce">
          <Bell className="w-4 h-4 text-amber-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Hero Banner */}
      <HeroBanner 
        image={LEAVE_HERO_IMAGE}
        title="Hostel Leave & Checkout Portal"
      />

      {/* Top Main Tab Navigation (NO ICONS on options as requested) */}
      <div className="bg-white border border-border p-1.5 rounded-2xl shadow-soft flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveMainTab('leave')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center transition-all cursor-pointer ${
            activeMainTab === 'leave'
              ? 'bg-primary text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span>Outpass & Leave Application System</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('vacate')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center transition-all cursor-pointer ${
            activeMainTab === 'vacate'
              ? 'bg-primary text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span>Permanent Hostel Exit & Vacating Portal</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: LEAVE & OUTPASS SYSTEM                                             */}
      {/* ========================================================================= */}
      {activeMainTab === 'leave' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Left 2 Columns: Multi-Step Leave Application */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-border p-6 sm:p-8 rounded-2xl shadow-soft space-y-6">
                
                {/* Stepper Header */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                        Leave Application
                      </h3>
                      <p className="text-[11px] text-text-muted font-semibold mt-0.5">
                        Step {wizardStep} of 3: {
                          wizardStep === 1 ? 'Leave Details & Travel Itinerary' :
                          wizardStep === 2 ? 'Guardian Information & Emergency Contact' :
                          'Review & Submit Final Declaration'
                        }
                      </p>
                    </div>
                    <span className="text-xs font-black text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                      Step {wizardStep} / 3
                    </span>
                  </div>

                  {/* Stepper Progress Bar (3 steps) */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { step: 1, label: '1. Leave Details' },
                      { step: 2, label: '2. Guardian Info' },
                      { step: 3, label: '3. Review & Submit' }
                    ].map(s => (
                      <div 
                        key={s.step} 
                        onClick={() => s.step < wizardStep && setWizardStep(s.step)}
                        className={`h-2 rounded-full transition-all cursor-pointer ${
                          s.step <= wizardStep ? 'bg-primary' : 'bg-slate-200'
                        }`}
                        title={s.label}
                      />
                    ))}
                  </div>
                </div>

                {/* Error Banner */}
                {stepError && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-3.5 rounded-r-xl text-xs font-bold text-red-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{stepError}</span>
                    </div>
                    <button onClick={() => setStepError(null)} className="text-red-500 hover:text-red-800">✕</button>
                  </div>
                )}

                {/* STEP 1: LEAVE DETAILS */}
                {wizardStep === 1 && (
                  <div className="space-y-5 animate-fadeIn">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">Leave Category / Purpose *</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          'Weekend Outpass',
                          'Emergency Leave',
                          'Vacation / Fest',
                          'Academic Duty'
                        ].map(t => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => { setLeaveType(t as any); setStepError(null); }}
                            className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                              leaveType === t
                                ? 'bg-primary text-white border-primary shadow-sm'
                                : 'bg-slate-50 border-border text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">From Date *</label>
                        <input 
                          type="date" 
                          value={fromDate}
                          onChange={e => { setFromDate(e.target.value); setStepError(null); }}
                          className="w-full border border-border rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 bg-slate-50/50"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">To Date *</label>
                        <input 
                          type="date" 
                          value={toDate}
                          onChange={e => { setToDate(e.target.value); setStepError(null); }}
                          className="w-full border border-border rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 bg-slate-50/50"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">Auto-Calculated Days</label>
                        <div className="bg-primary/10 border border-primary/20 p-2.5 rounded-xl text-center">
                          <span className="text-sm font-black text-primary">{calculatedDays} Day(s) Leave</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">Destination City / Full Address *</label>
                        <input 
                          type="text" 
                          placeholder="Enter destination address or city"
                          value={destination}
                          onChange={e => { setDestination(e.target.value); setStepError(null); }}
                          className="w-full border border-border rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">Expected Return Time to Gate *</label>
                        <select 
                          value={expectedReturnTime}
                          onChange={e => setExpectedReturnTime(e.target.value)}
                          className="w-full border border-border rounded-xl p-2.5 text-xs font-bold outline-none bg-white"
                        >
                          {['05:00 PM', '06:00 PM', '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM', '09:00 PM'].map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">Detailed Reason for Leave *</label>
                      <textarea 
                        rows={3}
                        placeholder="State clear reasons for outpass..."
                        value={reason}
                        onChange={e => { setReason(e.target.value); setStepError(null); }}
                        className="w-full border border-border rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">Student Emergency Phone Contact *</label>
                      <input 
                        type="tel" 
                        placeholder="Enter 10-digit emergency contact"
                        value={emergencyContact}
                        onChange={e => { setEmergencyContact(e.target.value); setStepError(null); }}
                        className="w-full border border-border rounded-xl p-2.5 text-xs font-mono font-bold outline-none bg-slate-50/50"
                      />
                    </div>
                  </div>
                )}

                {/* STEP 2: GUARDIAN INFO */}
                {wizardStep === 2 && (
                  <div className="space-y-5 animate-fadeIn">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">Parent / Guardian Full Name *</label>
                        <input 
                          type="text" 
                          placeholder="Enter parent/guardian full name"
                          value={parentName}
                          onChange={e => { setParentName(e.target.value); setStepError(null); }}
                          className="w-full border border-border rounded-xl p-2.5 text-xs font-bold outline-none bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">Relationship *</label>
                        <select 
                          value={relationship}
                          onChange={e => setRelationship(e.target.value)}
                          className="w-full border border-border rounded-xl p-2.5 text-xs font-bold outline-none bg-white"
                        >
                          <option value="Father">Father</option>
                          <option value="Mother">Mother</option>
                          <option value="Local Guardian">Local Guardian</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">Parent Registered Phone (10 Digits) *</label>
                        <input 
                          type="tel" 
                          placeholder="Enter 10-digit parent phone"
                          value={parentPhone}
                          onChange={e => { setParentPhone(e.target.value); setStepError(null); }}
                          className="w-full border border-border rounded-xl p-2.5 text-xs font-mono font-bold outline-none bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">Parent Email Address</label>
                        <input 
                          type="email" 
                          placeholder="Enter parent email address"
                          value={parentEmail}
                          onChange={e => setParentEmail(e.target.value)}
                          className="w-full border border-border rounded-xl p-2.5 text-xs font-bold outline-none bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">Guardian Permanent Postal Address</label>
                      <textarea 
                        rows={2}
                        placeholder="Enter permanent address"
                        value={parentAddress}
                        onChange={e => setParentAddress(e.target.value)}
                        className="w-full border border-border rounded-xl p-2.5 text-xs font-bold outline-none bg-white"
                      />
                    </div>
                  </div>
                )}

                {/* STEP 3: REVIEW & SUBMIT */}
                {wizardStep === 3 && (
                  <div className="space-y-5 animate-fadeIn">
                    <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4 text-xs font-semibold text-slate-800">
                      <h4 className="text-xs font-black uppercase text-primary tracking-wider border-b border-slate-200 pb-2">
                        Final Leave Request Summary Verification
                      </h4>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px]">
                        <div>
                          <span className="text-text-muted font-bold block text-[9px] uppercase">Leave Category</span>
                          <span className="font-black text-slate-900">{leaveType}</span>
                        </div>
                        <div>
                          <span className="text-text-muted font-bold block text-[9px] uppercase">Duration</span>
                          <span className="font-black text-slate-900">{calculatedDays} Day(s) ({fromDate} to {toDate})</span>
                        </div>
                        <div>
                          <span className="text-text-muted font-bold block text-[9px] uppercase">Expected Gate Return</span>
                          <span className="font-black text-slate-900">{expectedReturnTime}</span>
                        </div>
                        <div className="col-span-2 sm:col-span-3">
                          <span className="text-text-muted font-bold block text-[9px] uppercase">Destination</span>
                          <span className="font-bold text-slate-900">{destination || 'N/A'}</span>
                        </div>
                        <div className="col-span-2 sm:col-span-3">
                          <span className="text-text-muted font-bold block text-[9px] uppercase">Reason</span>
                          <span className="font-bold text-slate-700">{reason || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-text-muted font-bold block text-[9px] uppercase">Parent / Guardian</span>
                          <span className="font-black text-slate-900">{parentName || 'N/A'} ({relationship})</span>
                        </div>
                        <div>
                          <span className="text-text-muted font-bold block text-[9px] uppercase">Parent Phone</span>
                          <span className="font-mono font-bold text-slate-900">{parentPhone || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        id="declaration" 
                        checked={declarationChecked}
                        onChange={e => setDeclarationChecked(e.target.checked)}
                        className="w-4 h-4 text-primary rounded cursor-pointer"
                      />
                      <label htmlFor="declaration" className="text-xs font-bold text-slate-800 cursor-pointer">
                        I declare that the information provided is correct and I will abide by all hostel rules during my leave period.
                      </label>
                    </div>
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  {wizardStep > 1 ? (
                    <button
                      type="button"
                      onClick={() => setWizardStep(prev => prev - 1)}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Previous Step</span>
                    </button>
                  ) : <div />}

                  {wizardStep < 3 ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer ml-auto"
                    >
                      <span>Next Step</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleLeaveSubmit}
                      disabled={isSubmitting}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-xl text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer ml-auto"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isSubmitting ? 'Submitting...' : 'Submit Application'}</span>
                    </button>
                  )}
                </div>

              </div>
            </div>

            {/* Right Column: Interactive Leave Calendar */}
            <div className="space-y-6">
              
              <div className="bg-white border border-border p-6 rounded-2xl shadow-soft space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    Leave Calendar
                  </h3>

                  {/* Month & Year Dropdown Selectors */}
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <select
                      value={calendarMonth}
                      onChange={e => setCalendarMonth(Number(e.target.value))}
                      className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none cursor-pointer"
                    >
                      {months.map((m, idx) => (
                        <option key={idx} value={idx}>{m}</option>
                      ))}
                    </select>

                    <select
                      value={calendarYear}
                      onChange={e => setCalendarYear(Number(e.target.value))}
                      className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none cursor-pointer"
                    >
                      {years.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Legend (Keep ONLY Approved Leave option as requested) */}
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 pt-1 border-t border-slate-100">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" /> Approved Leave
                  </span>
                </div>

                {/* Calendar Grid (Display ONLY Approved Leave in Green) */}
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold pt-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, idx) => (
                    <div key={idx} className="text-text-muted py-1 font-extrabold uppercase text-[9px]">{d}</div>
                  ))}

                  {/* Dynamic Month/Year Offset & Day Tiles */}
                  {(() => {
                    const daysInCalendarMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
                    const firstDayOfCalendarMonth = new Date(calendarYear, calendarMonth, 1).getDay();
                    
                    const blankTiles = Array.from({ length: firstDayOfCalendarMonth }).map((_, i) => (
                      <div key={`blank-${i}`} className="p-2 rounded-lg bg-slate-50/40 text-transparent">.</div>
                    ));

                    const dayTiles = Array.from({ length: daysInCalendarMonth }, (_, i) => i + 1).map(day => {
                      const cellDate = new Date(calendarYear, calendarMonth, day);
                      cellDate.setHours(0, 0, 0, 0);

                      const isApprovedLeave = leaves.some(l => {
                        if (String(l.status).toLowerCase() !== 'approved') return false;
                        if (!l.fromDate || !l.toDate) return false;
                        const f = new Date(l.fromDate);
                        f.setHours(0, 0, 0, 0);
                        const t = new Date(l.toDate);
                        t.setHours(23, 59, 59, 999);
                        return cellDate >= f && cellDate <= t;
                      });

                      return (
                        <div 
                          key={day}
                          className={`p-2 rounded-lg text-xs font-bold transition-all ${
                            isApprovedLeave
                              ? 'bg-emerald-500 text-white font-black shadow-xs'
                              : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {day}
                        </div>
                      );
                    });

                    return [...blankTiles, ...dayTiles];
                  })()}
                </div>
              </div>

            </div>

          </div>

          {/* SUBMITTED LEAVE APPLICATIONS HISTORY */}
          <div className="bg-white border border-border p-6 sm:p-8 rounded-2xl shadow-soft space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  Submitted Leave Applications History
                </h3>
                <p className="text-[11px] text-text-muted font-semibold mt-0.5">
                  Track Warden approval status of your leave requests.
                </p>
              </div>
            </div>

            {leaves.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-xs font-bold text-slate-500">No leave applications submitted yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {leaves.map(leave => (
                  <div 
                    key={leave.id}
                    className="border border-border rounded-2xl p-5 space-y-4 bg-white shadow-soft"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-text-muted block">
                          {leave.id} • Applied: {leave.appliedDate || 'Recent'}
                        </span>
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 mt-1">{leave.leaveType}</h4>
                      </div>

                      <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-md border ${
                        String(leave.status).toLowerCase() === 'approved' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                        String(leave.status).toLowerCase() === 'pending' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                        String(leave.status).toLowerCase() === 'rejected' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                        'bg-slate-100 text-slate-700 border-slate-300'
                      }`}>
                        {leave.status}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl space-y-1.5 text-xs font-semibold text-slate-800">
                      <div>
                        <span>{leave.fromDate} to {leave.toDate} ({leave.totalDays} Day(s))</span>
                      </div>
                      {leave.destination && (
                        <p className="text-text-muted text-[11px] font-medium leading-relaxed">
                          📍 {leave.destination}
                        </p>
                      )}
                      {leave.reason && (
                        <p className="text-[11px] text-slate-600 font-medium">
                          Reason: {leave.reason}
                        </p>
                      )}
                    </div>

                    {/* Pending Actions */}
                    {String(leave.status).toLowerCase() === 'pending' && (
                      <div className="pt-2 border-t border-slate-100 flex justify-end">
                        <button
                          onClick={() => handleCancelLeave(leave.id)}
                          className="text-red-600 hover:text-red-800 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          Cancel Request
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PERMANENT HOSTEL EXIT & VACATING PORTAL                             */}
      {/* ========================================================================= */}
      {activeMainTab === 'vacate' && (
        <div className="space-y-8 animate-fadeIn">

          {/* Vacating Form */}
          <div className="bg-white border border-border p-6 sm:p-8 rounded-2xl shadow-soft space-y-6">
            <form onSubmit={handleVacateSubmit} className="space-y-6 text-xs font-semibold text-slate-800">
              
              <div className="space-y-4">
                <span className="text-[10px] font-black text-primary uppercase tracking-wider block border-b border-slate-100 pb-1">
                  1. Permanent Checkout Schedule & Reason
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-text-muted uppercase">Vacating Date *</label>
                    <input 
                      type="date"
                      value={vacateData.vacatingDate}
                      onChange={e => setVacateData({ ...vacateData, vacatingDate: e.target.value })}
                      className="w-full border border-border rounded-xl p-2.5 text-xs font-bold outline-none bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-text-muted uppercase">Reason for Permanent Checkout *</label>
                    <input 
                      type="text"
                      placeholder="Enter reason for vacating hostel"
                      value={vacateData.reason}
                      onChange={e => setVacateData({ ...vacateData, reason: e.target.value })}
                      className="w-full border border-border rounded-xl p-2.5 text-xs font-bold outline-none bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Digital Clearance Signature */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider block">
                    2. Student Clearance Signature
                  </span>

                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setSignatureMode('draw')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        signatureMode === 'draw' ? 'bg-white text-primary shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      ✏️ Draw Signature
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignatureMode('upload')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        signatureMode === 'upload' ? 'bg-white text-primary shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      📷 Upload Image
                    </button>
                  </div>
                </div>

                {signatureMode === 'upload' ? (
                  <div className="space-y-2">
                    <div className="border border-dashed border-primary/40 bg-slate-50 p-4 rounded-xl text-center flex flex-col items-center justify-center">
                      {vacateData.signatureDataUrl ? (
                        <div className="space-y-2">
                          <img src={vacateData.signatureDataUrl} alt="Uploaded Signature" className="max-h-24 max-w-full object-contain mx-auto border rounded p-1 bg-white shadow-sm" />
                          <button
                            type="button"
                            onClick={() => setVacateData({ ...vacateData, signatureDataUrl: '' })}
                            className="text-[10px] text-rose-600 font-bold hover:underline block mx-auto cursor-pointer"
                          >
                            Remove Image
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setVacateData({ ...vacateData, signatureDataUrl: reader.result as string });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary file:text-white hover:file:bg-primary-dark cursor-pointer"
                          />
                          <span className="text-[10px] text-slate-400 block">Select signature photo or image from your device gallery.</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="border border-border rounded-xl overflow-hidden bg-slate-50 relative">
                      <canvas 
                        ref={canvasRef}
                        width={600}
                        height={120}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        className="w-full h-28 bg-white cursor-crosshair"
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={clearSignature}
                      className="text-[10px] font-bold text-slate-500 hover:text-slate-800"
                    >
                      Clear Signature
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer"
                >
                  Submit Permanent Vacating Application
                </button>
              </div>

            </form>
          </div>

        </div>
      )}

      {/* SUCCESS SUBMISSION MODAL */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 shadow-2xl border border-white">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl font-black">
              ✓
            </div>
            <h3 className="text-lg font-black text-slate-900">Leave Application Submitted!</h3>
            <p className="text-xs text-slate-600 font-semibold leading-relaxed">
              Your leave request <strong className="text-slate-900 font-mono">{submittedLeaveId}</strong> has been transmitted in real-time to the Hostel Warden for review.
            </p>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md"
            >
              Continue to Student Dashboard
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
