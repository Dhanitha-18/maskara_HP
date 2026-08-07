import React, { useState, useEffect, useRef } from 'react';
import { HeroBanner } from '../../components/layout/HeroBanner';
import { COMPLAINTS_HERO_IMAGE } from '../../assets/heroBanners';
import { usePayment } from '../../context/PaymentContext';
import { socket } from '../../lib/socket';
import { 
  Send, ThumbsUp, CheckCircle, Clock, Filter, Search, 
  PhoneCall, ShieldAlert, FileText, ChevronRight, CheckCircle2,
  Loader2
} from 'lucide-react';

interface CommentItem {
  id: string;
  author: string;
  message: string;
  time: string;
}

interface ComplaintItem {
  id: string;
  category: string;
  subject: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  date: string;
  status: 'Pending' | 'In Progress' | 'Resolved';
  upvotes: number;
  assignedTechnician?: string;
  assignedTo?: string;
  resolutionNotes?: string;
  estimatedResolution?: string;
  location: string;
  upvotedByMe?: boolean;
  comments?: CommentItem[];
  imageUrl?: string;
}

export const formatTicketId = (rawId: string): string => {
  if (!rawId) return '#TKT-1001';
  const cleanId = rawId.trim();
  
  if (cleanId.startsWith('#TKT-')) return cleanId;
  if (cleanId.startsWith('#CMP-') || cleanId.startsWith('#TCK-')) {
    return cleanId.replace(/^#CMP-|^#TCK-/, '#TKT-');
  }
  if (cleanId.startsWith('CMP-') || cleanId.startsWith('TKT-') || cleanId.startsWith('TCK-')) {
    return `#${cleanId.replace(/^CMP-|^TCK-/, 'TKT-')}`;
  }
  
  let hash = 0;
  for (let i = 0; i < cleanId.length; i++) {
    hash = (hash * 31 + cleanId.charCodeAt(i)) % 9000;
  }
  const ticketNum = 1000 + Math.abs(hash);
  return `#TKT-${ticketNum}`;
};

export const Complaints: React.FC = () => {
  const { student, hostel } = usePayment();
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter, Search & Sort states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'recent' | 'upvotes' | 'priority'>('recent');

  // Form State
  const [category, setCategory] = useState('Wi-Fi Network');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [location, setLocation] = useState('');
  const [blockName, setBlockName] = useState('Block A');
  const [availableBlocks, setAvailableBlocks] = useState<string[]>([]);
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentPreview, setAttachmentPreview] = useState('');
  const [otherCategory, setOtherCategory] = useState('');

  // Interactive UI Modal & Toast states
  const [activeTrackingComplaint, setActiveTrackingComplaint] = useState<ComplaintItem | null>(null);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [isSuccessToast, setIsSuccessToast] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');

  // Fetch admin-created blocks from backend
  useEffect(() => {
    fetch('/api/blocks')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const names = data.map((b: any) => b.name).filter(Boolean);
          if (names.length > 0) {
            setAvailableBlocks(names);
            if (!names.includes(blockName)) {
              setBlockName(names[0]);
            }
          }
        }
      })
      .catch(err => console.error("Error fetching blocks:", err));
  }, []);
  const detailSectionRef = useRef<HTMLDivElement>(null);

  const studentBlock = 
    (student as any)?.allocatedBlock || 
    (student as any)?.block || 
    (student as any)?.applicationData?.block || 
    (student as any)?.applicationData?.hostelBlock || 
    (student as any)?.applicationData?.roomBlock || 
    hostel?.block || 
    blockName || 
    'Block A';

  const isSameBlock = (cBlockRaw: string, sBlockRaw: string) => {
    if (!cBlockRaw || !sBlockRaw) return false;
    const cb = String(cBlockRaw).toLowerCase().replace(/hostel|block|\s+|-|_/g, '');
    const sb = String(sBlockRaw).toLowerCase().replace(/hostel|block|\s+|-|_/g, '');
    if (!cb || !sb) return false;
    return cb === sb || cb.includes(sb) || sb.includes(cb);
  };

  // Load complaints on mount
  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch('/api/complaints')
      .then(res => res.json())
      .then(data => {
        if (active) {
          // Filter to show ONLY complaints for this student's allocated block or their own tickets
          const studentComplaints = data
            .filter((c: any) => {
              if (c.usn && student.usn && String(c.usn).trim().toUpperCase() === String(student.usn).trim().toUpperCase()) {
                return true;
              }
              return isSameBlock(c.block, studentBlock);
            })
            .map((c: any) => ({
              ...c,
              date: new Date(c.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
              location: `${c.block || 'Block A'} - Floor ${c.floor || 1} - Room ${c.roomNo}`,
              upvotes: c.upvotes || 1,
              comments: c.comments || []
            }));
          setComplaints(studentComplaints);
          setLoading(false);
        }
      })
      .catch(err => {
        if (active) {
          console.error(err);
          setError('Failed to load complaints');
          setLoading(false);
        }
      });

    return () => { active = false; };
  }, [student.usn, studentBlock]);

  // Socket.IO Listener Setup for instant synchronization
  useEffect(() => {
    const handleCreated = (newCmp: any) => {
      const isMine = newCmp.usn && student.usn && String(newCmp.usn).trim().toUpperCase() === String(student.usn).trim().toUpperCase();
      const isSame = isSameBlock(newCmp.block, studentBlock);
      if (isMine || isSame) {
        setComplaints(prev => {
          if (prev.some(c => c.id === newCmp.id)) return prev;
          const mapped = {
            ...newCmp,
            date: new Date(newCmp.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
            location: `${newCmp.block || 'Block A'} - Floor ${newCmp.floor || 1} - Room ${newCmp.roomNo}`,
            upvotes: newCmp.upvotes || 1,
            comments: newCmp.comments || []
          };
          return [mapped, ...prev];
        });
      }
    };

    const handleUpdated = (updatedCmp: any) => {
      const mapped = {
        ...updatedCmp,
        date: new Date(updatedCmp.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
        location: `${updatedCmp.block || 'Block A'} - Floor ${updatedCmp.floor || 1} - Room ${updatedCmp.roomNo}`,
        upvotes: updatedCmp.upvotes || 1,
        comments: updatedCmp.comments || []
      };
      setComplaints(prev => prev.map(c => c.id === updatedCmp.id ? mapped : c));
      setActiveTrackingComplaint(prev => (prev && prev.id === updatedCmp.id ? mapped : prev));
    };

    const handleDeleted = (deletedId: string) => {
      setComplaints(prev => prev.filter(c => c.id !== deletedId));
      setActiveTrackingComplaint(prev => (prev && prev.id === deletedId ? null : prev));
    };

    socket.on('complaint_created', handleCreated);
    socket.on('complaint_updated', handleUpdated);
    socket.on('complaint_deleted', handleDeleted);
    socket.on('data_updated', () => {
      fetch('/api/complaints')
        .then(res => res.json())
        .then(data => {
          const studentComplaints = data
            .filter((c: any) => {
              if (c.usn && student.usn && String(c.usn).trim().toUpperCase() === String(student.usn).trim().toUpperCase()) {
                return true;
              }
              return isSameBlock(c.block, studentBlock);
            })
            .map((c: any) => ({
              ...c,
              date: new Date(c.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
              location: `${c.block || 'Block A'} - Floor ${c.floor || 1} - Room ${c.roomNo}`,
              upvotes: c.upvotes || 1,
              comments: c.comments || []
            }));
          setComplaints(studentComplaints);
        })
        .catch(() => {});
    });

    return () => {
      socket.off('complaint_created', handleCreated);
      socket.off('complaint_updated', handleUpdated);
      socket.off('complaint_deleted', handleDeleted);
    };
  }, [student.usn, studentBlock]);

  // Set default location based on context
  useEffect(() => {
    if (hostel) {
      setLocation(`Room ${hostel.room}`);
      if (hostel.block) setBlockName(hostel.block);
    }
  }, [hostel]);

  // Handle Upvote / Me Too (Real-time sync to Admin, 1-time vote limit per user)
  const handleUpvote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const votedKey = `complaint_voted_${student.usn}_${id}`;
    if (localStorage.getItem(votedKey) === 'true') {
      return;
    }

    // Synchronously set votedKey to eliminate race conditions / multi-clicks
    localStorage.setItem(votedKey, 'true');
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, upvotes: c.upvotes + 1, upvotedByMe: true } : c));

    try {
      const res = await fetch(`/api/complaints/${id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usn: student.usn })
      });
      if (res.ok) {
        const updated = await res.json();
        setComplaints(prev => prev.map(c => c.id === id ? { ...c, upvotes: updated.upvotes, upvotedByMe: true } : c));
      }
    } catch (err) {
      console.error('Failed to like complaint', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !description) {
      alert("Please fill in the complaint subject and description.");
      return;
    }
    if (category === 'Other' && !otherCategory.trim()) {
      alert("Please specify your complaint category.");
      return;
    }

    const finalCategory = category === 'Other' ? otherCategory.trim() : category;

    const payload = {
      studentName: student.name,
      usn: student.usn,
      roomNo: location.replace(/Room\s+/gi, '') || hostel?.room || '304',
      block: blockName || studentBlock || hostel?.block || 'Block A',
      floor: hostel?.floor?.toString() || '1',
      category: finalCategory,
      priority,
      subject,
      description,
      status: 'Pending'
    };

    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to submit complaint');
      
      // Reset form
      setSubject('');
      setDescription('');
      setIsSuccessToast(true);
      setTimeout(() => setIsSuccessToast(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to register complaint on server.');
    }
  };

  const getPriorityStyle = (p: string) => {
    switch (p) {
      case 'Low': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'Medium': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'High': return 'bg-warning/10 text-warning border-warning/20';
      case 'Critical': return 'bg-danger/10 text-danger border-danger/20';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusStyle = (s: string) => {
    switch (s) {
      case 'Pending': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'In Progress': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Resolved': return 'bg-success/10 text-success border-success/20';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const totalCount = complaints.length;
  const inProgressCount = complaints.filter(c => c.status === 'In Progress').length;
  const resolvedCount = complaints.filter(c => c.status === 'Resolved').length;

  return (
    <div className="space-y-8 animate-fadeIn pb-12 text-left">
      <HeroBanner 
        image={COMPLAINTS_HERO_IMAGE}
        title="Grievance & Maintenance Redressal"
      />

      {/* Toast Notification */}
      {isSuccessToast && (
        <div className="bg-success text-white p-4 rounded-xl shadow-lg flex items-center justify-between animate-fadeIn text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-bold">Grievance ticket submitted successfully! Maintenance warden notified.</span>
          </div>
          <button onClick={() => setIsSuccessToast(false)} className="text-white text-sm font-bold">✕</button>
        </div>
      )}

      {/* Top Quick Stats Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-semibold">
        <div className="bg-white border border-border p-4 rounded-2xl shadow-soft flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Total Logged</span>
            <span className="text-xl font-black text-slate-900 font-mono mt-0.5 block">{totalCount} Tickets</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-border p-4 rounded-2xl shadow-soft flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">In Progress</span>
            <span className="text-xl font-black text-blue-600 font-mono mt-0.5 block">{inProgressCount} Active</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-border p-4 rounded-2xl shadow-soft flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Resolved SLA</span>
            <span className="text-xl font-black text-success font-mono mt-0.5 block">{resolvedCount} Tickets</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-success/10 text-success flex items-center justify-center font-bold">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Logged Complaints List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-border p-6 rounded-2xl shadow-soft space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-text uppercase tracking-wider">Complaint History Log</h3>
                <p className="text-[11px] text-text-muted mt-0.5 font-semibold">Monitor registered grievances</p>
              </div>
            </div>

            {/* Complaints Items Container */}
            <div className="space-y-4 pt-2">
              {loading ? (
                <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              ) : error ? (
                <div className="text-center py-8 text-danger font-semibold">{error}</div>
              ) : complaints.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-border rounded-xl text-text-muted text-xs font-semibold">
                  No complaints registered yet.
                </div>
              ) : (
                complaints.map(item => (
                  <div 
                    key={item.id} 
                    className="border border-border rounded-2xl p-5 space-y-3 bg-white shadow-sm"
                  >
                    <div className="flex flex-wrap justify-between items-start gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-text-muted">
                          <span className="text-primary font-mono font-bold bg-primary/10 border border-primary/20 px-2 py-0.5 rounded text-[11px]">
                            {formatTicketId(item.id)}
                          </span>
                          <span>• {item.date}</span>
                          <span>• {item.location}</span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-black text-slate-850 leading-snug">
                          {item.subject}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`text-[8.5px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getPriorityStyle(item.priority)}`}>
                          {item.priority}
                        </span>
                        <span className={`text-[8.5px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getStatusStyle(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-[11px] text-text-muted leading-relaxed font-semibold">{item.description}</p>
                    
                    <div className="flex flex-wrap items-center justify-between border-t border-slate-100 pt-3 text-[10px] text-text-muted font-bold gap-2">
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">{item.category}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        {(() => {
                          const isVoted = item.upvotedByMe || localStorage.getItem(`complaint_voted_${student.usn}_${item.id}`) === 'true';
                          return (
                            <button
                              type="button"
                              onClick={(e) => handleUpvote(item.id, e)}
                              disabled={isVoted}
                              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[10px] font-bold transition-all ${
                                isVoted 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 cursor-not-allowed opacity-90' 
                                  : 'bg-slate-50 text-slate-600 border-border hover:bg-slate-100 cursor-pointer'
                              }`}
                            >
                              <ThumbsUp className={`w-3 h-3 ${isVoted ? 'fill-emerald-600 text-emerald-600' : ''}`} />
                              <span>{isVoted ? `Supported (${item.upvotes || 1}) ✓` : `Me Too (${item.upvotes || 1})`}</span>
                            </button>
                          );
                        })()}
                      </div>
                    </div>

                  </div>
                ))
              )}
            </div>

          </div>
        </div>

        {/* Right 1 Column: File New Grievance Form */}
        <div className="bg-white border border-border p-6 rounded-2xl shadow-soft space-y-5 h-fit text-xs font-semibold">
          <div>
            <h3 className="text-sm font-black text-text uppercase tracking-wider">File New Grievance</h3>
            <p className="text-[11px] text-text-muted mt-0.5 font-semibold">Directly alerts hostel warden & maintenance team</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Category *</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-border rounded-xl p-2.5 font-bold outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                <option value="Wi-Fi Network">Wi-Fi Network</option>
                <option value="Electrical">Electrical</option>
                <option value="Plumbing">Plumbing</option>
                <option value="Housekeeping">Housekeeping</option>
                <option value="Mess Food">Mess Food</option>
                <option value="Carpentry / Furniture">Carpentry / Furniture</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {category === 'Other' && (
              <div className="space-y-1 animate-fadeIn">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Specify Complaint Category *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Noise Complaint, Hot Water Issue..."
                  value={otherCategory}
                  onChange={e => setOtherCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-border rounded-xl p-2.5 font-bold outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Block Name *</label>
                <select
                  value={blockName}
                  onChange={e => setBlockName(e.target.value)}
                  className="w-full bg-slate-50 border border-border rounded-xl p-2.5 font-bold outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                >
                  {(availableBlocks.length > 0 ? availableBlocks : ['Block A', 'Block B', 'Block C', 'Block D', 'Main Building']).map(blk => (
                    <option key={blk} value={blk}>{blk}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Priority *</label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as any)}
                  className="w-full bg-slate-50 border border-border rounded-xl p-2.5 font-bold outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Location / Room *</label>
                <input
                  type="text"
                  placeholder="e.g. Room 304"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-border rounded-xl p-2.5 font-bold outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Subject Title *</label>
              <input
                type="text"
                placeholder="e.g. Broken wall socket near study desk"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full bg-slate-50 border border-border rounded-xl p-2.5 font-semibold focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Detailed Description *</label>
              <textarea
                rows={4}
                placeholder="Describe what happened, floor location, and timing..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-slate-50 border border-border rounded-xl p-3 font-semibold focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-xl text-xs shadow flex items-center justify-center gap-1.5 transition-colors mt-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Submit Ticket</span>
            </button>

          </form>

        </div>

      </div>

      {/* MODAL 2: Emergency SOS Modal */}
      {showEmergencyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-border text-left">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-danger/10 text-danger flex items-center justify-center font-bold">
                  <ShieldAlert className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Emergency SOS Repair</h3>
                  <p className="text-xs text-text-muted font-semibold">Immediate dispatch for critical incidents</p>
                </div>
              </div>
              <button 
                onClick={() => setShowEmergencyModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-danger/5 border border-danger/20 p-4 rounded-xl space-y-2 text-xs font-semibold text-danger">
              <p>⚡ High priority dispatch for Water Pipe Burst, Main Line Short Circuit, or Gas Leakage.</p>
              <p>Duty Warden Hotline: <strong>+91 98860 12345</strong></p>
            </div>

            <button
              onClick={() => {
                alert("Emergency SOS Alert dispatched to Duty Warden & On-call Plumbing/Electrical team!");
                setShowEmergencyModal(false);
              }}
              className="w-full bg-danger hover:bg-danger-dark text-white font-black py-3 rounded-xl shadow flex items-center justify-center gap-2 transition-colors text-xs cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Dispatch Emergency Response Now</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};