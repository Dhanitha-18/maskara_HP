import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  Check, X, Calendar, User, Phone, MapPin, FileText, Clock, AlertCircle, CheckCircle2, XCircle, Search, Filter, ShieldCheck
} from 'lucide-react';
import { io } from 'socket.io-client';

export default function LeaveControl() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ['leaves'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/leaves');
      if (!res.ok) throw new Error('Failed to fetch leaves');
      return res.json();
    }
  });

  // Real-time WebSockets
  useEffect(() => {
    const socket = io('http://localhost:5000');
    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
    };
    socket.on('LEAVE_CREATED', handleUpdate);
    socket.on('LEAVE_UPDATED', handleUpdate);
    socket.on('data_updated', handleUpdate);

    return () => {
      socket.off('LEAVE_CREATED', handleUpdate);
      socket.off('LEAVE_UPDATED', handleUpdate);
      socket.off('data_updated', handleUpdate);
      socket.disconnect();
    };
  }, [queryClient]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const res = await fetch(`http://localhost:5000/api/leaves/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Failed to update status');
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      toast.success(`Leave application marked as ${variables.status}!`);
    },
    onError: () => {
      toast.error('Failed to update leave application status.');
    }
  });

  const getStatusBadge = (status: string) => {
    const st = String(status || 'Pending').toUpperCase();
    if (st === 'APPROVED') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 w-fit">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Approved
        </span>
      );
    }
    if (st === 'REJECTED') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5 w-fit">
          <XCircle className="w-3.5 h-3.5 text-rose-600" />
          Rejected
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5 w-fit">
        <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
        Pending Review
      </span>
    );
  };

  const filteredLeaves = leaves.filter((leave: any) => {
    if (statusFilter !== 'ALL') {
      if (String(leave.status).toUpperCase() !== statusFilter.toUpperCase()) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = (leave.studentName || '').toLowerCase().includes(q);
      const usnMatch = (leave.usn || '').toLowerCase().includes(q);
      const reasonMatch = (leave.reason || '').toLowerCase().includes(q);
      const destMatch = (leave.destination || '').toLowerCase().includes(q);
      if (!nameMatch && !usnMatch && !reasonMatch && !destMatch) return false;
    }
    return true;
  });

  const formatDate = (dateStr: any) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    } catch {
      return String(dateStr);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar / Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <span>Student Leave Applications</span>
          </h2>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Review and approve leave applications submitted by residents. Approvals reflect immediately in student portal.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search student or USN..."
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Leave Applications Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 font-bold text-xs">
            Loading student leave applications...
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div className="p-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl m-4">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-600">No leave applications found</p>
            <p className="text-xs text-slate-400 mt-1">Submitted leave requests will appear here for review.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/70 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-4">Student Details</th>
                  <th className="p-4">Leave Type & Reason</th>
                  <th className="p-4">Duration & Dates</th>
                  <th className="p-4">Destination & Contacts</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Admin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredLeaves.map((leave: any) => {
                  const statusUpper = String(leave.status || 'Pending').toUpperCase();
                  const isPending = statusUpper === 'PENDING';

                  return (
                    <tr key={leave.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Student Info */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-black flex items-center justify-center text-sm shrink-0">
                            {(leave.studentName || 'S').charAt(0)}
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900 text-sm">{leave.studentName}</p>
                            <p className="font-mono text-[11px] font-bold text-indigo-600 uppercase">{leave.usn}</p>
                            {leave.roomNo && (
                              <p className="text-[10px] text-slate-400">
                                {leave.block || 'Hostel'} • Room {leave.roomNo}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Leave Type & Reason */}
                      <td className="p-4 max-w-xs">
                        <span className="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md text-[10px] font-black uppercase tracking-wider mb-1">
                          {leave.leaveType || 'Temporary Leave'}
                        </span>
                        <p className="text-slate-700 font-medium text-xs line-clamp-2" title={leave.reason}>
                          {leave.reason || 'No reason provided'}
                        </p>
                      </td>

                      {/* Dates & Duration */}
                      <td className="p-4">
                        <div className="font-mono text-xs font-bold text-slate-900">
                          {formatDate(leave.fromDate)}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-500">
                          to {formatDate(leave.toDate)}
                        </div>
                        {leave.totalDays && (
                          <span className="text-[10px] font-bold text-indigo-600 block mt-0.5">
                            ({leave.totalDays} Day{leave.totalDays > 1 ? 's' : ''})
                          </span>
                        )}
                      </td>

                      {/* Destination & Contacts */}
                      <td className="p-4 space-y-1 text-[11px]">
                        {leave.destination && (
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium truncate max-w-[180px]" title={leave.destination}>
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{leave.destination}</span>
                          </div>
                        )}
                        {leave.emergencyContact && (
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Emerg: {leave.emergencyContact}</span>
                          </div>
                        )}
                        {leave.parentPhone && (
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Parent: {leave.parentName || ''} ({leave.parentPhone})</span>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        {getStatusBadge(leave.status)}
                        <span className="text-[9.5px] font-semibold text-slate-400 block mt-1">
                          Applied {formatDate(leave.appliedAt)}
                        </span>
                      </td>

                      {/* Action Buttons */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => updateStatus.mutate({ id: leave.id, status: 'Approved' })}
                            disabled={updateStatus.isPending}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                              statusUpper === 'APPROVED'
                                ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            }`}
                            title="Approve Leave Application"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>

                          <button 
                            onClick={() => updateStatus.mutate({ id: leave.id, status: 'Rejected' })}
                            disabled={updateStatus.isPending}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                              statusUpper === 'REJECTED'
                                ? 'bg-rose-600 text-white shadow-rose-600/20'
                                : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                            }`}
                            title="Reject Leave Application"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
