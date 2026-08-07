import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Loader2, Search, Filter, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

interface AllocatedStudentsTableProps {
  onReallocate: (allocId: string, gender: 'FEMALE' | 'MALE', name: string) => void;
}

export default function AllocatedStudentsTable({ onReallocate }: AllocatedStudentsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: allocations, isLoading } = useQuery({
    queryKey: ['allocations'],
    queryFn: async () => {
      const res = await fetch('/api/allocations');
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    }
  });

  const filteredAllocations = allocations?.filter((alloc: any) => 
    alloc.application.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    alloc.application.usn.toLowerCase().includes(searchQuery.toLowerCase()) ||
    alloc.bed.room.block.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Table Header Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-slate-200/60 shadow-sm">
        <div>
          <h3 className="font-bold text-slate-700 text-lg">Detailed List View</h3>
        </div>
        
        <div className="flex w-full md:w-auto items-center space-x-3 bg-slate-50 p-1.5 rounded-full border border-slate-200">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search name, USN, or block..." 
              className="w-full pl-9 pr-4 py-2 bg-transparent text-sm font-semibold focus:outline-none placeholder:font-medium text-slate-700"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="p-2 bg-white rounded-full shadow-sm text-slate-500 hover:text-blue-600 transition-colors">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Gender</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Course</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Block & Room</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Bed</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" /></td>
                </tr>
              ) : filteredAllocations?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">No allocations found.</td>
                </tr>
              ) : (
                filteredAllocations?.map((alloc: any) => (
                  <motion.tr 
                    key={alloc.id} 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold mr-3 shadow-sm">
                          {alloc.application.studentName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{alloc.application.studentName}</p>
                          <p className="text-xs font-semibold text-slate-500">{alloc.application.usn}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-slate-700 text-sm">{alloc.application.gender}</td>
                    <td className="p-4 text-sm font-semibold text-slate-700">{alloc.application.department} - {alloc.application.yearSem}</td>
                    <td className="p-4">
                      <p className="font-bold text-indigo-700 text-sm">{alloc.bed.room.block.name}</p>
                      <p className="text-xs font-semibold text-slate-500">Room {alloc.bed.room.roomNo}</p>
                    </td>
                    <td className="p-4 font-black text-slate-700">
                      {alloc.bed.bedNo}
                    </td>
                    <td className="p-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="rounded-full font-bold text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                        onClick={() => onReallocate(alloc.id, alloc.application.gender, alloc.application.studentName)}
                      >
                        <RefreshCw className="w-3 h-3 mr-2" />
                        Reallocate
                      </Button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
