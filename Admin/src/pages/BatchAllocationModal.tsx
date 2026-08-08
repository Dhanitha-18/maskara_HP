import { API_BASE_URL } from '../lib/api';
import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface BatchAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: string[];
  gender: 'FEMALE' | 'MALE';
  onSuccess: () => void;
}

export default function BatchAllocationModal({ isOpen, onClose, selectedIds, gender, onSuccess }: BatchAllocationModalProps) {
  const [blockId, setBlockId] = useState<string>('');
  const [floor, setFloor] = useState<string>('');
  const [roomType, setRoomType] = useState<string>('');

  // Fetch all blocks with full room/bed data (real-time)
  const { data: blocks = [], isLoading } = useQuery({
    queryKey: ['blocks-batch-modal'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/blocks`);
      if (!res.ok) throw new Error('Failed to fetch blocks');
      return res.json();
    },
    refetchInterval: 30000,
    enabled: isOpen
  });

  const allocateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/allocate/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationIds: selectedIds, blockId, floor, roomType })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Allocation failed');
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.allocated < data.totalRequested) {
        toast.warning(`Allocated ${data.allocated} students. ${data.totalRequested - data.allocated} students were skipped due to missing beds.`);
      } else {
        toast.success(`Successfully allocated all ${data.allocated} students!`);
      }
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Allocation failed');
    }
  });

  const handleAllocate = () => {
    if (!blockId || !floor || !roomType) return toast.warning('Please select block, floor, and room type');
    allocateMutation.mutate();
  };

  // ── Filter: only blocks matching the selected student gender ────────────────
  const genderBlocks = useMemo(
    () => blocks.filter((b: any) => b.gender === gender || b.gender === gender.charAt(0) + gender.slice(1).toLowerCase()),
    [blocks, gender]
  );

  const selectedBlockObj = useMemo(
    () => genderBlocks.find((b: any) => b.id === blockId),
    [genderBlocks, blockId]
  );

  // ── Floors: only floors that have ≥1 available (non-OCCUPIED) bed ────────────
  const availableFloors = useMemo(() => {
    if (!selectedBlockObj?.rooms) return [];
    const floorSet = new Set<number>();
    for (const room of selectedBlockObj.rooms) {
      const hasAvailableBed = room.beds?.some((bed: any) => bed.status !== 'OCCUPIED');
      if (hasAvailableBed) {
        floorSet.add(Number(room.floor));
      }
    }
    return Array.from(floorSet).sort((a, b) => a - b);
  }, [selectedBlockObj]);

  // ── Room types: detect actual sharing types that have available beds ────────
  const availableRoomTypes = useMemo(() => {
    if (!selectedBlockObj?.rooms || !floor) return [];
    const typeSet = new Set<string>();
    for (const room of selectedBlockObj.rooms) {
      if (String(room.floor) !== floor) continue;
      const hasAvailableBed = room.beds?.some((bed: any) => bed.status !== 'OCCUPIED');
      if (!hasAvailableBed) continue;
      // Derive sharing label from capacity or room type string
      const sharing = room.capacity
        ? `${room.capacity} Sharing`
        : room.type?.includes('Sharing')
        ? room.type
        : room.type;
      if (sharing) typeSet.add(sharing);
    }
    return Array.from(typeSet).sort();
  }, [selectedBlockObj, floor]);

  const floorLabel = (n: number) =>
    n === 1 ? '1st Floor' : n === 2 ? '2nd Floor' : n === 3 ? '3rd Floor' : `${n}th Floor`;

  // Reset floor and roomType when block changes
  const handleBlockChange = (val: string) => {
    setBlockId(val);
    setFloor('');
    setRoomType('');
  };

  // Reset roomType when floor changes
  const handleFloorChange = (val: string) => {
    setFloor(val);
    setRoomType('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Batch Hostel Allocation</DialogTitle>
          <DialogDescription>
            Allocate {selectedIds.length} approved {gender.toLowerCase()} students automatically.
            The system will fill consecutive available beds.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
        ) : (
          <div className="grid gap-4 py-4">

            {/* Block — only matching gender blocks */}
            <div className="grid gap-2">
              <Label>Block <span className="text-xs text-muted-foreground">({gender} blocks only)</span></Label>
              <Select value={blockId} onValueChange={handleBlockChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a block" />
                </SelectTrigger>
                <SelectContent>
                  {genderBlocks.length === 0 ? (
                    <SelectItem value="__none__" disabled>No {gender.toLowerCase()} blocks found</SelectItem>
                  ) : (
                    genderBlocks.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Floor — only floors with available beds */}
            <div className="grid gap-2">
              <Label>
                Floor
                {blockId && availableFloors.length === 0 && (
                  <span className="ml-2 text-xs text-destructive font-semibold">No available beds in this block</span>
                )}
              </Label>
              <Select value={floor} onValueChange={handleFloorChange} disabled={!blockId}>
                <SelectTrigger>
                  <SelectValue placeholder={!blockId ? 'Select a block first' : 'Select floor'} />
                </SelectTrigger>
                <SelectContent>
                  {availableFloors.length === 0 ? (
                    <SelectItem value="__none__" disabled>No floors with available beds</SelectItem>
                  ) : (
                    availableFloors.map((f) => (
                      <SelectItem key={f} value={String(f)}>{floorLabel(f)}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Room Type — real types from selected block+floor */}
            <div className="grid gap-2">
              <Label>Room Type</Label>
              <Select value={roomType} onValueChange={setRoomType} disabled={!floor}>
                <SelectTrigger>
                  <SelectValue placeholder={!floor ? 'Select a floor first' : 'Select room type'} />
                </SelectTrigger>
                <SelectContent>
                  {/* Always offer "Any" as the first option */}
                  <SelectItem value="ANY">Any Room Type (Fill first available)</SelectItem>
                  {availableRoomTypes.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                  {availableRoomTypes.length === 0 && floor && (
                    <SelectItem value="__none__" disabled>No available rooms on this floor</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={allocateMutation.isPending}>Cancel</Button>
          <Button
            onClick={handleAllocate}
            disabled={allocateMutation.isPending || !blockId || !floor || !roomType}
          >
            {allocateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Allocate {selectedIds.length} Students
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
