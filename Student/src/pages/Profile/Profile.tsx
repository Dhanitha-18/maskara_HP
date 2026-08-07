import React, { useState, useEffect } from 'react';
import { usePayment } from '../../context/PaymentContext';
import { useAuth } from '../../context/AuthContext';
import { 
  User, Phone, MapPin, Building, FileText, CheckCircle2, Clock, 
  XCircle, CreditCard, ArrowRight, ShieldAlert, X, Eye, HeartPulse, 
  Users, Mail, GraduationCap, ShieldCheck, Lock
} from 'lucide-react';
import { HeroBanner } from '../../components/layout/HeroBanner';
import { useNavigate } from 'react-router-dom';

import { API_BASE_URL } from '../../services/api';

export const Profile: React.FC = () => {
  const { student, hostel, paymentStatus, applicationState, backendPayments, updateStudent } = usePayment();
  const { isLoggedIn, studentUsn: authUsn, login } = useAuth();
  const navigate = useNavigate();
  const [showAppFormModal, setShowAppFormModal] = useState(false);

  const isRoomAllotted = applicationState === 'room_allotted' || applicationState === 'paid';
  const appData = student.applicationData || {};

  // Profile Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editedUsn, setEditedUsn] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const [selectedYear, setSelectedYear] = useState('1st Year');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setEditedUsn(student.usn || appData.usn || authUsn || '');
    setEditedEmail(student.email || appData.email || '');
    const savedYear = appData.yearSem || appData.year || (student as any).yearSem || (student as any).year || (typeof student.semester === 'string' ? student.semester : '1st Year');
    if (savedYear) {
      setSelectedYear(savedYear);
    }
  }, [student, appData, authUsn]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveSuccessMsg(null);
    try {
      const currentUsnToUse = student.usn || authUsn;
      const res = await fetch(`${API_BASE_URL}/api/student/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usn: currentUsnToUse,
          phoneNumber: student.phone || appData.phoneNumber,
          newUsn: editedUsn,
          email: editedEmail,
          year: selectedYear,
          yearSem: selectedYear
        })
      });

      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to update profile');
      }

      // Update AuthContext session so USN stays synced across all tabs
      if (editedUsn && editedUsn !== authUsn) {
        login(editedUsn, student.name || undefined, student.phone || undefined);
      }

      updateStudent({
        usn: editedUsn,
        email: editedEmail,
        yearSem: selectedYear as any,
        year: selectedYear as any
      });

      setSaveSuccessMsg('Profile updated successfully! Saved permanently in database.');
      setIsEditing(false);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to save profile changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const getPhotoUrl = (url?: string | null) => {
    if (!url || url === 'null' || url === 'undefined') return null;
    const trimmed = String(url).trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) return trimmed;
    const origin = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:5000` : 'http://localhost:5000';
    if (trimmed.startsWith('/')) return `${origin}${trimmed}`;
    return `${origin}/${trimmed}`;
  };

  const studentPhotoUrl = getPhotoUrl(student.photoUrl || student.passportPhoto || appData.photoUrl || appData.passportPhoto);

  const displayVal = (val: any) => {
    if (val === null || val === undefined || val === '' || val === 'null') return 'Not Available';
    return String(val);
  };

  // Determine payment status badge info
  const getPaymentStatusInfo = () => {
    if (backendPayments && backendPayments.length > 0) {
      const latest = backendPayments[0];
      if (latest.status === 'APPROVED') {
        return { label: 'Paid & Verified by Admin', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 };
      }
      if (latest.status === 'PENDING_REVIEW') {
        return { label: 'Paid & Under Verification', bg: 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse', icon: Clock };
      }
      if (latest.status === 'REJECTED') {
        return { label: 'Payment Submission Rejected', bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: XCircle };
      }
    }

    switch (paymentStatus) {
      case 'Verified':
      case 'Bed Confirmed':
        return { label: 'Fee Paid & Verified', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 };
      case 'Waiting for Admin Verification':
        return { label: 'Waiting for Admin Verification', bg: 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse', icon: Clock };
      default:
        return { label: 'Fee Pending / Unpaid', bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: XCircle };
    }
  };

  const paymentInfo = getPaymentStatusInfo();
  const PaymentIcon = paymentInfo.icon;

  return (
    <div className="space-y-6 sm:space-y-8 font-sans pb-12">
      <HeroBanner 
        image="/facilities/block4.jpeg" 
        title="Student Profile & Application Details" 
      />

      {/* RESIDENT PROFILE VIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Left Column: Student Avatar/Photo Card */}
          <div className="space-y-6">
            <div className="bg-white border border-border rounded-2xl p-6 shadow-card text-center flex flex-col items-center">
              
              {/* Actual Student Image shared in Application Form */}
              <div className="w-32 h-40 rounded-2xl border-4 border-primary/20 bg-slate-100 flex items-center justify-center overflow-hidden shadow-md mb-4 relative">
                {studentPhotoUrl ? (
                  <img 
                    src={studentPhotoUrl} 
                    alt={student.name} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 p-2">
                    <User className="w-12 h-12 text-slate-300" />
                    <span className="text-[10px] font-bold uppercase tracking-wider mt-1">No Photo</span>
                  </div>
                )}
              </div>

              <h3 className="text-lg font-black text-slate-800 tracking-tight leading-snug">{student.name}</h3>

              {/* Status Badge */}
              <div className="mt-3">
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Allocated Resident Profile
                </span>
              </div>

              {/* Summary Key Details */}
              <div className="w-full border-t border-slate-100 mt-5 pt-4 space-y-3 text-xs text-left font-semibold">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-primary uppercase tracking-wider block font-bold">Unique Application ID</span>
                  <span className="text-primary-dark font-black font-mono block text-xs bg-primary/10 px-2 py-0.5 rounded border border-primary/20 inline-block mt-0.5">
                    {appData.id ? (appData.id.startsWith('APP-') ? appData.id : `APP-2026-${appData.id.slice(0, 6).toUpperCase()}`) : '-'}
                  </span>
                </div>

                <div className="space-y-0.5 border-t border-slate-100/60 pt-2.5">
                  <span className="text-[10px] text-text-muted uppercase tracking-wider block font-bold">Hostel Block & Room</span>
                  <span className="text-slate-900 font-bold block text-xs">
                    {`Block ${hostel.block} • Room ${hostel.room} (Bed ${hostel.bed})`}
                  </span>
                </div>
                
                <div className="space-y-0.5 border-t border-slate-100/60 pt-2.5">
                  <span className="text-[10px] text-text-muted uppercase tracking-wider block font-bold">Branch / Department</span>
                  <span className="text-slate-900 font-bold block text-xs break-words">
                    {displayVal(appData.branch || appData.department || student.department)}
                  </span>
                </div>

                <div className="space-y-0.5 border-t border-slate-100/60 pt-2.5">
                  <span className="text-[10px] text-text-muted uppercase tracking-wider block font-bold">Program</span>
                  <span className="text-slate-900 font-bold block text-xs">
                    {displayVal(appData.program || 'B.E.')}
                  </span>
                </div>

                <div className="space-y-0.5 border-t border-slate-100/60 pt-2.5">
                  <span className="text-[10px] text-text-muted uppercase tracking-wider block font-bold">Email Address</span>
                  <span className="text-slate-900 font-bold font-mono block text-xs break-all">
                    {displayVal(student.email || appData.email)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Full Application Form Details in Structured Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-border rounded-2xl p-6 sm:p-8 shadow-card space-y-8">
              
              {/* Header Title & Edit Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                    Student Profile Details
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm shrink-0 cursor-pointer"
                    >
                      <span>Edit Profile (Email / Year)</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1 transition-all shadow-sm cursor-pointer"
                      >
                        <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-3 rounded-xl text-xs transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {saveSuccessMsg && (
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              {/* 1. Student Personal & Identification Details */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  1. Student Personal & Identification Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-100 p-4 rounded-xl">
                  <div>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block font-bold">2. Full Name</span>
                    <span className="text-slate-900 font-bold block mt-0.5">{displayVal(appData.studentName || student.name)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block font-bold">3. Gender</span>
                    <span className="text-slate-900 font-bold block mt-0.5">{displayVal(appData.gender)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block font-bold">4. Contact Number</span>
                    <span className="text-slate-900 font-bold block mt-0.5">{displayVal(appData.phoneNumber || student.phone)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block font-bold">5. Email</span>
                    {isEditing ? (
                      <input
                        type="email"
                        value={editedEmail}
                        onChange={e => setEditedEmail(e.target.value)}
                        className="w-full mt-1 bg-white border border-indigo-300 rounded-lg p-1.5 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    ) : (
                      <span className="text-slate-900 font-bold block mt-0.5 font-mono">{displayVal(editedEmail || appData.email || student.email)}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block font-bold">6. Academic Year</span>
                    {isEditing ? (
                      <select
                        value={selectedYear}
                        onChange={e => setSelectedYear(e.target.value)}
                        className="w-full mt-1 bg-white border border-indigo-300 rounded-lg p-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                      >
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                      </select>
                    ) : (
                      <span className="text-slate-900 font-bold block mt-0.5">{displayVal(selectedYear)}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block font-bold">7. Program</span>
                    <span className="text-slate-900 font-bold block mt-0.5">{displayVal(appData.program)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block font-bold">8. Branch</span>
                    <span className="text-slate-900 font-bold block mt-0.5">{displayVal(appData.branch || appData.department || student.department)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block font-bold">10. Blood Group</span>
                    <span className="text-slate-900 font-bold block mt-0.5 text-primary">{displayVal(appData.bloodGroup)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block font-bold">11. Aadhaar Number</span>
                    <span className="text-slate-900 font-bold block mt-0.5 font-mono">{displayVal(appData.aadhaarNumber)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block font-bold">12. Nationality</span>
                    <span className="text-slate-900 font-bold block mt-0.5">{displayVal(appData.nationality)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block font-bold">13. Religion</span>
                    <span className="text-slate-900 font-bold block mt-0.5">{displayVal(appData.religion)}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block font-bold">14. Permanent Address</span>
                    <span className="text-slate-900 font-bold block mt-0.5 leading-relaxed">{displayVal(appData.permanentAddress || appData.address || student.address)}</span>
                  </div>
                </div>
              </div>

              {/* 2. Parent & Family Details */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  2. Parent & Family Information
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-100 p-4 rounded-xl">
                  <div>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block font-bold">15. Father Name</span>
                    <span className="text-slate-900 font-bold block mt-0.5">{displayVal(appData.fatherName)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block font-bold">16. Father Contact Number</span>
                    <span className="text-slate-900 font-bold block mt-0.5">{displayVal(appData.fatherPhone)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block font-bold">17. Father Email</span>
                    <span className="text-slate-900 font-bold block mt-0.5 font-mono">{displayVal(appData.fatherEmail)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block font-bold">18. Mother Name</span>
                    <span className="text-slate-900 font-bold block mt-0.5">{displayVal(appData.motherName)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block font-bold">19. Mother Contact Number</span>
                    <span className="text-slate-900 font-bold block mt-0.5">{displayVal(appData.motherPhone)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block font-bold">20. Mother Email</span>
                    <span className="text-slate-900 font-bold block mt-0.5 font-mono">{displayVal(appData.motherEmail)}</span>
                  </div>
                  <div className="sm:col-span-3 border-t border-slate-200/60 pt-2.5">
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block font-bold">21. Communication Address</span>
                    <span className="text-slate-900 font-bold block mt-0.5 leading-relaxed">{displayVal(appData.communicationAddress)}</span>
                  </div>
                </div>
              </div>

              {/* 3. Local Guardian Details */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  3. Local Guardian Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-100 p-4 rounded-xl">
                  <div>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block font-bold">22. Local Guardian Name</span>
                    <span className="text-slate-900 font-bold block mt-0.5">{displayVal(appData.guardianName)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block font-bold">23. Relationship</span>
                    <span className="text-slate-900 font-bold block mt-0.5">{displayVal(appData.guardianRelationship)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block font-bold">24. Local Guardian Phone</span>
                    <span className="text-slate-900 font-bold block mt-0.5">{displayVal(appData.guardianPhone)}</span>
                  </div>
                  <div className="sm:col-span-3 border-t border-slate-200/60 pt-2.5">
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block font-bold">25. Local Guardian Address</span>
                    <span className="text-slate-900 font-bold block mt-0.5 leading-relaxed">{displayVal(appData.guardianAddress || appData.guardianEmail)}</span>
                  </div>
                </div>
              </div>

              {/* 4. Medical & Emergency Details */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-rose-500" />
                  4. Health, Medical & Emergency Contacts
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-100 p-4 rounded-xl">
                  <div>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block font-bold">26. Existing Health Issues</span>
                    <span className="text-slate-900 font-bold block mt-0.5">{displayVal(appData.healthIssues || appData.medicalInfo)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block font-bold">27. Allergies</span>
                    <span className="text-slate-900 font-bold block mt-0.5">{displayVal(appData.allergies)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block font-bold">28. Current Medications</span>
                    <span className="text-slate-900 font-bold block mt-0.5">{displayVal(appData.currentMedications)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block font-bold text-rose-600">29. Emergency Contact Number</span>
                    <span className="text-slate-900 font-bold block mt-0.5">{displayVal(appData.emergencyContact)}</span>
                  </div>
                </div>
              </div>

              {/* 5. Room Allotment & Hostel Status */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Building className="w-4 h-4 text-primary" />
                  5. Room Allotment & Hostel Status
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-100 p-4 rounded-xl">
                  <div className="space-y-1">
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block">Hostel Residence</span>
                    <span className="text-slate-900 font-bold block text-sm">OM SAI PG</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block">Block & Floor</span>
                    <span className="text-slate-900 font-bold block text-sm">Block {hostel.block} • Floor {hostel.floor}</span>
                  </div>
                  <div className="space-y-1 border-t border-slate-200/60 pt-2.5">
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block">Room Number & Bed</span>
                    <span className="text-slate-900 font-bold block font-mono text-sm">Room {hostel.room} • Bed {hostel.bed}</span>
                  </div>
                  <div className="space-y-1 border-t border-slate-200/60 pt-2.5">
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block">Sharing Type</span>
                    <span className="text-slate-900 font-bold block text-sm">{hostel.sharing}</span>
                  </div>
                </div>
              </div>

              {/* 6. Fee Payment Verification Status */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" />
                    6. Fee Payment Verification Status
                  </h4>
                  <button
                    onClick={() => navigate('/payment')}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-1.5 px-3 rounded-lg text-[10px] flex items-center gap-1 border border-slate-200 transition-all"
                  >
                    <span>Payment Hub</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                    <span className="text-[9px] text-text-muted uppercase tracking-wider block">Verification Status</span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border mt-1.5 ${paymentInfo.bg}`}>
                      <PaymentIcon className="w-3 h-3" />
                      {paymentInfo.label}
                    </span>
                  </div>
                  <div className="bg-primary/5 border border-primary/20 p-3 rounded-xl">
                    <span className="text-[9px] text-primary uppercase tracking-wider block font-bold">Amount to be paid</span>
                    <span className="text-base font-black text-primary mt-1 block">₹1,43,000</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>

      {/* Modal: View Filled Application Form */}
      {showAppFormModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white border border-border rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                    Filled Application Form Data
                  </h3>
                  <p className="text-[11px] text-text-muted">Official application record stored in database.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAppFormModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Sections */}
            <div className="space-y-4 text-xs font-semibold">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                <span className="text-[10px] font-black text-primary uppercase tracking-wider block border-b border-slate-200/60 pb-1">
                  Database Record Fields (1 - 29)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
                  <div><span className="text-text-muted text-[10px] uppercase block">1. USN</span><span className="font-bold text-slate-900">{displayVal(appData.bmsitId || appData.usn)}</span></div>
                  <div><span className="text-text-muted text-[10px] uppercase block">2. Name</span><span className="font-bold text-slate-900">{displayVal(appData.studentName)}</span></div>
                  <div><span className="text-text-muted text-[10px] uppercase block">3. Gender</span><span className="font-bold text-slate-900">{displayVal(appData.gender)}</span></div>
                  <div><span className="text-text-muted text-[10px] uppercase block">4. Contact Number</span><span className="font-bold text-slate-900">{displayVal(appData.phoneNumber)}</span></div>
                  <div><span className="text-text-muted text-[10px] uppercase block">5. Email</span><span className="font-bold text-slate-900 font-mono">{displayVal(appData.email)}</span></div>
                  <div><span className="text-text-muted text-[10px] uppercase block">6. Date of Birth</span><span className="font-bold text-slate-900">{appData.dob ? new Date(appData.dob).toLocaleDateString('en-IN') : 'Not Available'}</span></div>
                  <div><span className="text-text-muted text-[10px] uppercase block">7. Program</span><span className="font-bold text-slate-900">{displayVal(appData.program)}</span></div>
                  <div><span className="text-text-muted text-[10px] uppercase block">8. Branch</span><span className="font-bold text-slate-900">{displayVal(appData.branch || appData.department)}</span></div>
                  <div><span className="text-text-muted text-[10px] uppercase block">10. Blood Group</span><span className="font-bold text-slate-900">{displayVal(appData.bloodGroup)}</span></div>
                  <div><span className="text-text-muted text-[10px] uppercase block">11. Aadhaar Number</span><span className="font-bold text-slate-900 font-mono">{displayVal(appData.aadhaarNumber)}</span></div>
                  <div><span className="text-text-muted text-[10px] uppercase block">12. Nationality</span><span className="font-bold text-slate-900">{displayVal(appData.nationality)}</span></div>
                  <div><span className="text-text-muted text-[10px] uppercase block">13. Religion</span><span className="font-bold text-slate-900">{displayVal(appData.religion)}</span></div>
                  <div className="sm:col-span-2"><span className="text-text-muted text-[10px] uppercase block">14. Permanent Address</span><span className="font-bold text-slate-900">{displayVal(appData.permanentAddress || appData.address)}</span></div>
                  <div><span className="text-text-muted text-[10px] uppercase block">15. Father Name</span><span className="font-bold text-slate-900">{displayVal(appData.fatherName)}</span></div>
                  <div><span className="text-text-muted text-[10px] uppercase block">16. Father Contact Number</span><span className="font-bold text-slate-900">{displayVal(appData.fatherPhone)}</span></div>
                  <div><span className="text-text-muted text-[10px] uppercase block">17. Father Email</span><span className="font-bold text-slate-900 font-mono">{displayVal(appData.fatherEmail)}</span></div>
                  <div><span className="text-text-muted text-[10px] uppercase block">18. Mother Name</span><span className="font-bold text-slate-900">{displayVal(appData.motherName)}</span></div>
                  <div><span className="text-text-muted text-[10px] uppercase block">19. Mother Contact Number</span><span className="font-bold text-slate-900">{displayVal(appData.motherPhone)}</span></div>
                  <div><span className="text-text-muted text-[10px] uppercase block">20. Mother Email</span><span className="font-bold text-slate-900 font-mono">{displayVal(appData.motherEmail)}</span></div>
                  <div className="sm:col-span-2"><span className="text-text-muted text-[10px] uppercase block">21. Communication Address</span><span className="font-bold text-slate-900">{displayVal(appData.communicationAddress)}</span></div>
                  <div><span className="text-text-muted text-[10px] uppercase block">22. Local Guardian Name</span><span className="font-bold text-slate-900">{displayVal(appData.guardianName)}</span></div>
                  <div><span className="text-text-muted text-[10px] uppercase block">23. Relationship</span><span className="font-bold text-slate-900">{displayVal(appData.guardianRelationship)}</span></div>
                  <div><span className="text-text-muted text-[10px] uppercase block">24. Local Guardian Phone</span><span className="font-bold text-slate-900">{displayVal(appData.guardianPhone)}</span></div>
                  <div className="sm:col-span-2"><span className="text-text-muted text-[10px] uppercase block">25. Local Guardian Address</span><span className="font-bold text-slate-900">{displayVal(appData.guardianAddress || appData.guardianEmail)}</span></div>
                  <div><span className="text-text-muted text-[10px] uppercase block">26. Existing Health Issues</span><span className="font-bold text-slate-900">{displayVal(appData.healthIssues || appData.medicalInfo)}</span></div>
                  <div><span className="text-text-muted text-[10px] uppercase block">27. Allergies</span><span className="font-bold text-slate-900">{displayVal(appData.allergies)}</span></div>
                  <div><span className="text-text-muted text-[10px] uppercase block">28. Current Medications</span><span className="font-bold text-slate-900">{displayVal(appData.currentMedications)}</span></div>
                  <div><span className="text-text-muted text-[10px] uppercase block">29. Emergency Contact</span><span className="font-bold text-slate-900">{displayVal(appData.emergencyContact)}</span></div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAppFormModal(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-5 rounded-xl text-xs transition-colors"
              >
                Close View
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};