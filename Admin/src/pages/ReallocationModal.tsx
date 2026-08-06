import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../store/useAuthStore';

interface ReallocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  allocationId: string;
  gender: 'FEMALE' | 'MALE';
  studentName: string;
}

export default function ReallocationModal({ isOpen, onClose, allocationId, gender, studentName }: ReallocationModalProps) {
  const queryClient = useQueryClient();
  const adminName = useAuthStore((state) => state.name) || 'Super Admin';
  const [blockId, setBlockId] = useState<string>('');
  const [floor, setFloor] = useState<string>('');
  const [roomId, setRoomId] = useState<string>('');
  const [bedId, setBedId] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  const { data: blocks = [], isLoading: loadingBlocks } = useQuery({
    queryKey: ['blocks'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/blocks');
      if (!res.ok) throw new Error('Failed to fetch blocks');
      return res.json();
    },
    enabled: isOpen
  });

  const reallocateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('http://localhost:5000/api/reallocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allocationId, newBedId: bedId, adminName, reason })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Reallocation failed');
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidate all relevant query caches so admin portal reflects changes everywhere
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      queryClient.invalidateQueries({ queryKey: ['blocks'] });
      queryClient.invalidateQueries({ queryKey: ['occupancy'] });
      queryClient.invalidateQueries({ queryKey: ['applications_all'] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast.success(`Successfully reallocated bed for ${studentName}!`);
      // Reset form fields
      setBlockId('');
      setFloor('');
      setRoomId('');
      setBedId('');
      setReason('');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Reallocation failed');
    }
  });

  const handleReallocate = () => {
    if (!bedId) return toast.warning('Please select a new bed');
    reallocateMutation.mutate();
  };

  const selectedBlock = blocks.find((b: any) => b.id === blockId);

  // Available floors for selected block
  const availableFloors = selectedBlock?.rooms ? Array.from(new Set(selectedBlock.rooms.map((r: any) => Number(r.floor)))).sort((a: any, b: any) => a - b) : [];

  // Filtered rooms by selected block and selected floor
  const availableRooms = selectedBlock?.rooms ? selectedBlock.rooms.filter((r: any) => floor !== '' ? Number(r.floor) === Number(floor) : true) : [];

  const selectedRoom = availableRooms.find((r: any) => r.id === roomId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reallocate Student Bed</DialogTitle>
          <DialogDescription>
            Reallocate <b>{studentName}</b> to a new block, floor, room, and bed.
          </DialogDescription>
        </DialogHeader>
        
        {loadingBlocks ? (
           <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Reason for Reallocation (Optional)</Label>
              <input 
                type="text" 
                value={reason} 
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Room maintenance, request..."
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* 1. Select Block */}
            <div className="grid gap-2">
              <Label>Select Block</Label>
              <Select value={blockId} onValueChange={(val) => { setBlockId(val); setFloor(''); setRoomId(''); setBedId(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select block..." />
                </SelectTrigger>
                <SelectContent>
                  {blocks.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} {b.gender ? `(${b.gender})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 2. Select Floor */}
            <div className="grid gap-2">
              <Label>Select Floor</Label>
              <Select value={floor} onValueChange={(val) => { setFloor(val); setRoomId(''); setBedId(''); }} disabled={!blockId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select floor..." />
                </SelectTrigger>
                <SelectContent>
                  {availableFloors.length > 0 ? (
                    availableFloors.map((fl: any) => (
                      <SelectItem key={fl} value={String(fl)}>
                        {fl === 0 ? 'Ground Floor (0)' : `Floor ${fl}`}
                      </SelectItem>
                    ))
                  ) : (
                    [0, 1, 2, 3, 4].map((fl) => (
                      <SelectItem key={fl} value={String(fl)}>
                        {fl === 0 ? 'Ground Floor (0)' : `Floor ${fl}`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            
            {/* 3. Select Room */}
            <div className="grid gap-2">
              <Label>Select Room</Label>
              <Select value={roomId} onValueChange={(val) => { setRoomId(val); setBedId(''); }} disabled={!blockId || floor === ''}>
                <SelectTrigger>
                  <SelectValue placeholder="Select room..." />
                </SelectTrigger>
                <SelectContent>
                  {[...availableRooms]
                    .sort((a, b) => a.roomNo.localeCompare(b.roomNo, undefined, { numeric: true, sensitivity: 'base' }))
                    .map((r: any) => (
                      <SelectItem key={r.id} value={r.id}>
                        Room {r.roomNo} ({r.type})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* 4. Select Bed */}
            <div className="grid gap-2">
              <Label>Select Bed</Label>
              <Select value={bedId} onValueChange={setBedId} disabled={!roomId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select available bed..." />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const available = (selectedRoom?.beds || [])
                      .filter((b: any) => b.status === 'AVAILABLE')
                      .sort((a: any, b: any) => Number(a.bedNo) - Number(b.bedNo));
                    if (available.length === 0) {
                      return <SelectItem value="none" disabled>No beds available</SelectItem>;
                    }
                    return available.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>Bed {b.bedNo}</SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>

            <Button 
              className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl shadow-md" 
              onClick={handleReallocate}
              disabled={!bedId || bedId === 'none' || reallocateMutation.isPending}
            >
              {reallocateMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : null}
              Confirm Reallocation
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
