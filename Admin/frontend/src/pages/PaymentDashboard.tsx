import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, Download, Eye, CheckCircle, XCircle, Clock,
  CreditCard, ChevronDown, X, ZoomIn, ZoomOut, RotateCcw,
  AlertTriangle, Building, RefreshCw, FileSpreadsheet,
  Check, Phone, User, Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { socket } from '../lib/socket';

const API = 'http://localhost:5000/api';

// ─── Types ────────────────────────────────────────────────────
interface Payment {
  id: string;
  studentName: string;
  studentUsn: string;
  semester?: string | null;
  hostelName: string;
  block: string;
  floor: string | null;
  roomNumber: string;
  utrNumber: string;
  paymentTitle?: string | null;
  amount: number | null;
  paymentDate: string;
  transferBank?: string | null;
  accountHolderName?: string | null;
  accountHolderRelation?: string | null;
  accountHolderContact?: string | null;
  screenshotUrl: string | null;
  status: string;
  emailStatus: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  remarks: string | null;
  createdAt: string;
}

interface Filters {
  status: string;
  month: string;
  year: string;
}

const emptyFilters: Filters = { status: '', month: '', year: '' };

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return '—'; }
}

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Date(2000, i).toLocaleString('default', { month: 'long' })
}));

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
    PENDING_REVIEW: { label: 'Pending Verification', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
    APPROVED: { label: 'Approved', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    REJECTED: { label: 'Rejected', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
  };
  const cfg = configs[status] || configs.PENDING_REVIEW;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.text} ${cfg.border} tracking-wide uppercase whitespace-nowrap`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} animate-pulse`} />
      {cfg.label}
    </span>
  );
}

// ─── ScreenshotModal ──────────────────────────────────────────
function ScreenshotModal({ url, onClose }: { url: string; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);
  const fullUrl = url.startsWith('http') ? url : `${API.replace('/api', '')}${url}`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleDownload = () => {
    window.open(fullUrl, '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative bg-white rounded-3xl shadow-2xl max-w-3xl max-h-[85vh] w-full mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-800">Transaction Receipt Screenshot</h3>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500" title="Zoom Out"><ZoomOut className="w-4 h-4" /></button>
            <span className="text-xs font-bold text-slate-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500" title="Zoom In"><ZoomIn className="w-4 h-4" /></button>
            <button onClick={() => setZoom(1)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500" title="Reset Zoom"><RotateCcw className="w-4 h-4" /></button>
            <div className="w-px h-6 bg-slate-200 mx-1" />
            <button onClick={handleDownload} className="p-2 rounded-xl hover:bg-indigo-50 text-indigo-600" title="Download"><Download className="w-4 h-4" /></button>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-rose-50 text-rose-500" title="Close"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="overflow-auto max-h-[70vh] p-6 flex items-center justify-center bg-slate-50/50">
          <img
            src={fullUrl}
            alt="Payment Screenshot"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center center', transition: 'transform 0.2s ease' }}
            className="max-w-full rounded-xl shadow-md"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function PaymentDashboard() {
  const queryClient = useQueryClient();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);

  // Queries
  const { data: payments = [], isLoading, refetch } = useQuery<Payment[]>({
    queryKey: ['payments'],
    queryFn: async () => {
      const res = await fetch(`${API}/payments`);
      if (!res.ok) throw new Error('Failed to fetch payments');
      return res.json();
    },
  });

  // Socket Listeners
  useEffect(() => {
    const handleDataUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    };
    socket.on('data_updated', handleDataUpdate);
    socket.on('payment_submitted', handleDataUpdate);
    socket.on('payment_status_changed', handleDataUpdate);

    return () => {
      socket.off('data_updated', handleDataUpdate);
      socket.off('payment_submitted', handleDataUpdate);
      socket.off('payment_status_changed', handleDataUpdate);
    };
  }, [queryClient]);

  // Mutations
  const approveMutation = useMutation({
    mutationFn: async ({ id, reviewedBy }: { id: string; reviewedBy?: string }) => {
      const res = await fetch(`${API}/payments/${id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewedBy: reviewedBy || 'Admin' }),
      });
      if (!res.ok) throw new Error('Failed to approve payment');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Payment approved successfully');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to approve payment'),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, remarks, reviewedBy }: { id: string; remarks?: string; reviewedBy?: string }) => {
      const res = await fetch(`${API}/payments/${id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remarks: remarks || 'Rejected by Admin', reviewedBy: reviewedBy || 'Admin' }),
      });
      if (!res.ok) throw new Error('Failed to reject payment');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Payment rejected');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to reject payment'),
  });

  // Filter Payments
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      // Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = p.studentName?.toLowerCase().includes(q);
        const matchUsn = p.studentUsn?.toLowerCase().includes(q);
        const matchUtr = p.utrNumber?.toLowerCase().includes(q);
        const matchBank = p.transferBank?.toLowerCase().includes(q);
        const matchHolder = p.accountHolderName?.toLowerCase().includes(q);
        if (!matchName && !matchUsn && !matchUtr && !matchBank && !matchHolder) return false;
      }

      // Status Filter
      if (filters.status && p.status !== filters.status) return false;

      // Month/Year Filter
      if (p.paymentDate) {
        const d = new Date(p.paymentDate);
        if (filters.month && String(d.getMonth() + 1) !== filters.month) return false;
        if (filters.year && String(d.getFullYear()) !== filters.year) return false;
      }

      return true;
    });
  }, [payments, searchQuery, filters]);

  // CSV Export Handler
  const handleExportCSV = () => {
    if (filteredPayments.length === 0) {
      toast.error('No payment records to export');
      return;
    }

    const headers = [
      'Student Name',
      'USN',
      'Semester',
      'Amount (INR)',
      'UTR Number',
      'Payment Date',
      'Transfer Bank',
      'Account Holder Name',
      'Relationship to Student',
      'Account Holder Contact',
      'Status',
      'Reviewed By',
      'Reviewed At',
      'Screenshot URL'
    ];

    const rows = filteredPayments.map(p => [
      `"${p.studentName || ''}"`,
      `"${p.studentUsn || ''}"`,
      `"${p.semester || '1st Year'}"`,
      p.amount || 143000,
      `"${p.utrNumber || ''}"`,
      `"${formatDate(p.paymentDate)}"`,
      `"${p.transferBank || '-'}"`,
      `"${p.accountHolderName || '-'}"`,
      `"${p.accountHolderRelation || '-'}"`,
      `"${p.accountHolderContact || '-'}"`,
      `"${p.status}"`,
      `"${p.reviewedBy || '-'}"`,
      `"${formatDate(p.reviewedAt || '')}"`,
      `"${p.screenshotUrl || '-'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PG_Payments_Verification_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredPayments.length} payment records to CSV`);
  };

  const hasActiveFilters = Object.values(filters).some(Boolean) || searchQuery.trim() !== '';

  return (
    <div className="space-y-6 pb-12 font-sans">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-7 h-7 text-indigo-600" />
            Payment Management Hub
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Database-managed student PG payment verifications and export records
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-all shadow-xs cursor-pointer"
            title="Refresh Table"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* CSV Download Button */}
          <button
            onClick={handleExportCSV}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download CSV Data</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Name, USN, UTR No, Bank..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Toggles */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                showFilters || hasActiveFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
              {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
            </button>

            {hasActiveFilters && (
              <button
                onClick={() => { setFilters(emptyFilters); setSearchQuery(''); }}
                className="text-xs text-rose-600 font-bold hover:underline px-2"
              >
                Reset All
              </button>
            )}
          </div>
        </div>

        {/* Expandable Filter Panel */}
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={e => setFilters({ ...filters, status: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="PENDING_REVIEW">Pending Verification</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Month</label>
              <select
                value={filters.month}
                onChange={e => setFilters({ ...filters, month: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="">All Months</option>
                {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Year</label>
              <select
                value={filters.year}
                onChange={e => setFilters({ ...filters, year: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="">All Years</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
              </select>
            </div>
          </motion.div>
        )}
      </div>

      {/* Payment Verification Database Table */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-card overflow-hidden">
        
        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500">Loading database payment records...</p>
          </div>
        ) : filteredPayments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="p-4">Student & USN</th>
                  <th className="p-4">Semester</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Date & UTR No.</th>
                  <th className="p-4">Bank Transferred From</th>
                  <th className="p-4">Account Holder Details</th>
                  <th className="p-4 text-center">Receipt</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                {filteredPayments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    
                    {/* Student & USN */}
                    <td className="p-4">
                      <p className="font-extrabold text-slate-900 text-sm">{p.studentName}</p>
                      <p className="text-[10px] font-mono text-indigo-600 font-bold mt-0.5">{p.studentUsn}</p>
                    </td>

                    {/* Semester */}
                    <td className="p-4 font-bold text-slate-800">
                      {p.semester || '1st Year'}
                    </td>

                    {/* Amount */}
                    <td className="p-4 font-mono font-black text-slate-900 text-sm">
                      ₹{Number(p.amount || 143000).toLocaleString()}
                    </td>

                    {/* Date & UTR */}
                    <td className="p-4">
                      <p className="font-bold text-slate-800 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {formatDate(p.paymentDate)}
                      </p>
                      <p className="text-[10px] font-mono text-slate-500 mt-0.5">UTR: {p.utrNumber}</p>
                    </td>

                    {/* Bank Transferred From */}
                    <td className="p-4 font-bold text-slate-800">
                      {p.transferBank || 'Online Banking'}
                    </td>

                    {/* Account Holder Details */}
                    <td className="p-4 space-y-0.5">
                      <p className="font-extrabold text-slate-900">{p.accountHolderName || '-'}</p>
                      <p className="text-[10px] text-slate-500 font-bold">
                        Relation: {p.accountHolderRelation || '-'}
                      </p>
                      {p.accountHolderContact && (
                        <p className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {p.accountHolderContact}
                        </p>
                      )}
                    </td>

                    {/* Receipt Screenshot Modal Trigger */}
                    <td className="p-4 text-center">
                      {p.screenshotUrl ? (
                        <button
                          onClick={() => setScreenshotUrl(p.screenshotUrl)}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-1.5 px-3 rounded-lg text-[11px] inline-flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Receipt</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400">No Image</span>
                      )}
                    </td>

                    {/* Verification Status */}
                    <td className="p-4 text-center">
                      <StatusBadge status={p.status} />
                    </td>

                    {/* Approve / Reject Actions */}
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {p.status !== 'APPROVED' && (
                          <button
                            onClick={() => approveMutation.mutate({ id: p.id })}
                            disabled={approveMutation.isPending}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-2.5 rounded-lg text-[10px] transition-all cursor-pointer shadow-xs"
                            title="Approve Payment"
                          >
                            Approve
                          </button>
                        )}
                        {p.status !== 'REJECTED' && (
                          <button
                            onClick={() => rejectMutation.mutate({ id: p.id })}
                            disabled={rejectMutation.isPending}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold py-1.5 px-2.5 rounded-lg text-[10px] transition-all cursor-pointer"
                            title="Reject Payment"
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center space-y-3">
            <CreditCard className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-extrabold text-slate-700">No Payment Verification Records Found</h4>
            <p className="text-xs text-slate-400">Try adjusting your filters or search terms.</p>
          </div>
        )}
      </div>

      {/* Screenshot Modal */}
      {screenshotUrl && (
        <ScreenshotModal url={screenshotUrl} onClose={() => setScreenshotUrl(null)} />
      )}

    </div>
  );
}
