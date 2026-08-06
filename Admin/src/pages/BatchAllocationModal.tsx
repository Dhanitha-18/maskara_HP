import { useState } from 'react';
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
  const [roomType, setRoomType] = useState<string>('MATCH_PREFERENCE');

  const { data: blocks = [], isLoading } = useQuery({
    queryKey: ['blocks'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/blocks');
      if (!res.ok) throw new Error('Failed to fetch blocks');
      return res.json();
    }
  });

  const allocateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('http://localhost:5000/api/allocate/batch', {
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
        toast.warning(`Allocated ${data.allocated} students. ${data.totalRequested - data.allocated} students were skipped due to missing beds or mismatched preferences.`);
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
    if (!blockId || !floor) return toast.warning('Please select block and floor');
    allocateMutation.mutate();
  };

  const selectedBlockObj = blocks.find((b: any) => b.id === blockId);
  const detectedFloors = Array.from(
    new Set(
      selectedBlockObj?.rooms
        ? selectedBlockObj.rooms.map((r: any) => Number(r.floor)).filter((f: number) => f > 0)
        : []
    )
  ).sort((a: any, b: any) => a - b);

  const floorsToRender = detectedFloors.length > 0
    ? Array.from({ length: Math.max(...detectedFloors, 3) }, (_, i) => i + 1)
    : [1, 2, 3, 4, 5];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Batch Hostel Allocation</DialogTitle>
          <DialogDescription>
            Allocate {selectedIds.length} approved students automatically. The system will fill consecutive available beds.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
           <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Block</Label>
              <Select value={blockId} onValueChange={setBlockId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a block" />
                </SelectTrigger>
                <SelectContent>
                  {blocks.filter((b: any) => b.gender === gender).map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{b.name} ({b.gender})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Floor</Label>
              <Select value={floor} onValueChange={setFloor}>
                <SelectTrigger>
                  <SelectValue placeholder="Select floor" />
                </SelectTrigger>
                <SelectContent>
                  {floorsToRender.map((flNum) => {
                    const label = flNum === 1 ? '1st Floor' : flNum === 2 ? '2nd Floor' : flNum === 3 ? '3rd Floor' : `${flNum}th Floor`;
                    return <SelectItem key={flNum} value={String(flNum)}>{label}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Room Type</Label>
              <Select value={roomType} onValueChange={setRoomType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select room type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MATCH_PREFERENCE">Match Student Preference</SelectItem>
                  <SelectItem value="ANY">Any Room Type (Ignore Preference)</SelectItem>
                  <SelectItem value="2 Sharing">Force 2 Sharing</SelectItem>
                  <SelectItem value="3 Sharing">Force 3 Sharing</SelectItem>
                  <SelectItem value="4 Sharing">Force 4 Sharing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={allocateMutation.isPending}>Cancel</Button>
          <Button onClick={handleAllocate} disabled={allocateMutation.isPending || !blockId || !floor}>
            {allocateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Allocate Students
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
