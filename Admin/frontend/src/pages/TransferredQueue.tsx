import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, ChevronDown, CheckCircle, Search, Filter, FileText, Download, Printer, User, Users, BedDouble, ExternalLink, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import BatchAllocationModal from './BatchAllocationModal';
import { API_BASE_URL } from '../lib/api';

const getPhotoUrl = (url: string) => {
  if (!url) return '';
  return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
};

export default function TransferredQueue() {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectCount, setSelectCount] = useState('');
  const [activeTab, setActiveTab] = useState<'FEMALE' | 'MALE'>('FEMALE');

  const { data: applications, isLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/applications');
      if (!res.ok) throw new Error('Network response was not ok');
      const allApps = await res.json();
      return allApps.filter((app: any) => app.status === 'TRANSFERRED');
    },
    refetchInterval: 3000
  });

  const mutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[], status: string }) => {
      const res = await fetch('http://localhost:5000/api/applications/batch-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, status })
      });
      if (!res.ok) throw new Error('Failed to update status');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      setSelectedIds([]);
    }
  });

  const returnMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('http://localhost:5000/api/applications/batch-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PENDING', fromStatuses: ['TRANSFERRED'] })
      });
      if (!res.ok) throw new Error('Failed to return');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast.success(`Successfully returned ${data.count} remaining applications.`);
    },
    onError: () => {
      toast.error('Failed to return applications');
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-50 text-amber-600 border-amber-200/50 shadow-sm';
      case 'APPROVED': return 'bg-emerald-50 text-emerald-600 border-emerald-200/50 shadow-sm';
      case 'REJECTED': return 'bg-rose-50 text-rose-600 border-rose-200/50 shadow-sm';
      case 'ALLOCATED': return 'bg-blue-50 text-blue-600 border-blue-200/50 shadow-sm';
      case 'TRANSFERRED': return 'bg-purple-50 text-purple-600 border-purple-200/50 shadow-sm';
      default: return 'bg-slate-50 text-slate-600 border-slate-200/50 shadow-sm';
    }
  };

  const getBorderColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'border-l-amber-400';
      case 'APPROVED': return 'border-l-emerald-400';
      case 'REJECTED': return 'border-l-rose-400';
      case 'ALLOCATED': return 'border-l-blue-400';
      case 'TRANSFERRED': return 'border-l-purple-400';
      default: return 'border-l-slate-300';
    }
  };

  const getRankBadge = (index: number) => {
    return (
      <div className="w-8 h-8 flex items-center justify-center font-bold text-sm text-slate-500">
        {index + 1}
      </div>
    );
  };

  const handleAction = (id: string, status: string) => {
    mutation.mutate({ ids: [id], status });
  };

  const filteredApplications = applications?.filter((app: any) => 
    app.gender === activeTab &&
    (app.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.usn.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.department.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSelectTopN = () => {
    const n = parseInt(selectCount);
    if (isNaN(n) || n <= 0) return;
    
    // Select top N applications that are eligible (PENDING or APPROVED)
    const eligible = filteredApplications?.filter((app: any) => app.status === 'PENDING' || app.status === 'APPROVED') || [];
    const topN = eligible.slice(0, n).map((app: any) => app.id);
    setSelectedIds(topN);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-800">Transferred Applications</h2>
          <p className="text-slate-500 font-medium mt-1">Secondary Admin View - FCFS Order Preserved</p>
        </div>
        
        {/* Gender Tabs */}
        <div className="flex p-1 bg-slate-100/80 backdrop-blur-sm rounded-full shadow-inner border border-slate-200/50">
          <button 
            onClick={() => { setActiveTab('FEMALE'); setSelectedIds([]); }}
            className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'FEMALE' ? 'bg-pink-500 text-white shadow-md shadow-pink-500/20' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Girls Queue
          </button>
          <button 
            onClick={() => { setActiveTab('MALE'); setSelectedIds([]); }}
            className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'MALE' ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Boys Queue
          </button>
        </div>
        
        {/* Modern Filter Chips */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm flex items-center space-x-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search applicant..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-32 focus:w-48 transition-all duration-300" 
            />
          </div>
          
          <div className="flex items-center space-x-2 bg-blue-50 px-2 py-1.5 rounded-full border border-blue-100 shadow-sm">
            <span className="text-xs font-bold text-blue-700 pl-2 uppercase tracking-wide">Select N</span>
            <input 
              type="number" 
              placeholder="Qty" 
              value={selectCount}
              onChange={(e) => setSelectCount(e.target.value)}
              className="w-16 px-2 py-1 text-sm text-center border border-blue-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button 
              onClick={handleSelectTopN}
              className="bg-[#2b509a] text-white px-3 py-1 text-sm font-bold rounded-full hover:bg-blue-800 transition-colors shadow-sm"
            >
              Go
            </button>
          </div>

          <button 
            onClick={() => returnMutation.mutate()}
            disabled={returnMutation.isPending || !filteredApplications || filteredApplications.length === 0}
            className="bg-white px-4 py-2 rounded-full border border-orange-200 text-orange-600 shadow-sm flex items-center space-x-2 text-sm font-semibold hover:bg-orange-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {returnMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Users className="w-4 h-4" />}
            <span>Return Remaining</span>
          </button>

          <button className="bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm flex items-center space-x-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Sticky Action Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="sticky top-4 z-20 bg-white shadow-lg rounded-full px-6 py-3 border border-slate-200 flex justify-between items-center"
          >
            <span className="font-bold text-blue-600">{selectedIds.length} students selected</span>
            <div className="space-x-3">
              <Button variant="outline" className="rounded-full bg-white hover:bg-slate-50 border-slate-200 text-slate-600 font-semibold" onClick={() => setSelectedIds([])}>
                Cancel
              </Button>
              <Button 
                variant="outline" 
                className="rounded-full bg-white border-orange-200 text-orange-600 hover:bg-orange-50 font-bold" 
                onClick={() => {
                  if(confirm(`Are you sure you want to return these ${selectedIds.length} applicants to the main queue?`)) {
                    mutation.mutate({ ids: selectedIds, status: 'PENDING' });
                  }
                }}
              >
                Return Selected
              </Button>
              <Button className="rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold shadow-md shadow-blue-500/20" onClick={() => setIsBatchModalOpen(true)}>
                Allocate Selected
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Applications List */}
      <div className="space-y-4">
        {filteredApplications && filteredApplications.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-sm">
              <CheckCircle className="w-12 h-12 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">No Transferred Applications</h3>
            <p className="text-slate-500 mt-2 max-w-sm">
              There are currently no applications waiting in the overflow queue.
            </p>
          </motion.div>
        ) : (
          filteredApplications?.map((app: any, index: number) => {
            const isExpanded = expandedId === app.id;
            
            return (
            <motion.div 
              key={app.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white/80 backdrop-blur-sm rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-l-[6px] border border-slate-100/60 overflow-hidden transition-all duration-300 group ${getBorderColor(app.status)} ${isExpanded ? 'shadow-xl ring-2 ring-slate-100' : 'hover:shadow-xl hover:-translate-y-1 hover:bg-white'}`}
            >
              {/* Collapsed Row */}
              <div 
                className="flex items-center p-4 lg:p-5 cursor-pointer select-none"
                onClick={() => setExpandedId(isExpanded ? null : app.id)}
              >
                <div className="flex items-center w-full">
                  <div className="flex-shrink-0 mr-4" onClick={(e) => e.stopPropagation()}>
                    <Checkbox 
                      checked={selectedIds.includes(app.id)}
                      onCheckedChange={(checked) => {
                        setSelectedIds(checked ? [...selectedIds, app.id] : selectedIds.filter(id => id !== app.id));
                      }}
                    />
                  </div>
                  
                  <div className="flex-shrink-0 mr-4 flex items-center justify-center">
                    {getRankBadge(index)}
                  </div>

                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-100 border-2 border-white shadow-sm flex items-center justify-center mr-4 overflow-hidden">
                    {/* Placeholder Avatar */}
                    <span className="font-bold text-blue-700">{app.studentName.charAt(0)}</span>
                  </div>

                  <div className="flex-1 grid grid-cols-2 lg:grid-cols-5 gap-4 items-center">
                    <div className="col-span-2 lg:col-span-1">
                      <p className="font-bold text-slate-800 truncate">{app.studentName}</p>
                      <div className="flex flex-col mt-0.5">
                        <p className="text-xs font-semibold text-slate-400">ID: {app.id.slice(0,8).toUpperCase()}</p>
                        <p className="text-xs font-bold text-indigo-600 mt-0.5">
                          {new Date(app.createdAt).toLocaleDateString()} • {new Date(app.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                    </div>
                    
                    <div className="hidden lg:block">
                      <p className="text-sm font-semibold text-slate-700">{app.department}</p>
                      <p className="text-xs font-medium text-slate-500 mt-0.5">Sem {app.yearSem}</p>
                    </div>

                    <div className="hidden lg:block">
                      <p className="text-sm font-semibold text-slate-700">{app.hostelPref}</p>
                      <p className="text-xs font-medium text-slate-500 mt-0.5">Preference</p>
                    </div>

                    <div className="flex justify-end lg:justify-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(app.status)}`}>
                        {app.status}
                      </span>
                    </div>

                    <div className="flex justify-end items-center col-span-2 lg:col-span-1">
                      <div className={`p-2 rounded-full transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-slate-100' : 'hover:bg-slate-50'}`}>
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Card */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="border-t border-slate-100 bg-slate-50/50"
                  >
                    <div className="p-6 lg:p-8 space-y-8">
                      {/* Grid Sections */}
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {/* Personal Info */}
                        <div className="space-y-4">
                          <h4 className="text-sm font-bold text-indigo-500 uppercase tracking-wider flex items-center"><User className="w-4 h-4 mr-2"/> Personal Information</h4>
                          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 space-y-3">
                            <div>
                              <p className="text-xs text-slate-400 font-semibold">USN / Roll No</p>
                              <p className="font-bold text-slate-700 hover:text-indigo-600 transition-colors cursor-pointer group flex items-center">
                                {app.usn} <ExternalLink className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400 font-semibold">Phone Number</p>
                              <a href={`tel:${app.phoneNumber}`} className="font-bold text-[#2b509a] hover:text-blue-800 hover:underline transition-colors flex items-center">
                                <Phone className="w-3 h-3 mr-1" /> {app.phoneNumber}
                              </a>
                            </div>
                            <div><p className="text-xs text-slate-400 font-semibold">Gender</p><p className="font-bold text-slate-700">{app.gender}</p></div>
                          </div>
                        </div>

                        {/* Parent Details */}
                        <div className="space-y-4">
                          <h4 className="text-sm font-bold text-indigo-500 uppercase tracking-wider flex items-center"><Users className="w-4 h-4 mr-2"/> Parent Details</h4>
                          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 space-y-3">
                            <div><p className="text-xs text-slate-400 font-semibold">Father's Name</p><p className="font-bold text-slate-700">{app.fatherName}</p></div>
                            <div>
                              <p className="text-xs text-slate-400 font-semibold">Father's Phone</p>
                              <a href={`tel:${app.fatherPhone}`} className="font-bold text-[#2b509a] hover:text-blue-800 hover:underline transition-colors flex items-center">
                                <Phone className="w-3 h-3 mr-1" /> {app.fatherPhone}
                              </a>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400 font-semibold">Emergency Contact</p>
                              <a href={`tel:${app.emergencyContact}`} className="font-bold text-rose-600 hover:text-rose-800 hover:underline transition-colors flex items-center">
                                <Phone className="w-3 h-3 mr-1" /> {app.emergencyContact}
                              </a>
                            </div>
                          </div>
                        </div>

                        {/* Preferences */}
                        <div className="space-y-4">
                          <h4 className="text-sm font-bold text-indigo-500 uppercase tracking-wider flex items-center"><BedDouble className="w-4 h-4 mr-2"/> Preferences</h4>
                          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 space-y-3">
                            <div><p className="text-xs text-slate-400 font-semibold">Hostel Preference</p><p className="font-bold text-slate-700">{app.hostelPref}</p></div>
                            <div><p className="text-xs text-slate-400 font-semibold">Address</p><p className="font-bold text-slate-700 line-clamp-2">{app.address}</p></div>
                          </div>
                        </div>
                      </div>

                      {/* Student Photo Section */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-indigo-500 uppercase tracking-wider flex items-center"><User className="w-4 h-4 mr-2"/> Student Photo</h4>
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 max-w-sm space-y-4">
                          <div className="text-center pb-3 border-b border-slate-100">
                            <span className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                              Passport Size Photograph
                            </span>
                          </div>
                          
                          <div className="flex justify-center my-2">
                            <div className="w-32 h-40 rounded-xl border-2 border-slate-200 bg-slate-50 flex flex-col items-center justify-center overflow-hidden shadow-inner relative group">
                              {app.photoUrl || app.passportPhoto ? (
                                <img 
                                  src={getPhotoUrl(app.photoUrl || app.passportPhoto)} 
                                  alt={app.studentName} 
                                  className="w-full h-full object-cover" 
                                />
                              ) : (
                                <div className="flex flex-col items-center justify-center p-3 text-center text-slate-400">
                                  <User className="w-12 h-12 mb-1 text-slate-300" />
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">No Photo</span>
                                  <span className="text-[9px] text-slate-300">Uploaded</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-100 space-y-2 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-slate-400">Name:</span>
                              <span className="font-extrabold text-slate-800">{app.studentName}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-slate-400">Application ID:</span>
                              <span className="font-mono font-bold text-indigo-600">{app.usn || app.bmsitId || app.id}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-slate-400">Branch:</span>
                              <span className="font-bold text-slate-700">{app.department}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-slate-400">Year / Semester:</span>
                              <span className="font-bold text-slate-700">{app.yearSem}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Admin Actions */}
                      <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-slate-200/60">
                        <Button variant="outline" className="rounded-xl font-bold bg-white text-slate-600 hover:text-slate-800 hover:bg-slate-50 border-slate-200">
                          <Printer className="w-4 h-4 mr-2" /> Print
                        </Button>
                        <Button variant="outline" className="rounded-xl font-bold bg-white text-slate-600 hover:text-slate-800 hover:bg-slate-50 border-slate-200">
                          <Download className="w-4 h-4 mr-2" /> Download
                        </Button>
                        {app.status === 'PENDING' && (
                          <>
                            <Button 
                              onClick={() => handleAction(app.id, 'REJECTED')}
                              className="rounded-xl font-bold bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 shadow-sm"
                            >
                              Reject
                            </Button>
                            <Button 
                              onClick={() => handleAction(app.id, 'APPROVED')}
                              className="rounded-xl font-bold bg-gradient-to-r from-emerald-400 to-emerald-500 text-white shadow-md shadow-emerald-500/20 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" /> Approve
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })
        )}
      </div>

      <BatchAllocationModal 
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        selectedIds={selectedIds}
        gender={activeTab}
        onSuccess={() => {
          setIsBatchModalOpen(false);
          setSelectedIds([]);
          queryClient.invalidateQueries({ queryKey: ['applications'] });
        }}
      />
    </div>
  );
}
