import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Image as ImageIcon, Pencil } from 'lucide-react';
import { toast } from 'sonner';

// Same default facilities that appear in the Student Portal
const DEFAULT_FACILITIES = [
  { title: 'High-Speed Wi-Fi', description: 'Commercial gigabit bandwidth across all lounge and study areas.', imageUrl: '/facilities/wifib.jpeg' },
  { title: 'Laundry Services', description: 'Washing machines and professional dry cleaning schedules twice a week.', imageUrl: '/facilities/washingmachine.jpeg' },
  { title: 'RO Purified Water', description: 'Continuous RO water dispensers on every floor checked for TDS levels.', imageUrl: '/facilities/rowater.jpeg' },
  { title: 'Power Backup', description: 'Silent diesel generator backup ensuring 24/7 electricity coverage.', imageUrl: '/facilities/power.jpeg' },
  { title: 'Biometric Security', description: 'Secure biometric fingerprint access points on main entry gates.', imageUrl: '/facilities/tanker.jpeg' },
  { title: 'CCTV Surveillance', description: '60+ CCTV high definition cameras covering lobbies, corridors, and perimeters.', imageUrl: '/facilities/cctv.jpeg' },
  { title: 'Two-Wheeler Parking', description: 'Dedicated basement parking spots with security guard patrols.', imageUrl: '/facilities/shoerack.jpeg' },
  { title: 'Daily Housekeeping', description: 'Professional sweeping and garbage disposal in all rooms every morning.', imageUrl: '/facilities/cleaning2.jpeg' },
  { title: 'Indoor Games Arena', description: 'Table tennis, carrom boards, and chess in the recreation lounge.', imageUrl: '/facilities/FireExtinguisher.jpeg' },
  { title: 'Quiet Study Area', description: 'Separate soundproof cabins equipped with desk lights and ports.', imageUrl: '/facilities/dryarea.jpeg' },
  { title: 'Hot Water Supply', description: 'Solar heaters backed by instant geysers in all restrooms.', imageUrl: '/facilities/tanker.jpeg' },
  { title: 'Modern Lift Access', description: 'Reliable 8-passenger automatic elevator with ARD safety triggers.', imageUrl: '/facilities/lift.jpeg' },
];

export default function FacilitiesControl() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', description: '', imageUrl: '' });

  const { data: facilities, isLoading } = useQuery({
    queryKey: ['facilities'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/facilities');
      if (!res.ok) throw new Error('Failed to fetch facilities');
      return res.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('http://localhost:5000/api/facilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to create');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      toast.success('Facility added successfully');
      setIsAdding(false);
      setFormData({ title: '', description: '', imageUrl: '' });
    },
    onError: () => toast.error('Failed to add facility')
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`http://localhost:5000/api/facilities/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      toast.success('Facility deleted');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`http://localhost:5000/api/facilities/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to update');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      toast.success('Facility updated successfully');
      setIsAdding(false);
      setEditId(null);
      setFormData({ title: '', description: '', imageUrl: '' });
    },
    onError: () => toast.error('Failed to update facility')
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const uploadData = new FormData();
    uploadData.append('photo', file);
    try {
      const res = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: uploadData
      });
      const data = await res.json();
      if (res.ok) {
        setFormData(prev => ({ ...prev, imageUrl: `http://localhost:5000${data.imageUrl}` }));
        toast.success('Image uploaded');
      } else {
        toast.error('Failed to upload image');
      }
    } catch (err) {
      toast.error('Failed to upload image');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">Hostel Facilities</h2>
        <button 
          onClick={() => {
            setEditId(null);
            setFormData({ title: '', description: '', imageUrl: '' });
            setIsAdding(!isAdding);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Facility</span>
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Facility Name</label>
            <input required type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea required value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" rows={3} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Image Upload</label>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            {formData.imageUrl && <p className="text-xs text-green-600 mt-1">Image ready: {formData.imageUrl.split('/').pop()}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setIsAdding(false); setEditId(null); setFormData({ title: '', description: '', imageUrl: '' }); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer">Cancel</button>
            <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition cursor-pointer">
              {editId ? 'Update Facility' : 'Save Facility'}
            </button>
          </div>
        </form>
      )}

      {/* All hostel facilities (editable & deletable) */}
      {!isLoading && facilities && facilities.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {facilities.map((facility: any) => (
            <div key={facility.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden group">
              <div className="h-48 bg-slate-100 relative">
                {facility.imageUrl ? (
                  <img src={facility.imageUrl} alt={facility.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    <ImageIcon className="w-12 h-12" />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => {
                      setEditId(facility.id);
                      setFormData({ title: facility.title, description: facility.description, imageUrl: facility.imageUrl || '' });
                      setIsAdding(true);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="p-2 bg-white/80 backdrop-blur-sm text-blue-500 rounded-full hover:bg-blue-50 cursor-pointer shadow-sm"
                    title="Edit Facility"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(facility.id)}
                    className="p-2 bg-white/80 backdrop-blur-sm text-red-500 rounded-full hover:bg-red-50 cursor-pointer shadow-sm"
                    title="Delete Facility"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-slate-800 mb-1">{facility.title}</h3>
                <p className="text-sm text-slate-500 line-clamp-2">{facility.description}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-slate-400 font-medium">No facilities available</div>
      )}
    </div>
  );
}
