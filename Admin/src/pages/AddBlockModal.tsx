import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Settings2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface AddBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function parseRoomRanges(input: string): string[] {
  if (!input || !input.trim()) return [];
  const parts = input.split(',').map(p => p.trim()).filter(Boolean);
  const rooms: string[] = [];

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map(s => s.trim());
      
      const startNum = parseInt(startStr);
      const endNum = parseInt(endStr);
      
      if (!isNaN(startNum) && !isNaN(endNum) && startNum <= endNum && endNum - startNum < 200) {
        for (let i = startNum; i <= endNum; i++) {
          rooms.push(i.toString());
        }
      } else {
        const startMatch = startStr.match(/^([A-Za-z]+)(\d+)$/);
        const endMatch = endStr.match(/^([A-Za-z]+)(\d+)$/);
        
        if (startMatch && endMatch && startMatch[1] === endMatch[1]) {
          const prefix = startMatch[1];
          const sNum = parseInt(startMatch[2]);
          const eNum = parseInt(endMatch[2]);
          if (!isNaN(sNum) && !isNaN(eNum) && sNum <= eNum && eNum - sNum < 200) {
            for (let i = sNum; i <= eNum; i++) {
              rooms.push(`${prefix}${i}`);
            }
          } else {
            rooms.push(part);
          }
        } else {
          rooms.push(part);
        }
      }
    } else {
      rooms.push(part);
    }
  }
  
  return Array.from(new Set(rooms));
}

export default function AddBlockModal({ isOpen, onClose }: AddBlockModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [gender, setGender] = useState('MALE');
  const [numFloors, setNumFloors] = useState(3);
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  const [floorConfigs, setFloorConfigs] = useState(
    Array.from({ length: 3 }).map((_, i) => ({ id: Math.random().toString(36).substring(2, 15), floor: i + 1, roomInput: `${i + 1}01-${i + 1}10`, capacity: 2 }))
  );

  const handleNumFloorsChange = (val: number) => {
    if (isNaN(val) || val < 1) val = 1;
    if (val > 20) val = 20; // safety limit
    setNumFloors(val);
    
    setFloorConfigs(prev => {
      // Find highest floor we currently have configs for
      const highestFloor = prev.length > 0 ? Math.max(...prev.map(c => c.floor)) : 0;
      
      let newConfigs = [...prev];
      
      // If we increased floors, add one default config for each new floor
      if (val > highestFloor) {
        for (let i = highestFloor + 1; i <= val; i++) {
          newConfigs.push({ id: Math.random().toString(36).substring(2, 15), floor: i, roomInput: `${i}01-${i}10`, capacity: 2 });
        }
      }
      
      // If we decreased floors, remove configs for floors beyond the new limit
      if (val < highestFloor) {
        newConfigs = newConfigs.filter(c => c.floor <= val);
      }
      
      return newConfigs;
    });
  };

  const addConfigForFloor = (floorNum: number) => {
    setFloorConfigs(prev => {
       const newConfig = { id: Math.random().toString(36).substring(2, 15), floor: floorNum, roomInput: `${floorNum}01`, capacity: 2 };
       const lastIndex = prev.map(c => c.floor).lastIndexOf(floorNum);
       const copy = [...prev];
       if (lastIndex >= 0) {
         copy.splice(lastIndex + 1, 0, newConfig);
       } else {
         copy.push(newConfig);
       }
       return copy;
    });
  };

  const updateFloorConfig = (id: string, field: string, value: any) => {
    setFloorConfigs(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const removeConfig = (id: string) => {
     setFloorConfigs(prev => prev.filter(c => c.id !== id));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      let imageUrl = null;
      if (imageFile) {
        const formData = new FormData();
        formData.append('photo', imageFile);
        const uploadRes = await fetch('http://localhost:5000/api/upload', {
          method: 'POST',
          body: formData
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          imageUrl = uploadData.imageUrl;
        }
      }

      // Backend expects an array of configs with parsed roomNumbers
      const sanitizedConfigs = floorConfigs.map(c => ({
        ...c,
        roomNumbers: parseRoomRanges(c.roomInput)
      })).filter(c => c.roomNumbers.length > 0);
      
      const res = await fetch('http://localhost:5000/api/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, gender, floorConfigs: sanitizedConfigs, imageUrl })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create block');
      return data;
    },
    onSuccess: () => {
      toast.success('Block created successfully!');
      queryClient.invalidateQueries({ queryKey: ['blocks-overview'] });
      queryClient.invalidateQueries({ queryKey: ['blocks'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create block');
    }
  });

  const handleCreate = () => {
    if (!name) return toast.warning('Block name is required');
    if (floorConfigs.length === 0) return toast.warning('At least one room configuration is required');
    mutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-slate-50">
        <DialogHeader className="p-6 bg-white border-b border-slate-100">
          <DialogTitle className="text-xl">Add New Hostel Block</DialogTitle>
          <DialogDescription>
            Configure the exact layout of rooms and sharing capacities for each floor.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 flex items-center">Basic Details</h3>
            <div className="flex gap-4">
              <div className="flex-[2]">
                <Label className="text-[10px] font-bold uppercase text-slate-500 mb-2 block">Block Name</Label>
                <input 
                  autoFocus
                  placeholder="e.g., A Block, Krishna Hostel..."
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all" 
                />
              </div>
              <div className="flex-1">
                <Label className="text-[10px] font-bold uppercase text-slate-500 mb-2 block">Gender</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger className="h-[46px] rounded-xl bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Boys</SelectItem>
                    <SelectItem value="FEMALE">Girls</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label className="text-[10px] font-bold uppercase text-slate-500 mb-2 block">Cover Photo (Optional)</Label>
              <input 
                type="file" 
                accept="image/*"
                onChange={e => setImageFile(e.target.files?.[0] || null)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all cursor-pointer"
              />
            </div>
            
            <div className="grid gap-2 mt-2">
              <Label>Number of Floors</Label>
              <input 
                type="number" 
                min="1" 
                max="20"
                value={numFloors} 
                onChange={e => handleNumFloorsChange(parseInt(e.target.value))} 
                className="w-full p-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" 
              />
            </div>
          </div>

          <div>
            <div className="flex items-center space-x-2 mb-4 text-slate-800">
              <Settings2 className="w-5 h-5" />
              <h3 className="font-bold">Floor Configurations</h3>
            </div>
            
            <div className="space-y-4">
              {Array.from({ length: numFloors }).map((_, idx) => {
                 const floorNum = idx + 1;
                 const configsForFloor = floorConfigs.filter(c => c.floor === floorNum);
                 
                 return (
                   <div key={floorNum} className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm transition-all hover:border-slate-300">
                     <div className="flex justify-between items-center mb-3">
                       <h4 className="font-extrabold text-slate-700 bg-slate-100 px-3 py-1 rounded-md">Floor {floorNum}</h4>
                       <button 
                         onClick={() => addConfigForFloor(floorNum)} 
                         className="text-xs font-bold text-blue-600 flex items-center hover:bg-blue-50 px-2 py-1.5 rounded-md transition-colors border border-transparent hover:border-blue-100"
                       >
                         <Plus className="w-3 h-3 mr-1" /> Add Room Type
                       </button>
                     </div>
                     
                     {configsForFloor.length === 0 && (
                       <div className="text-sm text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-dashed border-slate-200 text-center">
                         No rooms configured for this floor. This floor will be empty.
                       </div>
                     )}
                     
                     <div className="space-y-2">
                       {configsForFloor.map((config) => {
                          const parsedRooms = parseRoomRanges(config.roomInput);
                          return (
                          <div key={config.id} className="flex flex-col gap-2 p-3 bg-slate-50/80 rounded-lg border border-slate-100 group hover:border-slate-300 hover:bg-white transition-all">
                            <div className="flex items-start gap-3">
                              <div className="flex-[2]">
                                <Label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Room Numbers / Range</Label>
                                <input 
                                  type="text" 
                                  placeholder="e.g., 101-105, 108"
                                  value={config.roomInput} 
                                  onChange={e => updateFloorConfig(config.id, 'roomInput', e.target.value)} 
                                  className="w-full p-2.5 rounded-md border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none" 
                                />
                              </div>
                              <div className="flex-1">
                                <Label className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Capacity</Label>
                                <Select value={config.capacity.toString()} onValueChange={v => updateFloorConfig(config.id, 'capacity', parseInt(v))}>
                                  <SelectTrigger className="h-[42px] bg-white border-slate-200"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="1">1 Sharing</SelectItem>
                                    <SelectItem value="2">2 Sharing</SelectItem>
                                    <SelectItem value="3">3 Sharing</SelectItem>
                                    <SelectItem value="4">4 Sharing</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <button 
                                onClick={() => removeConfig(config.id)} 
                                className="mt-6 p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                title="Remove this room type"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            {parsedRooms.length > 0 ? (
                              <div className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded inline-block w-max">
                                {parsedRooms.length} room(s) detected
                              </div>
                            ) : (
                              <div className="text-xs font-medium text-red-500 bg-red-50 px-2 py-1 rounded inline-block w-max">
                                Invalid or empty range
                              </div>
                            )}
                          </div>
                          );
                       })}
                     </div>
                   </div>
                 );
              })}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 p-6 bg-white border-t border-slate-100 shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
          <button 
            onClick={handleCreate} 
            disabled={mutation.isPending}
            className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl flex items-center shadow-md shadow-blue-600/20 hover:bg-blue-700 hover:shadow-lg transition-all disabled:opacity-50"
          >
            {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Block
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
