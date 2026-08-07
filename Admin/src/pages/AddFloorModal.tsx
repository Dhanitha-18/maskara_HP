import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Layers } from 'lucide-react';

export default function AddFloorModal({ isOpen, onClose, blockId }: { isOpen: boolean; onClose: () => void; blockId: string }) {
  const [floor, setFloor] = useState(4);
  const [numberOfRooms, setNumberOfRooms] = useState(10);
  const [capacityPerRoom, setCapacityPerRoom] = useState(4);
  const queryClient = useQueryClient();

  const addFloorMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/blocks/${blockId}/floors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to add floor');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Floor added successfully!');
      queryClient.invalidateQueries({ queryKey: ['blocks-overview'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addFloorMutation.mutate({ floor, numberOfRooms, capacityPerRoom });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <Layers className="w-5 h-5 mr-2 text-indigo-500" />
            Add New Floor
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Floor Number</label>
            <input
              type="number"
              value={floor}
              onChange={(e) => setFloor(parseInt(e.target.value) || 1)}
              className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Number of Rooms to Generate</label>
            <input
              type="number"
              value={numberOfRooms}
              onChange={(e) => setNumberOfRooms(parseInt(e.target.value) || 1)}
              className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              min="1"
              max="50"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Beds Per Room</label>
            <input
              type="number"
              value={capacityPerRoom}
              onChange={(e) => setCapacityPerRoom(parseInt(e.target.value) || 1)}
              className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              min="1"
              max="10"
              required
            />
          </div>
          <DialogFooter className="mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addFloorMutation.isPending}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center"
            >
              {addFloorMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Generate Floor
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
