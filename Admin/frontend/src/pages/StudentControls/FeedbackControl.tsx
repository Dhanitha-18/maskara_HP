import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  Loader2, 
  User, 
  MessageSquare, 
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Settings,
  Link,
  Power,
  Save
} from 'lucide-react';
import * as XLSX from 'xlsx';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function FeedbackControl() {
  const currentMonthName = new Date().toLocaleString('en-US', { month: 'long' });
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthName);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Google Form Config State
  const [googleFormUrl, setGoogleFormUrl] = useState<string>('');
  const [formEnabled, setFormEnabled] = useState<boolean>(true);
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Fetch Google Form Config
  useEffect(() => {
    fetch('http://localhost:5000/api/feedback/config')
      .then(res => res.json())
      .then(data => {
        if (data.googleFormUrl) setGoogleFormUrl(data.googleFormUrl);
        if (typeof data.enabled === 'boolean') setFormEnabled(data.enabled);
      })
      .catch(() => {});
  }, []);

  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    setSaveSuccessMsg(null);
    try {
      const res = await fetch('http://localhost:5000/api/feedback/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleFormUrl,
          enabled: formEnabled
        })
      });
      if (res.ok) {
        setSaveSuccessMsg('Google Form configuration updated successfully!');
        setTimeout(() => setSaveSuccessMsg(null), 3000);
      }
    } catch {
      alert('Failed to update Google Form configuration.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Fetch Feedback Submissions List
  const { data: feedbackList, isLoading: isFeedbackLoading } = useQuery({
    queryKey: ['feedback'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/feedback');
      if (!res.ok) throw new Error('Failed to fetch feedback');
      return res.json();
    },
    refetchInterval: 5000
  });

  // Fetch All Applications to render complete student list with Responded / Not Responded status
  const { data: applicationsList, isLoading: isAppsLoading } = useQuery({
    queryKey: ['applications_all'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/applications');
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 5000
  });

  const isLoading = isFeedbackLoading || isAppsLoading;

  // Map students with feedback response status (Responded / Not Responded)
  const studentFeedbackStatuses = useMemo(() => {
    const apps = Array.isArray(applicationsList) ? applicationsList : [];
    const fbs = Array.isArray(feedbackList) ? feedbackList : [];

    // Create lookup map of USNs who responded
    const respondedMap = new Map<string, any>();
    fbs.forEach(item => {
      if (item.usn) {
        const u = String(item.usn).trim().toUpperCase();
        respondedMap.set(u, item);
      }
    });

    // Merge applications list
    const combined = apps.map((app: any) => {
      const u = String(app.usn || '').trim().toUpperCase();
      const fbRecord = respondedMap.get(u);
      return {
        id: app.id,
        studentName: app.studentName || 'Student',
        usn: app.usn || 'N/A',
        department: app.department || 'General',
        phoneNumber: app.phoneNumber || 'N/A',
        hasResponded: Boolean(fbRecord),
        submittedAt: fbRecord?.createdAt || null
      };
    });

    // Also include any feedback submissions not matched with application
    fbs.forEach(fb => {
      const u = String(fb.usn || '').trim().toUpperCase();
      const alreadyInList = combined.some(c => String(c.usn).trim().toUpperCase() === u);
      if (!alreadyInList) {
        combined.push({
          id: fb.id,
          studentName: fb.studentName || 'Student',
          usn: fb.usn || 'N/A',
          department: fb.department || 'General',
          phoneNumber: fb.phoneNumber || 'N/A',
          hasResponded: true,
          submittedAt: fb.createdAt || null
        });
      }
    });

    return combined.filter(student => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        student.studentName.toLowerCase().includes(q) ||
        student.usn.toLowerCase().includes(q)
      );
    });
  }, [applicationsList, feedbackList, searchQuery]);

  // Export to XLSX
  const handleExportXLSX = () => {
    if (studentFeedbackStatuses.length === 0) return;

    const dataToExport = studentFeedbackStatuses.map(item => ({
      'Student Name': item.studentName,
      'USN': item.usn,
      'Department': item.department,
      'Feedback Status': item.hasResponded ? 'Responded' : 'Not Responded',
      'Submitted Date': item.submittedAt ? new Date(item.submittedAt).toLocaleString('en-GB') : 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Feedback_Status_${selectedMonth}`);
    XLSX.writeFile(workbook, `Student_Feedback_Status_${selectedMonth}_2026.xlsx`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mr-3" />
        <span className="text-sm font-bold text-slate-600">Loading student feedback status...</span>
      </div>
    );
  }

  const respondedCount = studentFeedbackStatuses.filter(s => s.hasResponded).length;
  const pendingCount = studentFeedbackStatuses.filter(s => !s.hasResponded).length;

  return (
    <div className="space-y-6 font-sans">
      
      {/* 1. Admin Google Form Settings & Embed Management Box */}
      <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Feedback Google Form Management (Admin Controls)
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-600">Form Status:</span>
            <button
              type="button"
              onClick={() => setFormEnabled(!formEnabled)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                formEnabled
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-slate-100 text-slate-600 border border-slate-300'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{formEnabled ? 'Enabled' : 'Disabled'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-9 space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
              Google Form Link / Embed URL for Student Portal
            </label>
            <div className="relative">
              <Link className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={googleFormUrl}
                onChange={e => setGoogleFormUrl(e.target.value)}
                placeholder="Paste Google Form link or embed URL (e.g. https://docs.google.com/forms/...)"
                className="w-full pl-9 pr-4 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none"
              />
            </div>
          </div>

          <div className="md:col-span-3 flex items-end">
            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={isSavingConfig}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingConfig ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </div>

        {saveSuccessMsg && (
          <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* 2. Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            Feedback Submissions for {selectedMonth}
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Tracks student name and whether the student has responded for feedback or not.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-emerald-50 border border-emerald-100 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-black text-emerald-900">
              Responded: <span className="text-emerald-600 font-extrabold">{respondedCount}</span>
            </span>
          </div>

          <div className="bg-slate-100 border border-slate-200 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5">
            <XCircle className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-black text-slate-700">
              Not Responded: <span className="text-slate-600 font-extrabold">{pendingCount}</span>
            </span>
          </div>

          <button
            onClick={handleExportXLSX}
            disabled={studentFeedbackStatuses.length === 0}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Sheet (.XLSX)</span>
          </button>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by Student Name or USN..."
            className="w-full pl-10 pr-4 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Select Month:</span>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold px-3 py-2 rounded-xl outline-none cursor-pointer w-full sm:w-48"
          >
            {MONTHS.map(month => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. Student Feedback Status Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                <th className="p-4 pl-6">Student Name</th>
                <th className="p-4">USN</th>
                <th className="p-4">Department</th>
                <th className="p-4 text-center">Feedback Status</th>
                <th className="p-4 text-right pr-6">Submission Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {studentFeedbackStatuses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400">
                    <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-600">No student records found.</p>
                  </td>
                </tr>
              ) : (
                studentFeedbackStatuses.map((item: any, index: number) => (
                  <tr key={item.id || index} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 pl-6 font-bold text-slate-900">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center shrink-0">
                          {item.studentName?.charAt(0) || 'S'}
                        </div>
                        <span className="text-xs font-extrabold text-slate-900">{item.studentName}</span>
                      </div>
                    </td>

                    <td className="p-4 font-mono font-bold text-slate-800">
                      {item.usn}
                    </td>

                    <td className="p-4 font-bold text-slate-600">
                      {item.department}
                    </td>

                    <td className="p-4 text-center">
                      {item.hasResponded ? (
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Responded
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-600 border border-slate-300 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
                          <XCircle className="w-3.5 h-3.5 text-slate-400" />
                          Not Responded
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-right pr-6 font-semibold text-slate-500 text-[11px]">
                      {item.submittedAt ? new Date(item.submittedAt).toLocaleString('en-GB') : 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
