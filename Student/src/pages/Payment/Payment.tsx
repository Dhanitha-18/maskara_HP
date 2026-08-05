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
  Upload,
  CheckCircle2,
  FileText,
  X,
  Send
} from 'lucide-react';

const DEFAULT_GOOGLE_FORM_URL = '';

export const Payment: React.FC = () => {
  const { student, hostel } = usePayment();

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
  const [allPayments, setAllPayments] = useState<any[]>([]);

  // Per-payment item verification checkbox states: map of itemId -> { college: boolean, pg: boolean }
  const [itemCheckboxes, setItemCheckboxes] = useState<Record<string, { college: boolean; pg: boolean }>>({});

  // Active target payment item for PG Verification Modal
  const [activePgModalItem, setActivePgModalItem] = useState<any | null>(null);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  // Form Fields State for PG Verification (Only Name, USN, Semester, Date prefilled)
  const [pgFormData, setPgFormData] = useState({
    name: '',
    usn: '',
    block: 'Block A',
    semester: '1st Year',
    amountDate: new Date().toISOString().split('T')[0],
    utrNo: '',
    transferBank: '',
    accountHolderName: '',
    accountHolderRelation: '',
    accountHolderContact: ''
  });
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [availableBlocks, setAvailableBlocks] = useState<string[]>([]);

  useEffect(() => {
    fetch('http://localhost:5000/api/settings/bank-details')
      .then(res => res.json())
      .then(data => {
        if (data && data.holderName) setBankDetails(data);
      })
      .catch(() => {});

    fetch('http://localhost:5000/api/blocks')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const names = data.map((b: any) => b.name).filter(Boolean);
          if (names.length > 0) setAvailableBlocks(names);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch Payment Requests & User Submitted Payments with WebSockets
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

    return () => {
      socket.off('data_updated', loadData);
      socket.off('payment_submitted', loadData);
      socket.off('payment_status_changed', loadData);
      socket.off('payment_request_updated', loadData);
      socket.disconnect();
    };
  }, []);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const handleOpenCollegeForm = (item: any) => {
    const targetUrl = item.googleFormUrl || DEFAULT_GOOGLE_FORM_URL;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  // Open PG Modal: Starts FRESH with no old transaction data
  const handleOpenPgModal = (item: any) => {
    setActivePgModalItem(item);
    setPgFormData({
      name: student.name || '',
      usn: student.usn || '',
      block: (student as any).allocatedBlock || (student as any).block || 'Block A',
      semester: (student as any).yearSem || (student.semester ? `${student.semester}st Year` : '1st Year'),
      amountDate: new Date().toISOString().split('T')[0],
      utrNo: '',
      transferBank: '',
      accountHolderName: '',
      accountHolderRelation: '',
      accountHolderContact: ''
    });
    setScreenshotFile(null);
  };

  const handleSavePgModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pgFormData.utrNo.trim()) {
      alert('Please enter Bank UTR / Transaction Reference Number');
      return;
    }
    if (!pgFormData.transferBank.trim()) {
      alert('Please enter the Bank Name from which amount was transferred');
      return;
    }
    if (!pgFormData.accountHolderName.trim()) {
      alert('Please enter the Account Holder Name');
      return;
    }

    if (activePgModalItem) {
      const itemId = activePgModalItem.id;
      setItemCheckboxes(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], pg: true }
      }));
    }
    setActivePgModalItem(null);
  };

  const handleFinalSubmit = async (item: any) => {
    const itemId = item.id;
    const itemState = itemCheckboxes[itemId] || { college: false, pg: false };

    if (!itemState.college || !itemState.pg) {
      alert('Please complete and check BOTH College Verification Form and PG Verification Form before submitting.');
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

      const res = await fetch('http://localhost:5000/api/student/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentUsn: pgFormData.usn || student.usn,
          studentName: pgFormData.name || student.name,
          block: pgFormData.block || (student as any).allocatedBlock || 'Block A',
          semester: pgFormData.semester,
          paymentTitle: item?.title || 'Hostel Fee Payment',
          amount: Number(item?.amount || 143000),
          utrNumber: pgFormData.utrNo.trim(),
          paymentDate: pgFormData.amountDate,
          transferBank: pgFormData.transferBank.trim(),
          accountHolderName: pgFormData.accountHolderName.trim(),
          accountHolderRelation: pgFormData.accountHolderRelation.trim(),
          accountHolderContact: pgFormData.accountHolderContact.trim(),
          screenshotUrl: uploadedUrl
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit payment verification');
      }

      alert(`Payment verification for "${item.title}" submitted successfully! Stored in database and synced with Admin Portal.`);
      
      // Save local response lock for this item
      localStorage.setItem(`payment_submitted_${student.usn}_${item.title}`, 'true');
      
      // Clear checkboxes for this item
      setItemCheckboxes(prev => ({
        ...prev,
        [itemId]: { college: true, pg: true }
      }));
    } catch (err: any) {
      alert(err.message || 'Error submitting payment details');
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // Filter Enabled Payment Requests published by Admin
  const enabledRequests = adminPaymentRequests.filter((r: any) => r.enabled !== false);
  
  // Filter student's existing submitted payments
  const myPaymentsList = allPayments.filter(
    (p: any) => p.studentUsn?.trim().toUpperCase() === student.usn?.trim().toUpperCase()
  );

  // Active Fee Dues Calculations matching exact screenshot
  const feeCalculations = (enabledRequests.length > 0 ? enabledRequests : [
    { id: 'req-1', title: 'hjb', subtitle: 'Admission & Hostel Charges', amount: 135000, dueDate: '8 aug 3333' },
    { id: 'req-2', title: 'Hostel Fee 2026', subtitle: 'Admission & Hostel Charges', amount: 143000, dueDate: '4 august 2026' }
  ]).map((req: any) => {
    const totalAmount = Number(req.amount || 0);
    const matching = myPaymentsList.filter(
      (p: any) => p.paymentTitle?.trim().toLowerCase() === req.title?.trim().toLowerCase()
    );
    const alreadySettled = matching.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
    const remainingFee = Math.max(0, totalAmount - alreadySettled);

    return {
      id: req.id,
      title: req.title,
      subtitle: req.subtitle || 'Admission & Hostel Charges',
      totalAmount,
      alreadySettled,
      remainingFee,
      dueDate: req.dueDate || '30 July 2026',
      isSettled: remainingFee === 0 && totalAmount > 0
    };
  });

  return (
    <div className="space-y-6 sm:space-y-8 font-sans relative pb-12">
      <HeroBanner 
        image={PAYMENT_HERO_IMAGE}
        title="PG Accounts Payment Hub"
      />

      {/* TOP SECTION: HOSTEL ALLOTTED DETAILS & ACTIVE FEE DUES & SUMMARY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Card 1: HOSTEL ALLOTTED DETAILS (Matching Image Exactly) */}
        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-card space-y-4">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">HOSTEL ALLOTTED DETAILS</h3>
            <p className="text-[10px] text-slate-500 mt-0.5 font-semibold">Your approved residential assignment</p>
          </div>

          <div className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
            <div className="flex justify-between py-2.5">
              <span className="text-slate-500 font-bold">Student Name</span>
              <span className="font-extrabold text-slate-900">{student.name || 'aaaa'}</span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-slate-500 font-bold">Allotted Wing</span>
              <span className="font-extrabold text-slate-900">{hostel.hostel || 'OM SAI PG'}</span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-slate-500 font-bold">Block / Floor</span>
              <span className="font-extrabold text-slate-900">Block {hostel.block || 'Block-A'} • {hostel.floor ? (String(hostel.floor).includes('Floor') ? hostel.floor : `${hostel.floor}rd Floor`) : '3rd Floor'}</span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-slate-500 font-bold">Room / Bed Assignment</span>
              <span className="font-extrabold text-slate-900 font-mono">Room {hostel.room || '306'} • Bed {hostel.bed || '2'}</span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-slate-500 font-bold">Room / Sharing Type</span>
              <span className="font-extrabold text-slate-900">{hostel.sharing || '2 Sharing'}</span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-slate-500 font-bold">Admission Date</span>
              <span className="font-extrabold text-slate-900">{hostel.admissionDate || '5 August 2026'}</span>
            </div>
            <div className="flex justify-between py-2.5 items-center">
              <span className="text-slate-500 font-bold">PG Booking Status</span>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-300 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-xs">
                CONFIRMED
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: ACTIVE FEE DUES & SUMMARY (Matching Image Exactly) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-3xl shadow-card space-y-4">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">ACTIVE FEE DUES & SUMMARY</h3>
            <p className="text-[10px] text-slate-500 mt-0.5 font-semibold">Real-time breakdown of enabled payments and outstanding balances</p>
          </div>

          <div className="space-y-4">
            {feeCalculations.map((item: any) => (
              <div key={item.id} className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-slate-900">{item.title}</h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">{item.subtitle}</p>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                    item.isSettled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {item.isSettled ? 'SETTLED' : 'DUE'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                  <div>
                    <span className="text-[9px] font-extrabold uppercase text-slate-400 block mb-1">ALREADY SETTLED</span>
                    <span className="font-black text-emerald-600 font-mono text-sm">₹{item.alreadySettled.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-extrabold uppercase text-slate-400 block mb-1">REMAINING FEE</span>
                    <span className="font-black text-rose-600 font-mono text-sm">₹{item.remainingFee.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-extrabold uppercase text-slate-400 block mb-1">DUE DATE</span>
                    <span className="font-bold text-slate-800 text-xs">{item.dueDate}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* BOTTOM SECTION: BANK DETAILS FOR THE ONLINE TRANSACTION (Matching Image Exactly) */}
      <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-3xl shadow-card space-y-5">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">BANK DETAILS FOR THE ONLINE TRANSACTION</h3>
            <p className="text-[10px] text-slate-500 mt-0.5 font-semibold">Make transfers using net banking or mobile apps to the official account</p>
          </div>
          <Building className="w-5 h-5 text-indigo-600 shrink-0" />
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 font-bold text-xs space-y-4 text-slate-800">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-extrabold">NAME OF THE A/C HOLDER</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-900 font-extrabold block text-xs">{bankDetails.holderName}</span>
                <button onClick={() => handleCopy(bankDetails.holderName, "holder")} className="p-1 hover:bg-slate-200 rounded text-slate-500" type="button">
                  {copiedField === 'holder' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-extrabold">SB A/C NO</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-900 font-black block font-mono text-sm tracking-wide">{bankDetails.accountNo}</span>
                <button onClick={() => handleCopy(bankDetails.accountNo, "acc")} className="p-1 hover:bg-slate-200 rounded text-slate-500" type="button">
                  {copiedField === 'acc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-extrabold">IFSC</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-900 font-black block font-mono text-sm tracking-wide">{bankDetails.ifscCode}</span>
                <button onClick={() => handleCopy(bankDetails.ifscCode, "ifsc")} className="p-1 hover:bg-slate-200 rounded text-slate-500" type="button">
                  {copiedField === 'ifsc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-extrabold">BANK NAME</span>
              <span className="text-slate-900 font-extrabold block text-xs">{bankDetails.bankName}</span>
            </div>

            <div className="space-y-1 col-span-full">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-extrabold">BRANCH</span>
              <span className="text-slate-900 font-extrabold block text-xs">{bankDetails.branch}</span>
            </div>

          </div>
        </div>

        <div className="pt-2 space-y-2 border-t border-slate-100">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">READ THE POINTS CAREFULLY BEFORE MAKING THE FEE TRANSFER</h4>
          <ol className="list-decimal pl-4 text-[11px] font-semibold text-slate-600 space-y-1 leading-relaxed">
            <li>IMPS / Neft / Mobile Banking is Allowed.</li>
            <li>Hostel & Mess fee should be paid to the below mentioned account only.</li>
          </ol>
        </div>
      </div>
      
      {/* MIDDLE/BOTTOM SECTION: PAYMENT UPDATED TABLE */}
      <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-3xl shadow-card space-y-6">
        <div className="pb-3 border-b border-slate-100">
          <h3 className="text-base font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            Payment Updated
          </h3>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Complete both College and PG Verification Forms for each payment below to submit your payment verification.
          </p>
        </div>

        <div className="overflow-x-auto text-xs font-semibold">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="p-3.5">Payment Title</th>
                <th className="p-3.5">Amount</th>
                <th className="p-3.5 text-center">College Verification Form</th>
                <th className="p-3.5 text-center">PG Verification Form</th>
                <th className="p-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {(enabledRequests.length > 0 ? enabledRequests : [
                { id: 'default-req-1', title: 'hjb', amount: 135000, googleFormUrl: DEFAULT_GOOGLE_FORM_URL },
                { id: 'default-req-2', title: 'Hostel Fee 2026', amount: 143000, googleFormUrl: DEFAULT_GOOGLE_FORM_URL }
              ]).map((item: any) => {
                const itemId = item.id;
                const isAlreadySubmitted = localStorage.getItem(`payment_submitted_${student.usn}_${item.title}`) === 'true' ||
                  myPaymentsList.some((p: any) => p.paymentTitle?.trim().toLowerCase() === item.title?.trim().toLowerCase());

                const itemState = itemCheckboxes[itemId] || { college: isAlreadySubmitted, pg: isAlreadySubmitted };
                const isBothChecked = itemState.college && itemState.pg;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    
                    {/* 1. Payment Title (Directly from Admin) */}
                    <td className="p-3.5">
                      <p className="font-extrabold text-slate-900 text-sm">{item.title}</p>
                      {item.subtitle && <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{item.subtitle}</p>}
                    </td>

                    {/* 2. Amount */}
                    <td className="p-3.5 font-mono font-black text-slate-900 text-sm">
                      ₹{Number(item.amount || 143000).toLocaleString()}
                    </td>

                    {/* 3. College Verification Form + Checkbox */}
                    <td className="p-3.5">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleOpenCollegeForm(item)}
                          disabled={isAlreadySubmitted}
                          className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        >
                          <span>College Form</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input 
                            type="checkbox"
                            disabled={isAlreadySubmitted}
                            checked={itemState.college}
                            onChange={(e) => {
                              const val = e.target.checked;
                              setItemCheckboxes(prev => ({
                                ...prev,
                                [itemId]: { ...prev[itemId], college: val }
                              }));
                            }}
                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                          />
                          <span className="text-[11px] font-bold text-slate-600">Filled</span>
                        </label>
                      </div>
                    </td>

                    {/* 4. PG Verification Form + Checkbox */}
                    <td className="p-3.5">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleOpenPgModal(item)}
                          disabled={isAlreadySubmitted}
                          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>PG Form Popup</span>
                        </button>
                        <label 
                          className="flex items-center gap-1.5 cursor-not-allowed opacity-80" 
                          title="PG Verification status is automatically filled upon completing the PG Form Popup"
                        >
                          <input 
                            type="checkbox"
                            disabled={true}
                            checked={itemState.pg}
                            readOnly
                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 pointer-events-none"
                          />
                          <span className="text-[11px] font-bold text-slate-600">Filled</span>
                        </label>
                      </div>
                    </td>

                    {/* 5. Action / Submit Button */}
                    <td className="p-3.5 text-center">
                      {isAlreadySubmitted ? (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-300 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 mx-auto shadow-xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Submitted
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleFinalSubmit(item)}
                          disabled={!isBothChecked || isSubmittingForm}
                          className={`font-black text-xs px-5 py-2 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 mx-auto ${
                            isBothChecked && !isSubmittingForm
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer hover:scale-105'
                              : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-70'
                          }`}
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{isSubmittingForm ? 'Submitting...' : 'Submit'}</span>
                        </button>
                      )}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* PG VERIFICATION POPUP MODAL (Fresh state for each payment) */}
      {activePgModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto border border-slate-100">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                  PG Verification Form — {activePgModalItem.title}
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Fill bank transfer details for <strong className="text-indigo-600">₹{Number(activePgModalItem.amount || 143000).toLocaleString()}</strong>
                </p>
              </div>
              <button 
                onClick={() => setActivePgModalItem(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSavePgModal} className="space-y-4 text-xs font-semibold text-slate-700">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* 1. Student Name (Prefilled from DB) */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">1. Student Name</label>
                  <input
                    type="text"
                    value={pgFormData.name}
                    onChange={e => setPgFormData({ ...pgFormData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>

                {/* 2. USN (Prefilled from DB) */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">2. USN</label>
                  <input
                    type="text"
                    value={pgFormData.usn}
                    onChange={e => setPgFormData({ ...pgFormData, usn: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold font-mono text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>

                {/* 3. Semester (Prefilled from DB) */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">3. Academic Year</label>
                  <select
                    value={pgFormData.semester}
                    onChange={e => setPgFormData({ ...pgFormData, semester: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>

                {/* 4. Hostel Block */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">4. Hostel Block</label>
                  <select
                    value={pgFormData.block}
                    onChange={e => setPgFormData({ ...pgFormData, block: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                  >
                    {(availableBlocks.length > 0 ? availableBlocks : ['Block A', 'Block B', 'Block C', 'Girls Hostel', 'Boys Hostel']).map(blockName => (
                      <option key={blockName} value={blockName}>{blockName}</option>
                    ))}
                  </select>
                </div>

                {/* 4. Amount Transferred Date (Prefilled from DB) */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">4. Amount Transferred Date</label>
                  <input
                    type="date"
                    value={pgFormData.amountDate}
                    onChange={e => setPgFormData({ ...pgFormData, amountDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>

                {/* 5. UTR No (BLANK for fresh entry) */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">5. UTR No. / Transaction ID</label>
                  <input
                    type="text"
                    placeholder="Enter 12-digit UTR Number"
                    value={pgFormData.utrNo}
                    onChange={e => setPgFormData({ ...pgFormData, utrNo: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold font-mono text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>

                {/* 6. Bank Transferred From (BLANK for fresh entry) */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">6. Bank Transferred From</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC Bank, SBI, ICICI"
                    value={pgFormData.transferBank}
                    onChange={e => setPgFormData({ ...pgFormData, transferBank: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>

                {/* 7. Name of Account Holder (BLANK for fresh entry) */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">7. Name of the Account Holder</label>
                  <input
                    type="text"
                    placeholder="Name on bank account"
                    value={pgFormData.accountHolderName}
                    onChange={e => setPgFormData({ ...pgFormData, accountHolderName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>

                {/* 8. Relationship with Student (BLANK for fresh entry) */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">8. Relationship with Student</label>
                  <input
                    type="text"
                    placeholder="e.g. Father, Mother, Self, Guardian"
                    value={pgFormData.accountHolderRelation}
                    onChange={e => setPgFormData({ ...pgFormData, accountHolderRelation: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>

                {/* 9. Contact No of Account Holder (BLANK for fresh entry) */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">9. Contact No of Account Holder</label>
                  <input
                    type="tel"
                    placeholder="10-digit Phone Number"
                    value={pgFormData.accountHolderContact}
                    onChange={e => setPgFormData({ ...pgFormData, accountHolderContact: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>

                {/* 10. Upload Screenshot (BLANK for fresh entry) */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">10. Upload Successful Transaction Screenshot</label>
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center hover:border-indigo-400 transition-all bg-slate-50">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => setScreenshotFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="pg-screenshot-upload"
                    />
                    <label htmlFor="pg-screenshot-upload" className="cursor-pointer flex flex-col items-center gap-1.5">
                      <Upload className="w-6 h-6 text-indigo-500" />
                      <span className="text-xs font-bold text-slate-700">
                        {screenshotFile ? screenshotFile.name : 'Click to Upload Transaction Receipt Image'}
                      </span>
                      <span className="text-[10px] text-slate-400">PNG, JPG or JPEG (Max 5MB)</span>
                    </label>
                  </div>
                </div>

              </div>

              {/* Submit Modal */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActivePgModalItem(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-5 rounded-xl text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2.5 px-6 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save PG Verification Details</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
