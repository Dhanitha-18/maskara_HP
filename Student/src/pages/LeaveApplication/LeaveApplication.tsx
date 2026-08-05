import React, { useState, useRef, useMemo, useEffect } from 'react';
import { usePayment } from '../../context/PaymentContext';
import { useAuth } from '../../context/AuthContext';
import { HeroBanner } from '../../components/layout/HeroBanner';
import { LEAVE_HERO_IMAGE } from '../../assets/heroBanners';
import { 
  Calendar as CalendarIcon, Clock, CheckCircle2, AlertCircle, LogOut, 
  FileText, Upload, Trash2, ArrowLeft, ArrowRight, QrCode, X, 
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
  // Attachments
  attachments: { name: string; size: string; type: string }[];
  // Status
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'Completed';
  appliedDate: string;
  qrCode?: string;
  isReturned?: boolean;
  returnedTimestamp?: string;
  parentNotified?: boolean;
  // Status Timeline step (1..5)
  currentTimelineStep: number;
}

export interface VacateRequest {
  id: string;
  vacatingDate: string;
  reason: string;
  currentStage: 'Application Submitted' | 'Warden Approval' | 'Asset Verification' | 'Room Inspection' | 'Refund Processing' | 'Completed';
  depositAmount: number;
  inspectionStatus: 'Pending' | 'In Progress' | 'Passed';
  refundStatus: 'Initiated' | 'Processing' | 'Completed';
  expectedRefundDate: string;
  accountHolder: string;
  bankName: string;
  branch: string;
  ifscCode: string;
  accountNumber: string;
  upiId?: string;
  signatureDataUrl?: string;
  dateSubmitted: string;
}

const INITIAL_LEAVES: LeaveRequest[] = [
  {
    id: 'LEV-2026-8941',
    leaveType: 'Weekend Outpass',
    fromDate: '2026-07-25',
    toDate: '2026-07-27',
    totalDays: 2,
    destination: 'Home Residence, Jubilee Hills, Hyderabad',
    reason: 'Family gathering and weekend home visit for festival celebrations.',
    emergencyContact: '+91 98765 01234',
    expectedReturnTime: '07:30 PM',
    parentName: 'Sri. Machireddy',
    relationship: 'Father',
    parentPhone: '+91 98765 01234',
    parentEmail: 'father.m@example.com',
    parentAddress: 'Flat 402, Sunshine Apartments, Jubilee Hills, Hyderabad',
    attachments: [
      { name: 'Parent_Permission_Letter.pdf', size: '1.2 MB', type: 'pdf' }
    ],
    status: 'Approved',
    appliedDate: '20 July 2026',
    qrCode: 'LEV-QR-8941',
    isReturned: false,
    parentNotified: true,
    currentTimelineStep: 3 // Approved, awaiting departure/return
  },
  {
    id: 'LEV-2026-7832',
    leaveType: 'Academic Duty',
    fromDate: '2026-07-10',
    toDate: '2026-07-12',
    totalDays: 2,
    destination: 'IIT Madras Campus, Chennai',
    reason: 'Attending Inter-College Technical Hackathon competition representation.',
    emergencyContact: '+91 98765 43210',
    expectedReturnTime: '08:00 PM',
    parentName: 'Sri. Machireddy',
    relationship: 'Father',
    parentPhone: '+91 98765 01234',
    parentEmail: 'father.m@example.com',
    parentAddress: 'Hyderabad',
    attachments: [
      { name: 'Event_Invitation_Letter.pdf', size: '450 KB', type: 'pdf' }
    ],
    status: 'Completed',
    appliedDate: '08 July 2026',
    qrCode: 'LEV-QR-7832',
    isReturned: true,
    returnedTimestamp: '12 July 2026, 07:15 PM',
    parentNotified: true,
    currentTimelineStep: 5 // Completed
  }
];

const INITIAL_VACATING: VacateRequest = {
  id: 'VAC-2026-08',
  vacatingDate: '2026-07-31',
  reason: 'Academic Course Completion / Final Semester Checkout',
  currentStage: 'Room Inspection',
  depositAmount: 15000,
  inspectionStatus: 'In Progress',
  refundStatus: 'Processing',
  expectedRefundDate: '04 August 2026',
  accountHolder: 'Dhanitha Machireddy',
  bankName: 'State Bank of India',
  branch: 'Main Campus Branch',
  ifscCode: 'SBIN0004521',
  accountNumber: '39485029104',
  upiId: 'dhanitha@sbi',
  dateSubmitted: '20 July 2026'
};

const getTodayFormatted = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

export const LeaveApplication: React.FC = () => {
  const { student } = usePayment();
  const [activeMainTab, setActiveMainTab] = useState<'leave' | 'vacate'>('leave');

  // Persistent Leave Records state
  const [leaves, setLeaves] = useState<LeaveRequest[]>(() => {
    try {
      const saved = localStorage.getItem('hostel_leaves');
      return saved ? JSON.parse(saved) : INITIAL_LEAVES;
    } catch {
      return INITIAL_LEAVES;
    }
  });

  const [wizardStep, setWizardStep] = useState<number>(1);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [submittedLeaveId, setSubmittedLeaveId] = useState<string>('');
  
  // Selected Leave for Status Timeline / QR Modal
  const [inspectLeave, setInspectLeave] = useState<LeaveRequest | null>(null);

  // Save leaves to localStorage whenever modified
  useEffect(() => {
    try {
      localStorage.setItem('hostel_leaves', JSON.stringify(leaves));
    } catch (e) {
      console.error(e);
    }
  }, [leaves]);

  // Auto-open pass if scanned via QR URL link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const passId = params.get('passId');
    if (passId) {
      const match = leaves.find(l => l.id.toLowerCase() === passId.toLowerCase());
      if (match) {
        setInspectLeave(match);
      } else if (leaves.length > 0) {
        setInspectLeave(leaves[0]);
      }
    }
  }, [leaves]);

  // Leave Form Fields - Step 1: Leave Details
  const [leaveType, setLeaveType] = useState<LeaveRequest['leaveType']>('Weekend Outpass');
  const [fromDate, setFromDate] = useState<string>(getTodayFormatted(0));
  const [toDate, setToDate] = useState<string>(getTodayFormatted(2));
  const [destination, setDestination] = useState<string>('Home Residence, Jubilee Hills, Hyderabad');
  const [reason, setReason] = useState<string>('Family gathering and weekend home visit for festival celebrations');
  const [emergencyContact, setEmergencyContact] = useState<string>(student?.phone || '9876501234');
  const [expectedReturnTime, setExpectedReturnTime] = useState<string>('07:30 PM');

  // Step 2: Guardian Information
  const [parentName, setParentName] = useState<string>('Sri. Machireddy');
  const [relationship, setRelationship] = useState<string>('Father');
  const [parentPhone, setParentPhone] = useState<string>('9876501234');
  const [parentEmail, setParentEmail] = useState<string>('father.m@example.com');
  const [parentAddress, setParentAddress] = useState<string>(student?.address || 'Flat 402, Sunshine Apartments, Jubilee Hills, Hyderabad');

  // Step 3: Documents Upload
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: string; type: string }[]>([]);
  
  // Step 4: Declaration
  const [declarationChecked, setDeclarationChecked] = useState<boolean>(true);

  // Error messaging
  const [stepError, setStepError] = useState<string | null>(null);

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

  // Calendar view Month & Year
  const [calendarMonth, setCalendarMonth] = useState<number>(6); // July

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
      if (!reason.trim() || reason.trim().length < 3) {
        setStepError('Please enter a detailed reason.');
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
      if (!parentEmail.trim() || !parentEmail.includes('@')) {
        setStepError('Please specify a valid Parent Email Address.');
        return;
      }
    }

    setWizardStep(prev => prev + 1);
  };

  // Handle Drag & Drop / File selection
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const fileSizeMb = (file.size / (1024 * 1024)).toFixed(1);
      const newFile = {
        name: file.name,
        size: `${fileSizeMb} MB`,
        type: file.name.endsWith('.pdf') ? 'pdf' : 'image'
      };
      setUploadedFiles(prev => [...prev, newFile]);
      triggerToast('Document uploaded successfully');
    }
  };

  // Submit Leave Application
  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!declarationChecked) {
      setStepError('You must accept the mandatory declaration to submit the leave application.');
      return;
    }

    const newId = `LEV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const newLeave: LeaveRequest = {
      id: newId,
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
      attachments: uploadedFiles,
      status: 'Pending',
      appliedDate: nowStr,
      qrCode: `LEV-QR-${Math.floor(1000 + Math.random() * 9000)}`,
      currentTimelineStep: 1 // Submitted
    };

    // Send to backend database
    fetch('http://localhost:5000/api/leaves', {
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
        parentName,
        relationship,
        parentPhone,
        parentEmail,
        parentAddress,
        status: 'Pending'
      })
    }).then(() => fetchBackendLeaves()).catch(() => {});

    const updatedLeaves = [newLeave, ...leaves];
    setLeaves(updatedLeaves);
    setSubmittedLeaveId(newId);
    setInspectLeave(newLeave);
    setShowSuccessModal(true);

    // Reset Form
    setWizardStep(1);
    setUploadedFiles([]);
    setStepError(null);
  };

  // QR Gate Return Check-in Simulation
  const handleSimulateQRReturn = (leaveId: string) => {
    const returnTimeStr = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    
    setLeaves(prev => prev.map(l => {
      if (l.id !== leaveId) return l;
      return {
        ...l,
        status: 'Completed',
        isReturned: true,
        returnedTimestamp: returnTimeStr,
        currentTimelineStep: 5 // Completed
      };
    }));

    if (inspectLeave && inspectLeave.id === leaveId) {
      setInspectLeave(prev => prev ? {
        ...prev,
        status: 'Completed',
        isReturned: true,
        returnedTimestamp: returnTimeStr,
        currentTimelineStep: 5
      } : null);
    }

    triggerToast('✅ Security Gatekeeper Scan verified! Status updated to Returned & Completed.');
  };

  // Cancel Leave Request
  const handleCancelLeave = (leaveId: string) => {
    setLeaves(prev => prev.map(l => l.id === leaveId ? { ...l, status: 'Cancelled', currentTimelineStep: 1 } : l));
    triggerToast('Leave request has been cancelled.');
  };

  // Statistics summary
  const leaveStats = useMemo(() => {
    const total = leaves.length;
    const approved = leaves.filter(l => l.status === 'Approved').length;
    const pending = leaves.filter(l => l.status === 'Pending').length;
    const rejected = leaves.filter(l => l.status === 'Rejected').length;
    const cancelled = leaves.filter(l => l.status === 'Cancelled').length;
    const upcoming = leaves.filter(l => l.status === 'Approved' && !l.isReturned).length;
    return { total, approved, pending, rejected, cancelled, upcoming };
  }, [leaves]);

  // ----------------------------------------------------
  // VACATING PORTAL STATE & CANVAS SIGNATURE
  // ----------------------------------------------------
  const [vacateData, setVacateData] = useState<VacateRequest>(INITIAL_VACATING);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureMode, setSignatureMode] = useState<'draw' | 'upload'>('draw');
  const [uploadedSignatureUrl, setUploadedSignatureUrl] = useState<string | null>(null);

  // Canvas signature handlers
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

  const handleSignaturePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedSignatureUrl(event.target?.result as string);
        triggerToast('Signature photo uploaded successfully!');
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Vacating Form
  const handleVacateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerToast('Permanent Vacating Application & Bank Transfer Details updated!');
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-16 relative">

      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2.5 animate-bounce">
          <Bell className="w-4 h-4 text-warning" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Hero Banner */}
      <HeroBanner 
        image={LEAVE_HERO_IMAGE}
        title="Hostel Leave & Checkout Portal"
      />

      {/* Top Main Tab Navigation */}
      <div className="bg-white border border-border p-1.5 rounded-2xl shadow-soft flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveMainTab('leave')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all ${
            activeMainTab === 'leave'
              ? 'bg-primary text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          <span>🏖️ Outpass & Leave Application System</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('vacate')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all ${
            activeMainTab === 'vacate'
              ? 'bg-primary text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <LogOut className="w-4 h-4" />
          <span>🚪 Permanent Hostel Exit & Vacating Portal</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: LEAVE & OUTPASS SYSTEM                                             */}
      {/* ========================================================================= */}
      {activeMainTab === 'leave' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Left 2 Columns: Multi-Step Leave Wizard */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-border p-6 sm:p-8 rounded-2xl shadow-soft space-y-6">
                
                {/* Stepper Header */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        Multi-Step Leave Application Wizard
                      </h3>
                      <p className="text-[11px] text-text-muted font-semibold mt-0.5">
                        Step {wizardStep} of 4: {
                          wizardStep === 1 ? 'Leave Details & Travel Itinerary' :
                          wizardStep === 2 ? 'Guardian Information & Emergency Contact' :
                          wizardStep === 3 ? 'Document Attachments & Permissions' :
                          'Review & Submit Final Declaration'
                        }
                      </p>
                    </div>
                    <span className="text-xs font-black text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                      Step {wizardStep} / 4
                    </span>
                  </div>

                  {/* Stepper Progress Bar */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { step: 1, label: '1. Leave Details' },
                      { step: 2, label: '2. Guardian Info' },
                      { step: 3, label: '3. Documents' },
                      { step: 4, label: '4. Review & Submit' }
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
                          placeholder="e.g. Flat 402, Sunshine Apartments, Jubilee Hills, Hyderabad"
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
                        placeholder="State clear reasons for outpass (e.g. Family gathering, medical checkup, academic hackathon)..."
                        value={reason}
                        onChange={e => { setReason(e.target.value); setStepError(null); }}
                        className="w-full border border-border rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">Student Emergency Phone Contact *</label>
                      <input 
                        type="tel" 
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
                    <div className="bg-blue-50/60 border border-blue-200 p-4 rounded-xl text-xs text-blue-900 font-medium flex items-start gap-2">
                      <Bell className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <strong>Automated Parent Verification System:</strong> Upon Warden approval, an SMS & Email with a unique verification code will be dispatched to this parent phone and email automatically.
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">Parent / Guardian Full Name *</label>
                        <input 
                          type="text" 
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
                          value={parentPhone}
                          onChange={e => { setParentPhone(e.target.value); setStepError(null); }}
                          className="w-full border border-border rounded-xl p-2.5 text-xs font-mono font-bold outline-none bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">Parent Email Address *</label>
                        <input 
                          type="email" 
                          value={parentEmail}
                          onChange={e => { setParentEmail(e.target.value); setStepError(null); }}
                          className="w-full border border-border rounded-xl p-2.5 text-xs font-bold outline-none bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">Guardian Permanent Postal Address *</label>
                      <textarea 
                        rows={2}
                        value={parentAddress}
                        onChange={e => setParentAddress(e.target.value)}
                        className="w-full border border-border rounded-xl p-2.5 text-xs font-bold outline-none bg-white"
                      />
                    </div>
                  </div>
                )}

                {/* STEP 3: DOCUMENT UPLOADS */}
                {wizardStep === 3 && (
                  <div className="space-y-5 animate-fadeIn">
                    <div className="space-y-2">
                      <span className="text-[10px] font-black text-text-muted uppercase tracking-wider block">
                        Upload Permission Documents / Travel Tickets / Medical Certificates (Optional)
                      </span>

                      {/* Drag and Drop Zone */}
                      <label className="border-2 border-dashed border-slate-300 hover:border-primary bg-slate-50/50 p-6 rounded-2xl text-center block cursor-pointer transition-colors group">
                        <Upload className="w-8 h-8 text-slate-400 group-hover:text-primary mx-auto transition-colors" />
                        <p className="text-xs font-bold text-slate-800 mt-2">
                          Click or drag files here to upload permission documents
                        </p>
                        <p className="text-[10px] text-text-muted font-medium mt-1">
                          Supported formats: PDF, PNG, JPG (Max file size: 5 MB)
                        </p>
                        <input 
                          type="file" 
                          className="hidden" 
                          onChange={handleFileUpload} 
                          accept=".pdf,.png,.jpg,.jpeg"
                        />
                      </label>
                    </div>

                    {/* Uploaded files list */}
                    {uploadedFiles.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">
                          Attached Files ({uploadedFiles.length}):
                        </span>
                        <div className="space-y-2">
                          {uploadedFiles.map((file, i) => (
                            <div key={i} className="bg-white border border-border p-3 rounded-xl flex items-center justify-between text-xs font-bold">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary" />
                                <span>{file.name}</span>
                                <span className="text-[10px] text-text-muted">({file.size})</span>
                              </div>
                              <button 
                                type="button"
                                onClick={() => setUploadedFiles(prev => prev.filter((_, idx) => idx !== i))}
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 4: REVIEW & SUBMIT */}
                {wizardStep === 4 && (
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
                          <span className="font-bold text-slate-900">{destination}</span>
                        </div>
                        <div className="col-span-2 sm:col-span-3">
                          <span className="text-text-muted font-bold block text-[9px] uppercase">Reason</span>
                          <span className="font-bold text-slate-700">{reason}</span>
                        </div>
                        <div>
                          <span className="text-text-muted font-bold block text-[9px] uppercase">Parent / Guardian</span>
                          <span className="font-black text-slate-900">{parentName} ({relationship})</span>
                        </div>
                        <div>
                          <span className="text-text-muted font-bold block text-[9px] uppercase">Parent Phone</span>
                          <span className="font-mono font-bold text-slate-900">{parentPhone}</span>
                        </div>
                        <div>
                          <span className="text-text-muted font-bold block text-[9px] uppercase">Attachments</span>
                          <span className="font-bold text-slate-900">{uploadedFiles.length} file(s)</span>
                        </div>
                      </div>
                    </div>

                    {/* Mandatory Declaration Checkbox */}
                    <div className="bg-amber-50/60 border border-amber-200 p-4 rounded-xl">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={declarationChecked}
                          onChange={e => { setDeclarationChecked(e.target.checked); setStepError(null); }}
                          className="w-4 h-4 text-primary rounded border-border focus:ring-primary mt-0.5"
                        />
                        <span className="text-[11px] text-slate-800 font-semibold leading-relaxed">
                          <strong>Mandatory Resident Declaration:</strong> I hereby confirm that all leave details provided above are accurate. I undertake to return to the hostel prior to the specified return time of <strong>{expectedReturnTime}</strong> on <strong>{toDate}</strong>.
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Wizard Bottom Controls */}
                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  {wizardStep > 1 ? (
                    <button
                      type="button"
                      onClick={() => { setWizardStep(prev => prev - 1); setStepError(null); }}
                      className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" /> Previous Step
                    </button>
                  ) : <div />}

                  {wizardStep < 4 ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors ml-auto"
                    >
                      <span>Proceed to Step {wizardStep + 1}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleLeaveSubmit}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl text-xs font-black shadow-md flex items-center gap-2 transition-all ml-auto"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Submit Leave Application
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
                    <CalendarIcon className="w-4 h-4 text-primary" /> Leave Calendar
                  </h3>
                  <div className="flex items-center gap-1 text-xs font-bold text-slate-700">
                    <button 
                      onClick={() => setCalendarMonth(prev => Math.max(0, prev - 1))}
                      className="p-1 hover:bg-slate-100 rounded"
                    >
                      ‹
                    </button>
                    <span>{calendarMonth === 6 ? 'July 2026' : 'August 2026'}</span>
                    <button 
                      onClick={() => setCalendarMonth(prev => Math.min(11, prev + 1))}
                      className="p-1 hover:bg-slate-100 rounded"
                    >
                      ›
                    </button>
                  </div>
                </div>

                {/* Legend */}
                <div className="grid grid-cols-2 gap-2 text-[9px] font-bold text-slate-700 pt-1 border-t border-slate-100">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Approved Leave
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Pending Approval
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400" /> Weekend
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Holiday
                  </span>
                </div>

                {/* Calendar Grid (July 2026) */}
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold pt-2">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, idx) => (
                    <div key={idx} className="text-text-muted py-1">{d}</div>
                  ))}

                  {/* Days simulation */}
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                    const isApproved = day >= 25 && day <= 27;
                    const isPending = day >= 28 && day <= 30;
                    const isWeekend = (day % 7 === 5 || day % 7 === 6);
                    const isHoliday = day === 15;

                    return (
                      <div 
                        key={day}
                        className={`p-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          day === 22 ? 'ring-2 ring-primary bg-primary/10 text-primary font-black' :
                          isApproved ? 'bg-emerald-500 text-white shadow-xs' :
                          isPending ? 'bg-amber-500 text-white shadow-xs' :
                          isHoliday ? 'bg-purple-500 text-white' :
                          isWeekend ? 'bg-blue-50 text-blue-800' :
                          'bg-slate-50 hover:bg-slate-100 text-slate-700'
                        }`}
                        title={`July ${day}, 2026`}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Auto Parent Notification Alert Card */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-primary-light text-xs font-black uppercase tracking-wider">
                  <Bell className="w-4 h-4 text-warning" />
                  <span>Auto Parent Notification Status</span>
                </div>
                <p className="text-[11px] text-slate-300 font-semibold leading-relaxed">
                  Every submitted outpass generates an automated SMS dispatch to the registered parent upon Warden review.
                </p>
                <div className="bg-slate-800 p-2.5 rounded-xl text-[10px] font-mono text-emerald-400 border border-slate-700">
                  SMS Log: Outpass {leaves.length > 0 ? leaves[0].id : 'LEV-2026-8941'} dispatched to parent/guardian.
                </div>
              </div>

            </div>

          </div>

          {/* LEAVE HISTORY & QR RETURN CHECK-IN CARDS */}
          <div className="bg-white border border-border p-6 sm:p-8 rounded-2xl shadow-soft space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Submitted Leave Applications History
                </h3>
                <p className="text-[11px] text-text-muted font-semibold mt-0.5">
                  Track Warden approval, status timeline, PDF outpass download, and QR gate return scanner.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {leaves.map(leave => (
                <div 
                  key={leave.id}
                  className="border border-border hover:border-slate-350 rounded-2xl p-5 space-y-4 bg-white transition-all shadow-soft"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-text-muted block">{leave.id} • Applied: {leave.appliedDate}</span>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 mt-1">{leave.leaveType}</h4>
                    </div>

                    <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-md border ${
                      leave.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                      leave.status === 'Pending' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                      leave.status === 'Completed' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                      'bg-slate-100 text-slate-700 border-slate-300'
                    }`}>
                      {leave.status}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl space-y-1.5 text-xs font-semibold text-slate-800">
                    <div className="flex items-center gap-1.5">
                      <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                      <span>{leave.fromDate} to {leave.toDate} ({leave.totalDays} Day(s))</span>
                    </div>
                    <p className="text-text-muted text-[11px] font-medium leading-relaxed">
                      📍 {leave.destination}
                    </p>
                    <p className="text-[11px] text-slate-600 font-medium">
                      Reason: {leave.reason}
                    </p>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs font-bold">
                    
                    <button
                      onClick={() => setInspectLeave(leave)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors text-[11px]"
                    >
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      <span>Status Timeline</span>
                    </button>

                    {leave.status === 'Approved' && (
                      <button
                        onClick={() => setInspectLeave(leave)}
                        className="bg-primary hover:bg-primary-dark text-white px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors shadow-xs text-[11px]"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>QR Gate Pass</span>
                      </button>
                    )}

                    {leave.status === 'Pending' && (
                      <button
                        onClick={() => handleCancelLeave(leave.id)}
                        className="text-red-600 hover:text-red-800 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg text-[11px] transition-colors"
                      >
                        Cancel Request
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PERMANENT HOSTEL EXIT & VACATING PORTAL                             */}
      {/* ========================================================================= */}
      {activeMainTab === 'vacate' && (
        <div className="space-y-8 animate-fadeIn">

          {/* Progress Tracker Bar */}
          <div className="bg-white border border-border p-6 rounded-2xl shadow-soft space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <LogOut className="w-4 h-4 text-danger" /> Permanent Hostel Clearance & Vacating Progress Tracker
            </h3>

            {/* Stage Stepper */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
              {[
                'Application Submitted',
                'Warden Approval',
                'Asset Verification',
                'Room Inspection',
                'Completed'
              ].map((stage, idx) => {
                const stages = ['Application Submitted', 'Warden Approval', 'Asset Verification', 'Room Inspection', 'Completed'];
                const currentIdx = stages.indexOf(vacateData.currentStage);
                const isPassed = idx <= currentIdx;
                const isCurrent = idx === currentIdx;

                return (
                  <div 
                    key={stage}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      isCurrent
                        ? 'bg-primary text-white border-primary shadow-sm font-black'
                        : isPassed
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-500 font-semibold'
                    }`}
                  >
                    <div className="text-[10px] font-mono mb-1">Stage {idx + 1}</div>
                    <div className="text-[11px] leading-tight">{stage}</div>
                  </div>
                );
              })}
            </div>
          </div>

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
                      className="w-full border border-border rounded-xl p-2.5 text-xs font-bold outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-text-muted uppercase">Reason for Permanent Checkout *</label>
                    <input 
                      type="text"
                      value={vacateData.reason}
                      onChange={e => setVacateData({ ...vacateData, reason: e.target.value })}
                      className="w-full border border-border rounded-xl p-2.5 text-xs font-bold outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Digital Clearance Signature */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider block">
                    3. Student Clearance Signature
                  </span>

                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setSignatureMode('draw')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        signatureMode === 'draw' ? 'bg-white text-primary shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      ✏️ Draw Signature
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignatureMode('upload')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        signatureMode === 'upload' ? 'bg-white text-primary shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      📷 Upload Photo Signature
                    </button>
                  </div>
                </div>

                {signatureMode === 'draw' ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-text-muted">Sign inside the box below:</span>
                      <button
                        type="button"
                        onClick={clearSignature}
                        className="text-[10px] text-red-600 hover:underline font-bold"
                      >
                        Clear Signature Pad
                      </button>
                    </div>

                    <div className="border border-slate-300 rounded-2xl p-2 bg-white flex justify-center">
                      <canvas 
                        ref={canvasRef}
                        width={500}
                        height={120}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        className="border border-dashed border-slate-200 rounded-xl cursor-crosshair bg-slate-50/30"
                      />
                    </div>
                    <p className="text-[10px] text-text-muted font-medium">Draw your digital signature using mouse or touch in the box above.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {uploadedSignatureUrl ? (
                      <div className="bg-slate-50 border border-slate-300 rounded-2xl p-4 flex flex-col items-center space-y-3">
                        <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                          ✓ Signature Image Uploaded
                        </span>
                        <div className="bg-white p-2 border border-slate-200 rounded-xl max-w-xs w-full flex justify-center shadow-xs">
                          <img 
                            src={uploadedSignatureUrl} 
                            alt="Uploaded Student Signature" 
                            className="max-h-24 object-contain"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setUploadedSignatureUrl(null)}
                          className="text-[10px] text-red-600 font-bold hover:underline"
                        >
                          Remove & Upload Different Photo
                        </button>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-slate-300 hover:border-primary bg-slate-50/50 p-6 rounded-2xl text-center block cursor-pointer transition-colors group">
                        <Upload className="w-8 h-8 text-slate-400 group-hover:text-primary mx-auto transition-colors" />
                        <p className="text-xs font-bold text-slate-800 mt-2">
                          Click or drag signature photo to upload
                        </p>
                        <p className="text-[10px] text-text-muted font-medium mt-1">
                          Supported formats: PNG, JPG, JPEG (Scanned signature photo)
                        </p>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={handleSignaturePhotoUpload} 
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary-dark text-white font-black py-3.5 rounded-xl text-xs shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" /> Save & Update Vacating Clearance Request
              </button>

            </form>
          </div>

        </div>
      )}

      {/* SUCCESS MODAL AFTER LEAVE SUBMIT */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center shadow-2xl border border-border space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-[10px] font-mono font-bold text-text-muted uppercase">Application ID: {submittedLeaveId}</span>
              <h3 className="text-lg font-black text-slate-900 mt-1">Leave Request Registered!</h3>
              <p className="text-xs text-text-muted font-medium mt-1">
                Your application has been routed to the Warden Office. An automated SMS notification will be sent to the registered parent.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs text-slate-700 font-bold space-y-1">
              <div>Expected Review Time: <strong>Within 2 Hours</strong></div>
              <div>Expected Gate Return: <strong>07:30 PM</strong></div>
            </div>

            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full bg-primary hover:bg-primary-dark text-white py-2.5 rounded-xl text-xs font-bold shadow-sm transition-colors"
            >
              Done & View Leave History
            </button>
          </div>
        </div>
      )}

      {/* STATUS TIMELINE & QR RETURN MODAL */}
      {inspectLeave && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-border space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-mono font-bold text-text-muted">{inspectLeave.id}</span>
                <h3 className="text-base font-black text-slate-900">{inspectLeave.leaveType}</h3>
              </div>
              <button 
                onClick={() => setInspectLeave(null)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Status Timeline */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Leave Status Timeline</h4>
              
              <div className="space-y-4 border-l-2 border-slate-200 ml-3 py-1">
                {[
                  { step: 1, title: 'Application Submitted', desc: `Applied on ${inspectLeave.appliedDate}` },
                  { step: 2, title: 'Warden Review & Parent SMS', desc: 'Parent verification code sent' },
                  { step: 3, title: 'Approved by Warden', desc: 'Gate outpass granted' },
                  { step: 4, title: 'Student Left Hostel', desc: 'Gate scanner checked out' },
                  { step: 5, title: 'Returned & Completed', desc: inspectLeave.returnedTimestamp ? `Returned: ${inspectLeave.returnedTimestamp}` : 'Awaiting return' }
                ].map((s) => {
                  const isPassed = s.step <= inspectLeave.currentTimelineStep;

                  return (
                    <div key={s.step} className="relative pl-6">
                      <div className={`absolute -left-[9px] top-0.5 w-4 h-4 rounded-full border-2 transition-all ${
                        isPassed ? 'bg-emerald-500 border-white' : 'bg-slate-200 border-white'
                      }`} />
                      <h5 className={`text-xs font-bold ${isPassed ? 'text-slate-900' : 'text-slate-400'}`}>
                        {s.title}
                      </h5>
                      <p className="text-[10px] text-text-muted font-medium">{s.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Visual Graphic Outpass Ticket Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl border border-slate-700 space-y-4">
              <div className="flex justify-between items-start border-b border-slate-700 pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider block">Official Gate Pass</span>
                  <h4 className="text-sm font-black text-white">{student?.name || 'Dhanitha Machireddy'} (USN: {student?.usn || '1BM22CS045'})</h4>
                  <p className="text-[11px] text-slate-300">Room 304 • Block A (Main Hostel)</p>
                </div>
                <div className="w-12 h-12 bg-white p-1 rounded-lg shrink-0 flex items-center justify-center">
                  <QrCode className="w-10 h-10 text-slate-900" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10.5px] font-semibold text-slate-300">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Destination</span>
                  <span>{inspectLeave.destination}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Expected Return</span>
                  <span className="text-amber-400 font-bold">{inspectLeave.expectedReturnTime} ({inspectLeave.toDate})</span>
                </div>
              </div>

              {/* Security Gatekeeper Actions */}
              <div className="pt-2 border-t border-slate-700 flex flex-wrap items-center justify-between gap-2">
                {!inspectLeave.isReturned && inspectLeave.status === 'Approved' ? (
                  <button
                    onClick={() => handleSimulateQRReturn(inspectLeave.id)}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-2.5 px-4 rounded-xl text-xs shadow flex items-center justify-center gap-2 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Simulate Security Gate Return Check-in</span>
                  </button>
                ) : inspectLeave.isReturned ? (
                  <div className="w-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 p-2.5 rounded-xl text-center text-xs font-bold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Return Check-in Completed ({inspectLeave.returnedTimestamp})</span>
                  </div>
                ) : null}
              </div>
            </div>

            <button
              onClick={() => setInspectLeave(null)}
              className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-xl text-xs hover:bg-slate-800 transition-colors"
            >
              Close Window
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
