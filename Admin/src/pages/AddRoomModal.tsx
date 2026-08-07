import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, DoorOpen } from 'lucide-react';

export default function AddRoomModal({ isOpen, onClose, blockId, initialFloor }: { isOpen: boolean; onClose: () => void; blockId: string; initialFloor?: number | null }) {
  const [floor, setFloor] = useState(initialFloor || 1);
  const [roomNosInput, setRoomNosInput] = useState('');
  const [capacity, setCapacity] = useState(4);
  const queryClient = useQueryClient();

  const addRoomMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/blocks/${blockId}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to add room');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Room(s) added successfully!');
      queryClient.invalidateQueries({ queryKey: ['blocks-overview'] });
      setRoomNosInput('');
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNosInput.trim()) {
      toast.error('Room number(s) required');
      return;
    }
    const roomNos = Array.from(new Set(roomNosInput.split(',').map(s => s.trim()).filter(s => s.length > 0)));
    if (roomNos.length === 0) {
      toast.error('Invalid room numbers');
      return;
    }
    addRoomMutation.mutate({ floor, roomNos, capacity });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <DoorOpen className="w-5 h-5 mr-2 text-indigo-500" />
            Add Room(s)
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
            <label className="text-sm font-semibold text-slate-700">Room Number(s)</label>
            <input
              type="text"
              value={roomNosInput}
              onChange={(e) => setRoomNosInput(e.target.value)}
              placeholder="e.g. 105, 106, 107"
              className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
            <p className="text-xs text-slate-500">Separate multiple rooms with commas.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Bed Capacity</label>
            <input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(parseInt(e.target.value) || 1)}
              className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              min="1"
              max="4"
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
              disabled={addRoomMutation.isPending}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center"
            >
              {addRoomMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Add Room(s)
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
