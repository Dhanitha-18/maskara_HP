import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, Download, Filter, FileSpreadsheet, ChevronDown, ChevronRight, User } from 'lucide-react';
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
  if (val === undefined || val === null || String(val).trim() === '' || val === '-') return 'Not Available';
  return val;
};

export default function StudentDatabase() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [genderFilter, setGenderFilter] = useState('ALL');
  const [blockFilter, setBlockFilter] = useState('ALL');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

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

      // Apply Block Filter
      if (blockFilter !== 'ALL') {
        const blockName = app.allocations?.[0]?.bed?.room?.block?.name || app.blockName;
        if (blockName !== blockFilter) return false;
      }

      return true;
    });
  }, [enrichedApplications, searchQuery, statusFilter, genderFilter, blockFilter]);  const handleExportExcel = () => {
    if (!filteredApplications || filteredApplications.length === 0) return;
    
    const headers = [
      'Timestamp',
      'BMSIT ID',
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
      'Father Contact Number',
      'Father Email',
      'Mother Name',
      'Mother Contact Number',
      'Mother Email',
      'Communication Address',
      'Local Guardian Name',
      'Relationship',
      'Local Guardian Phone Number',
      'Local Guardian Address',
      'Existing Health Issues',
      'Allergies',
      'Current Medications',
      'Emergency Contact Number'
    ];

    const rows = filteredApplications.map((app: any) => {
      const dobStr = app.dob ? new Date(app.dob).toLocaleDateString('en-IN') : 'Not Available';
      return [
        formatSubmissionDate(app.appliedAt || app.createdAt),
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
        displayVal(app.fatherPhone),
        displayVal(app.fatherEmail),
        displayVal(app.motherName),
        displayVal(app.motherPhone),
        displayVal(app.motherEmail),
        displayVal(app.communicationAddress),
        displayVal(app.guardianName),
        displayVal(app.guardianRelationship),
        displayVal(app.guardianPhone),
        displayVal(app.guardianAddress || app.guardianEmail),
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
              placeholder="Search name, USN, phone, email..." 
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
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50 sticky left-0 bg-indigo-50 shadow-[1px_0_0_rgba(199,210,254,0.5)] z-30">BMSIT ID</th>
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
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Father Contact Number</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Father Email</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Mother Name</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Mother Contact Number</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Mother Email</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Communication Address</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Local Guardian Name</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Relationship</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Local Guardian Phone Number</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Local Guardian Address</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Existing Health Issues</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Allergies</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider border-r border-indigo-200/50">Current Medications</th>
                  <th className="p-3 text-[10px] font-black text-indigo-900 uppercase tracking-wider">Emergency Contact Number</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredApplications.map((app: any, idx: number) => {
                  return (
                    <React.Fragment key={app.id}>
                      <motion.tr 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-slate-50 transition-colors group cursor-pointer"
                        onClick={() => setExpandedRow(expandedRow === app.id ? null : app.id)}
                      >
                        <td className="p-3 text-center border-r border-slate-100">
                          <button className="text-slate-400 hover:text-indigo-600 transition-colors">
                            {expandedRow === app.id ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
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
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100 sticky left-0 bg-white group-hover:bg-indigo-50/50 shadow-[1px_0_0_rgba(241,245,249,1)] group-hover:shadow-[1px_0_0_rgba(199,210,254,0.5)] z-10 transition-colors font-mono">{displayVal(app.bmsitId || app.usn)}</td>
                        <td className="p-3 text-sm font-bold text-slate-800 border-r border-slate-100">{displayVal(app.studentName)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.gender)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.phoneNumber)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.email)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{app.dob ? new Date(app.dob).toLocaleDateString('en-IN') : 'Not Available'}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.program)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.semester || app.yearSem)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.branch || app.department)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.bloodGroup)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.aadhaarNumber)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.nationality)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.religion)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100 max-w-[200px] truncate" title={app.permanentAddress || app.address}>{displayVal(app.permanentAddress || app.address)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.fatherName)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.fatherPhone)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.fatherEmail)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.motherName)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.motherPhone)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.motherEmail)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100 max-w-[200px] truncate" title={app.communicationAddress}>{displayVal(app.communicationAddress)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.guardianName)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.guardianRelationship)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.guardianPhone)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100 max-w-[200px] truncate" title={app.guardianAddress || app.guardianEmail}>{displayVal(app.guardianAddress || app.guardianEmail)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.healthIssues || app.medicalInfo)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.allergies)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600 border-r border-slate-100">{displayVal(app.currentMedications)}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600">{displayVal(app.emergencyContact)}</td>
                      </motion.tr>
                      <AnimatePresence>
                        {expandedRow === app.id && (
                          <motion.tr
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-slate-50/80 border-b border-slate-200 shadow-inner overflow-hidden"
                          >
                            <td colSpan={32} className="p-0">
                              <div className="p-6">
                                <h4 className="text-lg font-black text-slate-800 mb-4 border-b border-slate-200 pb-2">Full Student Information</h4>
                                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                                  {/* Left Col: Photo */}
                                  <div className="lg:col-span-1 flex flex-col items-center justify-center bg-slate-100/50 rounded-2xl p-4 border border-slate-200">
                                    <div className="w-32 h-40 rounded-xl border-2 border-slate-200 bg-white flex flex-col items-center justify-center overflow-hidden shadow-sm relative">
                                      {app.photoUrl || app.passportPhoto ? (
                                        <img 
                                          src={getPhotoUrl(app.photoUrl || app.passportPhoto)} 
                                          alt={app.studentName} 
                                          className="w-full h-full object-cover" 
                                        />
                                      ) : (
                                        <div className="flex flex-col items-center justify-center text-slate-400">
                                          <User className="w-12 h-12 text-slate-300" />
                                          <span className="text-[10px] font-bold uppercase tracking-wider mt-1">No Photo</span>
                                        </div>
                                      )}
                                    </div>
                                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 mt-3">
                                      Passport Size Photograph
                                    </span>
                                  </div>

                                  {/* Right Col: Fields Grid in Exact Sequence Starting with 1. Timestamp */}
                                  <div className="lg:col-span-3 space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                      <div className="space-y-1 sm:col-span-2"><p className="text-xs font-bold text-indigo-600 uppercase font-extrabold">1. Timestamp (Submission Date & Time)</p><p className="text-sm font-semibold text-indigo-900 font-mono">{formatSubmissionDate(app.appliedAt || app.createdAt)}</p></div>
                                      <div className="space-y-1"><p className="text-xs font-bold text-slate-500 uppercase">2. BMSIT ID</p><p className="text-sm font-semibold text-slate-800">{displayVal(app.bmsitId || app.usn)}</p></div>
                                      <div className="space-y-1"><p className="text-xs font-bold text-slate-500 uppercase">3. Name</p><p className="text-sm font-semibold text-slate-800">{displayVal(app.studentName)}</p></div>
                                      <div className="space-y-1"><p className="text-xs font-bold text-slate-500 uppercase">4. Gender</p><p className="text-sm font-semibold text-slate-800">{displayVal(app.gender)}</p></div>
                                      <div className="space-y-1"><p className="text-xs font-bold text-slate-500 uppercase">5. Contact Number</p><p className="text-sm font-semibold text-slate-800">{displayVal(app.phoneNumber)}</p></div>
                                      <div className="space-y-1"><p className="text-xs font-bold text-slate-500 uppercase">6. Email</p><p className="text-sm font-semibold text-slate-800">{displayVal(app.email)}</p></div>
                                      <div className="space-y-1"><p className="text-xs font-bold text-slate-500 uppercase">7. Date of Birth</p><p className="text-sm font-semibold text-slate-800">{app.dob ? new Date(app.dob).toLocaleDateString('en-IN') : 'Not Available'}</p></div>
                                      <div className="space-y-1"><p className="text-xs font-bold text-slate-500 uppercase">8. Program</p><p className="text-sm font-semibold text-slate-800">{displayVal(app.program)}</p></div>
                                      <div className="space-y-1"><p className="text-xs font-bold text-slate-500 uppercase">9. Semester</p><p className="text-sm font-semibold text-slate-800">{displayVal(app.semester || app.yearSem)}</p></div>
                                      <div className="space-y-1"><p className="text-xs font-bold text-slate-500 uppercase">10. Branch</p><p className="text-sm font-semibold text-slate-800">{displayVal(app.branch || app.department)}</p></div>
                                      <div className="space-y-1"><p className="text-xs font-bold text-slate-500 uppercase">11. Blood Group</p><p className="text-sm font-semibold text-slate-800">{displayVal(app.bloodGroup)}</p></div>
                                      <div className="space-y-1"><p className="text-xs font-bold text-slate-500 uppercase">12. Aadhaar Number</p><p className="text-sm font-semibold text-slate-800">{displayVal(app.aadhaarNumber)}</p></div>
                                      <div className="space-y-1"><p className="text-xs font-bold text-slate-500 uppercase">13. Nationality</p><p className="text-sm font-semibold text-slate-800">{displayVal(app.nationality)}</p></div>
                                      <div className="space-y-1"><p className="text-xs font-bold text-slate-500 uppercase">14. Religion</p><p className="text-sm font-semibold text-slate-800">{displayVal(app.religion)}</p></div>
                                      <div className="space-y-1 sm:col-span-2"><p className="text-xs font-bold text-slate-500 uppercase">15. Permanent Address</p><p className="text-sm font-semibold text-slate-800">{displayVal(app.permanentAddress || app.address)}</p></div>
                                      <div className="space-y-1"><p className="text-xs font-bold text-slate-500 uppercase">16. Father Name</p><p className="text-sm font-semibold text-slate-800">{displayVal(app.fatherName)}</p></div>
                                      <div className="space-y-1"><p className="text-xs font-bold text-slate-500 uppercase">17. Father Contact Number</p><p className="text-sm font-semibold text-slate-800">{displayVal(app.fatherPhone)}</p></div>
                                      <div className="space-y-1"><p className="text-xs font-bold text-slate-500 uppercase">18. Father Email</p><p className="text-sm font-semibold text-slate-800">{displayVal(app.fatherEmail)}</p></div>
                                      <div className="space-y-1"><p className="text-xs font-bold text-slate-500 uppercase">19. Mother Name</p><p className="text-sm font-semibold text-slate-800">{displayVal(app.motherName)}</p></div>
                                      <div className="space-y-1"><p className="text-xs font-bold text-slate-500 uppercase">20. Mother Contact Number</p><p className="text-sm font-semibold text-slate-800">{displayVal(app.motherPhone)}</p></div>
                                      <div className="space-y-1"><p className="text-xs font-bold text-slate-500 uppercase">21. Mother Email</p><p className="text-sm font-semibold text-slate-800">{displayVal(app.motherEmail)}</p></div>
                                      <div className="space-y-1 sm:col-span-2"><p className="text-xs font-bold text-slate-500 uppercase">22. Communication Address</p><p className="text-sm font-semibold text-slate-800">{displayVal(app.communicationAddress)}</p></div>
                                      <div className="space-y-1"><p className="text-xs font-bold text-slate-500 uppercase">23. Local Guardian Name</p><p className="text-sm font-semibold text-slate-800">{displayVal(app.guardianName)}</p></div>
                                      <div className="space-y-1"><p className="text-xs font-bold text-slate-500 uppercase">24. Relationship</p><p className="text-sm font-semibold text-slate-800">{displayVal(app.guardianRelationship)}</p></div>
                                      <div className="space-y-1"><p className="text-xs font-bold text-slate-500 uppercase">25. Local Guardian Phone Number</p><p className="text-sm font-semibold text-slate-800">{displayVal(app.guardianPhone)}</p></div>
                                      <div className="space-y-1 sm:col-span-2"><p className="text-xs font-bold text-slate-500 uppercase">26. Local Guardian Address</p><p className="text-sm font-semibold text-slate-800">{displayVal(app.guardianAddress || app.guardianEmail)}</p></div>
                                      <div className="space-y-1"><p className="text-xs font-bold text-slate-500 uppercase">27. Existing Health Issues</p><p className="text-sm font-semibold text-slate-800">{displayVal(app.healthIssues || app.medicalInfo)}</p></div>
                                      <div className="space-y-1"><p className="text-xs font-bold text-slate-500 uppercase">28. Allergies</p><p className="text-sm font-semibold text-slate-800">{displayVal(app.allergies)}</p></div>
                                      <div className="space-y-1"><p className="text-xs font-bold text-slate-500 uppercase">29. Current Medications</p><p className="text-sm font-semibold text-slate-800">{displayVal(app.currentMedications)}</p></div>
                                      <div className="space-y-1"><p className="text-xs font-bold text-slate-500 uppercase">30. Emergency Contact Number</p><p className="text-sm font-semibold text-slate-800">{displayVal(app.emergencyContact)}</p></div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
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
