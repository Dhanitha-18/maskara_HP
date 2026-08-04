import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  Download, 
  ChevronDown, 
  ChevronUp, 
  Star, 
  Loader2, 
  User, 
  CreditCard, 
  Utensils, 
  Building2, 
  ShieldCheck, 
  Calendar, 
  MessageSquare, 
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function FeedbackControl() {
  const currentMonthName = new Date().toLocaleString('en-US', { month: 'long' });
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthName);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const { data: feedbackList, isLoading, isError } = useQuery({
    queryKey: ['feedback'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/feedback');
      if (!res.ok) throw new Error('Failed to fetch feedback');
      return res.json();
    },
    refetchInterval: 5000
  });

  // Filter feedback by selected month & search query
  const filteredFeedback = useMemo(() => {
    if (!feedbackList || !Array.isArray(feedbackList)) return [];

    return feedbackList.filter((item: any) => {
      const createdDate = item.createdAt ? new Date(item.createdAt) : new Date();
      const monthName = createdDate.toLocaleString('en-US', { month: 'long' });

      // Month match filter
      const matchesMonth = monthName.toLowerCase() === selectedMonth.toLowerCase();
      if (!matchesMonth) return false;

      // Search query filter (Name, USN, Block, Room Number)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = item.studentName?.toLowerCase().includes(q);
        const usnMatch = item.usn?.toLowerCase().includes(q);
        const blockMatch = item.block?.toLowerCase().includes(q);
        const roomMatch = item.roomNumber?.toLowerCase().includes(q);
        return nameMatch || usnMatch || blockMatch || roomMatch;
      }

      return true;
    });
  }, [feedbackList, selectedMonth, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Export selected month feedback to XLSX
  const handleExportXLSX = () => {
    if (filteredFeedback.length === 0) return;

    const dataToExport = filteredFeedback.map((item: any) => ({
      'Feedback ID': item.id || item.feedbackId || 'FBD-RECORD',
      'Student Name': item.studentName || 'N/A',
      'USN': item.usn || 'N/A',
      'Block': item.block || 'Block A',
      'Room Number': item.roomNumber || 'N/A',
      'Paid PG Fee': item.paidPgAmount || 'Yes',
      'Overall Rating': `${item.rating || 5} Stars`,
      'Food Quality': item.foodQuality || 'Good',
      'Food as per Menu': item.foodServedAsPerMenu || 'Yes',
      'Internet Services': item.internetRating || 'Good',
      'RO Water Availability': item.roWaterAvailability || 'Sufficient',
      'Power Backup & Hot Water': item.powerHotWaterRating || 'Good',
      'Washing Machine Maintenance': item.washingMachineRating || 'Good',
      'Cot, Desk & Wardrobe': item.roomFacilitiesRating || 'Good',
      'Security Measures': item.securityRating || 'Good',
      'Hygiene & Maintenance': item.hygieneRating || 'Good',
      'Grievance Response': item.grievanceResponseRating || 'Good',
      'Suggestions': item.suggestions || item.message || 'None',
      'Additional Comments': item.comments || 'None',
      'Submitted Date': item.createdAt ? new Date(item.createdAt).toLocaleString('en-GB') : 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Feedback_${selectedMonth}`);
    XLSX.writeFile(workbook, `Student_Feedback_${selectedMonth}_2026.xlsx`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mr-3" />
        <span className="text-sm font-bold text-slate-600">Loading student feedback database...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 bg-red-50 text-red-600 rounded-2xl border border-red-200 text-center font-semibold text-sm">
        Failed to load feedback data. Please ensure the backend server is running.
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      
      {/* 1. Header & Control Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            Feedback for {selectedMonth}
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Review detailed monthly student feedback responses and hostel satisfaction ratings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Total Feedback Count Badge */}
          <div className="bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-xl flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-black text-indigo-900">
              Total: <span className="text-indigo-600 font-extrabold text-sm">{filteredFeedback.length}</span>
            </span>
          </div>

          {/* Download Sheet (.XLSX) Button */}
          <button
            onClick={handleExportXLSX}
            disabled={filteredFeedback.length === 0}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
            title="Export selected month feedback to XLSX"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download Sheet (.XLSX)</span>
          </button>
        </div>
      </div>

      {/* 2. Filters Bar: Search & Month Selection */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by Name, USN, Block, or Room..."
            className="w-full pl-10 pr-4 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all"
          />
        </div>

        {/* Month Dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Select Month:</span>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold px-3 py-2 rounded-xl focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none cursor-pointer w-full sm:w-48"
          >
            {MONTHS.map(month => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Professional Table Layout */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                <th className="p-4 pl-6">Student Name</th>
                <th className="p-4">USN</th>
                <th className="p-4">Block</th>
                <th className="p-4">Room Number</th>
                <th className="p-4 text-right pr-6">Action / Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filteredFeedback.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400">
                    <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-600">No feedback submissions found for {selectedMonth}.</p>
                    <p className="text-xs text-slate-400 mt-1">Try selecting a different month or adjusting your search terms.</p>
                  </td>
                </tr>
              ) : (
                filteredFeedback.map((item: any, index: number) => {
                  const isExpanded = !!expandedRows[item.id || index];
                  return (
                    <React.Fragment key={item.id || index}>
                      <tr className={`hover:bg-slate-50/80 transition-colors ${isExpanded ? 'bg-indigo-50/20' : ''}`}>
                        <td className="p-4 pl-6 font-bold text-slate-900">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center shrink-0">
                              {item.studentName?.charAt(0) || 'S'}
                            </div>
                            <div>
                              <p className="text-xs font-extrabold text-slate-900">{item.studentName}</p>
                              <p className="text-[10px] text-slate-400 font-semibold">{item.department || 'Computer Science & Engg'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-mono font-bold text-slate-800">
                          {item.usn}
                        </td>
                        <td className="p-4 font-bold text-slate-800">
                          <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-200">
                            {item.block || 'Block A'}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-slate-800">
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
                            {item.roomNumber || 'Room 304'}
                          </span>
                        </td>
                        <td className="p-4 text-right pr-6">
                          <button
                            onClick={() => toggleExpand(item.id || index.toString())}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-xl text-xs font-bold transition-all border border-slate-200 hover:border-indigo-200 cursor-pointer"
                          >
                            <span>{isExpanded ? 'Hide Details' : 'Expand'}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      </tr>

                      {/* 4. EXPANDED VIEW DRAWER */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={5} className="p-0 bg-slate-50/60">
                            <div className="p-6 border-y border-slate-200 space-y-6">
                              
                              {/* Header Metadata */}
                              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white px-2.5 py-0.5 rounded-full">
                                    ID: {item.feedbackId || item.id?.substring(0, 8).toUpperCase() || 'FBD-REC'}
                                  </span>
                                  <span className="text-xs text-slate-500 font-bold flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                    Submitted: {item.createdAt ? new Date(item.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '04 August 2026, 12:00 PM'}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-500">Overall Rating:</span>
                                  <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                                    {[...Array(5)].map((_, i) => (
                                      <Star 
                                        key={i} 
                                        className={`w-3.5 h-3.5 ${i < (item.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} 
                                      />
                                    ))}
                                    <span className="text-xs font-black text-amber-800 ml-1">{item.rating || 5}/5</span>
                                  </div>
                                </div>
                              </div>

                              {/* 3 Grid Sections Corresponding to Form Divisions */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                
                                {/* Card 1: Mess & Food Quality */}
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                    <Utensils className="w-4 h-4 text-amber-600" />
                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Mess & Food Quality</h4>
                                  </div>
                                  <div className="space-y-1.5 text-xs font-semibold text-slate-600">
                                    <p><span className="text-slate-400">Paid PG Fee to College:</span> <strong className="text-slate-800">{item.paidPgAmount || 'Yes'}</strong></p>
                                    <p><span className="text-slate-400">Overall Food Quality:</span> <strong className="text-slate-800">{item.foodQuality || 'Good'}</strong></p>
                                    <p><span className="text-slate-400">Served as Per Menu:</span> <strong className="text-slate-800">{item.foodServedAsPerMenu || 'Yes'}</strong></p>
                                  </div>
                                </div>

                                {/* Card 2: Facilities & Infrastructure */}
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                    <Building2 className="w-4 h-4 text-blue-600" />
                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Facilities & Infrastructure</h4>
                                  </div>
                                  <div className="space-y-1.5 text-xs font-semibold text-slate-600">
                                    <p><span className="text-slate-400">Internet Services:</span> <strong className="text-slate-800">{item.internetRating || 'Good'}</strong></p>
                                    <p><span className="text-slate-400">RO Drinking Water:</span> <strong className="text-slate-800">{item.roWaterAvailability || 'Sufficient'}</strong></p>
                                    <p><span className="text-slate-400">Power Backup & Hot Water:</span> <strong className="text-slate-800">{item.powerHotWaterRating || 'Good'}</strong></p>
                                    <p><span className="text-slate-400">Washing Machine:</span> <strong className="text-slate-800">{item.washingMachineRating || 'Good'}</strong></p>
                                    <p><span className="text-slate-400">Cot, Desk & Wardrobe:</span> <strong className="text-slate-800">{item.roomFacilitiesRating || 'Good'}</strong></p>
                                  </div>
                                </div>

                                {/* Card 3: Security, Hygiene & Grievances */}
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Security, Hygiene & Grievances</h4>
                                  </div>
                                  <div className="space-y-1.5 text-xs font-semibold text-slate-600">
                                    <p><span className="text-slate-400">Security Measures:</span> <strong className="text-slate-800">{item.securityRating || 'Good'}</strong></p>
                                    <p><span className="text-slate-400">Overall Hygiene:</span> <strong className="text-slate-800">{item.hygieneRating || 'Good'}</strong></p>
                                    <p><span className="text-slate-400">Grievance Response:</span> <strong className="text-slate-800">{item.grievanceResponseRating || 'Good'}</strong></p>
                                  </div>
                                </div>

                              </div>

                              {/* Section E: Suggestions & Additional Comments */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                                  <h5 className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Suggestions for Improvement</h5>
                                  <p className="text-xs text-slate-700 font-medium leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    {item.suggestions || item.message || 'No specific suggestions provided.'}
                                  </p>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                                  <h5 className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Additional Comments</h5>
                                  <p className="text-xs text-slate-700 font-medium leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    {item.comments || item.message || 'No additional comments provided.'}
                                  </p>
                                </div>
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
