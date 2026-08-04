import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, FileText, Loader2, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export default function CircularsControl() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    desc: '',
    date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    category: 'Events',
    priority: 'Normal',
    author: 'Admin',
    fileSize: '150 KB'
  });

  const { data: notices, isLoading } = useQuery({
    queryKey: ['notices'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/notices');
      if (!res.ok) throw new Error('Failed to fetch notices');
      const data = await res.json();
      return data.notices;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('http://localhost:5000/api/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to create');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices'] });
      toast.success('Notice published successfully');
      setIsAdding(false);
      setFormData({
        title: '', desc: '', date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
        category: 'Events', priority: 'Normal', author: 'Admin', fileSize: '150 KB'
      });
    },
    onError: () => toast.error('Failed to publish notice')
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`http://localhost:5000/api/notices/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices'] });
      toast.success('Notice deleted');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Circulars & Official Notices CMS</h1>
          <p className="text-slate-500">Publish and manage circulars visible to hostel students</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {isAdding ? 'Cancel' : 'Publish Circular'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">New Notice</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                required
                rows={3}
                value={formData.desc}
                onChange={e => setFormData({ ...formData, desc: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-lg"
              >
                <option value="Mess Rules">Mess Rules</option>
                <option value="Security">Security</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Events">Events</option>
                <option value="Regulations">Regulations</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={e => setFormData({ ...formData, priority: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-lg"
              >
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Author / Department</label>
              <input
                type="text"
                required
                value={formData.author}
                onChange={e => setFormData({ ...formData, author: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <input
                type="text"
                required
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-lg"
                placeholder="e.g., 20 July 2026"
              />
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {notices?.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200 shadow-sm">
            No circulars published yet
          </div>
        ) : (
          notices?.map((notice: any) => (
            <div key={notice.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between gap-4 transition hover:border-slate-300">
              <div className="flex gap-4">
                <div className={`mt-1 p-3 rounded-full flex-shrink-0 ${notice.priority === 'Urgent' ? 'bg-rose-100 text-rose-600' : notice.priority === 'High' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-500 px-2 py-0.5 bg-slate-100 rounded-md">
                      {notice.category}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-medium text-slate-400">
                      <Calendar className="w-3 h-3" />
                      {notice.date}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight mb-2">
                    {notice.title}
                  </h3>
                  <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                    {notice.desc}
                  </p>
                  <p className="text-xs font-medium text-slate-400">
                    By {notice.author}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this notice?')) {
                    deleteMutation.mutate(notice.id);
                  }
                }}
                disabled={deleteMutation.isPending}
                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition shrink-0"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
