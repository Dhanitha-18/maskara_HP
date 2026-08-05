import React, { useState, useEffect } from 'react';
import { usePayment } from '../../context/PaymentContext';
import { HeroBanner } from '../../components/layout/HeroBanner';
import { PAYMENT_HERO_IMAGE } from '../../assets/heroBanners';
import { io } from 'socket.io-client';
import { 
  Building,
  Copy,
  Check,
  ExternalLink,
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  ShieldAlert
} from 'lucide-react';

const DEFAULT_GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSeGj_HFh1FvceJCVuQhY7L4dY74CjjjjHccehN69MDOg6-Egw/viewform';

export const Payment: React.FC = () => {
  const { student, hostel, paymentStatus, backendPayments } = usePayment();

  // Copy success indicator
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Dynamic bank account details state
  const [bankDetails, setBankDetails] = useState({
    holderName: 'The Principal BMSIT & M Outsourced Hostel SB A/C',
    accountNo: '50495632400',
    ifscCode: 'IDIB000A682',
    bankName: 'Indian Bank',
    branch: 'Avalahalli, Bangalore'
  });

  // Admin Published Payment Requests State
  const [adminPaymentRequests, setAdminPaymentRequests] = useState<any[]>([]);
  // All Backend Payments Submitted by Students
  const [allPayments, setAllPayments] = useState<any[]>([]);

  useEffect(() => {
    fetch('http://localhost:5000/api/settings/bank-details')
      .then(res => res.json())
      .then(data => {
        if (data && data.holderName) {
          setBankDetails(data);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch Payment Requests & User Submitted Payments with Real-Time WebSockets
  useEffect(() => {
    const socket = io('http://localhost:5000');

    const loadData = () => {
      fetch('http://localhost:5000/api/settings/payment-requests')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setAdminPaymentRequests(data);
        })
        .catch(() => {});

      fetch('http://localhost:5000/api/payments')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setAllPayments(data);
        })
        .catch(() => {});
    };

    loadData();

    socket.on('data_updated', loadData);
    socket.on('payment_submitted', loadData);
    socket.on('payment_status_changed', loadData);
    socket.on('payment_request_updated', loadData);

    const interval = setInterval(loadData, 3000);

    return () => {
      socket.off('data_updated', loadData);
      socket.off('payment_submitted', loadData);
      socket.off('payment_status_changed', loadData);
      socket.off('payment_request_updated', loadData);
      socket.disconnect();
      clearInterval(interval);
    };
  }, []);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 1800);
  };

  // Payment Form Submission Modal State
  const [selectedFormItem, setSelectedFormItem] = useState<any | null>(null);
  const [utrInput, setUtrInput] = useState('');
  const [paymentDateInput, setPaymentDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const handleOpenFormAndModal = (item: any) => {
    const destination = item.googleFormUrl || DEFAULT_GOOGLE_FORM_URL;
    window.open(destination, '_blank', 'noopener,noreferrer');
    setSelectedFormItem(item);
  };

  const handleStudentFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrInput.trim()) {
      alert('Please enter Bank UTR / Transaction Reference Number');
      return;
    }
    setIsSubmittingForm(true);
    try {
      let uploadedUrl = null;
      if (screenshotFile) {
        const formData = new FormData();
        formData.append('photo', screenshotFile);
        const uploadRes = await fetch('http://localhost:5000/api/upload', {
          method: 'POST',
          body: formData
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          uploadedUrl = uploadData.imageUrl;
        }
      }

      const inputEl = document.getElementById('paidAmountInput') as HTMLInputElement | null;
      const userAmount = inputEl?.value ? Number(inputEl.value) : (selectedFormItem?.amount || 143000);

      const res = await fetch('http://localhost:5000/api/student/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentUsn: student.usn,
          studentName: student.name,
          paymentTitle: selectedFormItem?.title || 'Hostel Fee Payment',
          amount: userAmount,
          utrNumber: utrInput.trim(),
          paymentDate: paymentDateInput,
          screenshotUrl: uploadedUrl
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit payment details');
      }

      alert('Payment details submitted successfully! Real-time status updated in Admin Portal.');
      setSelectedFormItem(null);
      setUtrInput('');
      setScreenshotFile(null);
    } catch (err: any) {
      alert(err.message || 'Error submitting payment details');
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // Helper for real-time status reflection badges
  const getStatusBadge = (statusStr?: string) => {
    if (!statusStr) {
      return { label: 'Not Paid', bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: ShieldAlert };
    }
    const upper = statusStr.toUpperCase();
    if (upper === 'APPROVED' || upper === 'PAID & VERIFIED' || upper === 'VERIFIED') {
      return { label: 'Paid & Verified', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 };
    }
    if (upper === 'PENDING_REVIEW' || upper === 'PAID & UNDER VERIFICATION' || upper === 'WAITING FOR ADMIN VERIFICATION') {
      return { label: 'Paid & Under Verification', bg: 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse', icon: Clock };
    }
    if (upper === 'REJECTED' || upper === 'PAID & REJECTED') {
      return { label: 'Paid & Rejected', bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: XCircle };
    }
    return { label: 'Not Paid', bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: ShieldAlert };
  };

  // Dynamic calculation for enabled payments & real-time dues
  const enabledRequests = adminPaymentRequests.filter((r: any) => r.enabled !== false);
  const myPaymentsList = (allPayments.length > 0 ? allPayments : (backendPayments || [])).filter(
    (p: any) => p.studentUsn?.trim().toUpperCase() === student.usn?.trim().toUpperCase()
  );

  const feeCalculations = enabledRequests.map((req: any) => {
    const totalAmount = Number(req.amount || 0);

    // Matching payments for this title
    const matchingPayments = myPaymentsList.filter(
      (p: any) =>
        p.paymentTitle?.trim().toLowerCase() === req.title?.trim().toLowerCase() ||
        (enabledRequests.length === 1 && (!p.paymentTitle || p.paymentTitle === 'Hostel Fee Payment'))
    );

    // Paid amount taken from form submissions filled by user
    const alreadySettled = matchingPayments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
    const remainingFee = Math.max(0, totalAmount - alreadySettled);

    let statusLabel = 'DUE';
    let badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200';

    if (alreadySettled > 0 && remainingFee > 0) {
      statusLabel = 'PARTIALLY PAID';
      badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse';
    } else if (remainingFee === 0 && totalAmount > 0) {
      statusLabel = 'SETTLED';
      badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }

    return {
      id: req.id,
      title: req.title,
      subtitle: req.subtitle,
      totalAmount,
      alreadySettled,
      remainingFee,
      dueDate: req.dueDate || '30 July 2026',
      statusLabel,
      badgeStyle,
      isDue: remainingFee > 0
    };
  });

  const activeDues = feeCalculations.filter(f => f.isDue);

  // Combine payment items to display under PAYMENT UPDATED
  const combinedPayments = enabledRequests.length > 0 
    ? enabledRequests 
    : (backendPayments || []).map((p: any) => ({
        id: p.id,
        title: 'Hostel Admission Fee',
        subtitle: `UTR: ${p.utrNumber}`,
        amount: p.amount || 143000,
        googleFormUrl: DEFAULT_GOOGLE_FORM_URL,
        backendStatus: p.status
      }));

  return (
    <div className="space-y-6 sm:space-y-8 font-sans relative pb-12">
      <HeroBanner 
        image={PAYMENT_HERO_IMAGE}
        title="PG Accounts Payment Hub"
      />

      {/* TOP SECTION: ALLOTTED DETAILS & ACTIVE FEE DUES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Hostel Allotted Details Card */}
        <div className="bg-white border border-border p-6 rounded-2xl shadow-soft space-y-4">
          <div>
            <h3 className="text-xs font-black text-text uppercase tracking-wider">Hostel Allotted Details</h3>
            <p className="text-[10px] text-text-muted mt-0.5 font-semibold">Your approved residential assignment</p>
          </div>

          <div className="divide-y divide-slate-100 text-xs font-semibold text-text">
            <div className="flex justify-between py-2.5">
              <span className="text-text-muted">Student Name</span>
              <span className="font-bold">{student.name}</span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-text-muted">Allotted Wing</span>
              <span className="font-bold">{hostel.hostel}</span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-text-muted">Block / Floor</span>
              <span className="font-bold">Block {hostel.block} • {hostel.floor}rd Floor</span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-text-muted">Room / Bed Assignment</span>
              <span className="font-bold font-mono">Room {hostel.room} • Bed {hostel.bed}</span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-text-muted">Room / Sharing Type</span>
              <span className="font-bold">{hostel.sharing}</span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-text-muted">Admission Date</span>
              <span className="font-bold">{hostel.admissionDate}</span>
            </div>
            <div className="flex justify-between py-2.5 items-center">
              <span className="text-text-muted">PG Booking Status</span>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black uppercase px-2 py-0.5 rounded">
                Confirmed
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Fee Dues Card (Replaces old static breakdown cards) */}
        <div className="lg:col-span-2 bg-white border border-border p-6 rounded-2xl shadow-soft space-y-5">
          <div>
            <h3 className="text-xs font-black text-text uppercase tracking-wider">Active Fee Dues & Summary</h3>
            <p className="text-[10px] text-text-muted mt-0.5 font-semibold">Real-time breakdown of enabled payments and outstanding balances</p>
          </div>

          {activeDues.length > 0 ? (
            <div className="space-y-4">
              {activeDues.map((item: any) => (
                <div key={item.id} className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-4.5 space-y-3.5 hover:border-slate-300 transition-all">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                    <div>
                      <h4 className="text-sm font-black text-slate-850">{item.title}</h4>
                      {item.subtitle && <p className="text-[10px] text-text-muted font-medium mt-0.5">{item.subtitle}</p>}
                    </div>
                    <span className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-full border ${item.badgeStyle}`}>
                      {item.statusLabel}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs font-semibold">
                    <div className="flex flex-col bg-white p-3 rounded-xl border border-slate-100 shadow-2xs">
                      <span className="text-text-muted text-[9.5px] uppercase font-bold tracking-wider">Already Settled</span>
                      <span className="text-emerald-600 font-black text-sm mt-0.5">₹{item.alreadySettled.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col bg-white p-3 rounded-xl border border-slate-100 shadow-2xs">
                      <span className="text-text-muted text-[9.5px] uppercase font-bold tracking-wider">Remaining Fee</span>
                      <span className="text-rose-600 font-black text-sm mt-0.5">₹{item.remainingFee.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col bg-white p-3 rounded-xl border border-slate-100 shadow-2xs">
                      <span className="text-text-muted text-[9.5px] uppercase font-bold tracking-wider">Due Date</span>
                      <span className="text-slate-800 font-extrabold text-xs mt-1">{item.dueDate}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-10 text-center space-y-2.5">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="text-base font-black text-emerald-900 tracking-tight">No Due Payments</h4>
              <p className="text-xs text-emerald-700 font-semibold max-w-sm mx-auto">
                You have settled all active fee payments. No dues outstanding at this time.
              </p>
            </div>
          )}
        </div>

      </div>

      
      {/* BOTTOM SECTION: DYNAMIC BANK DETAILS FOR ONLINE TRANSACTION */}
      <div className="bg-white border border-border p-6 rounded-2xl shadow-soft space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xs font-black text-text uppercase tracking-wider">Bank Details for the Online Transaction</h3>
            <p className="text-[10px] text-text-muted mt-0.5 font-semibold">Make transfers using net banking or mobile apps to the official account</p>
          </div>
          <Building className="w-5 h-5 text-primary shrink-0" />
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 font-bold text-xs space-y-3.5 text-text">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="space-y-1 relative group">
              <span className="text-[10px] text-text-muted uppercase tracking-wider block">Name of the A/c holder</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-800 font-extrabold block">{bankDetails.holderName}</span>
                <button 
                  onClick={() => handleCopy(bankDetails.holderName, "holder")}
                  className="p-1 hover:bg-slate-200 rounded transition-colors text-text-muted hover:text-slate-800"
                  title="Copy Holder Name"
                  type="button"
                >
                  {copiedField === 'holder' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-text-muted uppercase tracking-wider block">SB A/c No</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-850 font-black block font-mono text-sm tracking-wide">{bankDetails.accountNo}</span>
                <button 
                  onClick={() => handleCopy(bankDetails.accountNo, "acc")}
                  className="p-1 hover:bg-slate-200 rounded transition-colors text-text-muted hover:text-slate-800"
                  title="Copy Account Number"
                  type="button"
                >
                  {copiedField === 'acc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-text-muted uppercase tracking-wider block">IFSC</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-850 font-black block font-mono text-sm tracking-wide">{bankDetails.ifscCode}</span>
                <button 
                  onClick={() => handleCopy(bankDetails.ifscCode, "ifsc")}
                  className="p-1 hover:bg-slate-200 rounded transition-colors text-text-muted hover:text-slate-800"
                  title="Copy IFSC Code"
                  type="button"
                >
                  {copiedField === 'ifsc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-text-muted uppercase tracking-wider block">Bank Name</span>
              <span className="text-slate-800 font-extrabold block">{bankDetails.bankName}</span>
            </div>

            <div className="space-y-1 col-span-full">
              <span className="text-[10px] text-text-muted uppercase tracking-wider block">Branch</span>
              <span className="text-slate-800 font-extrabold block">{bankDetails.branch}</span>
            </div>

          </div>
        </div>

        <div className="border-t border-slate-100 pt-4.5 space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Read the points carefully before making the fee transfer</h4>
          <ol className="list-decimal pl-4.5 text-[11px] font-semibold text-text-muted space-y-2 leading-relaxed">
            <li>IMPS / Neft / Mobile Banking is Allowed.</li>
            <li>Hostel & Mess fee should be paid to the below mentioned account only.</li>
          </ol>
        </div>
      </div>
      
      {/* MIDDLE SECTION: PAYMENT UPDATED */}
      <div className="bg-white border border-border p-6 rounded-2xl shadow-soft space-y-4">
        <div className="pb-2 border-b border-slate-100">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            Payment Updated
          </h3>
          <p className="text-[10px] text-text-muted mt-0.5 font-semibold">Real-time fee payment records and verification status updated by hostel administration</p>
        </div>

        {combinedPayments && combinedPayments.length > 0 ? (
          <div className="overflow-x-auto text-xs font-semibold">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 border-b border-border text-[9px] font-bold text-text-muted uppercase tracking-wider">
                  <th className="p-3">Payment Details</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Form Link & UTR Submission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {combinedPayments.map((item: any) => {
                  const matchingPayment = myPaymentsList.find((p: any) => p.paymentTitle?.toLowerCase() === item.title?.toLowerCase());
                  const currentStatus = matchingPayment?.status || item.backendStatus || paymentStatus;
                  const badge = getStatusBadge(currentStatus);
                  const Icon = badge.icon;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3">
                        <p className="font-bold text-slate-850">{item.title}</p>
                        {item.subtitle && <p className="text-[10px] text-text-muted mt-0.5">{item.subtitle}</p>}
                        {item.dueDate && <p className="text-[9px] text-slate-400">Due: {item.dueDate}</p>}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-800">
                        ₹{Number(item.amount || 143000).toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase px-2.5 py-1 rounded-full border ${badge.bg}`}>
                          <Icon className="w-3 h-3" />
                          {badge.label}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {item.enabled !== false ? (
                          <button
                            onClick={() => {
                              const destination = item.googleFormUrl || DEFAULT_GOOGLE_FORM_URL;
                              window.open(destination, '_blank', 'noopener,noreferrer');
                            }}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] shadow-sm transition-all inline-flex items-center gap-1.5 cursor-pointer"
                            type="button"
                            title="Open Google Form"
                          >
                            <span>Fill Payment Form</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400">Form Closed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-8 text-center space-y-2">
            <CreditCard className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-600">No Payments Updated Yet</p>
          </div>
        )}
      </div>
    </div>
  );
};
