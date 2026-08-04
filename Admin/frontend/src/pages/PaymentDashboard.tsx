import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, Download, Eye, CheckCircle, XCircle, Clock,
  CreditCard, ChevronDown, X, ZoomIn, ZoomOut, RotateCcw,
  AlertTriangle, Loader2, Building, TrendingUp,
  Bell, RefreshCw, Inbox, FileSpreadsheet, Mail
} from 'lucide-react';
import { toast } from 'sonner';
import { socket } from '../lib/socket';

const API = 'http://localhost:5000/api';

// ─── Types ────────────────────────────────────────────────────
interface Payment {
  id: string;
  studentName: string;
  studentUsn: string;
  hostelName: string;
  block: string;
  floor: string | null;
  roomNumber: string;
  utrNumber: string;
  paymentDate: string;
  screenshotUrl: string | null;
  status: string;
  emailStatus: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  remarks: string | null;
  createdAt: string;
}

interface PaymentStats {
  pendingReview: number;
  approvedTotal: number;
  approvedToday: number;
  rejected: number;
  totalThisMonth: number;
  blockStats: Record<string, { total: number; paid: number }>;
}

interface Filters {
  hostel: string;
  block: string;
  floor: string;
  room: string;
  status: string;
  month: string;
  year: string;
}

interface ConfirmAction {
  type: 'approve-selected' | 'reject-selected' | 'approve-all' | 'reject-all';
  ids: string[];
  label: string;
}

const emptyFilters: Filters = { hostel: '', block: '', floor: '', room: '', status: '', month: '', year: '' };

// ─── Helpers ──────────────────────────────────────────────────
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

// ─── StatusBadge ──────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
    PENDING_REVIEW: { label: 'Pending Review', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200/60', dot: 'bg-amber-500' },
    APPROVED: { label: 'Approved', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200/60', dot: 'bg-emerald-500' },
    REJECTED: { label: 'Rejected', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200/60', dot: 'bg-rose-500' },
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
          <h3 className="text-lg font-bold text-slate-800">Payment Screenshot</h3>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors" title="Zoom Out"><ZoomOut className="w-4 h-4" /></button>
            <span className="text-xs font-bold text-slate-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors" title="Zoom In"><ZoomIn className="w-4 h-4" /></button>
            <button onClick={() => setZoom(1)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors" title="Reset Zoom"><RotateCcw className="w-4 h-4" /></button>
            <div className="w-px h-6 bg-slate-200 mx-1" />
            <button onClick={handleDownload} className="p-2 rounded-xl hover:bg-indigo-50 text-indigo-600 transition-colors" title="Download"><Download className="w-4 h-4" /></button>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-rose-50 text-rose-500 transition-colors" title="Close"><X className="w-4 h-4" /></button>
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
  const [activeTab, setActiveTab] = useState<'incoming' | 'approved' | 'all' | 'spreadsheet'>('incoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  // Google Form & Sheet URL Settings State
  const [showFormModal, setShowFormModal] = useState(false);
  const [currentFormUrl, setCurrentFormUrl] = useState('');
  const [formUrlInput, setFormUrlInput] = useState('');
  const [currentSheetUrl, setCurrentSheetUrl] = useState('');
  const [sheetUrlInput, setSheetUrlInput] = useState('');
  const [isSavingUrl, setIsSavingUrl] = useState(false);
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);

  // Fetch settings on load
  useEffect(() => {
    fetch(`${API}/settings/google-form`)
      .then(res => res.json())
      .then(data => {
        if (data?.url) {
          setCurrentFormUrl(data.url);
          setFormUrlInput(data.url);
        }
      })
      .catch(() => { });

    fetch(`${API}/settings/google-sheet`)
      .then(res => res.json())
      .then(data => {
        if (data?.url) {
          setCurrentSheetUrl(data.url);
          setSheetUrlInput(data.url);
        }
      })
      .catch(() => { });
  }, []);

  // Trigger Google Sheet payments sync when Payments page loads
  useEffect(() => {
    fetch(`${API}/payments/sync`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.importedCount > 0) {
          queryClient.invalidateQueries({ queryKey: ['payments'] });
          queryClient.invalidateQueries({ queryKey: ['payment-stats'] });
          toast.info(`Auto-sync imported ${data.importedCount} new payment(s) from Google Sheet.`);
        }
      })
      .catch(() => {});
  }, [queryClient]);

  const handleSyncGoogleSheet = async () => {
    setIsSyncingSheet(true);
    try {
      const res = await fetch(`${API}/payments/sync`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['payments'] });
        queryClient.invalidateQueries({ queryKey: ['payment-stats'] });
        toast.success(`Sync completed! Imported: ${data.importedCount}, Skipped: ${data.skippedCount}`);
      } else {
        throw new Error(data.error || 'Sync returned unsuccessful');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to sync Google Sheet');
    } finally {
      setIsSyncingSheet(false);
    }
  };

  const handleSaveFormUrl = async () => {
    if (!formUrlInput.trim()) {
      toast.error('Please enter a valid Google Form URL');
      return;
    }
    setIsSavingUrl(true);
    try {
      // Save Form URL
      const formRes = await fetch(`${API}/settings/google-form`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: formUrlInput.trim() }),
      });
      const formData = await formRes.json();
      if (!formRes.ok) throw new Error(formData.error || 'Failed to save Google Form URL');
      setCurrentFormUrl(formData.url);

      // Save Sheet URL if provided
      if (sheetUrlInput.trim()) {
        const sheetRes = await fetch(`${API}/settings/google-sheet`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: sheetUrlInput.trim() }),
        });
        const sheetData = await sheetRes.json();
        if (!sheetRes.ok) throw new Error(sheetData.error || 'Failed to save Google Sheet URL');
        setCurrentSheetUrl(sheetData.url);
      }

      setShowFormModal(false);
      toast.success('Form & Sheet settings updated successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update settings');
    } finally {
      setIsSavingUrl(false);
    }
  };


  // Queries
  const { data: payments, isLoading, isError: isPaymentsError } = useQuery<Payment[]>({
    queryKey: ['payments'],
    queryFn: async () => { 
      const r = await fetch(`${API}/payments`); 
      if (!r.ok) throw new Error('Failed to fetch payments'); 
      return r.json(); 
    },
    refetchInterval: 5000,
    retry: 1,
  });

  const { data: stats } = useQuery<PaymentStats>({
    queryKey: ['payment-stats'],
    queryFn: async () => { 
      const r = await fetch(`${API}/payments/stats`); 
      if (!r.ok) throw new Error('Failed to fetch stats'); 
      return r.json(); 
    },
    refetchInterval: 5000,
    retry: 1,
  });

  // Real-time socket listener — auto-refresh when students submit Google Form payments
  useEffect(() => {
    const handleDataUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment-stats'] });
    };

    const handlePaymentSubmitted = (data: any) => {
      toast.info(`New Google Form payment submitted by ${data.studentUsn}`, { duration: 4000 });
      handleDataUpdate();
    };

    socket.on('data_updated', handleDataUpdate);
    socket.on('PAYMENT_SUBMITTED', handlePaymentSubmitted);
    socket.on('PAYMENT_STATUS_CHANGED', handleDataUpdate);

    return () => {
      socket.off('data_updated', handleDataUpdate);
      socket.off('PAYMENT_SUBMITTED', handlePaymentSubmitted);
      socket.off('PAYMENT_STATUS_CHANGED', handleDataUpdate);
    };
  }, [queryClient]);

  // Mutations
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`${API}/payments/${id}/approve`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      if (!r.ok) throw new Error(); return r.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payments'] }); queryClient.invalidateQueries({ queryKey: ['payment-stats'] }); toast.success('Payment approved successfully'); },
    onError: () => toast.error('Failed to approve payment'),
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`${API}/payments/${id}/reject`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      if (!r.ok) throw new Error(); return r.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payments'] }); queryClient.invalidateQueries({ queryKey: ['payment-stats'] }); toast.success('Payment rejected'); },
    onError: () => toast.error('Failed to reject payment'),
  });

  const bulkApproveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const r = await fetch(`${API}/payments/bulk-approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
      if (!r.ok) throw new Error(); return r.json();
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] }); queryClient.invalidateQueries({ queryKey: ['payment-stats'] });
      setSelectedIds(new Set()); toast.success(`${ids.length} payment(s) bulkly approved`);
    },
    onError: () => toast.error('Bulk approve failed'),
  });

  const bulkRejectMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const r = await fetch(`${API}/payments/bulk-reject`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
      if (!r.ok) throw new Error(); return r.json();
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] }); queryClient.invalidateQueries({ queryKey: ['payment-stats'] });
      setSelectedIds(new Set()); toast.success(`${ids.length} payment(s) rejected`);
    },
    onError: () => toast.error('Bulk reject failed'),
  });

  const reminderMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`${API}/payments/${id}/reminder`, { method: 'POST' });
      if (!r.ok) throw new Error(); return r.json();
    },
    onSuccess: (data: any) => { toast.success(data.message || 'Reminder sent'); queryClient.invalidateQueries({ queryKey: ['payments'] }); },
    onError: () => toast.error('Failed to send reminder'),
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${API}/payments/seed`, { method: 'POST' });
      if (!r.ok) throw new Error(); return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] }); queryClient.invalidateQueries({ queryKey: ['payment-stats'] });
      toast.success('Demo payment data loaded successfully');
    },
    onError: () => toast.error('Failed to load demo data'),
  });

  // Computed values
  const filterOptions = useMemo(() => {
    const data = payments || [];
    return {
      hostels: [...new Set(data.map(p => p.hostelName))].filter(Boolean).sort(),
      blocks: [...new Set(data.map(p => p.block))].filter(Boolean).sort(),
      floors: [...new Set(data.map(p => p.floor).filter(Boolean) as string[])].sort(),
      rooms: [...new Set(data.map(p => p.roomNumber))].filter(Boolean).sort(),
      years: [...new Set(data.map(p => new Date(p.paymentDate).getFullYear()))].sort((a, b) => b - a),
    };
  }, [payments]);

  const filteredPayments = useMemo(() => {
    let data = payments || [];

    // Tab filter
    if (activeTab === 'incoming') data = data.filter(p => p.status === 'PENDING_REVIEW');
    else if (activeTab === 'approved') data = data.filter(p => p.status === 'APPROVED');

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(p =>
        p.studentName.toLowerCase().includes(q) ||
        p.studentUsn.toLowerCase().includes(q) ||
        p.utrNumber.toLowerCase().includes(q) ||
        p.roomNumber.toLowerCase().includes(q)
      );
    }

    // Filters
    if (filters.hostel) data = data.filter(p => p.hostelName === filters.hostel);
    if (filters.block) data = data.filter(p => p.block === filters.block);
    if (filters.floor) data = data.filter(p => p.floor === filters.floor);
    if (filters.room) data = data.filter(p => p.roomNumber === filters.room);
    if (filters.status) data = data.filter(p => p.status === filters.status);
    if (filters.month) { const m = parseInt(filters.month); data = data.filter(p => new Date(p.paymentDate).getMonth() + 1 === m); }
    if (filters.year) { const y = parseInt(filters.year); data = data.filter(p => new Date(p.paymentDate).getFullYear() === y); }

    return data;
  }, [payments, activeTab, searchQuery, filters]);

  const hasActiveFilters = useMemo(() =>
    !!(filters.hostel || filters.block || filters.floor || filters.room || filters.status || filters.month || filters.year),
    [filters]);

  const activeFilterCount = useMemo(() =>
    [filters.hostel, filters.block, filters.floor, filters.room, filters.status, filters.month, filters.year].filter(Boolean).length,
    [filters]);

  const tabCounts = useMemo(() => {
    const all = payments || [];
    return {
      incoming: all.filter(p => p.status === 'PENDING_REVIEW').length,
      approved: all.filter(p => p.status === 'APPROVED').length,
      all: all.length,
    };
  }, [payments]);

  // Clear selection on tab/filter change
  useEffect(() => { setSelectedIds(new Set()); }, [activeTab, searchQuery, filters]);

  // Handlers
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredPayments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPayments.map(p => p.id)));
    }
  };

  const handleBulkAction = (type: ConfirmAction['type']) => {
    let ids: string[];
    let label: string;
    switch (type) {
      case 'approve-selected': ids = Array.from(selectedIds); label = `Approve ${ids.length} Selected`; break;
      case 'reject-selected': ids = Array.from(selectedIds); label = `Reject ${ids.length} Selected`; break;
      case 'approve-all': ids = filteredPayments.filter(p => p.status === 'PENDING_REVIEW').map(p => p.id); label = `Approve All ${ids.length} Pending`; break;
      case 'reject-all': ids = filteredPayments.filter(p => p.status === 'PENDING_REVIEW').map(p => p.id); label = `Reject All ${ids.length} Pending`; break;
      default: return;
    }
    if (ids.length === 0) { toast.error('No eligible payments to process'); return; }
    setConfirmAction({ type, ids, label });
  };

  const executeConfirmedAction = () => {
    if (!confirmAction) return;
    if (confirmAction.type.includes('approve')) bulkApproveMutation.mutate(confirmAction.ids);
    else bulkRejectMutation.mutate(confirmAction.ids);
    setConfirmAction(null);
  };

  const exportCSV = () => {
    const headers = ['Student Name', 'USN', 'Hostel', 'Block', 'Floor', 'Room Number', 'UTR Number', 'Payment Date', 'Payment Status', 'Email Status', 'Screenshot Proof'];
    const rows = filteredPayments.map(p => [p.studentName, p.studentUsn, p.hostelName, p.block, p.floor || '-', p.roomNumber, p.utrNumber, formatDate(p.paymentDate), p.status, p.emailStatus, p.screenshotUrl ? 'Yes' : 'Google Form']);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `hostel_payments_spreadsheet_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredPayments.length} records to CSV spreadsheet`);
  };

  // ─── Loading State ──────────────────────────────────────────
  if (isLoading && !isPaymentsError) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // ─── Summary Cards Config ──────────────────────────────────
  const summaryCards = [
    { title: 'Pending Review', value: stats?.pendingReview ?? 0, icon: Clock, gradient: 'from-amber-500 to-orange-500', iconBg: 'bg-amber-50', iconColor: 'text-amber-600', valueCls: 'text-amber-700' },
    { title: 'Approved Today', value: stats?.approvedToday ?? 0, icon: CheckCircle, gradient: 'from-emerald-500 to-teal-500', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', valueCls: 'text-emerald-700' },
    { title: 'Rejected', value: stats?.rejected ?? 0, icon: XCircle, gradient: 'from-rose-500 to-pink-500', iconBg: 'bg-rose-50', iconColor: 'text-rose-600', valueCls: 'text-rose-700' },
    { title: 'This Month', value: stats?.totalThisMonth ?? 0, icon: TrendingUp, gradient: 'from-indigo-500 to-violet-500', iconBg: 'bg-indigo-50', iconColor: 'text-indigo-600', valueCls: 'text-indigo-700' },
  ];

  const blockStats = stats?.blockStats || {};

  // ─── Filter Dropdown Helper ────────────────────────────────
  const selectCls = "w-full px-3.5 py-2.5 bg-white/80 border border-slate-200/60 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 transition-all appearance-none cursor-pointer";

  return (
    <div className="space-y-6 pb-24 text-left">
      {isPaymentsError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Could not connect to the payments server. Please verify the backend is running. Showing empty/offline state.</span>
        </div>
      )}
      {/* ═══ Header ═══ */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-800">Payment Management</h2>
          <p className="text-slate-500 font-medium mt-1">Review and manage student payment submissions</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { queryClient.invalidateQueries({ queryKey: ['payments'] }); queryClient.invalidateQueries({ queryKey: ['payment-stats'] }); toast.info('Refreshed'); }}
            className="p-3 bg-white/70 backdrop-blur-sm border border-slate-200/60 rounded-2xl text-slate-500 hover:text-indigo-600 hover:bg-white transition-all hover:-translate-y-0.5 hover:shadow-md"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowFormModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl text-sm font-bold shadow-sm hover:bg-emerald-100 hover:-translate-y-0.5 transition-all"
            title="Set Google Form Link for Student Portal"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Configure Google Form</span>
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-indigo-500/25 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/30 transition-all"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* ═══ Summary Cards ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {summaryCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.08, ease: 'easeOut' }}
            >
              <div className="relative overflow-hidden bg-white/80 backdrop-blur-md shadow-sm border border-slate-100/60 rounded-[1.5rem] p-6 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{card.title}</p>
                    <h3 className={`text-4xl font-black tracking-tight ${card.valueCls}`}>{card.value}</h3>
                  </div>
                  <div className={`p-3.5 rounded-2xl ${card.iconBg} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`w-6 h-6 ${card.iconColor}`} />
                  </div>
                </div>
                <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient}`} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ═══ Block-wise Stats ═══ */}
      {Object.keys(blockStats).length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35 }}>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Building className="w-3.5 h-3.5" /> Block-wise Payment Status
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {Object.entries(blockStats).sort(([a], [b]) => a.localeCompare(b)).map(([block, data]) => {
              const pct = data.total > 0 ? Math.round((data.paid / data.total) * 100) : 0;
              return (
                <button
                  key={block}
                  onClick={() => setFilters(f => ({ ...f, block: f.block === block ? '' : block }))}
                  className={`flex-shrink-0 rounded-2xl border px-5 py-3 min-w-[155px] transition-all duration-200 text-left cursor-pointer hover:-translate-y-0.5 hover:shadow-md ${filters.block === block
                    ? 'bg-indigo-50 border-indigo-200/60 shadow-sm'
                    : 'bg-white/60 backdrop-blur-sm border-slate-200/50 hover:bg-white'
                    }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Building className={`w-3.5 h-3.5 ${filters.block === block ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className={`text-sm font-bold ${filters.block === block ? 'text-indigo-700' : 'text-slate-700'}`}>Block {block}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-2xl font-black ${filters.block === block ? 'text-indigo-600' : 'text-slate-800'}`}>{data.paid}</span>
                    <span className="text-sm text-slate-400">/ {data.total} paid</span>
                  </div>
                  <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ═══ Search + Filter Bar ═══ */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, USN, UTR, or room number..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-10 py-3 bg-white/70 backdrop-blur-sm border border-slate-200/60 rounded-2xl text-sm font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold transition-all duration-200 ${showFilters || hasActiveFilters
            ? 'bg-indigo-50 text-indigo-600 border border-indigo-200/60 shadow-sm'
            : 'bg-white/70 text-slate-500 border border-slate-200/60 hover:bg-white hover:text-slate-700'
            }`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {hasActiveFilters && (
            <span className="w-5 h-5 bg-indigo-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{activeFilterCount}</span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* ═══ Collapsible Filter Panel ═══ */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-slate-200/50 p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Hostel</label>
                  <select value={filters.hostel} onChange={e => setFilters(f => ({ ...f, hostel: e.target.value }))} className={selectCls}>
                    <option value="">All Hostels</option>
                    {filterOptions.hostels.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Block</label>
                  <select value={filters.block} onChange={e => setFilters(f => ({ ...f, block: e.target.value }))} className={selectCls}>
                    <option value="">All Blocks</option>
                    {filterOptions.blocks.map(b => <option key={b} value={b}>Block {b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Floor</label>
                  <select value={filters.floor} onChange={e => setFilters(f => ({ ...f, floor: e.target.value }))} className={selectCls}>
                    <option value="">All Floors</option>
                    {filterOptions.floors.map(f => <option key={f} value={f}>Floor {f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Room</label>
                  <select value={filters.room} onChange={e => setFilters(f => ({ ...f, room: e.target.value }))} className={selectCls}>
                    <option value="">All Rooms</option>
                    {filterOptions.rooms.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Payment Status</label>
                  <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className={selectCls}>
                    <option value="">All Statuses</option>
                    <option value="PENDING_REVIEW">Pending Review</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Month</label>
                  <select value={filters.month} onChange={e => setFilters(f => ({ ...f, month: e.target.value }))} className={selectCls}>
                    <option value="">All Months</option>
                    {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Year</label>
                  <select value={filters.year} onChange={e => setFilters(f => ({ ...f, year: e.target.value }))} className={selectCls}>
                    <option value="">All Years</option>
                    {filterOptions.years.map(y => <option key={y} value={String(y)}>{y}</option>)}
                  </select>
                </div>
              </div>
              {hasActiveFilters && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => setFilters(emptyFilters)}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200/60 transition-all"
                  >
                    <X className="w-3.5 h-3.5" /> Clear All Filters
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Tab Bar ═══ */}
      <div className="flex items-center gap-2 flex-wrap">
        {([
          { key: 'incoming' as const, label: 'Incoming Payments', count: tabCounts.incoming },
          { key: 'approved' as const, label: 'Approved Payments', count: tabCounts.approved },
          { key: 'all' as const, label: 'All Payments', count: tabCounts.all },
          { key: 'spreadsheet' as const, label: 'Google Forms / Spreadsheet View', count: tabCounts.all },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all duration-300 ${activeTab === tab.key
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25'
              : 'bg-white/50 text-slate-500 hover:bg-white hover:text-slate-700 border border-slate-200/40'
              }`}
          >
            {tab.label}
            <span className={`min-w-[22px] h-[22px] flex items-center justify-center rounded-full text-[10px] font-black ${activeTab === tab.key ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
              }`}>{tab.count}</span>
          </button>
        ))}

        {/* Bulk action buttons (visible only on incoming tab) */}
        {activeTab === 'incoming' && tabCounts.incoming > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => handleBulkAction('approve-all')}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-2xl text-xs font-bold hover:bg-emerald-100 transition-all"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Approve All
            </button>
            <button
              onClick={() => handleBulkAction('reject-all')}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-50 text-rose-700 border border-rose-200/60 rounded-2xl text-xs font-bold hover:bg-rose-100 transition-all"
            >
              <XCircle className="w-3.5 h-3.5" /> Reject All
            </button>
          </div>
        )}
      </div>

      {/* ═══ Data Table / Spreadsheet View ═══ */}
      {activeTab === 'spreadsheet' ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="bg-white rounded-2xl border border-emerald-300 shadow-lg overflow-hidden font-sans">

            {/* Spreadsheet Toolbar Header */}
            <div className="bg-emerald-700 text-white p-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center font-black text-sm">
                  📊
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight">Google Forms & Bank Payment Submissions Sheet</h3>
                  <p className="text-[11px] text-emerald-100 font-medium">Real-time consolidated spreadsheet of all student UTR and proof submissions</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-white/10 px-3 py-1.5 rounded-lg border border-white/20 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Total Entries: {filteredPayments.length}
                </span>
                <button
                  onClick={handleSyncGoogleSheet}
                  disabled={isSyncingSheet}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-lg text-xs font-bold shadow-md transition-all disabled:opacity-60"
                  title="Pull new responses from Google Sheet"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheet ? 'animate-spin' : ''}`} />
                  <span>{isSyncingSheet ? 'Syncing...' : 'Sync Google Sheet'}</span>
                </button>
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-lg text-xs font-bold shadow-md transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Sheet (.CSV)</span>
                </button>
              </div>

            </div>

            {/* Spreadsheet Table Grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-emerald-50 border-b border-emerald-200 text-[10px] font-black text-emerald-900 uppercase tracking-wider">
                    <th className="p-3 border-r border-emerald-200 text-center w-12">#</th>
                    <th className="p-3 border-r border-emerald-200">Timestamp / Date</th>
                    <th className="p-3 border-r border-emerald-200">Student Name</th>
                    <th className="p-3 border-r border-emerald-200">USN</th>
                    <th className="p-3 border-r border-emerald-200">Hostel & Block</th>
                    <th className="p-3 border-r border-emerald-200">Floor</th>
                    <th className="p-3 border-r border-emerald-200">Room No</th>
                    <th className="p-3 border-r border-emerald-200">Bank UTR / Ref No</th>
                    <th className="p-3 border-r border-emerald-200 text-center">Payment Proof</th>
                    <th className="p-3 border-r border-emerald-200 text-center">Email Status</th>
                    <th className="p-3 border-r border-emerald-200 text-center">Verification Status</th>
                    <th className="p-3 text-center">Admin Verification Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs font-medium text-slate-700 bg-white">
                  {filteredPayments.map((payment, idx) => (
                    <tr key={payment.id} className="hover:bg-emerald-50/40 transition-colors">
                      <td className="p-3 border-r border-slate-200 text-center font-bold text-slate-400 bg-slate-50">{idx + 1}</td>
                      <td className="p-3 border-r border-slate-200 font-mono text-[11px] text-slate-600">{formatDate(payment.paymentDate)}</td>
                      <td className="p-3 border-r border-slate-200 font-bold text-slate-800">{payment.studentName}</td>
                      <td className="p-3 border-r border-slate-200 font-mono font-bold text-slate-700">{payment.studentUsn}</td>
                      <td className="p-3 border-r border-slate-200">{payment.hostelName} (Block {payment.block})</td>
                      <td className="p-3 border-r border-slate-200 text-center font-mono">{payment.floor || '-'}</td>
                      <td className="p-3 border-r border-slate-200 font-bold">{payment.roomNumber}</td>
                      <td className="p-3 border-r border-slate-200 font-mono font-bold text-indigo-700">{payment.utrNumber}</td>
                      <td className="p-3 border-r border-slate-200 text-center">
                        {payment.screenshotUrl ? (
                          <button
                            onClick={() => setScreenshotUrl(payment.screenshotUrl!)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold border border-indigo-200 transition-all inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Screenshot</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-semibold italic">No File</span>
                        )}
                      </td>
                      <td className="p-3 border-r border-slate-200 text-center">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${payment.emailStatus === 'SENT' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                          <Mail className="w-3 h-3" />
                          {payment.emailStatus === 'SENT' ? 'Sent' : 'Pending'}
                        </span>
                      </td>
                      <td className="p-3 border-r border-slate-200 text-center">
                        <StatusBadge status={payment.status} />
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {payment.status === 'PENDING_REVIEW' && (
                            <>
                              <button
                                onClick={() => approveMutation.mutate(payment.id)}
                                disabled={approveMutation.isPending}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold shadow-sm transition-all disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => rejectMutation.mutate(payment.id)}
                                disabled={rejectMutation.isPending}
                                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold shadow-sm transition-all disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {payment.status === 'APPROVED' && (
                            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" /> Verified
                            </span>
                          )}
                          {payment.status === 'REJECTED' && (
                            <span className="text-[10px] font-bold text-rose-500 flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" /> Rejected
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Sheet Footer */}
            <div className="bg-emerald-50 px-6 py-3 border-t border-emerald-200 flex items-center justify-between text-xs text-emerald-900 font-bold">
              <span>Google Forms Responses Spreadsheet View</span>
              <span>Showing {filteredPayments.length} of {payments?.length ?? 0} Total Form Submissions</span>
            </div>

          </div>
        </motion.div>
      ) : filteredPayments.length > 0 ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-slate-200/50 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100/80">
                    <th className="pl-5 pr-2 py-4 text-left">
                      <input
                        type="checkbox"
                        checked={filteredPayments.length > 0 && selectedIds.size === filteredPayments.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                      />
                    </th>
                    {['Student Name', 'USN', 'Hostel', 'Block', 'Room', 'UTR Number', 'Payment Date', 'Screenshot', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment, idx) => {
                    const isSelected = selectedIds.has(payment.id);
                    return (
                      <motion.tr
                        key={payment.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.02 }}
                        className={`border-b border-slate-50 transition-colors duration-150 ${isSelected ? 'bg-indigo-50/50' : idx % 2 === 0 ? 'bg-white/30' : 'bg-slate-50/30'
                          } hover:bg-indigo-50/30`}
                      >
                        <td className="pl-5 pr-2 py-3.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(payment.id)}
                            className="w-4 h-4 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                          />
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-sm font-bold text-slate-800">{payment.studentName}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-sm font-mono font-semibold text-slate-600">{payment.studentUsn}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-sm text-slate-500">{payment.hostelName}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-black">{payment.block}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-sm font-semibold text-slate-600">{payment.roomNumber}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-sm font-mono font-medium text-slate-600">{payment.utrNumber}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-sm text-slate-500">{formatDate(payment.paymentDate)}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          {payment.screenshotUrl ? (
                            <button
                              onClick={() => setScreenshotUrl(payment.screenshotUrl!)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 text-indigo-600 hover:text-indigo-850 font-bold transition-all text-xs border border-slate-200/50"
                              title="View Screenshot"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Screenshot</span>
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 font-semibold italic">No File</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={payment.status} />
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1">
                            {payment.status === 'PENDING_REVIEW' && (
                              <>
                                <button
                                  onClick={() => approveMutation.mutate(payment.id)}
                                  disabled={approveMutation.isPending}
                                  className="p-2 rounded-xl hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-all disabled:opacity-50"
                                  title="Approve"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => rejectMutation.mutate(payment.id)}
                                  disabled={rejectMutation.isPending}
                                  className="p-2 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all disabled:opacity-50"
                                  title="Reject"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => reminderMutation.mutate(payment.id)}
                                  disabled={reminderMutation.isPending}
                                  className="p-2 rounded-xl hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-all disabled:opacity-50"
                                  title="Send Reminder"
                                >
                                  <Bell className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {payment.status === 'APPROVED' && (
                              <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Verified
                              </span>
                            )}
                            {payment.status === 'REJECTED' && (
                              <span className="text-xs font-medium text-rose-500 flex items-center gap-1" title={payment.remarks || ''}>
                                <XCircle className="w-3 h-3" /> {payment.remarks ? payment.remarks.slice(0, 20) + '…' : 'Rejected'}
                              </span>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Table Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100/60 flex items-center justify-between bg-white/40">
              <p className="text-xs font-medium text-slate-500">
                Showing <span className="font-bold text-slate-700">{filteredPayments.length}</span> of <span className="font-bold text-slate-700">{payments?.length ?? 0}</span> payments
              </p>
              {selectedIds.size > 0 && (
                <p className="text-xs font-bold text-indigo-600">{selectedIds.size} selected</p>
              )}
            </div>
          </div>
        </motion.div>
      ) : (
        /* ═══ Empty State ═══ */
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-slate-200/50 p-16 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6">
              <Inbox className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">
              {hasActiveFilters || searchQuery ? 'No matching payments' : 'No payments yet'}
            </h3>
            <p className="text-sm text-slate-400 max-w-md mb-6">
              {hasActiveFilters || searchQuery
                ? 'Try adjusting your search or filter criteria to find payments.'
                : 'Payment data will appear here once students submit their payment details through the Google Form.'}
            </p>
            {!hasActiveFilters && !searchQuery && (
              <button
                onClick={() => seedMutation.mutate()}
                disabled={seedMutation.isPending}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-indigo-500/25 hover:-translate-y-0.5 hover:shadow-xl transition-all disabled:opacity-60"
              >
                {seedMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                Load Demo Data
              </button>
            )}
            {(hasActiveFilters || searchQuery) && (
              <button
                onClick={() => { setFilters(emptyFilters); setSearchQuery(''); }}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-200 transition-all"
              >
                <X className="w-4 h-4" /> Clear Search & Filters
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* ═══ Floating Selection Action Bar ═══ */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-6 py-3.5 bg-slate-900 text-white rounded-2xl shadow-2xl shadow-slate-900/30"
          >
            <span className="text-sm font-bold">
              <span className="inline-flex items-center justify-center w-6 h-6 bg-white/20 rounded-lg text-xs font-black mr-2">{selectedIds.size}</span>
              selected
            </span>
            <div className="w-px h-6 bg-white/20" />
            <button
              onClick={() => handleBulkAction('approve-selected')}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-bold transition-all"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Approve
            </button>
            <button
              onClick={() => handleBulkAction('reject-selected')}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-500 hover:bg-rose-400 text-white rounded-xl text-xs font-bold transition-all"
            >
              <XCircle className="w-3.5 h-3.5" /> Reject
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-2 hover:bg-white/10 rounded-xl text-white/60 hover:text-white transition-all"
              title="Clear Selection"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Screenshot Modal ═══ */}
      <AnimatePresence>
        {screenshotUrl && (
          <ScreenshotModal url={screenshotUrl} onClose={() => setScreenshotUrl(null)} />
        )}
      </AnimatePresence>

      {/* ═══ Google Form & Sheet Link Configuration Modal ═══ */}
      <AnimatePresence>
        {showFormModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowFormModal(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="bg-white rounded-3xl shadow-2xl max-w-lg w-full mx-4 p-8 overflow-hidden relative"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Google Form & Sheet Config</h3>
                    <p className="text-xs text-slate-500 font-medium">Link the Google Form for fee submissions and Google Sheet for responses</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFormModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Google Form URL (Shared with Student Portal)
                  </label>
                  <textarea
                    rows={2}
                    value={formUrlInput}
                    onChange={e => setFormUrlInput(e.target.value)}
                    placeholder="Paste Google Form view link..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Google Sheet (Responses) URL
                  </label>
                  <textarea
                    rows={2}
                    value={sheetUrlInput}
                    onChange={e => setSheetUrlInput(e.target.value)}
                    placeholder="Paste Google Sheet edit/view link..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
                  />
                </div>

                <div className="p-3.5 bg-emerald-50/60 border border-emerald-200/60 rounded-2xl text-xs font-medium text-emerald-800 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <span>💡 Dynamic Sheet Sync Active</span>
                  </p>
                  <p className="text-[11px] leading-relaxed text-emerald-700">
                    Students use the Google Form to pay fees. The Google Sheet Responses link fetches payment info (UTR, name, USN, screenshot) directly into the Admin dashboard.
                  </p>
                </div>

                {currentFormUrl && (
                  <div className="text-[11px] text-slate-500 font-medium truncate">
                    <span className="font-bold text-slate-700">Form Link:</span>{' '}
                    <a href={currentFormUrl} target="_blank" rel="noreferrer" className="text-indigo-600 underline font-mono">
                      {currentFormUrl}
                    </a>
                  </div>
                )}

                {currentSheetUrl && (
                  <div className="text-[11px] text-slate-500 font-medium truncate">
                    <span className="font-bold text-slate-700">Sheet Link:</span>{' '}
                    <a href={currentSheetUrl} target="_blank" rel="noreferrer" className="text-indigo-600 underline font-mono">
                      {currentSheetUrl}
                    </a>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 justify-end mt-6 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setShowFormModal(false)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveFormUrl}
                  disabled={isSavingUrl}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-2xl shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-60"
                >
                  {isSavingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                  Save & Connect
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Confirmation Dialog ═══ */}
      <AnimatePresence>
        {confirmAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setConfirmAction(null)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 p-8"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 rounded-2xl ${confirmAction.type.includes('approve') ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                  <AlertTriangle className={`w-6 h-6 ${confirmAction.type.includes('approve') ? 'text-emerald-600' : 'text-rose-600'}`} />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Confirm Action</h3>
              </div>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                Are you sure you want to <span className="font-bold">{confirmAction.label.toLowerCase()}</span>?
                This action will affect <span className="font-bold text-slate-800">{confirmAction.ids.length}</span> payment(s) and cannot be easily undone.
              </p>
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={executeConfirmedAction}
                  disabled={bulkApproveMutation.isPending || bulkRejectMutation.isPending}
                  className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-2xl transition-all shadow-lg disabled:opacity-60 ${confirmAction.type.includes('approve')
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/25 hover:shadow-emerald-500/40'
                    : 'bg-gradient-to-r from-rose-500 to-pink-500 shadow-rose-500/25 hover:shadow-rose-500/40'
                    }`}
                >
                  {(bulkApproveMutation.isPending || bulkRejectMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                  {confirmAction.label}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
