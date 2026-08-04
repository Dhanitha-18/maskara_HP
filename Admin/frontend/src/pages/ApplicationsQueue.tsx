import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, ChevronDown, CheckCircle, Search, FileText, Download, Printer, User, Users, BedDouble, ExternalLink, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import BatchAllocationModal from './BatchAllocationModal';
import AllocationModal from './AllocationModal';
import { usePresence } from '../context/PresenceContext';
import { API_BASE_URL } from '../lib/api';
import { jsPDF } from 'jspdf';

const getPhotoUrl = (url: string) => {
  if (!url) return '';
  return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
};

const getBase64ImageFromUrl = async (imageUrl: string): Promise<string | null> => {
  try {
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to convert image to Base64', error);
    return null;
  }
};

const formatSubmissionDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return 'Not Available';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Not Available';
  
  const day = String(date.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strTime = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  
  return `${day} ${month} ${year} • ${strTime}`;
};

const handleDownloadPDF = async (app: any) => {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  // Title / Header
  doc.setFillColor(49, 46, 129); // indigo-900 color
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('HOSTEL ADMISSION APPLICATION', 15, 20);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('BMS Institute of Technology and Management', 15, 28);
  doc.text('Consolidated Application & Profile Record', 15, 33);

  let currentY = 50;

  // Function to draw section headers
  const drawSectionHeader = (title: string) => {
    doc.setFillColor(243, 244, 246);
    doc.rect(15, currentY, 180, 8, 'F');
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(title, 20, currentY + 6);
    currentY += 14;
  };

  // Function to draw field row
  const drawFieldRow = (label1: string, val1: string, label2?: string, val2?: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text(label1, 20, currentY);
    
    if (label2) {
      doc.text(label2, 110, currentY);
    }
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(10);
    doc.text(val1 || 'N/A', 20, currentY + 5);
    
    if (label2 && val2 !== undefined) {
      doc.text(val2 || 'N/A', 110, currentY + 5);
    }
    
    currentY += 12;
  };

  // 1. Application Details
  const formattedAppId = app.id.startsWith('APP-') ? app.id : `APP-2026-${app.id.slice(0, 6).toUpperCase()}`;
  const subDate = formatSubmissionDate(app.createdAt || app.appliedAt);
  
  drawSectionHeader('APPLICATION DETAILS');
  drawFieldRow('Unique Application ID', formattedAppId, 'Submission Date', subDate);
  drawFieldRow('Application Status', app.status, 'BMSIT Reference ID', app.bmsitId || 'N/A');

  // 2. Student Information
  drawSectionHeader('STUDENT INFORMATION');
  drawFieldRow('Student Name', app.studentName, 'USN / Roll Number', app.usn);
  drawFieldRow('Gender', app.gender, 'Date of Birth', app.dob ? new Date(app.dob).toLocaleDateString('en-IN') : 'N/A');
  drawFieldRow('Department', app.department, 'Semester', app.yearSem);
  drawFieldRow('Student Email', app.email, 'Phone Number', app.phoneNumber);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text('Residential Address', 20, currentY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(10);
  doc.text(app.address || 'N/A', 20, currentY + 5);
  currentY += 15;

  // Add student photo to the right side if available
  const photoUrl = app.photoUrl || app.passportPhoto;
  if (photoUrl) {
    try {
      const resolvedUrl = photoUrl.startsWith('http') ? photoUrl : `${API_BASE_URL}${photoUrl}`;
      const base64Img = await getBase64ImageFromUrl(resolvedUrl);
      if (base64Img) {
        doc.addImage(base64Img, 'JPEG', 150, 48, 35, 45);
      }
    } catch (err) {
      console.error('Skipping image in PDF generation', err);
    }
  }

  // 3. Parent Information
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }
  drawSectionHeader('PARENT / GUARDIAN INFORMATION');
  drawFieldRow('Father\'s Name', app.fatherName, 'Father\'s Phone', app.fatherPhone);
  drawFieldRow("Father's Email", app.fatherEmail || 'N/A', "Mother's Email", app.motherEmail || 'N/A');
  drawFieldRow("Guardian's Email", app.guardianEmail || 'N/A', 'Emergency Contact Phone', app.emergencyContact);

  // 4. Hostel Preference & Details
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }
  drawSectionHeader('HOSTEL PREFERENCES & INFORMATION');
  drawFieldRow('Hostel Preference / Sharing', app.hostelPref, 'Medical Information / Category', app.medicalInfo || 'None');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text('Remarks / Additional Notes', 20, currentY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(10);
  doc.text(app.remarks || 'None', 20, currentY + 5);
  currentY += 15;

  // 5. Allocation Details (if allocated)
  if (app.status === 'ALLOCATED' && app.allocations && app.allocations.length > 0) {
    const alloc = app.allocations[0];
    const hostelName = alloc.bed?.room?.block?.gender === 'FEMALE' ? 'Girls Hostel' : 'Boys Hostel';
    const blockName = alloc.bed?.room?.block?.name || 'N/A';
    const floorNo = alloc.bed?.room?.floor || 'N/A';
    const roomNo = alloc.bed?.room?.roomNo || 'N/A';
    const bedNo = alloc.bed?.bedNo || 'N/A';
    const allocDate = alloc.allocatedAt 
      ? new Date(alloc.allocatedAt).toLocaleString('en-IN')
      : 'N/A';

    if (currentY > 220) {
      doc.addPage();
      currentY = 20;
    }
    drawSectionHeader('ALLOCATION DETAILS (OFFICIAL USE ONLY)');
    drawFieldRow('Allocated Hostel', hostelName, 'Allocated Block Name', blockName);
    drawFieldRow('Allocated Room Number', `Room ${roomNo}`, 'Allocated Bed Number', `Bed ${bedNo}`);
    drawFieldRow('Floor Level', `Floor ${floorNo}`, 'Allocation Timestamp', allocDate);
  }

  doc.save(`${app.studentName.replace(/\s+/g, '_')}_Hostel_Application.pdf`);
};

export default function ApplicationsQueue() {
  const queryClient = useQueryClient();
  const { acquireLock, releaseLock, isLockedByOther } = usePresence();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [allocationModal, setAllocationModal] = useState<{isOpen: boolean, appId: string, gender: 'FEMALE'|'MALE', name: string} | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectCount, setSelectCount] = useState('');
  const [activeTab, setActiveTab] = useState<'FEMALE' | 'MALE'>('FEMALE');
  const [activeView, setActiveView] = useState<'PENDING' | 'ALLOCATED'>('PENDING');
  const [sharingFilter, setSharingFilter] = useState('ALL');

  const { data: applications, isLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/applications');
      if (!res.ok) throw new Error('Network response was not ok');
      const allApps = await res.json();
      return allApps.filter((app: any) => app.status !== 'TRANSFERRED');
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-50 text-amber-600 border-amber-200/50 shadow-sm';
      case 'APPROVED': return 'bg-emerald-50 text-emerald-600 border-emerald-200/50 shadow-sm';
      case 'REJECTED': return 'bg-rose-50 text-rose-600 border-rose-200/50 shadow-sm';
      case 'ALLOCATED': return 'bg-indigo-50 text-indigo-600 border-indigo-200/50 shadow-sm';
      default: return 'bg-slate-50 text-slate-600 border-slate-200/50 shadow-sm';
    }
  };

  const getBorderColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'border-l-amber-400';
      case 'APPROVED': return 'border-l-emerald-400';
      case 'REJECTED': return 'border-l-rose-400';
      case 'ALLOCATED': return 'border-l-indigo-400';
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

  const transferMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('http://localhost:5000/api/applications/batch-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'TRANSFERRED', fromStatuses: ['PENDING', 'APPROVED'] })
      });
      if (!res.ok) throw new Error('Failed to transfer');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast.success(`Successfully transferred ${data.count} remaining applications.`);
    },
    onError: () => {
      toast.error('Failed to transfer applications');
    }
  });



  const undoAllocationMutation = useMutation({
    mutationFn: async (applicationIds: string[]) => {
      const res = await fetch('http://localhost:5000/api/allocate/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationIds })
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to undo allocations');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast.success(`Successfully reverted allocations for ${data.count} students.`);
      setSelectedIds([]);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to undo allocations');
    }
  });

  const filteredApplications = applications?.filter((app: any) => {
    if (app.gender.toUpperCase() !== activeTab) return false;
    
    // View filtering
    if (activeView === 'PENDING' && (app.status === 'ALLOCATED' || app.status === 'TRANSFERRED')) return false;
    if (activeView === 'ALLOCATED' && app.status !== 'ALLOCATED') return false;

    // Sharing preference filtering
    if (sharingFilter !== 'ALL' && app.hostelPref !== sharingFilter) return false;

    // Search filtering
    return app.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           app.usn.toLowerCase().includes(searchQuery.toLowerCase()) ||
           app.department.toLowerCase().includes(searchQuery.toLowerCase());
  });

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
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-800">Applications Queue</h2>
            <p className="text-slate-500 font-medium mt-1">First-Come, First-Served Allocation</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            {/* Gender Tabs */}
            <div className="flex p-1 bg-slate-100/80 backdrop-blur-sm rounded-full shadow-inner border border-slate-200/50">
              <button 
            onClick={() => { setActiveTab('FEMALE'); setSelectedIds([]); }}
            className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'FEMALE' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'text-slate-500 hover:text-indigo-600'}`}
            title="View Girls Application Queue"
          >
            Girls Queue
          </button>
          <button 
            onClick={() => { setActiveTab('MALE'); setSelectedIds([]); }}
            className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'MALE' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'text-slate-500 hover:text-indigo-600'}`}
            title="View Boys Application Queue"
          >
            Boys Queue
          </button>
            </div>

            {/* View Toggle */}
            <div className="flex p-1 bg-slate-100/80 backdrop-blur-sm rounded-full shadow-inner border border-slate-200/50">
              <button 
                onClick={() => { setActiveView('PENDING'); setSelectedIds([]); }}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeView === 'PENDING' ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Pending
              </button>
              <button 
                onClick={() => { setActiveView('ALLOCATED'); setSelectedIds([]); }}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeView === 'ALLOCATED' ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Allocated
              </button>
            </div>
          </div>
        </div>
        
        {/* Modern Filter Chips & Actions Row */}
        <div className="flex flex-wrap gap-3 items-center justify-between bg-slate-50/50 p-2 rounded-2xl border border-slate-100">
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

            <div className="bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm flex items-center space-x-2">
              <span className="text-sm font-medium text-slate-500">Pref:</span>
              <select 
                value={sharingFilter} 
                onChange={(e) => setSharingFilter(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-slate-700 font-medium cursor-pointer"
              >
                <option value="ALL">All Options</option>
                <option value="2 Sharing">2 Sharing</option>
                <option value="3 Sharing">3 Sharing</option>
                <option value="4 Sharing">4 Sharing</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2 bg-indigo-50 px-2 py-1.5 rounded-full border border-indigo-100 shadow-sm" title="Select the top N students from the queue">
            <span className="text-xs font-bold text-indigo-700 pl-2 uppercase tracking-wide">Select N</span>
            <input 
              type="number" 
              min="1"
              value={selectCount}
              onChange={(e) => setSelectCount(e.target.value)}
              className="w-14 h-7 text-center rounded-md border border-indigo-200 text-sm font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
            <Button size="sm" onClick={handleSelectTopN} className="h-7 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3">
              Select
            </Button>
          </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">


          </div>
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
              {activeView === 'PENDING' ? (
                <>
                  <Button className="rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold shadow-md shadow-indigo-500/20" onClick={() => setIsBatchModalOpen(true)}>
                    Allocate Selected
                  </Button>
                </>
              ) : (
                <Button 
                  variant="outline" 
                  disabled={undoAllocationMutation.isPending}
                  className="rounded-full bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 font-bold" 
                  onClick={() => {
                    if(confirm(`Are you sure you want to revert the allocation for these ${selectedIds.length} students and free up their beds?`)) {
                      undoAllocationMutation.mutate(selectedIds);
                    }
                  }}
                >
                  {undoAllocationMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Revert Allocation
                </Button>
              )}
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
            <h3 className="text-xl font-bold text-slate-800">Queue is Empty</h3>
            <p className="text-slate-500 mt-2 max-w-sm">
              All applications have been processed or transferred. Great job!
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
                onClick={() => {
                  if (isExpanded) {
                    setExpandedId(null);
                    releaseLock(app.id, 'APPLICATION');
                  } else {
                    if (expandedId) releaseLock(expandedId, 'APPLICATION');
                    setExpandedId(app.id);
                    acquireLock(app.id, 'APPLICATION');
                  }
                }}
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

                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-100 to-violet-100 border-2 border-white shadow-sm flex items-center justify-center mr-4 overflow-hidden">
                    {/* Placeholder Avatar */}
                    <span className="font-bold text-indigo-700">{app.studentName.charAt(0)}</span>
                  </div>

                  <div className="flex-1 grid grid-cols-2 lg:grid-cols-5 gap-4 items-center">
                    <div className="col-span-2 lg:col-span-1">
                      <p className="font-bold text-slate-800 truncate">{app.studentName}</p>
                      <div className="flex flex-col mt-0.5">
                        <p className="text-xs font-bold text-indigo-600 font-mono">App ID: {app.id.startsWith('APP-') ? app.id : `APP-2026-${app.id.slice(0, 6).toUpperCase()}`}</p>
                        <p className="text-xs font-semibold text-slate-400 mt-0.5">
                          {formatSubmissionDate(app.createdAt || app.appliedAt)}
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

                    <div className="flex justify-end lg:justify-center flex-col items-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(app.status)} mb-1`}>
                        {app.status}
                      </span>
                      {isLockedByOther(app.id, 'APPLICATION') && (
                        <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full animate-pulse border border-rose-200">
                          Editing by {isLockedByOther(app.id, 'APPLICATION')?.adminName}
                        </span>
                      )}
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
                              <p className="text-xs text-slate-400 font-semibold">Unique Application ID</p>
                              <p className="font-bold text-indigo-700 font-mono text-xs bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 inline-block mt-0.5">
                                {app.id.startsWith('APP-') ? app.id : `APP-2026-${app.id.slice(0, 6).toUpperCase()}`}
                              </p>
                            </div>
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

                      {/* Photo & Allocation details side-by-side if allocated */}
                      {app.status === 'ALLOCATED' && app.allocations && app.allocations.length > 0 ? (
                        <div className="flex flex-col md:flex-row gap-8 items-start">
                          {/* Student Photo */}
                          <div className="space-y-4 w-full md:w-auto">
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
                            </div>
                          </div>

                          {/* Allocation Details */}
                          {(() => {
                            const alloc = app.allocations[0];
                            const hostelName = alloc.bed?.room?.block?.gender === 'FEMALE' ? 'Girls Hostel' : 'Boys Hostel';
                            const blockName = alloc.bed?.room?.block?.name || 'N/A';
                            const floorNo = alloc.bed?.room?.floor || 'N/A';
                            const roomNo = alloc.bed?.room?.roomNo || 'N/A';
                            const bedNo = alloc.bed?.bedNo || 'N/A';
                            const allocDate = alloc.allocatedAt 
                              ? new Date(alloc.allocatedAt).toLocaleDateString('en-IN')
                              : 'N/A';

                            return (
                              <div className="space-y-4 flex-1 w-full max-w-sm">
                                <h4 className="text-sm font-bold text-emerald-600 uppercase tracking-wider flex items-center">
                                  <BedDouble className="w-4 h-4 mr-2"/> Allocation Details
                                </h4>
                                <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-200 space-y-4">
                                  <div className="text-center pb-3 border-b border-slate-100">
                                    <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                                      Official Bed Allotment
                                    </span>
                                  </div>
                                  <div className="space-y-2 text-xs">
                                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                                      <span className="font-semibold text-slate-400">Hostel:</span>
                                      <span className="font-extrabold text-slate-800">{hostelName}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                                      <span className="font-semibold text-slate-400">Block:</span>
                                      <span className="font-extrabold text-slate-800">{blockName}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                                      <span className="font-semibold text-slate-400">Floor Level:</span>
                                      <span className="font-extrabold text-slate-800">Floor {floorNo}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                                      <span className="font-semibold text-slate-400">Room Number:</span>
                                      <span className="font-extrabold text-slate-800">{roomNo}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                                      <span className="font-semibold text-slate-400">Bed Number:</span>
                                      <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{bedNo}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1">
                                      <span className="font-semibold text-slate-400">Allocation Date:</span>
                                      <span className="font-bold text-slate-700">{allocDate}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        /* Student Photo Section only */
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
                          </div>
                        </div>
                      )}

                      {/* Admin Actions */}
                      <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-slate-200/60 relative">
                        {isLockedByOther(app.id, 'APPLICATION') && (
                          <div className="absolute left-0 top-6 flex items-center text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 shadow-sm animate-pulse">
                            <span className="text-xs font-bold">🔒 Currently being viewed by {isLockedByOther(app.id, 'APPLICATION')?.adminName}. Actions disabled.</span>
                          </div>
                        )}
                        <Button 
                          variant="outline" 
                          className="rounded-xl font-bold bg-white text-slate-600 hover:text-slate-800 hover:bg-slate-50 border-slate-200" 
                          disabled={!!isLockedByOther(app.id, 'APPLICATION')}
                          onClick={() => handleDownloadPDF(app)}
                        >
                          <Download className="w-4 h-4 mr-2" /> Download
                        </Button>
                        {app.status === 'PENDING' && (
                          <>
                            <Button 
                              disabled={!!isLockedByOther(app.id, 'APPLICATION')}
                              onClick={() => handleAction(app.id, 'REJECTED')}
                              className="rounded-xl font-bold bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 shadow-sm"
                            >
                              Reject
                            </Button>
                            <Button 
                              disabled={!!isLockedByOther(app.id, 'APPLICATION')}
                       onClick={() =>
  setAllocationModal({
    isOpen: true,
    appId: app.id,
    gender: app.gender.toUpperCase() as 'MALE' | 'FEMALE',
    name: app.studentName,
  })
}
                              className="rounded-xl font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" /> Allocate Bed
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

      {allocationModal && (
        <AllocationModal
          isOpen={allocationModal.isOpen}
          onClose={() => setAllocationModal(null)}
          applicationId={allocationModal.appId}
          gender={allocationModal.gender}
          studentName={allocationModal.name}
        />
      )}
    </div>
  );
}
