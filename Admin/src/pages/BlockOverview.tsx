import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, ArrowLeft, Building2, User, Users, Plus, Trash2, Edit2, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AddBlockModal from './AddBlockModal';
import AddFloorModal from './AddFloorModal';
import AddRoomModal from './AddRoomModal';
import { toast } from 'sonner';

import { useAuthStore } from '../store/useAuthStore';

export default function BlockOverview() {
  const { role, allowedBlocks } = useAuthStore();
  const [selectedBlock, setSelectedBlock] = useState<any | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddFloorOpen, setIsAddFloorOpen] = useState(false);
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: rawBlocks, isLoading } = useQuery({
    queryKey: ['blocks-overview'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/blocks');
      if (!res.ok) throw new Error('Failed to fetch blocks');
      return res.json();
    }
  });

  const blocks = (rawBlocks || []).filter((b: any) => 
    role === 'CHIEF' || !allowedBlocks || allowedBlocks.includes('ALL') || allowedBlocks.includes(b.name)
  );

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`http://localhost:5000/api/blocks/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete block');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Block deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['blocks-overview'] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const updateRoomCapacityMutation = useMutation({
    mutationFn: async ({ roomId, newCapacity }: { roomId: string, newCapacity: number }) => {
      const res = await fetch(`http://localhost:5000/api/rooms/${roomId}/capacity`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newCapacity })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update capacity');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Room capacity updated');
      queryClient.invalidateQueries({ queryKey: ['blocks-overview'] });
    },
    onError: (err: any) => {
      toast.error(err.message);
    }
  });

  const deleteRoomMutation = useMutation({
    mutationFn: async (roomId: string) => {
      const res = await fetch(`http://localhost:5000/api/rooms/${roomId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete room');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Room deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['blocks-overview'] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  const deleteFloorMutation = useMutation({
    mutationFn: async (floorNum: number) => {
      if (!selectedBlock) return;
      const res = await fetch(`http://localhost:5000/api/blocks/${selectedBlock.id}/floors/${floorNum}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete floor');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Floor deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['blocks-overview'] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  const updateBlockPhotoMutation = useMutation({
    mutationFn: async ({ blockId, file }: { blockId: string, file: File }) => {
      const formData = new FormData();
      formData.append('photo', file);
      
      const uploadRes = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData
      });
      if (!uploadRes.ok) throw new Error('Failed to upload image');
      const { imageUrl } = await uploadRes.json();
      
      const res = await fetch(`http://localhost:5000/api/blocks/${blockId}/photo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl })
      });
      if (!res.ok) throw new Error('Failed to update block photo');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Block photo updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['blocks-overview'] });
    },
    onError: () => toast.error('Failed to update block photo')
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Calculate stats for a block
  const getBlockStats = (block: any) => {
    let totalCapacity = 0;
    let occupiedBeds = 0;
    let availableBeds = 0;

    block.rooms.forEach((room: any) => {
      totalCapacity += room.capacity;
      room.beds.forEach((bed: any) => {
        if (bed.status === 'OCCUPIED') occupiedBeds++;
        if (bed.status === 'AVAILABLE') availableBeds++;
      });
    });

    return { totalCapacity, occupiedBeds, availableBeds };
  };

  const activeBlock = selectedBlock ? blocks?.find((b: any) => b.id === selectedBlock.id) : null;

  const blockFloors = activeBlock 
    ? (Array.from(new Set(activeBlock.rooms.map((r: any) => r.floor))).filter((f) => Number(f) !== 0).sort() as number[])
    : [];

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <AnimatePresence>
              {activeBlock && (
                <motion.button 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  onClick={() => { setSelectedBlock(null); setSelectedFloor(null); }}
                  className="p-2 bg-white rounded-full shadow-sm hover:shadow-md hover:bg-slate-50 transition-all text-slate-600 border border-slate-200"
                >
                  <ArrowLeft className="w-5 h-5" />
                </motion.button>
              )}
            </AnimatePresence>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-800">
              {activeBlock ? activeBlock.name : 'Hostel Allocation'}
            </h2>
          </div>
          <p className="text-slate-500 font-medium mt-1 ml-1">
            {activeBlock ? 'Select a room and bed to manage allocation' : 'Select a hostel block to view layout'}
          </p>
        </div>
        
        {!activeBlock && (
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 hover:shadow-lg transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>Add Block</span>
          </button>
        )}
      </div>

      <AddBlockModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />

      <AnimatePresence mode="wait">
        {!activeBlock ? (
          // View 1: Block Cards
          <motion.div 
            key="blocks"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {blocks?.map((block: any) => {
              const stats = getBlockStats(block);
              const isGirls = block.gender === 'FEMALE';
              const themeColor = isGirls ? 'pink' : 'blue';
              
              return (
                <div 
                  key={block.id}
                  onClick={() => { 
                    setSelectedBlock(block); 
                    const floors = Array.from(new Set(block.rooms.map((r: any) => r.floor))).filter((f) => Number(f) !== 0).sort() as number[];
                    setSelectedFloor(floors[0] || 1); 
                  }}
                  className={`bg-white rounded-3xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-${themeColor}-100 hover:shadow-xl hover:-translate-y-1 cursor-pointer transition-all duration-300 group`}
                >
                  <div className="h-48 relative overflow-hidden bg-slate-100 group/image">
                    <div className={`absolute inset-0 bg-gradient-to-t ${isGirls ? 'from-pink-900/90 via-pink-900/30' : 'from-blue-900/90 via-blue-900/30'} to-transparent z-10 transition-opacity pointer-events-none`}></div>
                    <img 
                      src={block.imageUrl ? (block.imageUrl.startsWith('http') || block.imageUrl.startsWith('data:') ? block.imageUrl : `http://localhost:5000${block.imageUrl.startsWith('/') ? '' : '/'}${block.imageUrl}`) : "/bg.png"} 
                      className="w-full h-full object-cover pointer-events-none" 
                      alt="Hostel Building" 
                    />

                    <div className="absolute inset-0 flex flex-col justify-end p-6 z-20 text-white pointer-events-none">
                      <div className="absolute top-4 right-4 z-30 pointer-events-auto flex gap-2">
                        <label 
                          onClick={e => e.stopPropagation()}
                          className="p-2 bg-white/20 hover:bg-blue-500 rounded-full backdrop-blur-sm transition-all text-white cursor-pointer hover:scale-110 active:scale-95"
                          title="Upload Photo"
                        >
                          <Upload className="w-4 h-4" />
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                updateBlockPhotoMutation.mutate({ blockId: block.id, file });
                              }
                            }}
                          />
                        </label>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Are you sure you want to delete ${block.name}? This will permanently remove all rooms and beds.`)) {
                              deleteMutation.mutate(block.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          className="p-2 bg-white/20 hover:bg-red-500 rounded-full backdrop-blur-sm transition-colors text-white"
                          title="Delete Block"
                        >
                          {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                      <h3 className="text-2xl font-black">{block.name}</h3>
                      <p className="font-medium opacity-90 flex items-center mt-1">
                        <Building2 className="w-4 h-4 mr-2" /> {isGirls ? 'Girls Hostel' : 'Boys Hostel'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="p-6 space-y-5">
                    <div className="flex justify-between gap-2">
                      <div className="flex-1 text-center py-2 px-1 rounded-xl bg-slate-50 border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Capacity</p>
                        <p className="text-xl font-black text-slate-700 mt-0.5">{stats.totalCapacity}</p>
                      </div>
                      <div className="flex-1 text-center py-2 px-1 rounded-xl bg-emerald-50 border border-emerald-100">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Occupied</p>
                        <p className="text-xl font-black text-emerald-700 mt-0.5">{stats.occupiedBeds}</p>
                      </div>
                      <div className="flex-1 text-center py-2 px-1 rounded-xl bg-amber-50 border border-amber-100">
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Available</p>
                        <p className="text-xl font-black text-amber-700 mt-0.5">{stats.availableBeds}</p>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold mb-2">
                        <span className="text-slate-500">Occupancy Level</span>
                        <span className={`text-${themeColor}-600`}>{Math.round((stats.occupiedBeds / stats.totalCapacity) * 100) || 0}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full bg-gradient-to-r ${isGirls ? 'from-pink-400 to-rose-500' : 'from-blue-400 to-indigo-500'}`} 
                          style={{ width: `${Math.round((stats.occupiedBeds / stats.totalCapacity) * 100) || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        ) : (
          // View 2: Room Selection (Airline Style)
          <motion.div 
            key="allocation"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Legend & Floor Selector */}
            <div className="flex flex-col xl:flex-row justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200 gap-4">
              <div className="flex space-x-2 bg-slate-100 p-1.5 rounded-xl flex-wrap gap-y-2">
                {blockFloors.map((floorNum) => (
                  <button
                    key={floorNum}
                    onClick={() => setSelectedFloor(floorNum)}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                      selectedFloor === floorNum 
                        ? (selectedBlock.gender === 'FEMALE' ? 'bg-pink-500 text-white shadow-md shadow-pink-500/30' : 'bg-blue-600 text-white shadow-md shadow-blue-500/30')
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Floor {floorNum}
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-6 text-sm font-semibold">
                <div className="flex items-center"><div className="w-4 h-4 rounded-md bg-white border border-slate-200 shadow-sm mr-2"></div><span className="text-slate-600">Available</span></div>
                <div className="flex items-center"><div className="w-4 h-4 rounded-md bg-slate-200 border border-slate-300 mr-2"></div><span className="text-slate-600">Occupied</span></div>
                
                <div className="flex space-x-2 ml-auto">
                  <button 
                    onClick={() => setIsAddFloorOpen(true)}
                    className="flex items-center px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100 font-semibold"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Floor
                  </button>
                  {selectedFloor !== null && (
                    <button 
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete Floor ${selectedFloor} from ${activeBlock.name}? All unallocated rooms on this floor will be deleted.`)) {
                          deleteFloorMutation.mutate(selectedFloor);
                        }
                      }}
                      disabled={deleteFloorMutation.isPending}
                      className="flex items-center px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors border border-rose-100 font-semibold disabled:opacity-50"
                      title={`Delete Floor ${selectedFloor}`}
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> Delete Floor
                    </button>
                  )}
                  <button 
                    onClick={() => setIsAddRoomOpen(true)}
                    className="flex items-center px-3 py-1.5 bg-teal-50 text-teal-600 hover:bg-teal-100 rounded-lg transition-colors border border-teal-100 font-semibold"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Room
                  </button>
                </div>
              </div>
            </div>

            {/* Room Layout Grid */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm mt-6">
              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
                <Users className="w-5 h-5 mr-2 text-slate-400" />
                Floor Plan
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {activeBlock.rooms
                  .filter((r: any) => r.floor === selectedFloor)
                  .sort((a: any, b: any) => a.roomNo.localeCompare(b.roomNo, undefined, { numeric: true, sensitivity: 'base' }))
                  .map((room: any) => {
                  const isGirls = activeBlock.gender === 'FEMALE';
                  const themeFocus = isGirls ? 'focus:ring-pink-400' : 'focus:ring-blue-500';
                  
                  return (
                    <div key={room.id} className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200">
                      <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200">
                        <span className="font-bold text-slate-700">RM {room.roomNo}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold bg-white px-2 py-1 rounded border border-slate-200 text-slate-500">
                            {room.capacity} sharing
                          </span>
                          <button 
                            onClick={() => {
                              const val = window.prompt(`Edit capacity for Room ${room.roomNo}:`, room.capacity.toString());
                              if (val) {
                                const newCap = parseInt(val);
                                if (newCap > 0 && newCap <= 10) {
                                  updateRoomCapacityMutation.mutate({ roomId: room.id, newCapacity: newCap });
                                }
                              }
                            }}
                            className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 transition-colors"
                            title="Edit Capacity"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {room.beds.filter((b: any) => b.status === 'OCCUPIED').length === 0 && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete room ${room.roomNo}?`)) {
                                  deleteRoomMutation.mutate(room.id);
                                }
                              }}
                              className="p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-600 transition-colors"
                              title="Delete Room"
                              disabled={deleteRoomMutation.isPending}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Bed Seats */}
                      <div className="grid grid-cols-2 gap-3">
                        {room.beds.map((bed: any, index: number) => {
                          const isOccupied = bed.status === 'OCCUPIED';
                          
                          return (
                            <div 
                              key={bed.id}
                              className="relative group"
                              title={isOccupied ? 'Occupied' : 'Available'}
                            >
                              <button
                                disabled={isOccupied}
                                className={`w-full h-12 rounded-xl flex items-center justify-center font-bold text-sm transition-all duration-300 relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 ${themeFocus} ${
                                  isOccupied 
                                    ? 'bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed shadow-inner' 
                                    : `bg-white border-slate-200 text-slate-600 shadow-sm hover:scale-105 hover:shadow-md cursor-pointer border ${isGirls ? 'hover:border-pink-300' : 'hover:border-blue-300'}`
                                }`}
                              >
                                {isOccupied && <User className="w-5 h-5 opacity-40 absolute" />}
                                <span className={`z-10 ${isOccupied ? 'opacity-0' : 'opacity-100'}`}>B{index + 1}</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Infrastructure Modals */}
      {activeBlock && (
        <>
          <AddFloorModal 
            isOpen={isAddFloorOpen} 
            onClose={() => setIsAddFloorOpen(false)} 
            blockId={activeBlock.id} 
          />
          <AddRoomModal 
            isOpen={isAddRoomOpen} 
            onClose={() => setIsAddRoomOpen(false)} 
            blockId={activeBlock.id} 
            initialFloor={selectedFloor}
          />
        </>
      )}
    </div>
  );
}
