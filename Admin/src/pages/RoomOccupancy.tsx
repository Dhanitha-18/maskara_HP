import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Building, Users, Bed, DoorOpen, Search, Hash, Fingerprint, GraduationCap, Loader2, BedDouble, CheckCircle, Filter, RefreshCw, LayoutGrid, List, User as UserIcon } from 'lucide-react';
import ReallocationModal from './ReallocationModal';
import AllocatedStudentsTable from './AllocatedStudentsTable';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { useAuthStore } from '../store/useAuthStore';

export default function RoomOccupancy() {
  const { role, allowedBlocks } = useAuthStore();
  const [viewMode, setViewMode] = useState<'VISUAL' | 'LIST'>('VISUAL');
  const { data: rawBlocks = [], isLoading } = useQuery({
    queryKey: ['occupancy'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/occupancy');
      if (!res.ok) throw new Error('Failed to fetch occupancy data');
      return res.json();
    }
  });

  const blocks = (Array.isArray(rawBlocks) ? rawBlocks : rawBlocks?.blocks || []).filter((b: any) => 
    role === 'CHIEF' || !allowedBlocks || allowedBlocks.includes('ALL') || allowedBlocks.includes(b.name)
  );

  // Filter States
  const [hostelType, setHostelType] = useState('ALL');
  const [blockFilter, setBlockFilter] = useState('ALL');
  const [floorFilter, setFloorFilter] = useState('ALL');
  const [occupancyFilter, setOccupancyFilter] = useState('ALL');
  
  const [roomSearch, setRoomSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [idSearch, setIdSearch] = useState('');
  const [deptSearch, setDeptSearch] = useState('');
  const [yearSearch, setYearSearch] = useState('ALL');

  const [reallocationModal, setReallocationModal] = useState<{isOpen: boolean, allocId: string, gender: 'FEMALE'|'MALE', name: string} | null>(null);

  // Flattened Data and Stats
  const { flatRooms, stats } = useMemo(() => {
    let totalBlocks = blocks.length;
    let totalRooms = 0;
    let occupiedRooms = 0;
    let availableRooms = 0;
    let studentsAllocated = 0;
    let vacantBeds = 0;

    let allRooms: any[] = [];

    blocks.forEach((block: any) => {
      block.rooms.forEach((room: any) => {
        totalRooms++;
        
        let occupiedBedsInRoom = 0;
        let studentsInRoom: any[] = [];
        
        room.beds.forEach((bed: any) => {
          if (bed.status === 'OCCUPIED' && bed.allocation) {
            occupiedBedsInRoom++;
            studentsAllocated++;
            studentsInRoom.push({
              bedNo: bed.bedNo,
              allocationId: bed.allocation.id,
              ...bed.allocation.application
            });
          } else {
            vacantBeds++;
          }
        });

        if (occupiedBedsInRoom === room.capacity) {
          occupiedRooms++;
        } else {
          availableRooms++;
        }

        allRooms.push({
          ...room,
          blockName: block.name,
          blockGender: block.gender,
          occupiedBedsInRoom,
          studentsInRoom
        });
      });
    });

    return {
      flatRooms: allRooms,
      stats: { totalBlocks, totalRooms, occupiedRooms, availableRooms, studentsAllocated, vacantBeds }
    };
  }, [blocks]);

  // Dynamic list of all floors available in database for the selected block
  const allFloors = useMemo(() => {
    const floorsSet = new Set<number>();
    flatRooms.forEach(room => {
      // If a specific block is selected, filter floors only for that block
      if (blockFilter !== 'ALL' && room.blockId !== blockFilter) {
        return;
      }
      if (room.floor !== undefined && room.floor !== null && Number(room.floor) !== 0) {
        floorsSet.add(Number(room.floor));
      }
    });
    return Array.from(floorsSet).sort((a, b) => a - b);
  }, [flatRooms, blockFilter]);

  // Reset floor filter when changing blocks if selected floor doesn't exist in new block
  useEffect(() => {
    if (floorFilter !== 'ALL' && !allFloors.includes(Number(floorFilter))) {
      setFloorFilter('ALL');
    }
  }, [allFloors, floorFilter]);

  // Apply Filters and Sort Rooms Numerically
  const filteredRooms = useMemo(() => {
    return flatRooms.filter(room => {
      if (hostelType !== 'ALL' && room.blockGender !== hostelType) return false;
      if (blockFilter !== 'ALL' && room.blockId !== blockFilter) return false;
      if (floorFilter !== 'ALL' && room.floor.toString() !== floorFilter) return false;
      if (occupancyFilter === 'FULLY_OCCUPIED' && room.occupiedBedsInRoom !== room.capacity) return false;
      if (occupancyFilter === 'FULLY_VACANT' && room.occupiedBedsInRoom !== 0) return false;
      if (occupancyFilter === 'PARTIALLY_VACANT' && (room.occupiedBedsInRoom === 0 || room.occupiedBedsInRoom === room.capacity)) return false;
      if (roomSearch && !room.roomNo.toLowerCase().includes(roomSearch.toLowerCase())) return false;

      if (studentSearch || idSearch || deptSearch || yearSearch !== 'ALL') {
        const hasMatchingStudent = room.studentsInRoom.some((s: any) => {
          if (studentSearch && !s.studentName?.toLowerCase().includes(studentSearch.toLowerCase())) return false;
          if (idSearch && !s.usn?.toLowerCase().includes(idSearch.toLowerCase())) return false;
          if (deptSearch && !s.department?.toLowerCase().includes(deptSearch.toLowerCase())) return false;
          if (yearSearch !== 'ALL' && s.yearSem !== yearSearch) return false;
          return true;
        });
        if (!hasMatchingStudent) return false;
      }

      return true;
    }).sort((a: any, b: any) => a.roomNo.localeCompare(b.roomNo, undefined, { numeric: true, sensitivity: 'base' }));
  }, [flatRooms, hostelType, blockFilter, floorFilter, occupancyFilter, roomSearch, studentSearch, idSearch, deptSearch, yearSearch]);

  const statCards = [
    { title: 'Total Hostel Blocks', value: stats.totalBlocks, icon: Building, colorBase: 'blue' },
    { title: 'Total Rooms', value: stats.totalRooms, icon: DoorOpen, colorBase: 'indigo' },
    { title: 'Full Rooms', value: stats.occupiedRooms, icon: CheckCircle, colorBase: 'emerald' },
    { title: 'Available Rooms', value: stats.availableRooms, icon: BedDouble, colorBase: 'amber' },
    { title: 'Total Students', value: stats.studentsAllocated, icon: Users, colorBase: 'blue' },
    { title: 'Vacant Beds', value: stats.vacantBeds, icon: Bed, colorBase: 'amber' },
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue': return { border: 'border-b-blue-500', shadow: 'hover:shadow-blue-500/20', text: 'text-blue-600', iconBg: 'from-blue-50 to-blue-100' };
      case 'indigo': return { border: 'border-b-indigo-500', shadow: 'hover:shadow-indigo-500/20', text: 'text-indigo-600', iconBg: 'from-indigo-50 to-indigo-100' };
      case 'emerald': return { border: 'border-b-emerald-500', shadow: 'hover:shadow-emerald-500/20', text: 'text-emerald-600', iconBg: 'from-emerald-50 to-emerald-100' };
      case 'amber': return { border: 'border-b-amber-500', shadow: 'hover:shadow-amber-500/20', text: 'text-amber-600', iconBg: 'from-amber-50 to-amber-100' };
      default: return { border: 'border-b-slate-500', shadow: 'hover:shadow-slate-500/20', text: 'text-slate-600', iconBg: 'from-slate-50 to-slate-100' };
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* ... header ... */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-800">Room Occupancy & Allocations</h2>
          <p className="text-slate-500 font-medium mt-1">Manage and view detailed resident allocations across all blocks.</p>
        </div>
        <div className="bg-slate-100 p-1.5 rounded-xl border border-slate-200 flex items-center">
          <button 
            onClick={() => setViewMode('VISUAL')}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'VISUAL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <LayoutGrid className="w-4 h-4 mr-2" /> Live Layout
          </button>
          <button 
            onClick={() => setViewMode('LIST')}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'LIST' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <List className="w-4 h-4 mr-2" /> Data Table
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, idx) => {
          const colors = getColorClasses(stat.colorBase);
          return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/80 backdrop-blur-md border border-slate-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden border-b-4 ${colors.border} ${colors.shadow}`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  {stat.title}
                </p>
                <h3 className={`text-4xl font-black ${colors.text}`}>
                  {stat.value}
                </h3>
              </div>
              <div className={`p-4 rounded-2xl shadow-inner bg-gradient-to-br ${colors.iconBg} ${colors.text}`}>
                <stat.icon className="w-7 h-7" />
              </div>
            </div>
          </motion.div>
        )})}
      </div>

      {viewMode === 'LIST' ? (
        <AllocatedStudentsTable onReallocate={(allocId, gender, name) => setReallocationModal({ isOpen: true, allocId, gender, name })} />
      ) : (
        <>
          {/* Filters Section */}
          <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 mb-2">
          <Filter className="w-5 h-5 text-indigo-500" />
          <h3 className="font-bold text-slate-700 text-lg">Advanced Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hostel Type</label>
            <select className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none" value={hostelType} onChange={e => setHostelType(e.target.value)}>
              <option value="ALL">All Types</option>
              <option value="FEMALE">Girls</option>
              <option value="MALE">Boys</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Block</label>
            <select className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none" value={blockFilter} onChange={e => setBlockFilter(e.target.value)}>
              <option value="ALL">All Blocks</option>
              {blocks.filter((b: any) => hostelType === 'ALL' || b.gender === hostelType).map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Floor</label>
            <select className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none" value={floorFilter} onChange={e => setFloorFilter(e.target.value)}>
              <option value="ALL">All Floors</option>
              {allFloors.map(floorNum => (
                <option key={floorNum} value={floorNum.toString()}>
                  {floorNum === 1 ? '1st Floor' : floorNum === 2 ? '2nd Floor' : floorNum === 3 ? '3rd Floor' : `${floorNum}th Floor`}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Occupancy Status</label>
            <select className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none" value={occupancyFilter} onChange={e => setOccupancyFilter(e.target.value)}>
              <option value="ALL">All Status</option>
              <option value="FULLY_OCCUPIED">Fully Occupied</option>
              <option value="FULLY_VACANT">Fully Vacant</option>
              <option value="PARTIALLY_VACANT">Partially Vacant</option>
            </select>
          </div>
          
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input placeholder="Search Room No..." className="pl-9 w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none" value={roomSearch} onChange={e => setRoomSearch(e.target.value)} />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input placeholder="Search Student Name..." className="pl-9 w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
          </div>
          <div className="relative">
            <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input placeholder="Search USN / ID..." className="pl-9 w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none" value={idSearch} onChange={e => setIdSearch(e.target.value)} />
          </div>
          <div className="relative">
            <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input placeholder="Search Department..." className="pl-9 w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none" value={deptSearch} onChange={e => setDeptSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Results Grid */}
      <div className="space-y-4">
        <h3 className="font-bold text-slate-700 text-lg flex items-center">
          Showing {filteredRooms.length} Rooms
        </h3>
        
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredRooms.map((room: any) => {

            return (
              <motion.div 
                key={room.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
              >
                {/* Room Header */}
                <div className={`p-4 flex justify-between items-center border-b ${room.blockGender === 'FEMALE' ? 'bg-rose-50/50 border-rose-100' : 'bg-blue-50/50 border-blue-100'}`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner font-black text-lg ${room.blockGender === 'FEMALE' ? 'bg-gradient-to-br from-rose-100 to-pink-100 text-rose-700' : 'bg-gradient-to-br from-blue-100 to-cyan-100 text-blue-700'}`}>
                      {room.roomNo}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-lg">{room.blockName}</h4>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Floor {room.floor} • {room.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-sm border ${room.blockGender === 'FEMALE' ? 'bg-rose-100/50 border-rose-200 text-rose-700' : 'bg-blue-100/50 border-blue-200 text-blue-700'}`}>
                      {room.occupiedBedsInRoom} / {room.capacity} Occupied
                    </div>
                  </div>
                </div>

                {/* Residents Bus Layout */}
                <div className="p-4 flex-1 bg-slate-50/50">
                  <div className="grid grid-cols-2 gap-4">
                    {Array.from({ length: room.capacity }).map((_, index) => {
                      const bedNo = index + 1;
                      const student = room.studentsInRoom.find((s: any) => s.bedNo === bedNo);

                      if (student) {
                        const isGirl = room.blockGender === 'FEMALE';
                        return (
                          <Popover key={`bed-${bedNo}`}>
                            <PopoverTrigger asChild>
                              <button className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 shadow-sm hover:shadow-md transition-all group h-24 ${isGirl ? 'border-rose-200 bg-rose-50 hover:border-rose-300 hover:bg-rose-100' : 'border-blue-200 bg-blue-50 hover:border-blue-300 hover:bg-blue-100'}`}>
                                <div className={`absolute top-2 left-2 text-[10px] font-black bg-white px-1.5 py-0.5 rounded-md shadow-sm ${isGirl ? 'text-rose-400' : 'text-blue-400'}`}>B{bedNo}</div>
                                <UserIcon className={`w-6 h-6 mb-1 ${isGirl ? 'text-rose-600' : 'text-blue-600'}`} />
                                <span className="text-xs font-bold text-slate-700 truncate w-full text-center px-2">{student.studentName.split(' ')[0]}</span>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 p-0 rounded-3xl overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border-slate-100/60 bg-white/95 backdrop-blur-xl">
                              <div className={`p-5 text-white ${isGirl ? 'bg-gradient-to-r from-rose-500 to-pink-500' : 'bg-gradient-to-r from-blue-500 to-cyan-500'}`}>
                                <h4 className="font-bold text-lg">{student.studentName}</h4>
                                <p className="text-white/80 text-sm font-medium">{student.usn}</p>
                              </div>
                              <div className="p-4 space-y-3 bg-white">
                                <div className="flex items-center text-sm">
                                  <GraduationCap className="w-4 h-4 mr-2 text-slate-400" />
                                  <span className="font-semibold text-slate-700">{student.department} • Semester {student.yearSem}</span>
                                </div>
                                <div className="flex items-center justify-between mt-2 pt-3 border-t border-slate-100">
                                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bed {student.bedNo}</span>
                                  <button
                                    onClick={() => setReallocationModal({
                                      isOpen: true,
                                      allocId: student.allocationId,
                                      gender: student.gender,
                                      name: student.studentName
                                    })}
                                    className={`flex items-center text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${isGirl ? 'text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100' : 'text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100'}`}
                                  >
                                    <RefreshCw className="w-3 h-3 mr-1.5" />
                                    Reallocate
                                  </button>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        );
                      } else {
                        return (
                          <div key={`bed-${bedNo}`} className="relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-100/50 opacity-60 h-24">
                            <div className="absolute top-2 left-2 text-[10px] font-black text-slate-400 bg-white/50 px-1.5 py-0.5 rounded-md">B{bedNo}</div>
                            <Bed className="w-6 h-6 text-slate-400 mb-1" />
                            <span className="text-xs font-semibold text-slate-500 italic">Available</span>
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
      </>
      )}

      {reallocationModal && (
        <ReallocationModal
          isOpen={reallocationModal.isOpen}
          onClose={() => setReallocationModal(null)}
          allocationId={reallocationModal.allocId}
          gender={reallocationModal.gender}
          studentName={reallocationModal.name}
        />
      )}
    </div>
  );
}
