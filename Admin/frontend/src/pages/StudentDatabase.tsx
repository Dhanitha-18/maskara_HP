import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Loader2, Search, Download, Filter, FileSpreadsheet, ChevronDown, ChevronRight, 
  User, Users, Building2, Activity, FileText, Calendar, Mail, Phone, MapPin, 
  CreditCard, ShieldCheck, HeartPulse, Eye, ExternalLink, Sparkles, FolderCheck, 
  CheckCircle2, Clock, AlertCircle, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { API_BASE_URL } from '../lib/api';

const getPhotoUrl = (url: string) => {
  if (!url) return '';
  return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
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

const displayVal = (val: any) => {
  if (val === undefined || val === null || String(val).trim() === '' || val === '-' || val === 'Not Available' || val === 'N/A') return '-';
  return val;
};

import { useAuthStore } from '../store/useAuthStore';

export default function StudentDatabase() {
  const { role, allowedBlocks } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [genderFilter, setGenderFilter] = useState('ALL');
  const [blockFilter, setBlockFilter] = useState('ALL');
  const [selectedStudentApp, setSelectedStudentApp] = useState<any | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<string>('ALL');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [expandedTabState, setExpandedTabState] = useState<Record<string, string>>({});

  const { data: applications, isLoading: isLoadingApps } = useQuery({
    queryKey: ['applications_all'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/applications');
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    }
  });

  const { data: payments, isLoading: isLoadingPayments } = useQuery({
    queryKey: ['payments_all'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/payments');
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    }
  });

  const isLoading = isLoadingApps || isLoadingPayments;

  const enrichedApplications = useMemo(() => {
    if (!applications) return [];
    return applications.map((app: any) => {
      // Find latest payment for this application (payments are sorted desc by default from backend)
      const appPayment = payments?.find((p: any) => p.studentUsn === app.usn);
      return {
        ...app,
        latestPayment: appPayment || null
      };
    });
  }, [applications, payments]);

  // Extract unique blocks for the filter dropdown
  const uniqueBlocks = useMemo(() => {
    if (!applications) return [];
    const blocks = new Set<string>();
    applications.forEach((app: any) => {
      if (app.allocations && app.allocations.length > 0) {
        const alloc = app.allocations[0];
        if (alloc.bed?.room?.block?.name) {
          blocks.add(alloc.bed.room.block.name);
        }
      }
    });
    return Array.from(blocks).sort();
  }, [applications]);

  const filteredApplications = useMemo(() => {
    if (!enrichedApplications) return [];
    return enrichedApplications.filter((app: any) => {
      // Apply Search
      const searchStr = searchQuery.trim().toLowerCase();
      if (searchStr) {
        const formattedId = app.id ? (app.id.startsWith('APP-') ? app.id : `APP-2026-${app.id.slice(0, 6).toUpperCase()}`) : '';
        const nameMatch = app.studentName && app.studentName.toLowerCase().includes(searchStr);
        const usnMatch = app.usn && app.usn.toLowerCase().includes(searchStr);
        const bmsitMatch = app.bmsitId && app.bmsitId.toLowerCase().includes(searchStr);
        const phoneMatch = app.phoneNumber && app.phoneNumber.includes(searchStr);
        const emailMatch = app.email && app.email.toLowerCase().includes(searchStr);
        const idMatch = formattedId && formattedId.toLowerCase().includes(searchStr);

        if (!nameMatch && !usnMatch && !bmsitMatch && !phoneMatch && !emailMatch && !idMatch) {
          return false;
        }
      }

      // Apply Status Filter
      if (statusFilter !== 'ALL') {
        const appStatus = (app.status || '').toUpperCase();
        const filterStatus = statusFilter.toUpperCase();
        if (appStatus !== filterStatus) return false;
      }

      // Apply Gender Filter (Case-insensitive check for Boys/Girls or Male/Female)
      if (genderFilter !== 'ALL') {
        const appGender = (app.gender || '').toUpperCase();
        const filterGen = genderFilter.toUpperCase();
        if (filterGen === 'MALE' && appGender !== 'MALE' && appGender !== 'BOYS') return false;
        if (filterGen === 'FEMALE' && appGender !== 'FEMALE' && appGender !== 'GIRLS') return false;
      }

      // Apply Block Jurisdiction Restriction
      if (role !== 'CHIEF' && allowedBlocks && !allowedBlocks.includes('ALL')) {
        const studentBlock = app.allocations?.[0]?.bed?.room?.block?.name || app.blockName;
        if (!studentBlock || !allowedBlocks.includes(studentBlock)) {
          return false;
        }
      }

      // Apply Block Filter
      if (blockFilter !== 'ALL') {
        const blockName = app.allocations?.[0]?.bed?.room?.block?.name || app.blockName;
        if (blockName !== blockFilter) return false;
      }

      return true;
    });
  }, [enrichedApplications, searchQuery, statusFilter, genderFilter, blockFilter, role, allowedBlocks]);  const handleExportExcel = () => {
    if (!filteredApplications || filteredApplications.length === 0) return;
    
    const headers = [
      'Timestamp',
      'Application ID',
      'USN',
      'Name',
      'Gender',
      'Contact Number',
      'Email',
      'Date of Birth',
      'Program',
      'Semester',
      'Branch',
      'Blood Group',
      'Aadhaar Number',
      'Nationality',
      'Religion',
      'Permanent Address',
      'Father Name',
      'Father Occupation',
      'Father Contact Number',
      'Father Email',
      'Mother Name',
      'Mother Occupation',
      'Mother Contact Number',
      'Mother Email',
      'Communication Address',
      'Local Guardian Name',
      'Relationship',
      'Local Guardian Phone Number',
      'Local Guardian Address',
      'Hostel',
      'Block Name',
      'Floor Level',
      'Room Number',
      'Bed Number',
      'Allocation Date',
      'Existing Health Issues',
      'Allergies',
      'Current Medications',
      'Emergency Contact Number'
    ];

    const rows = filteredApplications.map((app: any) => {
      const dobStr = app.dob ? new Date(app.dob).toLocaleDateString('en-IN') : '-';
      const alloc = app.allocations && app.allocations.length > 0 ? app.allocations[0] : null;
      const isAllocated = app.status === 'ALLOCATED' && alloc;
      const appIdStr = app.id ? (app.id.startsWith('APP-') ? app.id : `APP-2026-${app.id.slice(0, 6).toUpperCase()}`) : '-';

      return [
        formatSubmissionDate(app.appliedAt || app.createdAt),
        appIdStr,
        displayVal(app.bmsitId || app.usn),
        displayVal(app.studentName),
        displayVal(app.gender),
        displayVal(app.phoneNumber),
        displayVal(app.email),
        dobStr,
        displayVal(app.program),
        displayVal(app.semester || app.yearSem),
        displayVal(app.branch || app.department),
        displayVal(app.bloodGroup),
        displayVal(app.aadhaarNumber),
        displayVal(app.nationality),
        displayVal(app.religion),
        displayVal(app.permanentAddress || app.address),
        displayVal(app.fatherName),
        displayVal(app.fatherOccupation || app.fatherOcc),
        displayVal(app.fatherPhone),
        displayVal(app.fatherEmail),
        displayVal(app.motherName),
        displayVal(app.motherOccupation || app.motherOcc),
        displayVal(app.motherPhone),
        displayVal(app.motherEmail),
        displayVal(app.communicationAddress),
        displayVal(app.guardianName),
        displayVal(app.guardianRelationship),
        displayVal(app.guardianPhone),
        displayVal(app.guardianAddress || app.guardianEmail),
        isAllocated ? (alloc.bed?.room?.block?.gender === 'FEMALE' ? 'Girls Hostel' : 'Boys Hostel') : '-',
        isAllocated ? displayVal(alloc.bed?.room?.block?.name) : '-',
        isAllocated ? displayVal(alloc.bed?.room?.floor ? `Floor ${alloc.bed.room.floor}` : null) : '-',
        isAllocated ? displayVal(alloc.bed?.room?.roomNo) : '-',
        isAllocated ? displayVal(alloc.bed?.bedNo) : '-',
        isAllocated && alloc.allocatedAt ? new Date(alloc.allocatedAt).toLocaleDateString('en-IN') : '-',
        displayVal(app.healthIssues || app.medicalInfo),
        displayVal(app.allergies),
        displayVal(app.currentMedications),
        displayVal(app.emergencyContact)
      ];
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const colWidths = headers.map(header => ({ wch: Math.max(header.length + 2, 12) }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
    XLSX.writeFile(workbook, "Student_Database.xlsx");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-100 text-amber-700';
      case 'APPROVED': return 'bg-emerald-100 text-emerald-700';
      case 'REJECTED': return 'bg-rose-100 text-rose-700';
      case 'ALLOCATED': return 'bg-indigo-100 text-indigo-700';
      case 'TRANSFERRED': return 'bg-purple-100 text-purple-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Filters Row */}
      <div className="bg-white/80 backdrop-blur-md p-4 rounded-3xl border border-slate-200/60 shadow-sm flex flex-wrap gap-4 items-center">
          <div className="bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm flex items-center space-x-2 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search name, USN, Application ID, phone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full font-medium text-slate-700 placeholder:font-normal" 
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm flex items-center space-x-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent border-none outline-none text-sm font-semibold text-slate-700 cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="ALLOCATED">Allocated</option>
                <option value="REJECTED">Rejected</option>
                <option value="TRANSFERRED">Transferred</option>
              </select>
            </div>

            <div className="bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm flex items-center space-x-2">
              <select 
                value={genderFilter} 
                onChange={(e) => setGenderFilter(e.target.value)}
                className="bg-transparent border-none outline-none text-sm font-semibold text-slate-700 cursor-pointer"
              >
                <option value="ALL">All Genders</option>
                <option value="MALE">Boys</option>
                <option value="FEMALE">Girls</option>
              </select>
            </div>

            <div className="bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm flex items-center space-x-2">
              <select 
                value={blockFilter} 
                onChange={(e) => setBlockFilter(e.target.value)}
                className="bg-transparent border-none outline-none text-sm font-semibold text-slate-700 cursor-pointer"
              >
                <option value="ALL">All Blocks</option>
                {uniqueBlocks.map(block => (
                  <option key={block} value={block}>{block}</option>
                ))}
              </select>
            </div>
          </div>
      </div>

      {/* Spreadsheet Table */}
      <div className="bg-white rounded-2xl shadow-xl border border-indigo-200 overflow-hidden relative font-sans">
        
        {/* Spreadsheet Toolbar Header */}
        <div className="bg-[#312E81] p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <FileSpreadsheet className="w-6 h-6 text-indigo-50" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold tracking-tight text-white">Student Applications & Database Sheet</h3>
              <p className="text-[11px] text-indigo-200 font-medium mt-0.5">Real-time consolidated spreadsheet of all student admissions and status</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold bg-white/10 px-4 py-2 rounded-xl border border-white/20 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Total Entries: {filteredApplications.length}
            </span>
            <button 
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors font-medium text-sm border border-indigo-200"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Download Sheet (.XLSX)</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64 bg-slate-50">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 bg-slate-50 text-slate-500 border-t border-indigo-100">
            <Search className="w-12 h-12 text-slate-300 mb-3" />
            <p className="font-semibold text-lg">No matching records found.</p>
            <p className="text-sm">Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[70vh] custom-scrollbar border-t border-indigo-100">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="sticky top-0 bg-indigo-50 shadow-sm z-20">
                <tr className="border-b border-indigo-200">
                  <th className="p-3 w-10 text-center border-r border-indigo-200/50"></th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">#</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50 bg-indigo-100/70 text-indigo-950 font-bold">Timestamp</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50 sticky left-0 bg-indigo-50 shadow-[1px_0_0_rgba(199,210,254,0.5)] z-30">Application ID</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">USN</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Name</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Gender</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Contact Number</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Email</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Date of Birth</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Program</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Semester</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Branch</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Blood Group</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Aadhaar Number</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Nationality</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Religion</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Permanent Address</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Father Name</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Father Occupation</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Father Contact Number</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Father Email</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Mother Name</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Mother Occupation</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Mother Contact Number</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Mother Email</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Communication Address</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Local Guardian Name</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Relationship</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Local Guardian Phone Number</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Local Guardian Address</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Hostel</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Block Name</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Floor Level</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Room Number</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Bed Number</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Allocation Date</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Existing Health Issues</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Allergies</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Current Medications</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider">Emergency Contact Number</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredApplications.map((app: any, idx: number) => {
                  const alloc = app.allocations && app.allocations.length > 0 ? app.allocations[0] : null;
                  const isAllocated = app.status === 'ALLOCATED' && alloc;
                  const appIdFormatted = app.id ? (app.id.startsWith('APP-') ? app.id : `APP-2026-${app.id.slice(0, 6).toUpperCase()}`) : '-';

                  return (
                    <React.Fragment key={app.id}>
                      <motion.tr 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-slate-50 transition-colors group cursor-pointer"
                        onClick={() => { setSelectedStudentApp(app); setActiveModalTab('ALL'); }}
                      >
                        <td className="p-3 text-center border-r border-slate-100">
                          <button className="text-slate-400 group-hover:text-indigo-600 transition-colors" title="View Full Details Modal">
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                        <td className="p-3 border-r border-slate-100">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="text-xs font-bold text-slate-400">{idx + 1}</span>
                            <span 
                              className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-black ${getStatusColor(app.status)} shadow-sm border border-white`}
                              title={`Application: ${app.status}`}
                            >
                              {app.status.charAt(0).toUpperCase()}
                            </span>
                            <span 
                              className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-black ${app.latestPayment?.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'} shadow-sm border border-white`}
                              title={app.latestPayment ? `Payment: ${app.latestPayment.status}` : 'Payment: Pending'}
                            >
                              P
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-xs font-semibold text-slate-600 font-mono border-r border-slate-100 bg-slate-50/50">{formatSubmissionDate(app.appliedAt || app.createdAt)}</td>
                        <td className="p-3 text-sm font-bold text-indigo-700 border-r border-slate-100 sticky left-0 bg-white group-hover:bg-indigo-50/50 shadow-[1px_0_0_rgba(241,245,249,1)] group-hover:shadow-[1px_0_0_rgba(199,210,254,0.5)] z-10 transition-colors font-mono">{appIdFormatted}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100 font-mono">{displayVal(app.bmsitId || app.usn)}</td>
                        <td className="p-3 text-sm font-bold text-slate-800 border-r border-slate-100">{displayVal(app.studentName)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.gender)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.phoneNumber)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.email)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{app.dob ? new Date(app.dob).toLocaleDateString('en-IN') : '-'}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.program)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.semester || app.yearSem)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.branch || app.department)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.bloodGroup)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.aadhaarNumber)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.nationality)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.religion)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100 max-w-[200px] truncate" title={app.permanentAddress || app.address}>{displayVal(app.permanentAddress || app.address)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.fatherName)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.fatherOccupation || app.fatherOcc)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.fatherPhone)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.fatherEmail)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.motherName)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.motherOccupation || app.motherOcc)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.motherPhone)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.motherEmail)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100 max-w-[200px] truncate" title={app.communicationAddress}>{displayVal(app.communicationAddress)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.guardianName)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.guardianRelationship)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.guardianPhone)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100 max-w-[200px] truncate" title={app.guardianAddress || app.guardianEmail}>{displayVal(app.guardianAddress || app.guardianEmail)}</td>
                        <td className="p-3 text-sm font-bold text-slate-700 border-r border-slate-100">{isAllocated ? (alloc.bed?.room?.block?.gender === 'FEMALE' ? 'Girls Hostel' : 'Boys Hostel') : '-'}</td>
                        <td className="p-3 text-sm font-bold text-slate-700 border-r border-slate-100">{isAllocated ? displayVal(alloc.bed?.room?.block?.name) : '-'}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{isAllocated ? displayVal(alloc.bed?.room?.floor ? `Floor ${alloc.bed.room.floor}` : null) : '-'}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{isAllocated ? displayVal(alloc.bed?.room?.roomNo) : '-'}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100 font-mono">{isAllocated ? displayVal(alloc.bed?.bedNo) : '-'}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{isAllocated && alloc.allocatedAt ? new Date(alloc.allocatedAt).toLocaleDateString('en-IN') : '-'}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.healthIssues || app.medicalInfo)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.allergies)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.currentMedications)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600">{displayVal(app.emergencyContact)}</td>
                      </motion.tr>
                      <AnimatePresence>
                        {expandedRow === app.id && (() => {
                          const activeSection = expandedTabState[app.id] || 'ALL';

                          const setSection = (sec: string) => {
                            setExpandedTabState(prev => ({ ...prev, [app.id]: sec }));
                          };

                          const sectionButtons = [
                            { id: 'ALL', label: 'All Details', icon: FolderCheck },
                            { id: 'STUDENT', label: 'Student Info', icon: User },
                            { id: 'PARENT', label: 'Parent Info', icon: Users },
                            { id: 'HOSTEL', label: 'Hostel & Room', icon: Building2 },
                            { id: 'HEALTH', label: 'Emergency & Health', icon: HeartPulse },
                            { id: 'DOCUMENTS', label: 'Documents', icon: FileText },
                            { id: 'APPLICATION', label: 'Application Details', icon: Calendar },
                          ];

                          const showAll = activeSection === 'ALL';

                          return (
                            <motion.tr
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="bg-slate-50 border-b border-indigo-200 shadow-inner overflow-hidden"
                            >
                              <td colSpan={41} className="p-0">
                                <div className="p-6 space-y-6">
                                  
                                  {/* Header & Quick Profile Summary Bar */}
                                  <div className="bg-white rounded-2xl p-5 border border-indigo-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                      <div className="w-16 h-20 rounded-xl border-2 border-indigo-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                                        {app.photoUrl || app.passportPhoto ? (
                                          <img 
                                            src={getPhotoUrl(app.photoUrl || app.passportPhoto)} 
                                            alt={app.studentName} 
                                            className="w-full h-full object-cover" 
                                          />
                                        ) : (
                                          <User className="w-8 h-8 text-indigo-300" />
                                        )}
                                      </div>
                                      <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                          <h3 className="text-xl font-black text-slate-900">{displayVal(app.studentName)}</h3>
                                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusColor(app.status)} shadow-xs`}>
                                            {app.status}
                                          </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs font-semibold text-slate-600">
                                          <span><strong className="text-slate-400">USN:</strong> {displayVal(app.bmsitId || app.usn)}</span>
                                          <span>•</span>
                                          <span><strong className="text-slate-400">App ID:</strong> {appIdFormatted}</span>
                                          <span>•</span>
                                          <span><strong className="text-slate-400">Program:</strong> {displayVal(app.program)} ({displayVal(app.branch || app.department)})</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Navigation Section Tabs */}
                                    <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 w-full md:w-auto">
                                      {sectionButtons.map(btn => {
                                        const Icon = btn.icon;
                                        const isActive = activeSection === btn.id;
                                        return (
                                          <button
                                            key={btn.id}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSection(btn.id);
                                            }}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                              isActive 
                                                ? 'bg-indigo-600 text-white shadow-sm' 
                                                : 'text-slate-600 hover:text-indigo-600 hover:bg-white/60'
                                            }`}
                                          >
                                            <Icon className="w-3.5 h-3.5" />
                                            <span>{btn.label}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Structured Section Grid */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    
                                    {/* 1. STUDENT INFORMATION SECTION */}
                                    {(showAll || activeSection === 'STUDENT') && (
                                      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-indigo-700 font-extrabold text-sm uppercase tracking-wider">
                                          <User className="w-4 h-4 text-indigo-600" />
                                          <span>Student Information</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 text-xs">
                                          <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Full Name</p>
                                            <p className="font-bold text-slate-800 mt-0.5">{displayVal(app.studentName)}</p>
                                          </div>
                                          <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">USN / BMSIT ID</p>
                                            <p className="font-bold text-indigo-700 font-mono mt-0.5">{displayVal(app.bmsitId || app.usn)}</p>
                                          </div>
                                          <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Gender</p>
                                            <p className="font-semibold text-slate-700 mt-0.5">{displayVal(app.gender)}</p>
                                          </div>
                                          <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Date of Birth</p>
                                            <p className="font-semibold text-slate-700 mt-0.5">{app.dob ? new Date(app.dob).toLocaleDateString('en-IN') : '-'}</p>
                                          </div>
                                          <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Contact Number</p>
                                            <p className="font-semibold text-slate-700 font-mono mt-0.5">{displayVal(app.phoneNumber)}</p>
                                          </div>
                                          <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Email Address</p>
                                            <p className="font-semibold text-slate-700 truncate mt-0.5" title={app.email}>{displayVal(app.email)}</p>
                                          </div>
                                          <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Program</p>
                                            <p className="font-semibold text-slate-700 mt-0.5">{displayVal(app.program)}</p>
                                          </div>
                                          <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Semester / Year</p>
                                            <p className="font-semibold text-slate-700 mt-0.5">{displayVal(app.semester || app.yearSem)}</p>
                                          </div>
                                          <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Branch / Dept</p>
                                            <p className="font-semibold text-slate-700 mt-0.5">{displayVal(app.branch || app.department)}</p>
                                          </div>
                                          <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Blood Group</p>
                                            <p className="font-semibold text-rose-600 mt-0.5">{displayVal(app.bloodGroup)}</p>
                                          </div>
                                          <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Aadhaar Number</p>
                                            <p className="font-semibold text-slate-700 font-mono mt-0.5">{displayVal(app.aadhaarNumber)}</p>
                                          </div>
                                          <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Nationality / Religion</p>
                                            <p className="font-semibold text-slate-700 mt-0.5">{displayVal(app.nationality)} • {displayVal(app.religion)}</p>
                                          </div>
                                          <div className="col-span-2">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Permanent Address</p>
                                            <p className="font-semibold text-slate-700 mt-0.5">{displayVal(app.permanentAddress || app.address)}</p>
                                          </div>
                                          <div className="col-span-2">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Communication Address</p>
                                            <p className="font-semibold text-slate-700 mt-0.5">{displayVal(app.communicationAddress)}</p>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* 2. PARENT INFORMATION SECTION */}
                                    {(showAll || activeSection === 'PARENT') && (
                                      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-indigo-700 font-extrabold text-sm uppercase tracking-wider">
                                          <Users className="w-4 h-4 text-indigo-600" />
                                          <span>Parent & Guardian Information</span>
                                        </div>
                                        
                                        {/* Father Info */}
                                        <div className="space-y-2 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                                          <p className="text-xs font-bold text-indigo-900 border-b border-slate-200/60 pb-1">Father Information</p>
                                          <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div><p className="text-[10px] font-bold text-slate-400 uppercase">Name</p><p className="font-semibold text-slate-800">{displayVal(app.fatherName)}</p></div>
                                            <div><p className="text-[10px] font-bold text-slate-400 uppercase">Occupation</p><p className="font-semibold text-slate-800">{displayVal(app.fatherOccupation || app.fatherOcc)}</p></div>
                                            <div><p className="text-[10px] font-bold text-slate-400 uppercase">Phone</p><p className="font-semibold text-slate-800 font-mono">{displayVal(app.fatherPhone)}</p></div>
                                            <div><p className="text-[10px] font-bold text-slate-400 uppercase">Email</p><p className="font-semibold text-slate-800 truncate" title={app.fatherEmail}>{displayVal(app.fatherEmail)}</p></div>
                                          </div>
                                        </div>

                                        {/* Mother Info */}
                                        <div className="space-y-2 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                                          <p className="text-xs font-bold text-indigo-900 border-b border-slate-200/60 pb-1">Mother Information</p>
                                          <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div><p className="text-[10px] font-bold text-slate-400 uppercase">Name</p><p className="font-semibold text-slate-800">{displayVal(app.motherName)}</p></div>
                                            <div><p className="text-[10px] font-bold text-slate-400 uppercase">Occupation</p><p className="font-semibold text-slate-800">{displayVal(app.motherOccupation || app.motherOcc)}</p></div>
                                            <div><p className="text-[10px] font-bold text-slate-400 uppercase">Phone</p><p className="font-semibold text-slate-800 font-mono">{displayVal(app.motherPhone)}</p></div>
                                            <div><p className="text-[10px] font-bold text-slate-400 uppercase">Email</p><p className="font-semibold text-slate-800 truncate" title={app.motherEmail}>{displayVal(app.motherEmail)}</p></div>
                                          </div>
                                        </div>

                                        {/* Guardian Info */}
                                        <div className="space-y-2 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                                          <p className="text-xs font-bold text-indigo-900 border-b border-slate-200/60 pb-1">Local Guardian Information</p>
                                          <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div><p className="text-[10px] font-bold text-slate-400 uppercase">Name</p><p className="font-semibold text-slate-800">{displayVal(app.guardianName)}</p></div>
                                            <div><p className="text-[10px] font-bold text-slate-400 uppercase">Relationship</p><p className="font-semibold text-slate-800">{displayVal(app.guardianRelationship)}</p></div>
                                            <div><p className="text-[10px] font-bold text-slate-400 uppercase">Phone</p><p className="font-semibold text-slate-800 font-mono">{displayVal(app.guardianPhone)}</p></div>
                                            <div><p className="text-[10px] font-bold text-slate-400 uppercase">Address / Email</p><p className="font-semibold text-slate-800 truncate">{displayVal(app.guardianAddress || app.guardianEmail)}</p></div>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* 3. HOSTEL & ROOM ALLOCATION SECTION */}
                                    {(showAll || activeSection === 'HOSTEL') && (
                                      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-indigo-700 font-extrabold text-sm uppercase tracking-wider">
                                          <Building2 className="w-4 h-4 text-indigo-600" />
                                          <span>Hostel Information & Room Allocation</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 text-xs">
                                          <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Hostel Type</p>
                                            <p className="font-bold text-slate-800 mt-0.5">{isAllocated ? (alloc.bed?.room?.block?.gender === 'FEMALE' ? 'Girls Hostel' : 'Boys Hostel') : '-'}</p>
                                          </div>
                                          <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Block Name</p>
                                            <p className="font-bold text-indigo-700 mt-0.5">{isAllocated ? displayVal(alloc.bed?.room?.block?.name) : '-'}</p>
                                          </div>
                                          <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Floor Level</p>
                                            <p className="font-semibold text-slate-700 mt-0.5">{isAllocated ? displayVal(alloc.bed?.room?.floor ? `Floor ${alloc.bed.room.floor}` : null) : '-'}</p>
                                          </div>
                                          <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Room Number</p>
                                            <p className="font-bold text-slate-800 mt-0.5">{isAllocated ? displayVal(alloc.bed?.room?.roomNo) : '-'}</p>
                                          </div>
                                          <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Bed Number</p>
                                            <p className="font-bold text-indigo-700 font-mono mt-0.5">{isAllocated ? displayVal(alloc.bed?.bedNo) : '-'}</p>
                                          </div>
                                          <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Allocation Date</p>
                                            <p className="font-semibold text-slate-700 mt-0.5">{isAllocated && alloc.allocatedAt ? new Date(alloc.allocatedAt).toLocaleDateString('en-IN') : '-'}</p>
                                          </div>
                                          <div className="col-span-2 bg-indigo-50/60 p-3 rounded-xl border border-indigo-100">
                                            <p className="text-[10px] font-extrabold text-indigo-600 uppercase">Current Allocation Status</p>
                                            <p className="font-black text-indigo-900 text-sm mt-0.5">{app.status}</p>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* 4. EMERGENCY CONTACT & HEALTH SECTION */}
                                    {(showAll || activeSection === 'HEALTH') && (
                                      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-rose-700 font-extrabold text-sm uppercase tracking-wider">
                                          <HeartPulse className="w-4 h-4 text-rose-600" />
                                          <span>Emergency Contact & Health Info</span>
                                        </div>
                                        <div className="space-y-3 text-xs">
                                          <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-100">
                                            <p className="text-[10px] font-bold text-rose-700 uppercase">Emergency Contact Number</p>
                                            <p className="font-black text-rose-900 text-sm font-mono mt-0.5">{displayVal(app.emergencyContact)}</p>
                                          </div>
                                          <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Existing Health Issues / Medical Info</p>
                                            <p className="font-semibold text-slate-800 mt-0.5">{displayVal(app.healthIssues || app.medicalInfo)}</p>
                                          </div>
                                          <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Allergies</p>
                                            <p className="font-semibold text-slate-800 mt-0.5">{displayVal(app.allergies)}</p>
                                          </div>
                                          <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Current Medications</p>
                                            <p className="font-semibold text-slate-800 mt-0.5">{displayVal(app.currentMedications)}</p>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* 5. DOCUMENTS SECTION */}
                                    {(showAll || activeSection === 'DOCUMENTS') && (
                                      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-indigo-700 font-extrabold text-sm uppercase tracking-wider">
                                          <FileText className="w-4 h-4 text-indigo-600" />
                                          <span>Uploaded Documents</span>
                                        </div>
                                        <div className="space-y-3 text-xs">
                                          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <div className="flex items-center gap-2">
                                              <User className="w-4 h-4 text-indigo-600" />
                                              <div>
                                                <p className="font-bold text-slate-800">Passport Photo</p>
                                                <p className="text-[10px] text-slate-400 font-medium">Student Identification Photo</p>
                                              </div>
                                            </div>
                                            {app.photoUrl || app.passportPhoto ? (
                                              <a 
                                                href={getPhotoUrl(app.photoUrl || app.passportPhoto)} 
                                                target="_blank" 
                                                rel="noreferrer" 
                                                className="px-3 py-1.5 bg-indigo-50 text-indigo-700 font-bold rounded-lg text-[11px] hover:bg-indigo-100 transition-colors flex items-center gap-1"
                                              >
                                                <Eye className="w-3.5 h-3.5" /> View
                                              </a>
                                            ) : (
                                              <span className="text-[10px] text-slate-400 font-bold">Not Uploaded</span>
                                            )}
                                          </div>

                                          {app.documents && app.documents.length > 0 ? (
                                            app.documents.map((doc: any) => (
                                              <div key={doc.id || doc.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <div className="flex items-center gap-2">
                                                  <FileText className="w-4 h-4 text-indigo-600" />
                                                  <div>
                                                    <p className="font-bold text-slate-800">{doc.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-medium">{doc.type || 'Document'}</p>
                                                  </div>
                                                </div>
                                                <a 
                                                  href={getPhotoUrl(doc.url)} 
                                                  target="_blank" 
                                                  rel="noreferrer" 
                                                  className="px-3 py-1.5 bg-indigo-50 text-indigo-700 font-bold rounded-lg text-[11px] hover:bg-indigo-100 transition-colors flex items-center gap-1"
                                                >
                                                  <ExternalLink className="w-3.5 h-3.5" /> View
                                                </a>
                                              </div>
                                            ))
                                          ) : (
                                            <p className="text-slate-400 text-[11px] italic text-center py-2">No additional document files uploaded.</p>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {/* 6. APPLICATION DETAILS SECTION */}
                                    {(showAll || activeSection === 'APPLICATION') && (
                                      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-indigo-700 font-extrabold text-sm uppercase tracking-wider">
                                          <Calendar className="w-4 h-4 text-indigo-600" />
                                          <span>Application & Submission Details</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 text-xs">
                                          <div className="col-span-2">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Submission Date & Time</p>
                                            <p className="font-bold text-indigo-900 font-mono mt-0.5">{formatSubmissionDate(app.appliedAt || app.createdAt)}</p>
                                          </div>
                                          <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Application ID</p>
                                            <p className="font-bold text-indigo-700 font-mono mt-0.5">{appIdFormatted}</p>
                                          </div>
                                          <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Application Status</p>
                                            <p className="font-bold text-slate-800 mt-0.5">{app.status}</p>
                                          </div>
                                          <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Payment Status</p>
                                            <p className="font-bold text-emerald-700 mt-0.5">{app.latestPayment?.status || 'Pending'}</p>
                                          </div>
                                          <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Payment UTR Number</p>
                                            <p className="font-semibold text-slate-700 font-mono mt-0.5">{app.latestPayment?.utrNumber || '-'}</p>
                                          </div>
                                          <div className="col-span-2">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Payment Submission Date</p>
                                            <p className="font-semibold text-slate-700 mt-0.5">{app.latestPayment?.paymentDate ? new Date(app.latestPayment.paymentDate).toLocaleDateString('en-IN') : '-'}</p>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                  </div>
                                </div>
                              </td>
                            </motion.tr>
                          );
                        })()}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Centered Rectangular Student Details Modal Popup */}
      <AnimatePresence>
        {selectedStudentApp && (() => {
          const app = selectedStudentApp;
          const alloc = app.allocations && app.allocations.length > 0 ? app.allocations[0] : null;
          const isAllocated = app.status === 'ALLOCATED' && alloc;
          const appIdFormatted = app.id ? (app.id.startsWith('APP-') ? app.id : `APP-2026-${app.id.slice(0, 6).toUpperCase()}`) : '-';

          const modalSectionButtons = [
            { id: 'ALL', label: 'All Details', icon: FolderCheck },
            { id: 'STUDENT', label: 'Student Info', icon: User },
            { id: 'PARENT', label: 'Parent Info', icon: Users },
            { id: 'HOSTEL', label: 'Hostel & Room', icon: Building2 },
            { id: 'HEALTH', label: 'Emergency & Health', icon: HeartPulse },
            { id: 'DOCUMENTS', label: 'Documents', icon: FileText },
            { id: 'APPLICATION', label: 'Application Details', icon: Calendar },
          ];

          const showAll = activeModalTab === 'ALL';

          return (
            <div 
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
              onClick={() => setSelectedStudentApp(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden my-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-16 rounded-xl border-2 border-indigo-400/30 bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                      {app.photoUrl || app.passportPhoto ? (
                        <img 
                          src={getPhotoUrl(app.photoUrl || app.passportPhoto)} 
                          alt={app.studentName} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <User className="w-7 h-7 text-indigo-300" />
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-black text-white">{displayVal(app.studentName)}</h3>
                        <span className={`px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusColor(app.status)}`}>
                          {app.status}
                        </span>
                        {app.latestPayment && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Payment: {app.latestPayment.status}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-300 font-medium">
                        <span><strong className="text-slate-400">USN:</strong> {displayVal(app.bmsitId || app.usn)}</span>
                        <span>•</span>
                        <span><strong className="text-slate-400">App ID:</strong> {appIdFormatted}</span>
                        <span>•</span>
                        <span><strong className="text-slate-400">Branch:</strong> {displayVal(app.branch || app.department)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedStudentApp(null)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Close Modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Sub-tab Navigation Bar */}
                <div className="bg-slate-100/80 p-3 border-b border-slate-200 flex flex-wrap gap-1.5 shrink-0">
                  {modalSectionButtons.map(btn => {
                    const Icon = btn.icon;
                    const isActive = activeModalTab === btn.id;
                    return (
                      <button
                        key={btn.id}
                        onClick={() => setActiveModalTab(btn.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isActive 
                            ? 'bg-indigo-600 text-white shadow-sm' 
                            : 'text-slate-600 hover:text-indigo-600 hover:bg-white'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{btn.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Scrollable Content Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/50 custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    
                    {/* 1. STUDENT INFORMATION */}
                    {(showAll || activeModalTab === 'STUDENT') && (
                      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-indigo-700 font-extrabold text-sm uppercase tracking-wider">
                          <User className="w-4 h-4 text-indigo-600" />
                          <span>Student Information</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Full Name</p>
                            <p className="font-bold text-slate-800 mt-0.5">{displayVal(app.studentName)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">USN / BMSIT ID</p>
                            <p className="font-bold text-indigo-700 font-mono mt-0.5">{displayVal(app.bmsitId || app.usn)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Gender</p>
                            <p className="font-semibold text-slate-700 mt-0.5">{displayVal(app.gender)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Date of Birth</p>
                            <p className="font-semibold text-slate-700 mt-0.5">{app.dob ? new Date(app.dob).toLocaleDateString('en-IN') : '-'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Contact Number</p>
                            <p className="font-semibold text-slate-700 font-mono mt-0.5">{displayVal(app.phoneNumber)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Email Address</p>
                            <p className="font-semibold text-slate-700 truncate mt-0.5" title={app.email}>{displayVal(app.email)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Program</p>
                            <p className="font-semibold text-slate-700 mt-0.5">{displayVal(app.program)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Semester / Year</p>
                            <p className="font-semibold text-slate-700 mt-0.5">{displayVal(app.semester || app.yearSem)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Branch / Dept</p>
                            <p className="font-semibold text-slate-700 mt-0.5">{displayVal(app.branch || app.department)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Blood Group</p>
                            <p className="font-semibold text-rose-600 mt-0.5">{displayVal(app.bloodGroup)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Aadhaar Number</p>
                            <p className="font-semibold text-slate-700 font-mono mt-0.5">{displayVal(app.aadhaarNumber)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Nationality / Religion</p>
                            <p className="font-semibold text-slate-700 mt-0.5">{displayVal(app.nationality)} • {displayVal(app.religion)}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Permanent Address</p>
                            <p className="font-semibold text-slate-700 mt-0.5">{displayVal(app.permanentAddress || app.address)}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Communication Address</p>
                            <p className="font-semibold text-slate-700 mt-0.5">{displayVal(app.communicationAddress)}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 2. PARENT INFORMATION */}
                    {(showAll || activeModalTab === 'PARENT') && (
                      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-indigo-700 font-extrabold text-sm uppercase tracking-wider">
                          <Users className="w-4 h-4 text-indigo-600" />
                          <span>Parent & Guardian Information</span>
                        </div>
                        
                        {/* Father Info */}
                        <div className="space-y-2 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                          <p className="text-xs font-bold text-indigo-900 border-b border-slate-200/60 pb-1">Father Information</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div><p className="text-[10px] font-bold text-slate-400 uppercase">Name</p><p className="font-semibold text-slate-800">{displayVal(app.fatherName)}</p></div>
                            <div><p className="text-[10px] font-bold text-slate-400 uppercase">Occupation</p><p className="font-semibold text-slate-800">{displayVal(app.fatherOccupation || app.fatherOcc)}</p></div>
                            <div><p className="text-[10px] font-bold text-slate-400 uppercase">Phone</p><p className="font-semibold text-slate-800 font-mono">{displayVal(app.fatherPhone)}</p></div>
                            <div><p className="text-[10px] font-bold text-slate-400 uppercase">Email</p><p className="font-semibold text-slate-800 truncate" title={app.fatherEmail}>{displayVal(app.fatherEmail)}</p></div>
                          </div>
                        </div>

                        {/* Mother Info */}
                        <div className="space-y-2 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                          <p className="text-xs font-bold text-indigo-900 border-b border-slate-200/60 pb-1">Mother Information</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div><p className="text-[10px] font-bold text-slate-400 uppercase">Name</p><p className="font-semibold text-slate-800">{displayVal(app.motherName)}</p></div>
                            <div><p className="text-[10px] font-bold text-slate-400 uppercase">Occupation</p><p className="font-semibold text-slate-800">{displayVal(app.motherOccupation || app.motherOcc)}</p></div>
                            <div><p className="text-[10px] font-bold text-slate-400 uppercase">Phone</p><p className="font-semibold text-slate-800 font-mono">{displayVal(app.motherPhone)}</p></div>
                            <div><p className="text-[10px] font-bold text-slate-400 uppercase">Email</p><p className="font-semibold text-slate-800 truncate" title={app.motherEmail}>{displayVal(app.motherEmail)}</p></div>
                          </div>
                        </div>

                        {/* Guardian Info */}
                        <div className="space-y-2 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                          <p className="text-xs font-bold text-indigo-900 border-b border-slate-200/60 pb-1">Local Guardian Information</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div><p className="text-[10px] font-bold text-slate-400 uppercase">Name</p><p className="font-semibold text-slate-800">{displayVal(app.guardianName)}</p></div>
                            <div><p className="text-[10px] font-bold text-slate-400 uppercase">Relationship</p><p className="font-semibold text-slate-800">{displayVal(app.guardianRelationship)}</p></div>
                            <div><p className="text-[10px] font-bold text-slate-400 uppercase">Phone</p><p className="font-semibold text-slate-800 font-mono">{displayVal(app.guardianPhone)}</p></div>
                            <div><p className="text-[10px] font-bold text-slate-400 uppercase">Address / Email</p><p className="font-semibold text-slate-800 truncate">{displayVal(app.guardianAddress || app.guardianEmail)}</p></div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 3. HOSTEL & ROOM ALLOCATION */}
                    {(showAll || activeModalTab === 'HOSTEL') && (
                      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-indigo-700 font-extrabold text-sm uppercase tracking-wider">
                          <Building2 className="w-4 h-4 text-indigo-600" />
                          <span>Hostel Information & Room Allocation</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Hostel Type</p>
                            <p className="font-bold text-slate-800 mt-0.5">{isAllocated ? (alloc.bed?.room?.block?.gender === 'FEMALE' ? 'Girls Hostel' : 'Boys Hostel') : '-'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Block Name</p>
                            <p className="font-bold text-indigo-700 mt-0.5">{isAllocated ? displayVal(alloc.bed?.room?.block?.name) : '-'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Floor Level</p>
                            <p className="font-semibold text-slate-700 mt-0.5">{isAllocated ? displayVal(alloc.bed?.room?.floor ? `Floor ${alloc.bed.room.floor}` : null) : '-'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Room Number</p>
                            <p className="font-bold text-slate-800 mt-0.5">{isAllocated ? displayVal(alloc.bed?.room?.roomNo) : '-'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Bed Number</p>
                            <p className="font-bold text-indigo-700 font-mono mt-0.5">{isAllocated ? displayVal(alloc.bed?.bedNo) : '-'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Allocation Date</p>
                            <p className="font-semibold text-slate-700 mt-0.5">{isAllocated && alloc.allocatedAt ? new Date(alloc.allocatedAt).toLocaleDateString('en-IN') : '-'}</p>
                          </div>
                          <div className="col-span-2 bg-indigo-50/60 p-3 rounded-xl border border-indigo-100">
                            <p className="text-[10px] font-extrabold text-indigo-600 uppercase">Current Allocation Status</p>
                            <p className="font-black text-indigo-900 text-sm mt-0.5">{app.status}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 4. EMERGENCY CONTACT & HEALTH */}
                    {(showAll || activeModalTab === 'HEALTH') && (
                      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-rose-700 font-extrabold text-sm uppercase tracking-wider">
                          <HeartPulse className="w-4 h-4 text-rose-600" />
                          <span>Emergency Contact & Health Info</span>
                        </div>
                        <div className="space-y-3 text-xs">
                          <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-100">
                            <p className="text-[10px] font-bold text-rose-700 uppercase">Emergency Contact Number</p>
                            <p className="font-black text-rose-900 text-sm font-mono mt-0.5">{displayVal(app.emergencyContact)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Existing Health Issues / Medical Info</p>
                            <p className="font-semibold text-slate-800 mt-0.5">{displayVal(app.healthIssues || app.medicalInfo)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Allergies</p>
                            <p className="font-semibold text-slate-800 mt-0.5">{displayVal(app.allergies)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Current Medications</p>
                            <p className="font-semibold text-slate-800 mt-0.5">{displayVal(app.currentMedications)}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 5. DOCUMENTS */}
                    {(showAll || activeModalTab === 'DOCUMENTS') && (
                      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-indigo-700 font-extrabold text-sm uppercase tracking-wider">
                          <FileText className="w-4 h-4 text-indigo-600" />
                          <span>Uploaded Documents</span>
                        </div>
                        <div className="space-y-3 text-xs">
                          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-indigo-600" />
                              <div>
                                <p className="font-bold text-slate-800">Passport Photo</p>
                                <p className="text-[10px] text-slate-400 font-medium">Student Identification Photo</p>
                              </div>
                            </div>
                            {app.photoUrl || app.passportPhoto ? (
                              <a 
                                href={getPhotoUrl(app.photoUrl || app.passportPhoto)} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="px-3 py-1.5 bg-indigo-50 text-indigo-700 font-bold rounded-lg text-[11px] hover:bg-indigo-100 transition-colors flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" /> View
                              </a>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-bold">Not Uploaded</span>
                            )}
                          </div>

                          {app.documents && app.documents.length > 0 ? (
                            app.documents.map((doc: any) => (
                              <div key={doc.id || doc.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-indigo-600" />
                                  <div>
                                    <p className="font-bold text-slate-800">{doc.name}</p>
                                    <p className="text-[10px] text-slate-400 font-medium">{doc.type || 'Document'}</p>
                                  </div>
                                </div>
                                <a 
                                  href={getPhotoUrl(doc.url)} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="px-3 py-1.5 bg-indigo-50 text-indigo-700 font-bold rounded-lg text-[11px] hover:bg-indigo-100 transition-colors flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" /> View
                                </a>
                              </div>
                            ))
                          ) : (
                            <p className="text-slate-400 text-[11px] italic text-center py-2">No additional document files uploaded.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 6. APPLICATION DETAILS */}
                    {(showAll || activeModalTab === 'APPLICATION') && (
                      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-indigo-700 font-extrabold text-sm uppercase tracking-wider">
                          <Calendar className="w-4 h-4 text-indigo-600" />
                          <span>Application & Submission Details</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="col-span-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Submission Date & Time</p>
                            <p className="font-bold text-indigo-900 font-mono mt-0.5">{formatSubmissionDate(app.appliedAt || app.createdAt)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Application ID</p>
                            <p className="font-bold text-indigo-700 font-mono mt-0.5">{appIdFormatted}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Application Status</p>
                            <p className="font-bold text-slate-800 mt-0.5">{app.status}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Payment Status</p>
                            <p className="font-bold text-emerald-700 mt-0.5">{app.latestPayment?.status || 'Pending'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Payment UTR Number</p>
                            <p className="font-semibold text-slate-700 font-mono mt-0.5">{app.latestPayment?.utrNumber || '-'}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Payment Submission Date</p>
                            <p className="font-semibold text-slate-700 mt-0.5">{app.latestPayment?.paymentDate ? new Date(app.latestPayment.paymentDate).toLocaleDateString('en-IN') : '-'}</p>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                </div>

                {/* Modal Footer */}
                <div className="bg-slate-100 p-4 border-t border-slate-200 flex items-center justify-end shrink-0">
                  <button
                    onClick={() => setSelectedStudentApp(null)}
                    className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
                  >
                    Close Window
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          height: 12px;
          width: 12px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 8px;
          border: 3px solid #f1f5f9;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #94a3b8;
        }
      `}} />
    </div>
  );
}
