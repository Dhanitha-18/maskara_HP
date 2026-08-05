import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../store/useAuthStore';

interface AllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  gender: 'FEMALE' | 'MALE';
  studentName: string;
}

export default function AllocationModal({ isOpen, onClose, applicationId, gender, studentName }: AllocationModalProps) {
  const queryClient = useQueryClient();
  const adminName = useAuthStore((state) => state.name) || 'Super Admin';
  const [blockId, setBlockId] = useState<string>('');
  const [floor, setFloor] = useState<string>('');
  const [roomId, setRoomId] = useState<string>('');
  const [bedId, setBedId] = useState<string>('');

  const { data: blocks = [], isLoading: loadingBlocks } = useQuery({
    queryKey: ['blocks'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/blocks');
      if (!res.ok) throw new Error('Failed to fetch blocks');
      return res.json();
    },
    enabled: isOpen
  });

  const allocateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('http://localhost:5000/api/allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, bedId, adminName })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Allocation failed');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(`Successfully allocated bed for ${studentName}!`);
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['applications_all'] });
      queryClient.invalidateQueries({ queryKey: ['blocks'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      handleResetModal();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Allocation failed');
    }
  });

  // Selected Block
  const selectedBlock = blocks.find((b: any) => b.id === blockId);

  // Available Floors in selected block
  const availableFloors = useMemo(() => {
    if (!selectedBlock?.rooms) return [];
    const floors = Array.from(new Set(selectedBlock.rooms.map((r: any) => r.floor)))
      .filter((f) => f !== undefined && f !== null && Number(f) !== 0)
      .sort((a: any, b: any) => a - b);
    return floors;
  }, [selectedBlock]);

  const getFloorLabel = (flr: number | string) => {
    const fNum = Number(flr);
    if (fNum === 0) return 'Ground Floor';
    if (fNum === 1) return 'First Floor';
    if (fNum === 2) return 'Second Floor';
    if (fNum === 3) return 'Third Floor';
    if (fNum === 4) return 'Fourth Floor';
    if (fNum === 5) return 'Fifth Floor';
    if (fNum === 6) return 'Sixth Floor';
    if (fNum === 7) return 'Seventh Floor';
    if (fNum === 8) return 'Eighth Floor';
    if (fNum === 9) return 'Ninth Floor';
    if (fNum === 10) return 'Tenth Floor';
    return `Floor ${flr}`;
  };

  // Available Rooms on selected floor (hiding fully occupied rooms)
  const availableRooms = useMemo(() => {
    if (!selectedBlock?.rooms || floor === '') return [];
    const filtered = selectedBlock.rooms.filter((r: any) => {
      if (String(r.floor) !== String(floor)) return false;
      // Must have at least one available bed
      const hasAvailableBed = r.beds?.some((b: any) => b.status === 'AVAILABLE');
      return hasAvailableBed;
    });
    return [...filtered].sort((a, b) =>
      a.roomNo.localeCompare(b.roomNo, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [selectedBlock, floor]);

  const selectedRoom = availableRooms.find((r: any) => r.id === roomId);

  // Available Beds in selected room (occupied beds NEVER shown)
  const availableBeds = useMemo(() => {
    if (!selectedRoom?.beds) return [];
    const filteredBeds = selectedRoom.beds.filter((b: any) => b.status === 'AVAILABLE');
    return [...filteredBeds].sort((a, b) => Number(a.bedNo) - Number(b.bedNo));
  }, [selectedRoom]);

  const handleAllocate = () => {
    if (!blockId) return toast.warning('Please select a Block');
    if (floor === '') return toast.warning('Please select a Floor');
    if (!roomId) return toast.warning('Please select a Room');
    if (!bedId) return toast.warning('Please select a Bed');
    allocateMutation.mutate();
  };

  const handleResetModal = () => {
    setBlockId('');
    setFloor('');
    setRoomId('');
    setBedId('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleResetModal()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Allocate Bed</DialogTitle>
          <DialogDescription>
            Allocate a bed for <b>{studentName}</b>.
          </DialogDescription>
        </DialogHeader>
        
        {loadingBlocks ? (
          <div className="flex justify-center p-4"><Loader2 className="animate-spin text-blue-600" /></div>
        ) : (
          <div className="grid gap-4 py-4">
            {/* Step 1: Block */}
            <div className="grid gap-2">
              <Label className="font-bold text-xs text-slate-700">Block (Filtered by Gender: {gender})</Label>
              <Select 
                value={blockId} 
                onValueChange={(val) => { 
                  setBlockId(val); 
                  setFloor(''); 
                  setRoomId(''); 
                  setBedId(''); 
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a block" />
                </SelectTrigger>
                <SelectContent>
                  {blocks.filter((b: any) => !b.gender || String(b.gender).toUpperCase() === String(gender).toUpperCase()).map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Step 2: Floor */}
            <div className="grid gap-2">
              <Label className="font-bold text-xs text-slate-700">Floor</Label>
              <Select 
                value={floor} 
                onValueChange={(val) => { 
                  setFloor(val); 
                  setRoomId(''); 
                  setBedId(''); 
                }}
                disabled={!blockId}
              >
                <SelectTrigger className="disabled:bg-slate-100 disabled:cursor-not-allowed">
                  <SelectValue placeholder={blockId ? "Select a floor" : "Select block first"} />
                </SelectTrigger>
                <SelectContent>
                  {availableFloors.map((flr: any) => (
                    <SelectItem key={String(flr)} value={String(flr)}>
                      {getFloorLabel(flr)}
                    </SelectItem>
                  ))}
                  {availableFloors.length === 0 && (
                    <SelectItem value="none" disabled>No floors available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Step 3: Room */}
            <div className="grid gap-2">
              <Label className="font-bold text-xs text-slate-700">Room</Label>
              <Select 
                value={roomId} 
                onValueChange={(val) => { 
                  setRoomId(val); 
                  setBedId(''); 
                }} 
                disabled={floor === ''}
              >
                <SelectTrigger className="disabled:bg-slate-100 disabled:cursor-not-allowed">
                  <SelectValue placeholder={floor !== '' ? "Select a room" : "Select floor first"} />
                </SelectTrigger>
                <SelectContent>
                  {availableRooms.map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>
                      Room {r.roomNo} ({r.type || '2 Sharing'})
                    </SelectItem>
                  ))}
                  {availableRooms.length === 0 && (
                    <SelectItem value="none" disabled>No available rooms on this floor</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Step 4: Bed */}
            <div className="grid gap-2">
              <Label className="font-bold text-xs text-slate-700">Bed</Label>
              <Select 
                value={bedId} 
                onValueChange={setBedId} 
                disabled={!roomId}
              >
                <SelectTrigger className="disabled:bg-slate-100 disabled:cursor-not-allowed">
                  <SelectValue placeholder={roomId ? "Select an available bed" : "Select room first"} />
                </SelectTrigger>
                <SelectContent>
                  {availableBeds.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>Bed {b.bedNo}</SelectItem>
                  ))}
                  {availableBeds.length === 0 && (
                    <SelectItem value="none" disabled>No beds available in this room</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Confirm Allocation Button */}
            <Button 
              className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold" 
              onClick={handleAllocate}
              disabled={!blockId || floor === '' || !roomId || !bedId || allocateMutation.isPending}
            >
              {allocateMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : null}
              Confirm Allocation
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
