import { API_BASE_URL } from '../../lib/api';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Building, Plus, Trash2, DollarSign, ExternalLink, CheckCircle2, XCircle, Power } from 'lucide-react';
import { toast } from 'sonner';

export default function PaymentsControl() {
  const queryClient = useQueryClient();

  // Bank details form state
  const [bankData, setBankData] = useState({
    holderName: '',
    accountNo: '',
    ifscCode: '',
    bankName: '',
    branch: ''
  });

  // New Payment Request form state
  const [newPayment, setNewPayment] = useState({
    title: '',
    subtitle: '',
    amount: '',
    dueDate: '',
    googleFormUrl: '',
    enabled: true
  });

  // Fetch Bank Details
  const { data: fetchedBankData } = useQuery({
    queryKey: ['bank-details'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/settings/bank-details`);
      if (!res.ok) throw new Error('Failed to fetch bank details');
      return res.json();
    }
  });

  useEffect(() => {
    if (fetchedBankData) {
      setBankData({
        holderName: fetchedBankData.holderName || '',
        accountNo: fetchedBankData.accountNo || '',
        ifscCode: fetchedBankData.ifscCode || '',
        bankName: fetchedBankData.bankName || '',
        branch: fetchedBankData.branch || ''
      });
    }
  }, [fetchedBankData]);

  // Save Bank Details Mutation
  const saveBankMutation = useMutation({
    mutationFn: async (data: typeof bankData) => {
      const res = await fetch(`${API_BASE_URL}/api/settings/bank-details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to save bank details');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-details'] });
      toast.success('Bank details saved successfully!');
    },
    onError: () => toast.error('Failed to save bank details')
  });

  // Fetch Payment Requests
  // Backend stores the entire list as JSON under the 'payment-requests' key
  const { data: paymentRequests, isLoading: isLoadingRequests } = useQuery({
    queryKey: ['payment-requests'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/settings/payment-requests`);
      if (!res.ok) throw new Error('Failed to fetch payment requests');
      return res.json();
    },
    // Normalise: the backend returns null when nothing saved yet, or the raw array
    select: (data: any): any[] => (Array.isArray(data) ? data : [])
  });

  // Helper: fetch current list, apply transform, save back
  const updatePaymentList = async (transform: (list: any[]) => any[]) => {
    const getRes = await fetch(`${API_BASE_URL}/api/settings/payment-requests`);
    const current = getRes.ok ? await getRes.json() : null;
    const list: any[] = Array.isArray(current) ? current : [];
    const updated = transform(list);
    const saveRes = await fetch(`${API_BASE_URL}/api/settings/payment-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
    if (!saveRes.ok) throw new Error('Failed to save payment requests');
    return saveRes.json();
  };

  // Publish New Payment Request Mutation
  const publishPaymentMutation = useMutation({
    mutationFn: async (data: typeof newPayment) => {
      const newItem = {
        ...data,
        id: `pr-${Date.now()}`,
        createdAt: new Date().toISOString()
      };
      return updatePaymentList(list => [...list, newItem]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-requests'] });
      toast.success('New payment request published to student portal!');
      setNewPayment({
        title: '',
        subtitle: '',
        amount: '',
        dueDate: '',
        googleFormUrl: '',
        enabled: true
      });
    },
    onError: () => toast.error('Failed to publish payment request')
  });

  // Update Payment Request Mutation (Toggle status or details)
  const updatePaymentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return updatePaymentList(list =>
        list.map(item => item.id === id ? { ...item, ...data } : item)
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-requests'] });
      toast.success('Payment request updated');
    },
    onError: () => toast.error('Failed to update payment request')
  });

  // Delete Payment Request Mutation
  const deletePaymentMutation = useMutation({
    mutationFn: async (id: string) => {
      return updatePaymentList(list => list.filter(item => item.id !== id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-requests'] });
      toast.success('Payment request deleted');
    }
  });

  const handleBankSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveBankMutation.mutate(bankData);
  };

  const handlePublishSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayment.title || !newPayment.amount) {
      return toast.error('Payment title and amount are required');
    }
    publishPaymentMutation.mutate(newPayment);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-[1.5rem] p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-indigo-600" />
          <span>Payment & Bank Controls CMS</span>
        </h3>
        <p className="text-slate-500 font-medium text-xs mt-1">
          Configure official bank account details, publish fee payment requests with specific Google Form links, and enable or disable individual payment requests.
        </p>
      </div>

      {/* 1. BANK ACCOUNT DETAILS CMS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-slate-800">Official Bank Account Details</h4>
              <p className="text-xs text-slate-500 font-medium">Displayed in the Student Portal for online NEFT / IMPS transfers</p>
            </div>
          </div>
          <button
            onClick={handleBankSubmit}
            disabled={saveBankMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <span>{saveBankMutation.isPending ? 'Saving...' : 'Save Bank Details'}</span>
          </button>
        </div>

        <form onSubmit={handleBankSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
          <div className="md:col-span-2">
            <label className="block text-slate-600 font-bold uppercase text-[10px] mb-1">Account Holder Name</label>
            <input
              type="text"
              required
              value={bankData.holderName}
              onChange={e => setBankData({ ...bankData, holderName: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="e.g., The Principal BMSIT & M Outsourced Hostel SB A/C"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-bold uppercase text-[10px] mb-1">SB Account Number</label>
            <input
              type="text"
              required
              value={bankData.accountNo}
              onChange={e => setBankData({ ...bankData, accountNo: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="e.g., 50495632400"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-bold uppercase text-[10px] mb-1">IFSC Code</label>
            <input
              type="text"
              required
              value={bankData.ifscCode}
              onChange={e => setBankData({ ...bankData, ifscCode: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="e.g., IDIB000A682"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-bold uppercase text-[10px] mb-1">Bank Name</label>
            <input
              type="text"
              required
              value={bankData.bankName}
              onChange={e => setBankData({ ...bankData, bankName: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="e.g., Indian Bank"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-bold uppercase text-[10px] mb-1">Branch Name</label>
            <input
              type="text"
              required
              value={bankData.branch}
              onChange={e => setBankData({ ...bankData, branch: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="e.g., Avalahalli, Bangalore"
            />
          </div>
        </form>
      </div>

      {/* 2. PUBLISH NEW PAYMENT REQUEST CMS (WITH GOOGLE FORM LINK & ENABLE/DISABLE OPTIONS) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-slate-800">Publish New Payment Request</h4>
              <p className="text-xs text-slate-500 font-medium">Create a fee request with a custom Google Form submission link and status toggle</p>
            </div>
          </div>
        </div>

        <form onSubmit={handlePublishSubmit} className="space-y-4 text-xs font-semibold">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-slate-600 font-bold uppercase text-[10px] mb-1">Payment Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Mess Fee (Term 2) / Admission Fee"
                value={newPayment.title}
                onChange={e => setNewPayment({ ...newPayment, title: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-bold uppercase text-[10px] mb-1">Description / Subtitle</label>
              <input
                type="text"
                placeholder="e.g. Hostel & Mess Fee Installment"
                value={newPayment.subtitle}
                onChange={e => setNewPayment({ ...newPayment, subtitle: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-bold uppercase text-[10px] mb-1">Amount (₹) *</label>
              <input
                type="number"
                required
                placeholder="e.g. 143000"
                value={newPayment.amount}
                onChange={e => setNewPayment({ ...newPayment, amount: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-bold uppercase text-[10px] mb-1">Due Date</label>
              <input
                type="text"
                placeholder="e.g. 30 August 2026"
                value={newPayment.dueDate}
                onChange={e => setNewPayment({ ...newPayment, dueDate: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="md:col-span-2">
              <label className="block text-slate-600 font-bold uppercase text-[10px] mb-1">Google Form Link for this Payment *</label>
              <input
                type="text"
                required
                placeholder="https://docs.google.com/forms/d/e/.../viewform"
                value={newPayment.googleFormUrl}
                onChange={e => setNewPayment({ ...newPayment, googleFormUrl: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-bold uppercase text-[10px] mb-1">Payment Status</label>
              <select
                value={newPayment.enabled ? 'true' : 'false'}
                onChange={e => setNewPayment({ ...newPayment, enabled: e.target.value === 'true' })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                <option value="true">Enabled (Accept Submissions)</option>
                <option value="false">Disabled (Form Locked)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={publishPaymentMutation.isPending}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{publishPaymentMutation.isPending ? 'Publishing...' : 'Publish Payment Request'}</span>
            </button>
          </div>
        </form>

        {/* Payment History Ledger with Enable / Disable Toggles */}
        <div className="border-t border-slate-100 pt-4 space-y-3">
          <h5 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Active Published Payment Requests</h5>
          {isLoadingRequests ? (
            <p className="text-xs text-slate-400 italic">Loading requests...</p>
          ) : !paymentRequests || paymentRequests.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No custom payment requests published yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
              {paymentRequests.map((req: any) => (
                <div key={req.id} className="p-4 bg-slate-50/50 hover:bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h6 className="font-extrabold text-slate-800 text-sm">{req.title}</h6>
                      {req.enabled !== false ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3 h-3" /> Disabled
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 font-semibold">{req.subtitle || 'General Hostel Fee'}</p>
                    
                    {req.googleFormUrl && (
                      <p className="text-[10px] text-indigo-600 font-mono flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> {req.googleFormUrl}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-semibold pt-0.5">
                      <span>Due: {req.dueDate || 'N/A'}</span>
                      <span>•</span>
                      <span>Published: {new Date(req.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono font-black text-emerald-700 text-base mr-2">
                      ₹{Number(req.amount).toLocaleString()}
                    </span>

                    {/* Enable / Disable Quick Toggle Button */}
                    <button
                      onClick={() => updatePaymentMutation.mutate({ id: req.id, data: { enabled: !req.enabled } })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        req.enabled !== false
                          ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                      }`}
                      title={req.enabled !== false ? 'Disable this payment' : 'Enable this payment'}
                    >
                      <Power className="w-3 h-3" />
                      <span>{req.enabled !== false ? 'Disable' : 'Enable'}</span>
                    </button>

                    <button
                      onClick={() => deletePaymentMutation.mutate(req.id)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Delete payment request"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
