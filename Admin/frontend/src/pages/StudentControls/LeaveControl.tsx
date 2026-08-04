import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, X } from 'lucide-react';

export default function LeaveControl() {
  const queryClient = useQueryClient();

  const { data: leaves, isLoading } = useQuery({
    queryKey: ['leaves'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/leaves');
      if (!res.ok) throw new Error('Failed to fetch leaves');
      return res.json();
    }
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const res = await fetch(`http://localhost:5000/api/leaves/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Failed to update');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      toast.success('Leave application updated');
    }
  });

  if (isLoading) return <div className="text-slate-500">Loading applications...</div>;

  const getStatusBadge = (status: string) => {
    if (status === 'Approved') return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Approved</span>;
    if (status === 'Rejected') return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">Rejected</span>;
    return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Pending</span>;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-800">Leave Applications</h2>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
            <tr>
              <th className="p-4">Student</th>
              <th className="p-4">Dates</th>
              <th className="p-4">Reason</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leaves?.map((leave: any) => (
              <tr key={leave.id} className="hover:bg-slate-50/50 transition">
                <td className="p-4">
                  <div className="font-medium text-slate-800">{leave.studentName}</div>
                  <div className="text-xs text-slate-500">{leave.usn}</div>
                  <div className="text-xs text-slate-400 mt-1">Applied: {new Date(leave.appliedAt).toLocaleDateString()}</div>
                </td>
                <td className="p-4">
                  <div className="text-slate-700 font-medium">{new Date(leave.fromDate).toLocaleDateString()}</div>
                  <div className="text-xs text-slate-500">to {new Date(leave.toDate).toLocaleDateString()}</div>
                </td>
                <td className="p-4 max-w-xs text-slate-600">{leave.reason}</td>
                <td className="p-4">{getStatusBadge(leave.status)}</td>
                <td className="p-4 text-right">
                  {leave.status === 'Pending' && (
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => updateStatus.mutate({ id: leave.id, status: 'Approved' })}
                        className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition"
                        title="Approve"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => updateStatus.mutate({ id: leave.id, status: 'Rejected' })}
                        className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                        title="Reject"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {leaves?.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500">No leave applications found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
