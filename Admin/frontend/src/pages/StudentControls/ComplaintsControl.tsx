import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FileText, Clock, CheckCircle, ShieldAlert, 
  Loader2, Edit3, Save, X, PhoneCall, Tag, Search, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { io } from 'socket.io-client';
import { useAuthStore } from '../../store/useAuthStore';

interface ComplaintItem {
  id: string;
  studentName: string;
  usn: string;
  roomNo: string;
  block: string;
  floor: string;
  category: string;
  priority: string;
  subject: string;
  description: string;
  status: string;
  upvotes?: number;
  assignedTo: string | null;
  resolutionNotes: string | null;
  createdAt: string;
}

export const formatTicketId = (rawId: string): string => {
  if (!rawId) return '#TKT-1001';
  const cleanId = rawId.trim();
  if (cleanId.startsWith('#TKT-')) return cleanId;
  let hash = 0;
  for (let i = 0; i < cleanId.length; i++) {
    hash = (hash * 31 + cleanId.charCodeAt(i)) % 9000;
  }
  return `#TKT-${1000 + Math.abs(hash)}`;
};

export default function ComplaintsControl() {
  const queryClient = useQueryClient();
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [selectedBlockFilter, setSelectedBlockFilter] = useState('ALL');
  const [availableBlocks, setAvailableBlocks] = useState<string[]>([]);

  // Modal State
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintItem | null>(null);
  const [editStatus, setEditStatus] = useState('Pending');
  const [editTechnician, setEditTechnician] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Fetch Complaints
  const { data: serverComplaints, isLoading } = useQuery({
    queryKey: ['complaints'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/complaints');
      if (!res.ok) throw new Error('Failed to fetch complaints');
      return res.json();
    }
  });

  // Sync state on load
  useEffect(() => {
    if (serverComplaints) {
      setComplaints(serverComplaints);
    }
  }, [serverComplaints]);

  // Sockets for real-time synchronization
  useEffect(() => {
    const socket = io('http://localhost:5000');

    socket.on('complaint_created', (newCmp: ComplaintItem) => {
      setComplaints(prev => {
        if (prev.some(c => c.id === newCmp.id)) return prev;
        return [newCmp, ...prev];
      });
      toast.info(`New complaint submitted: ${newCmp.subject}`);
    });

    socket.on('complaint_updated', (updatedCmp: ComplaintItem) => {
      setComplaints(prev => prev.map(c => c.id === updatedCmp.id ? updatedCmp : c));
      setSelectedComplaint(prev => {
        if (prev && prev.id === updatedCmp.id) {
          return updatedCmp;
        }
        return prev;
      });
    });

    socket.on('complaint_deleted', (deletedId: string) => {
      setComplaints(prev => prev.filter(c => c.id !== deletedId));
      setSelectedComplaint(prev => (prev && prev.id === deletedId ? null : prev));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await fetch(`http://localhost:5000/api/complaints/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to update complaint');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      toast.success(`Complaint ${formatTicketId(data.id)} updated successfully`);
      setSelectedComplaint(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save changes');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`http://localhost:5000/api/complaints/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete complaint');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      toast.success('Complaint deleted successfully');
      setSelectedComplaint(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete complaint');
    }
  });

  const handleQuickStatusChange = (id: string, newStatus: string) => {
    updateMutation.mutate({
      id,
      payload: { status: newStatus }
    });
  };

  const handleManageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    updateMutation.mutate({
      id: selectedComplaint.id,
      payload: {
        status: editStatus,
        assignedTo: editTechnician.trim() || null,
        resolutionNotes: editNotes.trim() || null
      }
    });
  };

  const openManageModal = (cmp: ComplaintItem) => {
    setSelectedComplaint(cmp);
    setEditStatus(cmp.status);
    setEditTechnician(cmp.assignedTo || '');
    setEditNotes(cmp.resolutionNotes || '');
  };

  const getPriorityStyle = (p: string) => {
    switch (p) {
      case 'Low': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'Medium': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'High': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Critical': return 'bg-rose-50 text-rose-700 border-rose-100';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusStyle = (s: string) => {
    switch (s) {
      case 'Pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'In Progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Resolved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Fetch real-time available blocks for filter
  useEffect(() => {
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

  const { role, allowedBlocks } = useAuthStore();

  const isBlockAllowed = (itemBlock?: string) => {
    if (role === 'CHIEF') return true;
    if (!allowedBlocks || allowedBlocks.includes('ALL')) return true;
    if (!itemBlock) return true;
    const cleanItemBlock = itemBlock.trim().toLowerCase();
    return allowedBlocks.some(b => {
      const cleanB = b.trim().toLowerCase();
      return cleanItemBlock.includes(cleanB) || cleanB.includes(cleanItemBlock);
    });
  };

  const filteredComplaints = complaints
    .filter(c => {
      const matchesSearch = c.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            c.usn.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            c.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            formatTicketId(c.id).toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
      const matchesPriority = priorityFilter === 'ALL' || c.priority === priorityFilter;
      const matchesBlockAllowed = isBlockAllowed(c.block);
      const matchesSelectedBlock = selectedBlockFilter === 'ALL' ||
        (c.block || '').trim().toLowerCase().includes(selectedBlockFilter.trim().toLowerCase()) ||
        selectedBlockFilter.trim().toLowerCase().includes((c.block || '').trim().toLowerCase());

      return matchesSearch && matchesStatus && matchesPriority && matchesBlockAllowed && matchesSelectedBlock;
    });

  // Calculate counters
  const totalCount = complaints.length;
  const pendingCount = complaints.filter(c => c.status === 'Pending').length;
  const inProgressCount = complaints.filter(c => c.status === 'In Progress').length;
  const resolvedCount = complaints.filter(c => c.status === 'Resolved').length;

  return (
    <div className="space-y-6 pb-12 text-left">
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md">
        <h2 className="text-base font-black uppercase tracking-wider text-indigo-400 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-500" />
          Maintenance Grievance Desk
        </h2>
        <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
          Real-time end-to-end synchronization with Student Portal maintenance requests.
        </p>
      </div>

      {/* Top Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-semibold">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Logged</span>
            <span className="text-lg font-black text-slate-800 font-mono mt-0.5 block">{totalCount} Tickets</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <FileText className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending</span>
            <span className="text-lg font-black text-amber-600 font-mono mt-0.5 block">{pendingCount} Waiting</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">In Progress</span>
            <span className="text-lg font-black text-blue-600 font-mono mt-0.5 block">{inProgressCount} Active</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Resolved SLA</span>
            <span className="text-lg font-black text-emerald-600 font-mono mt-0.5 block">{resolvedCount} Solved</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Toolbar Filters */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-semibold">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Block Filter</label>
            <select
              value={selectedBlockFilter}
              onChange={e => setSelectedBlockFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none font-bold text-slate-700 cursor-pointer"
            >
              <option value="ALL">All Blocks</option>
              {(availableBlocks.length > 0 ? availableBlocks : ['Block A', 'Block B', 'Block C', 'Girls Hostel', 'Boys Hostel']).map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Status Filter</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none font-bold text-slate-700"
            >
              <option value="ALL">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
          <div>
            <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Priority Filter</label>
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none font-bold text-slate-700"
            >
              <option value="ALL">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </div>

        <div className="relative w-full md:w-64">
          <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">Search Tickets</label>
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search USN, ID, Name or Keyword..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Main Table view */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm overflow-x-auto">
        {isLoading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>
        ) : filteredComplaints.length === 0 ? (
          <div className="text-center py-12 text-slate-400 italic">No tickets found matching current filters.</div>
        ) : (
          <table className="w-full border-collapse border border-slate-200 text-left text-xs font-semibold text-slate-700 rounded-2xl overflow-hidden">
            <thead>
              <tr className="bg-slate-950 text-white font-bold uppercase text-[9px] tracking-wider border border-slate-900">
                <th className="p-3.5">ID</th>
                <th className="p-3.5">Student Info</th>
                <th className="p-3.5">Location</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Priority</th>
                <th className="p-3.5">Subject & Description</th>
                <th className="p-3.5">Submitted</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-center">Likes / Me Too</th>
                <th className="p-3.5">Update Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {filteredComplaints.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-3.5 font-mono font-black text-slate-900 whitespace-nowrap">
                    {formatTicketId(item.id)}
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    <div className="font-bold text-slate-800">{item.studentName}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.usn}</div>
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    <div>Room {item.roomNo}</div>
                    <div className="text-[10px] text-slate-400 font-bold mt-0.5">{item.block} • Floor {item.floor}</div>
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">{item.category}</span>
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold ${getPriorityStyle(item.priority)}`}>
                      {item.priority}
                    </span>
                  </td>
                  <td className="p-3.5 min-w-[180px] max-w-[280px]">
                    <div className="font-black text-slate-800 leading-snug">{item.subject}</div>
                    <p className="text-[10px] text-slate-400 leading-relaxed font-semibold mt-1 line-clamp-2">{item.description}</p>
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    <div>{new Date(item.createdAt).toLocaleDateString('en-GB')}</div>
                    <div className="text-[9px] text-slate-400 font-mono mt-0.5">{new Date(item.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${getStatusStyle(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-center whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 font-black px-2.5 py-1 rounded-lg border border-indigo-200 text-xs">
                      👍 {item.upvotes || 1}
                    </span>
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    <select
                      value={item.status}
                      onChange={e => handleQuickStatusChange(item.id, e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg p-1 text-[11px] outline-none font-bold text-slate-700 cursor-pointer"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MANAGE TICKET DIALOG MODAL */}
      {selectedComplaint && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 border border-slate-200 shadow-2xl">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded">
                  {formatTicketId(selectedComplaint.id)}
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1.5">{selectedComplaint.subject}</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                  Logged by: {selectedComplaint.studentName} ({selectedComplaint.usn})
                </p>
              </div>
              <button onClick={() => setSelectedComplaint(null)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs font-semibold space-y-2 text-left">
              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-bold">
                <div>Category: <span className="text-slate-800">{selectedComplaint.category}</span></div>
                <div>Priority: <span className="text-slate-800">{selectedComplaint.priority}</span></div>
                <div>Room: <span className="text-slate-800">{selectedComplaint.roomNo}</span></div>
                <div>Block: <span className="text-slate-800">{selectedComplaint.block} • Floor {selectedComplaint.floor}</span></div>
              </div>
              <div className="border-t border-slate-200 pt-2 text-slate-700 leading-relaxed font-medium">
                {selectedComplaint.description}
              </div>
            </div>

            <form onSubmit={handleManageSubmit} className="space-y-3 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-black mb-1">Ticket Status</label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2 bg-white outline-none font-bold text-slate-800"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-black mb-1">Assign Technician</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar (Plumber)"
                    value={editTechnician}
                    onChange={e => setEditTechnician(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2 outline-none font-bold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-black mb-1">Resolution / Inspection Notes</label>
                <textarea
                  placeholder="Mention final work checklist or closure remarks..."
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 outline-none font-semibold text-slate-800"
                  rows={3}
                />
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedComplaint && confirm(`Are you sure you want to delete complaint ${formatTicketId(selectedComplaint.id)}?`)) {
                      deleteMutation.mutate(selectedComplaint.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl border border-rose-200 transition flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Ticket</span>
                </button>

                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setSelectedComplaint(null)} 
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition text-xs"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={updateMutation.isPending}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow text-xs"
                  >
                    {updateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save Actions
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
