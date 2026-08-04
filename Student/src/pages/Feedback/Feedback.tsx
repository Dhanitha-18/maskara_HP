import React, { useState, useEffect } from 'react';
import { usePayment } from '../../context/PaymentContext';
import { useAuth } from '../../context/AuthContext';
import { HeroBanner } from '../../components/layout/HeroBanner';
import { FEEDBACK_HERO_IMAGE } from '../../assets/heroBanners';
import { 
  Star, 
  CheckCircle2, 
  Utensils, 
  Wifi, 
  ShieldCheck, 
  Send, 
  Sparkles,
  FileCheck,
  AlertCircle,
  Clock,
  CreditCard,
  Lock,
  Calendar
} from 'lucide-react';

interface StoredFeedback {
  feedbackId: string;
  submissionDate: string;
  submissionTime: string;
  submissionIso: string;
  monthKey: string;
  monthTitle: string;
  paidPgAmount: string;
  foodQuality: string;
  foodServedAsPerMenu: string;
  securityRating: string;
  internetRating: string;
  roWaterAvailability: string;
  hygieneRating: string;
  powerHotWaterRating: string;
  washingMachineRating: string;
  roomFacilitiesRating: string;
  grievanceResponseRating: string;
  overallRating: number;
  suggestions: string;
  comments: string;
}

export const Feedback: React.FC = () => {
  const { student, hostel } = usePayment();
  const { studentName: authName, studentPhone: authPhone, studentUsn: authUsn } = useAuth();

  // Dynamic Month & Calendar Window Calculation:
  // On 1st of any month (e.g. 1st August to 31st August), feedback is collected for the completed previous month (July).
  // On 1st September to 30th September, feedback is collected for August, etc.
  const getFeedbackMonthInfo = () => {
    const now = new Date();
    
    // 1. Target feedback month (Previous completed month e.g., July 2026 when in August 2026)
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const targetMonthName = prevMonthDate.toLocaleString('en-US', { month: 'long' });
    const targetYear = prevMonthDate.getFullYear();
    const monthKey = `${targetMonthName.toLowerCase()}_${targetYear}`; // e.g. 'july_2026'

    // 2. Current active submission window (1st to last day of current month e.g., 1 Aug 2026 - 31 Aug 2026)
    const currentMonthName = now.toLocaleString('en-US', { month: 'long' });
    const currentYear = now.getFullYear();
    const activeWindowStartStr = `1 ${currentMonthName} ${currentYear}`;
    const lastDayObj = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const activeWindowEndStr = `${lastDayObj.getDate()} ${currentMonthName} ${currentYear}`;

    // 3. Next feedback cycle opening date (1st day of next month e.g., 1 September 2026 when in August)
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonthName = nextMonthDate.toLocaleString('en-US', { month: 'long' });
    const nextMonthYear = nextMonthDate.getFullYear();
    const nextOpenDate = `1 ${nextMonthName} ${nextMonthYear}`; // '1 September 2026'

    const headingTitle = `Feedback Form for ${targetMonthName}`;

    return {
      targetMonthName,
      targetYear,
      headingTitle,
      monthKey,
      currentMonthName,
      activeWindowStartStr,
      activeWindowEndStr,
      nextOpenDate,
      nextMonthName
    };
  };

  const monthInfo = getFeedbackMonthInfo();

  // Form Field States corresponding exactly to Google Form Questions (UNFILLED BY DEFAULT)
  const [paidPgAmount, setPaidPgAmount] = useState<string>('');
  const [foodQuality, setFoodQuality] = useState<string>('');
  const [securityRating, setSecurityRating] = useState<string>('');
  const [internetRating, setInternetRating] = useState<string>('');
  const [roWaterAvailability, setRoWaterAvailability] = useState<string>('');
  const [hygieneRating, setHygieneRating] = useState<string>('');
  const [powerHotWaterRating, setPowerHotWaterRating] = useState<string>('');
  const [washingMachineRating, setWashingMachineRating] = useState<string>('');
  const [roomFacilitiesRating, setRoomFacilitiesRating] = useState<string>('');
  const [grievanceResponseRating, setGrievanceResponseRating] = useState<string>('');
  const [foodServedAsPerMenu, setFoodServedAsPerMenu] = useState<string>('');
  const [overallRating, setOverallRating] = useState<number>(0);

  const [suggestions, setSuggestions] = useState<string>('');
  const [comments, setComments] = useState<string>('');

  const studentKey = authUsn || student.usn || 'guest';
  const storageKey = `hms_student_feedback_${studentKey}_${monthInfo.monthKey}`;

  // Submission / Success State per month per student
  const [submittedFeedback, setSubmittedFeedback] = useState<StoredFeedback | null>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isSuccessToast, setIsSuccessToast] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync state if month or student changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      setSubmittedFeedback(saved ? JSON.parse(saved) : null);
    } catch (e) {
      console.error(e);
    }
  }, [storageKey]);

  // Handle Form Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validate ALL questions are answered (None autofilled)
    const unanswered: string[] = [];
    if (!paidPgAmount) unanswered.push('Q1 (Paid PG Amount)');
    if (!foodQuality) unanswered.push('Q2 (Overall Food Quality)');
    if (!securityRating) unanswered.push('Q3 (Security Measures)');
    if (!internetRating) unanswered.push('Q4 (Internet Services)');
    if (!roWaterAvailability) unanswered.push('Q5 (RO Drinking Water)');
    if (!hygieneRating) unanswered.push('Q6 (Overall Hygiene)');
    if (!powerHotWaterRating) unanswered.push('Q7 (Power Backup & Hot Water)');
    if (!washingMachineRating) unanswered.push('Q8 (Washing Machine Maintenance)');
    if (!roomFacilitiesRating) unanswered.push('Q9 (Cot, Desk & Wardrobe Facilities)');
    if (!grievanceResponseRating) unanswered.push('Q10 (Grievance Response)');
    if (!foodServedAsPerMenu) unanswered.push('Q11 (Food Served as Per Menu)');
    if (overallRating === 0) unanswered.push('Q12 (Overall Rating Stars)');

    if (unanswered.length > 0) {
      setValidationError(`Please answer all feedback questions before submitting! Pending: ${unanswered.join(', ')}`);
      return;
    }

    const uniqueId = `FBD-${monthInfo.targetMonthName.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const isoStr = now.toISOString();

    const newFeedback: StoredFeedback = {
      feedbackId: uniqueId,
      submissionDate: dateStr,
      submissionTime: timeStr,
      submissionIso: isoStr,
      monthKey: monthInfo.monthKey,
      monthTitle: monthInfo.headingTitle,
      paidPgAmount,
      foodQuality,
      foodServedAsPerMenu,
      securityRating,
      internetRating,
      roWaterAvailability,
      hygieneRating,
      powerHotWaterRating,
      washingMachineRating,
      roomFacilitiesRating,
      grievanceResponseRating,
      overallRating,
      suggestions: suggestions.trim(),
      comments: comments.trim()
    };

    // Save to profile & month specific key in localStorage (1 response per month per student)
    try {
      localStorage.setItem(storageKey, JSON.stringify(newFeedback));
    } catch (err) {
      console.error(err);
    }

    // Submit to backend
    fetch('http://localhost:5000/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName: student.name || authName || 'Student',
        usn: studentKey,
        message: suggestions.trim() || comments.trim() || `Feedback for ${monthInfo.headingTitle}`,
        rating: overallRating || 5
      })
    }).catch(err => console.error('Feedback submit error:', err));

    setSubmittedFeedback(newFeedback);
    setIsSuccessToast(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Custom Radio Button Option Component (Unselected by default)
  const RadioGroupOptions = ({
    options,
    value,
    onChange
  }: {
    options: string[];
    value: string;
    onChange: (val: string) => void;
  }) => (
    <div className="flex flex-wrap gap-2.5 pt-1">
      {options.map((opt) => {
        const isSelected = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${
              isSelected
                ? 'bg-primary border-primary text-white shadow-sm font-black scale-[1.02]'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
            }`}
          >
            <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
              isSelected ? 'border-white bg-white' : 'border-slate-400'
            }`}>
              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
            </span>
            <span>{opt}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-8 animate-fadeIn pb-16 font-sans">
      
      {/* Hero Banner */}
      <HeroBanner 
        image={FEEDBACK_HERO_IMAGE}
        title={monthInfo.headingTitle}
      />

      {/* Success Toast */}
      {isSuccessToast && (
        <div className="bg-emerald-600 text-white p-4 sm:p-5 rounded-2xl shadow-lg flex items-center justify-between animate-fadeIn border border-emerald-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black">Feedback for {monthInfo.targetMonthName} {monthInfo.targetYear} submitted successfully!</h4>
              <p className="text-[11px] text-emerald-100 font-medium">
                Feedback ID: {submittedFeedback?.feedbackId} • Timestamp: {submittedFeedback?.submissionDate} at {submittedFeedback?.submissionTime}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => setIsSuccessToast(false)} 
            className="text-white hover:bg-emerald-700 p-1.5 rounded-lg text-sm font-bold transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* CASE 1: Feedback Already Submitted for Target Month (1 Response Per Month Restriction) */}
      {submittedFeedback ? (
        <div className="bg-white border border-emerald-200 p-6 sm:p-10 rounded-2xl shadow-card space-y-6 max-w-3xl mx-auto text-center animate-fadeIn">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-200 shadow-inner">
            <FileCheck className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider border border-emerald-200 font-mono">
              STATUS: ✅ RESPONSE SUBMITTED FOR {monthInfo.targetMonthName.toUpperCase()} {monthInfo.targetYear}
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 pt-2">
              {monthInfo.headingTitle} — Response Recorded
            </h3>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-900 font-bold inline-flex items-center gap-2 px-6">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Next Feedback Cycle (for {monthInfo.currentMonthName}) Opens: <strong className="text-amber-950 font-black">{monthInfo.nextOpenDate}</strong></span>
          </div>

          {/* Submitted Response Details Summary Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left space-y-4 text-xs font-semibold">
            <div className="flex flex-wrap justify-between items-center border-b border-slate-200 pb-3 gap-2">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Your Submitted Response ({submittedFeedback.feedbackId})</span>
              <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[10.5px]">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>Submitted on {submittedFeedback.submissionDate} at {submittedFeedback.submissionTime}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[9.5px] text-text-muted uppercase font-bold block">Paid PG Fee to College</span>
                <span className="text-slate-900 font-black text-xs mt-0.5 block">{submittedFeedback.paidPgAmount}</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[9.5px] text-text-muted uppercase font-bold block">Overall Food Quality</span>
                <span className="text-slate-900 font-black text-xs mt-0.5 block">{submittedFeedback.foodQuality}</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[9.5px] text-text-muted uppercase font-bold block">Overall Rating</span>
                <span className="text-amber-500 font-black text-sm flex items-center gap-1 mt-0.5">
                  ⭐ {submittedFeedback.overallRating} / 5
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[9.5px] text-text-muted uppercase font-bold block">Hostel Hygiene</span>
                <span className="text-slate-900 font-black text-xs mt-0.5 block">{submittedFeedback.hygieneRating}</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[9.5px] text-text-muted uppercase font-bold block">Security Measures</span>
                <span className="text-slate-900 font-black text-xs mt-0.5 block">{submittedFeedback.securityRating}</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[9.5px] text-text-muted uppercase font-bold block">Grievance Response</span>
                <span className="text-slate-900 font-black text-xs mt-0.5 block">{submittedFeedback.grievanceResponseRating}</span>
              </div>
            </div>

            {submittedFeedback.suggestions && (
              <div className="space-y-1 bg-white p-3.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Suggestions for Improvement</span>
                <p className="text-slate-800 leading-relaxed text-xs">{submittedFeedback.suggestions}</p>
              </div>
            )}
          </div>

        </div>
      ) : (

        /* CASE 2: Active Monthly Feedback Form (Answers UNFILLED by default) */
        <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto">

          {/* Form Month Heading Header Card */}
          <div className="bg-white border border-primary/20 p-6 rounded-2xl shadow-soft flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-wide uppercase">
                  {monthInfo.headingTitle}
                </h2>
                <p className="text-xs text-text-muted font-medium">
                  Monthly feedback for <strong className="text-slate-800">{monthInfo.targetMonthName} {monthInfo.targetYear}</strong> • Submission window: <span className="text-primary font-bold">{monthInfo.activeWindowStartStr} to {monthInfo.activeWindowEndStr}</span>
                </p>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              🟢 Open for Submission
            </span>
          </div>

          {/* Validation Warning Alert */}
          {validationError && (
            <div className="bg-danger/10 border border-danger/20 text-danger p-4 rounded-2xl text-xs flex items-center gap-3 font-bold animate-fadeIn">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* SECTION 1: Payment Verification (Question 1) */}
          <div className={`bg-white border rounded-2xl p-6 sm:p-8 shadow-soft space-y-4 ${!paidPgAmount ? 'border-amber-300' : 'border-border'}`}>
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CreditCard className="w-4.5 h-4.5" />
              </div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Fee Payment Status
              </h3>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-900 block">
                1. Have you paid PG amount to BMSIT&M college account? If no then feedback is not mandatory. <span className="text-danger">*</span>
              </label>
              <RadioGroupOptions 
                options={['Yes', 'No']}
                value={paidPgAmount}
                onChange={setPaidPgAmount}
              />
            </div>
          </div>

          {/* SECTION 2: Mess & Food Quality (Questions 2 & 11) */}
          <div className="bg-white border border-border rounded-2xl p-6 sm:p-8 shadow-soft space-y-6">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Utensils className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Mess & Food Quality
                </h3>
                <p className="text-[11px] text-text-muted font-semibold">Questions 2 & 11 from Google Form</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Question 2 */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-900 block">
                  2. How do you rate the overall quality of the food <span className="text-danger">*</span>
                </label>
                <RadioGroupOptions 
                  options={['Good', 'Satisfactory', 'Poor']}
                  value={foodQuality}
                  onChange={setFoodQuality}
                />
              </div>

              {/* Question 11 */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <label className="text-sm font-bold text-slate-900 block">
                  11. Is the food served as per the menu displayed <span className="text-danger">*</span>
                </label>
                <RadioGroupOptions 
                  options={['Yes', 'No', 'Maybe']}
                  value={foodServedAsPerMenu}
                  onChange={setFoodServedAsPerMenu}
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: Facilities, Wi-Fi & Maintenance (Questions 4, 5, 7, 8, 9) */}
          <div className="bg-white border border-border rounded-2xl p-6 sm:p-8 shadow-soft space-y-6">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-primary flex items-center justify-center">
                <Wifi className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Facilities & Infrastructure Services
                </h3>
                <p className="text-[11px] text-text-muted font-semibold">Questions 4, 5, 7, 8 & 9 from Google Form</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Question 4 */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-900 block">
                  4. How do you rate the internet services in the hostel <span className="text-danger">*</span>
                </label>
                <RadioGroupOptions 
                  options={['Good', 'Satisfactory', 'Poor']}
                  value={internetRating}
                  onChange={setInternetRating}
                />
              </div>

              {/* Question 5 */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <label className="text-sm font-bold text-slate-900 block">
                  5. Availability of purified / RO drinking water in the hostel? <span className="text-danger">*</span>
                </label>
                <RadioGroupOptions 
                  options={['Sufficient', 'Scarcity', 'Very bad condition']}
                  value={roWaterAvailability}
                  onChange={setRoWaterAvailability}
                />
              </div>

              {/* Question 7 */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <label className="text-sm font-bold text-slate-900 block">
                  7. How do you rate the overall power backup and hot water facility in the hostel <span className="text-danger">*</span>
                </label>
                <RadioGroupOptions 
                  options={['Excellent', 'Very good', 'Good', 'Fair', 'Poor']}
                  value={powerHotWaterRating}
                  onChange={setPowerHotWaterRating}
                />
              </div>

              {/* Question 8 */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <label className="text-sm font-bold text-slate-900 block">
                  8. How do you rate washing machine maintenance in the hostel <span className="text-danger">*</span>
                </label>
                <RadioGroupOptions 
                  options={['Good', 'Satisfactory', 'Poor']}
                  value={washingMachineRating}
                  onChange={setWashingMachineRating}
                />
              </div>

              {/* Question 9 */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <label className="text-sm font-bold text-slate-900 block">
                  9. How do you rate the cot, study table, chair and wardrobe facilities provided in the room. <span className="text-danger">*</span>
                </label>
                <RadioGroupOptions 
                  options={['Good', 'Satisfactory', 'Poor']}
                  value={roomFacilitiesRating}
                  onChange={setRoomFacilitiesRating}
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: Hygiene, Security & Authorities (Questions 3, 6, 10) */}
          <div className="bg-white border border-border rounded-2xl p-6 sm:p-8 shadow-soft space-y-6">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <ShieldCheck className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Security, Hygiene & Grievances
                </h3>
                <p className="text-[11px] text-text-muted font-semibold">Questions 3, 6 & 10 from Google Form</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Question 3 */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-900 block">
                  3. How do you rate the security measures incorporated in the hostel <span className="text-danger">*</span>
                </label>
                <RadioGroupOptions 
                  options={['Excellent', 'Very good', 'Good', 'Fair', 'Poor']}
                  value={securityRating}
                  onChange={setSecurityRating}
                />
              </div>

              {/* Question 6 */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <label className="text-sm font-bold text-slate-900 block">
                  6. How do you rate the overall hygiene and maintenance of the hostel <span className="text-danger">*</span>
                </label>
                <RadioGroupOptions 
                  options={['Excellent', 'Very good', 'Good', 'Fair', 'Poor']}
                  value={hygieneRating}
                  onChange={setHygieneRating}
                />
              </div>

              {/* Question 10 */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <label className="text-sm font-bold text-slate-900 block">
                  10. How do you rate the response to your grievances by the residential hostel authorities. <span className="text-danger">*</span>
                </label>
                <RadioGroupOptions 
                  options={['Good', 'Satisfactory', 'Poor']}
                  value={grievanceResponseRating}
                  onChange={setGrievanceResponseRating}
                />
              </div>
            </div>
          </div>

          {/* SECTION 5: Overall Rating (Question 12) & Suggestions */}
          <div className="bg-white border border-border rounded-2xl p-6 sm:p-8 shadow-soft space-y-6">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Sparkles className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Overall Rating & Detailed Suggestions
                </h3>
                <p className="text-[11px] text-text-muted font-semibold">Question 12 from Google Form + Additional Text Areas</p>
              </div>
            </div>

            {/* Question 12: Star Rating */}
            <div className="bg-amber-50/60 border border-amber-200 p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-900 block">
                  12. Overall rating <span className="text-danger">*</span>
                </label>
                <span className="text-xs font-black text-amber-600 font-mono">
                  {overallRating > 0 ? `${overallRating} / 5 Stars` : 'Tap stars to rate'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setOverallRating(star)}
                    className={`p-2.5 rounded-xl border transition-all ${
                      star <= overallRating
                        ? 'bg-amber-500 text-white border-amber-500 shadow-md scale-105'
                        : 'bg-white text-slate-300 border-slate-200 hover:border-amber-400 hover:text-amber-400'
                    }`}
                    title={`${star} Star${star > 1 ? 's' : ''}`}
                  >
                    <Star className={`w-6 h-6 ${star <= overallRating ? 'fill-white' : ''}`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Suggestions for Improvement (Large Text Area) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 block">
                Suggestions for Improvement
              </label>
              <textarea
                rows={4}
                value={suggestions}
                onChange={(e) => setSuggestions(e.target.value)}
                placeholder="Share your specific suggestions for mess food, study areas, water supply, laundry or warden assistance..."
                className="w-full bg-slate-50 border border-border rounded-xl p-3.5 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
              />
            </div>

            {/* Additional Comments (Large Text Area) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 block">
                Additional Comments
              </label>
              <textarea
                rows={3}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Any extra comments, appreciation for staff, or custom requests..."
                className="w-full bg-slate-50 border border-border rounded-xl p-3.5 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="bg-primary hover:bg-primary-dark text-white font-bold py-4 px-8 rounded-2xl text-xs sm:text-sm shadow-md hover:shadow-lg flex items-center gap-2 transition-all group"
            >
              <Send className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              <span>Submit Feedback</span>
            </button>
          </div>

        </form>
      )}

    </div>
  );
};