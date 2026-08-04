import React, { useState, useEffect } from 'react';
import { usePayment } from '../../context/PaymentContext';
import { HeroBanner } from '../../components/layout/HeroBanner';
import { PAYMENT_HERO_IMAGE } from '../../assets/heroBanners';
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
  const { fees, student, hostel, paymentStatus, backendPayments } = usePayment();

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

  // Poll Admin Published Payment Requests in Real-Time (every 3s)
  useEffect(() => {
    const fetchRequests = () => {
      fetch('http://localhost:5000/api/settings/payment-requests')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setAdminPaymentRequests(data);
          }
        })
        .catch(() => {});
    };

    fetchRequests();
    const interval = setInterval(fetchRequests, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const handleIndividualFormClick = (formUrl?: string) => {
    const destination = formUrl || DEFAULT_GOOGLE_FORM_URL;
    window.open(destination, '_blank', 'noopener,noreferrer');
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

  // Combine payment items to display under PAYMENT UPDATED
  const combinedPayments = adminPaymentRequests.length > 0 
    ? adminPaymentRequests 
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

      {/* TOP SECTION: ALLOTTED DETAILS & ADMISSION FEE SUMMARY */}
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

        {/* Fee Summary Card */}
        <div className="lg:col-span-2 bg-white border border-border p-6 rounded-2xl shadow-soft space-y-6">
          <div>
            <h3 className="text-xs font-black text-text uppercase tracking-wider">Admission Fee Summary</h3>
            <p className="text-[10px] text-text-muted mt-0.5 font-semibold">Consolidated fee structure details</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
              <span className="text-[8.5px] font-bold text-text-muted uppercase tracking-wider block">Hostel Rent</span>
              <span className="text-sm font-black text-slate-800 mt-1 block">₹95,000</span>
            </div>
            <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
              <span className="text-[8.5px] font-bold text-text-muted uppercase tracking-wider block">Security Deposit</span>
              <span className="text-sm font-black text-slate-800 mt-1 block">₹15,000</span>
            </div>
            <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
              <span className="text-[8.5px] font-bold text-text-muted uppercase tracking-wider block">Annual Mess Fee</span>
              <span className="text-sm font-black text-slate-800 mt-1 block">₹33,000</span>
            </div>
            <div className="bg-primary/5 border border-primary/10 p-3 rounded-xl">
              <span className="text-[8.5px] font-black text-primary uppercase tracking-wider block font-sans">Total Fee</span>
              <span className="text-sm font-black text-primary mt-1 block">₹1,43,000</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-5 text-xs font-semibold">
            <div className="flex flex-col">
              <span className="text-text-muted text-[10px]">Already Settled:</span>
              <span className="text-emerald-600 font-black text-sm mt-0.5">₹{fees.paid.toLocaleString()}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-text-muted text-[10px]">Remaining Balance:</span>
              <span className="text-rose-600 font-black text-sm mt-0.5">₹{fees.remaining.toLocaleString()}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-text-muted text-[10px]">Final Due Date:</span>
              <span className="text-slate-800 font-bold text-sm mt-0.5">30 July 2026</span>
            </div>
          </div>
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
      
      {/* MIDDLE SECTION: PAYMENT UPDATED (BEFORE BANK DETAILS) */}
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
                  <th className="p-3 text-center">Form Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {combinedPayments.map((item: any) => {
                  const currentStatus = item.backendStatus || (backendPayments && backendPayments.length > 0 ? backendPayments[0].status : paymentStatus);
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
                            onClick={() => handleIndividualFormClick(item.googleFormUrl)}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] shadow-sm transition-all inline-flex items-center gap-1.5 cursor-pointer"
                            type="button"
                            title="Open payment form"
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
