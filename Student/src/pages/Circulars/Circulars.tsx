import React, { useState, useMemo } from 'react';
import { HeroBanner } from '../../components/layout/HeroBanner';
import { CIRCULARS_HERO_IMAGE } from '../../assets/heroBanners';
import { 
  Download, Eye, Calendar, Filter, Search, Share2, MessageSquare, 
  ThumbsUp, Heart, HelpCircle, CheckCircle2, FileText, Image as ImageIcon, 
  FileSpreadsheet, Link2, Printer, ZoomIn, ZoomOut, Maximize2, X, Bell, 
  Layers, Clock, Send, Award, Sparkles
} from 'lucide-react';

export interface Attachment {
  name: string;
  type: 'pdf' | 'image' | 'excel' | 'word' | 'link';
  size?: string;
  url?: string;
}

export interface Comment {
  id: string;
  author: string;
  role: 'Student' | 'Warden' | 'Admin';
  avatar?: string;
  text: string;
  timestamp: string;
}

export interface Notice {
  id: string;
  title: string;
  desc: string;
  date: string;
  time: string;
  category: 'Mess Rules' | 'Security' | 'Maintenance' | 'Regulations' | 'Events';
  priority: 'Urgent' | 'High' | 'Normal';
  isRead: boolean;
  readAt?: string;
  isArchived: boolean;
  author: string;
  fileSize: string;
  attachments: Attachment[];
  reactions: {
    going: number;
    useful: number;
    thanks: number;
    clarification: number;
  };
  userReaction?: 'going' | 'useful' | 'thanks' | 'clarification' | null;
  comments: Comment[];
  eventDetails?: {
    eventDate: string;
    eventTime: string;
    venue: string;
    rsvpDeadline: string;
    isRsvped?: boolean;
    rsvpCount: number;
  };
}

const INITIAL_NOTICES: Notice[] = [
  {
    id: 'circ-1',
    title: 'Revised Mess Timings & Exam Week Special Dining Schedule',
    desc: 'Mess dinner schedules have been extended by 45 minutes to facilitate student arrival during the ongoing mid-semester examinations. Special high-protein snacks will be served during evening hours at Block A cafeteria.',
    date: '18 July 2026',
    time: '09:30 AM',
    category: 'Mess Rules',
    priority: 'High',
    isRead: false,
    isArchived: false,
    author: 'Chief Warden Dr. R. K. Sharma',
    fileSize: '240 KB',
    attachments: [
      { name: 'Exam_Mess_Schedule_July2026.pdf', type: 'pdf', size: '240 KB' },
      { name: 'Dietary_Menu_Chart.xlsx', type: 'excel', size: '115 KB' }
    ],
    reactions: { going: 45, useful: 89, thanks: 62, clarification: 4 },
    comments: [
      { id: 'c1', author: 'Rahul V.', role: 'Student', text: 'Will packed dinner be available for students returning late from lab?', timestamp: '18 Jul, 10:15 AM' },
      { id: 'c2', author: 'Dr. R. K. Sharma', role: 'Warden', text: 'Yes, please inform the mess supervisor before 5:00 PM for late dinner tokens.', timestamp: '18 Jul, 11:00 AM' }
    ]
  },
  {
    id: 'circ-2',
    title: 'Mandatory Biometric Access & Facial Recognition Update Notice',
    desc: 'All newly admitted residents of Block A and Block B must register their biometrics and updated emergency contacts with the Warden office by Friday. Failure to comply will restrict late-hour gate access.',
    date: '15 July 2026',
    time: '02:15 PM',
    category: 'Security',
    priority: 'High',
    isRead: false,
    isArchived: false,
    author: 'Head of Hostel Security Capt. M. Singh',
    fileSize: '150 KB',
    attachments: [
      { name: 'Biometric_Registration_Form.pdf', type: 'pdf', size: '150 KB' },
      { name: 'Security_Guidelines.png', type: 'image', size: '1.2 MB' }
    ],
    reactions: { going: 12, useful: 114, thanks: 45, clarification: 8 },
    comments: [
      { id: 'c3', author: 'Ananya S.', role: 'Student', text: 'Are the warden office timings open during weekend hours for registration?', timestamp: '15 Jul, 03:00 PM' },
      { id: 'c4', author: 'Capt. M. Singh', role: 'Warden', text: 'Office is open Saturday 9:00 AM to 1:00 PM strictly.', timestamp: '15 Jul, 04:20 PM' }
    ]
  },
  {
    id: 'circ-3',
    title: 'Annual Independence Day Flag Hoisting & Cultural Gala 2026',
    desc: 'Join all hostel residents and faculty for the Independence Day flag hoisting ceremony at the main administrative lawn followed by a grand breakfast buffet and cultural performances.',
    date: '14 July 2026',
    time: '11:00 AM',
    category: 'Events',
    priority: 'Normal',
    isRead: true,
    readAt: '14 Jul 2026, 04:30 PM',
    isArchived: false,
    author: 'Student Cultural Committee',
    fileSize: '410 KB',
    eventDetails: {
      eventDate: '15 August 2026',
      eventTime: '08:30 AM - 12:30 PM',
      venue: 'Main Administrative Lawn & Auditorium',
      rsvpDeadline: '10 August 2026',
      isRsvped: true,
      rsvpCount: 142
    },
    attachments: [
      { name: 'Cultural_Event_Itinerary.pdf', type: 'pdf', size: '410 KB' },
      { name: 'Performance_Registration_Link', type: 'link', url: 'https://college.edu/events/register' }
    ],
    reactions: { going: 128, useful: 95, thanks: 76, clarification: 2 },
    comments: []
  },
  {
    id: 'circ-4',
    title: 'Block A Elevator Servicing & Solar Heater Electrical Maintenance',
    desc: 'Elevator servicing in Block A is scheduled for Saturday between 10:00 AM and 1:00 PM. Hot water supply via solar heaters will undergo maintenance between 06:00 AM and 08:30 AM.',
    date: '12 July 2026',
    time: '04:00 PM',
    category: 'Maintenance',
    priority: 'Normal',
    isRead: true,
    readAt: '13 Jul 2026, 09:10 AM',
    isArchived: false,
    author: 'Estate Maintenance Division',
    fileSize: '110 KB',
    attachments: [
      { name: 'Maintenance_Schedule.pdf', type: 'pdf', size: '110 KB' }
    ],
    reactions: { going: 5, useful: 72, thanks: 30, clarification: 6 },
    comments: []
  },
  {
    id: 'circ-5',
    title: 'Revised Guidelines & Timings for Submitting Leave Applications',
    desc: 'Ensure all weekend and outstation leave requests are submitted via the portal Leave tab at least 24 hours in advance. Parent SMS verification code must be validated prior to warden departure approval.',
    date: '08 July 2026',
    time: '10:00 AM',
    category: 'Regulations',
    priority: 'High',
    isRead: true,
    readAt: '09 Jul 2026, 08:00 AM',
    isArchived: false,
    author: 'Associate Dean Student Affairs',
    fileSize: '310 KB',
    attachments: [
      { name: 'Leave_Rules_2026_Policy.pdf', type: 'pdf', size: '310 KB' }
    ],
    reactions: { going: 8, useful: 98, thanks: 40, clarification: 12 },
    comments: []
  },
  {
    id: 'circ-6',
    title: 'Archive Notice: Monsoon Pest Control & Room Sanitization Drive',
    desc: 'Mandatory room-by-room pest control drive conducted across all floors of OM SAI PG during early monsoon season.',
    date: '01 June 2026',
    time: '09:00 AM',
    category: 'Maintenance',
    priority: 'Normal',
    isRead: true,
    isArchived: true,
    author: 'Health & Hygiene Committee',
    fileSize: '180 KB',
    attachments: [
      { name: 'Sanitization_Report_June.pdf', type: 'pdf', size: '180 KB' }
    ],
    reactions: { going: 0, useful: 45, thanks: 22, clarification: 0 },
    comments: []
  }
];

export const Circulars: React.FC = () => {
  const [notices, setNotices] = useState<Notice[]>(INITIAL_NOTICES);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'card' | 'timeline'>('card');
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  
  // PDF Viewer Modal Controls
  const [pdfZoom, setPdfZoom] = useState<number>(100);
  const [isPdfFullscreen, setIsPdfFullscreen] = useState<boolean>(false);
  
  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Comment input per notice
  const [newCommentText, setNewCommentText] = useState<{ [noticeId: string]: string }>({});

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch real-time notices from backend and setup sockets
  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/notices');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.notices) && data.notices.length > 0) {
            const mapped = data.notices.map((n: any) => ({
              id: n.id,
              title: n.title,
              date: n.date,
              category: n.category || 'Events',
              priority: n.priority || 'Normal',
              desc: n.desc,
              author: n.author || 'Admin',
              fileSize: n.fileSize || '150 KB',
              attachments: n.documentUrl ? [{ name: n.documentName || 'Document Attachment', type: n.documentType?.toLowerCase() || 'pdf', url: n.documentUrl, size: n.fileSize || '150 KB' }] : [],
              reactions: { going: 0, useful: 12, thanks: 8, clarification: 0 },
              comments: []
            }));
            setNotices(mapped);
          }
        }
      } catch (err) {
        console.error('Error fetching notices:', err);
      }
    };

    fetchNotices();

    const socket = io('http://localhost:5000');
    socket.on('notice_created', () => fetchNotices());
    socket.on('notice_deleted', () => fetchNotices());
    socket.on('data_updated', () => fetchNotices());

    return () => {
      socket.disconnect();
    };
  }, []);

  const categories = ['All', 'Unread', 'Mess Rules', 'Security', 'Maintenance', 'Regulations', 'Events', 'Archived'];

  // Single select filter chip
  const handleCategorySelect = (cat: string) => {
    setActiveCategory(cat);
  };

  // Reactions toggle
  const handleReaction = (noticeId: string, reactionType: 'going' | 'useful' | 'thanks' | 'clarification') => {
    setNotices(prev => prev.map(n => {
      if (n.id !== noticeId) return n;
      const current = n.userReaction;
      const reactions = { ...n.reactions };

      if (current === reactionType) {
        reactions[reactionType] = Math.max(0, reactions[reactionType] - 1);
        return { ...n, userReaction: null, reactions };
      }

      if (current) {
        reactions[current] = Math.max(0, reactions[current] - 1);
      }
      reactions[reactionType] += 1;
      return { ...n, userReaction: reactionType, reactions };
    }));
    showToast(`Reaction updated!`);
  };

  // RSVP Event toggle
  const handleRSVP = (noticeId: string) => {
    setNotices(prev => prev.map(n => {
      if (n.id !== noticeId || !n.eventDetails) return n;
      const isRsvped = !n.eventDetails.isRsvped;
      const rsvpCount = isRsvped ? n.eventDetails.rsvpCount + 1 : Math.max(0, n.eventDetails.rsvpCount - 1);
      showToast(isRsvped ? '🎉 RSVP Confirmed for Event!' : 'RSVP Cancelled');
      return {
        ...n,
        eventDetails: {
          ...n.eventDetails,
          isRsvped,
          rsvpCount
        }
      };
    }));
  };

  // Mark notice as read
  const markAsRead = (notice: Notice) => {
    if (notice.isRead) return;
    const nowStr = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    setNotices(prev => prev.map(n => n.id === notice.id ? { ...n, isRead: true, readAt: nowStr } : n));
  };

  // Open PDF viewer modal
  const openNoticeViewer = (notice: Notice) => {
    markAsRead(notice);
    setSelectedNotice(notice);
    setPdfZoom(100);
  };

  // Post Comment
  const handleAddComment = (noticeId: string) => {
    const text = newCommentText[noticeId]?.trim();
    if (!text) return;

    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      author: 'Dhanitha M.',
      role: 'Student',
      text,
      timestamp: 'Just now'
    };

    setNotices(prev => prev.map(n => {
      if (n.id !== noticeId) return n;
      return { ...n, comments: [...n.comments, newComment] };
    }));

    setNewCommentText(prev => ({ ...prev, [noticeId]: '' }));
    showToast('Question submitted to Warden Office!');
  };

  // Print PDF Notice
  const handlePrintPDF = (notice: Notice) => {
    const printContent = `
      <html>
        <head>
          <title>${notice.title}</title>
          <style>
            body { font-family: 'Inter', system-ui, sans-serif; padding: 40px; color: #0f172a; line-height: 1.6; }
            .header { border-bottom: 3px solid #1e40af; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; }
            .header h2 { margin: 0; color: #1e40af; font-size: 22px; }
            .header p { margin: 4px 0 0; color: #64748b; font-size: 13px; font-weight: bold; }
            h1 { font-size: 22px; color: #0f172a; margin-bottom: 12px; }
            .meta { background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0; color: #475569; margin-bottom: 24px; font-size: 13px; }
            .content { font-size: 14px; color: #334155; margin-bottom: 30px; }
            .note { margin-top: 30px; padding: 16px; background: #fffbebfb; border-left: 4px solid #f59e0b; color: #92400e; font-size: 13px; border-radius: 0 8px 8px 0; }
            .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h2>OM SAI PG ADMINISTRATION</h2>
              <p>Official Institutional Circular / Public Notice</p>
            </div>
            <div style="text-align: right; font-size: 12px; color: #64748b;">
              <strong>Date:</strong> ${notice.date}<br/>
              <strong>Time:</strong> ${notice.time}
            </div>
          </div>
          <h1>${notice.title}</h1>
          <div class="meta">
            <strong>Category:</strong> ${notice.category} &nbsp;|&nbsp; 
            <strong>Priority:</strong> ${notice.priority} &nbsp;|&nbsp; 
            <strong>Issued By:</strong> ${notice.author}
          </div>
          <div class="content">
            <p>${notice.desc}</p>
          </div>
          ${notice.eventDetails ? `
            <div style="background:#eff6ff; padding:16px; border-radius:8px; border:1px solid #bfdbfe; margin-bottom:20px;">
              <strong>Event Schedule:</strong> ${notice.eventDetails.eventDate} (${notice.eventDetails.eventTime})<br/>
              <strong>Venue:</strong> ${notice.eventDetails.venue}
            </div>
          ` : ''}
          <div class="note">
            <strong>Mandatory Resident Note:</strong> Strict adherence to this notice is mandatory for all hostel residents. For inquiries, contact the Warden's office during working hours.
          </div>
          <div class="footer">
            Ref: ${notice.id.toUpperCase()}-2026 &nbsp;|&nbsp; System-generated Verified Official Notice
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `;
    const blob = new Blob([printContent], { type: 'text/html' });
    window.open(URL.createObjectURL(blob), '_blank');
  };

  // Filtered dataset
  const filteredNotices = useMemo(() => {
    return notices.filter(notice => {
      // Archived filter
      if (activeCategory === 'Archived') {
        if (!notice.isArchived) return false;
      } else {
        if (notice.isArchived) return false;
      }

      // Active category single filter
      if (activeCategory !== 'All' && activeCategory !== 'Archived') {
        if (activeCategory === 'Unread') {
          if (notice.isRead) return false;
        } else {
          if (notice.category !== activeCategory) return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = 
          notice.title.toLowerCase().includes(q) ||
          notice.desc.toLowerCase().includes(q) ||
          notice.category.toLowerCase().includes(q) ||
          notice.author.toLowerCase().includes(q) ||
          notice.date.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [notices, activeCategory, searchQuery]);

  // Statistics (Clean 3 Cards: Total, Unread, Archived)
  const stats = useMemo(() => {
    const total = notices.filter(n => !n.isArchived).length;
    const unread = notices.filter(n => !n.isRead && !n.isArchived).length;
    const archived = notices.filter(n => n.isArchived).length;
    return { total, unread, archived };
  }, [notices]);

  const handleDownloadAttachment = (att: Attachment) => {
    if (att.url) {
      window.open(att.url, '_blank');
      return;
    }
    const content = `Official Notice Attachment: ${att.name}\nType: ${att.type}\nSize: ${att.size || 'Unknown'}\n\nThank you.`;
    const blob = new Blob([content], { type: att.type === 'pdf' ? 'application/pdf' : 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = att.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Downloading ${att.name}...`);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-16 relative">

      {/* Toast Notification Popup */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2.5 animate-bounce">
          <Bell className="w-4 h-4 text-warning" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero Banner */}
      <HeroBanner 
        image={CIRCULARS_HERO_IMAGE}
        title="Circulars & Announcement Hub"
      />

      {/* Clean 3-Card Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-border p-4 rounded-2xl shadow-soft flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Total Notices</p>
            <h3 className="text-xl font-black text-slate-900 mt-1">{stats.total}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-border p-4 rounded-2xl shadow-soft flex items-center justify-between border-l-4 border-l-primary">
          <div>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Unread Notices</p>
            <h3 className="text-xl font-black text-primary mt-1">{stats.unread}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-primary flex items-center justify-center relative">
            <Bell className="w-5 h-5" />
            {stats.unread > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full animate-ping" />
            )}
          </div>
        </div>

        <div className="bg-white border border-border p-4 rounded-2xl shadow-soft flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Archived Notices</p>
            <h3 className="text-xl font-black text-slate-500 mt-1">{stats.archived}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control Toolbar: Search Bar & View Mode */}
      <div className="bg-white border border-border p-4 rounded-2xl shadow-soft space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          
          {/* Search Bar */}
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search title, keywords, category, date, author..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full border border-border rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold text-text placeholder:text-text-muted/60 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-slate-50/50"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-slate-700 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-border text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewMode('card')}
                className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  viewMode === 'card' ? 'bg-white text-primary shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Card View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  viewMode === 'timeline' ? 'bg-white text-primary shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Timeline</span>
              </button>
            </div>
          </div>
        </div>

        {/* Single-Select Filter Chips Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-2 border-t border-slate-100">
          <span className="text-[10px] font-black text-text-muted uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-primary" /> Filter:
          </span>
          {categories.map(cat => {
            const isSelected = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategorySelect(cat)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold shrink-0 transition-all border ${
                  isSelected
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-white text-slate-700 border-border hover:bg-slate-50'
                }`}
              >
                {cat}
                {cat === 'Unread' && stats.unread > 0 && (
                  <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                    isSelected ? 'bg-white text-primary' : 'bg-primary text-white'
                  }`}>
                    {stats.unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* CARD VIEW MODE */}
      {viewMode === 'card' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Institutional Announcements
            </h3>
            <span className="text-[11px] font-bold text-text-muted">
              Showing {filteredNotices.length} notice(s)
            </span>
          </div>

          {filteredNotices.length === 0 ? (
            <div className="bg-white border border-border p-12 text-center rounded-2xl shadow-soft space-y-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <Layers className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-800">No notices found</h4>
                <p className="text-xs text-text-muted font-medium">Try clearing your search query or selecting a different filter chip.</p>
              </div>
              <button
                type="button"
                onClick={() => { setActiveCategory('All'); setSearchQuery(''); }}
                className="bg-primary hover:bg-primary-dark text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors shadow-sm"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            filteredNotices.map(notice => (
              <div 
                key={notice.id}
                className={`bg-white border rounded-2xl shadow-sm p-6 space-y-5 transition-all duration-200 hover:shadow-md hover:border-slate-300 group ${
                  !notice.isRead ? 'border-l-4 border-l-primary bg-slate-50/40' : 'border-slate-200/90'
                }`}
              >
                {/* Card Header Tags & Date */}
                <div className="flex flex-wrap justify-between items-center gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {!notice.isRead && (
                      <span className="bg-primary text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs animate-pulse">
                        <span className="w-1.5 h-1.5 bg-white rounded-full" /> NEW
                      </span>
                    )}

                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-primary/10 text-primary px-3 py-0.5 rounded-full border border-primary/20">
                      {notice.category}
                    </span>

                    <span className="text-[11px] text-slate-500 font-bold flex items-center gap-1.5 ml-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {notice.date} ({notice.time})
                    </span>
                  </div>
                </div>

                {/* Title & Issued By & Description */}
                <div className="space-y-2">
                  <h4 
                    className="text-base font-extrabold text-slate-900 group-hover:text-primary transition-colors cursor-pointer leading-snug"
                  >
                    {notice.title}
                  </h4>
                  <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5 pt-0.5">
                    <Award className="w-3.5 h-3.5 text-primary shrink-0" /> Issued by: <span className="text-slate-800 font-extrabold">{notice.author}</span>
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium pt-1 max-w-4xl">
                    {notice.desc}
                  </p>
                </div>

                {/* Event Details Card (If Category === Events) */}
                {notice.eventDetails && (
                  <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/50 border border-blue-200/80 p-4 rounded-xl space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-primary bg-white px-2.5 py-0.5 rounded-full border border-blue-200">
                          🎉 Special Event Schedule
                        </span>
                        <h5 className="text-xs font-extrabold text-slate-900 mt-1.5">
                          📅 Date: {notice.eventDetails.eventDate} ({notice.eventDetails.eventTime})
                        </h5>
                        <p className="text-xs font-bold text-slate-700">
                          📍 Venue: {notice.eventDetails.venue}
                        </p>
                      </div>

                      <button
                        onClick={() => handleRSVP(notice.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all ${
                          notice.eventDetails.isRsvped
                            ? 'bg-emerald-600 text-white'
                            : 'bg-primary hover:bg-primary-dark text-white'
                        }`}
                      >
                        {notice.eventDetails.isRsvped ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Attending ({notice.eventDetails.rsvpCount})</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>RSVP Now ({notice.eventDetails.rsvpCount})</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Attachments List */}
                {notice.attachments.length > 0 && (
                  <div className="p-1 space-y-2.5">
                    <div className="flex flex-wrap gap-2.5">
                      {notice.attachments.map((att, idx) => (
                        <div 
                          key={idx}
                          onClick={() => handleDownloadAttachment(att)}
                          className="bg-slate-100/80 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-800 flex items-center gap-2 hover:border-primary hover:text-primary hover:shadow-xs transition-all cursor-pointer group/att"
                        >
                          <span>{att.name}</span>
                          {att.size && <span className="text-[10px] text-slate-400 font-semibold">({att.size})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}



              </div>
            ))
          )}
        </div>
      )}

      {/* TIMELINE VIEW MODE */}
      {viewMode === 'timeline' && (
        <div className="bg-white border border-border p-6 rounded-2xl shadow-soft space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Chronological Notice Timeline
            </h3>
            <span className="text-[10px] text-text-muted font-bold">July 2026</span>
          </div>

          <div className="relative border-l-2 border-primary/20 ml-4 space-y-8 py-2">
            {filteredNotices.map((notice) => (
              <div key={notice.id} className="relative pl-6 group">
                
                {/* Timeline node icon */}
                <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs shadow-sm transition-transform group-hover:scale-110 bg-primary border-white text-white">
                  <Calendar className="w-3.5 h-3.5" />
                </div>

                <div className="bg-slate-50 border border-slate-200 hover:border-primary p-4 rounded-xl space-y-2 transition-all cursor-pointer" onClick={() => openNoticeViewer(notice)}>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[10px] font-black uppercase text-primary bg-primary/10 px-2 py-0.5 rounded">
                      {notice.date} ({notice.time})
                    </span>
                    <span className="text-[9px] font-bold text-text-muted uppercase">
                      {notice.category}
                    </span>
                  </div>

                  <h4 className="text-xs font-black text-slate-900 group-hover:text-primary transition-colors">
                    {notice.title}
                  </h4>
                  <p className="text-[11px] text-text-muted leading-relaxed font-medium line-clamp-2">
                    {notice.desc}
                  </p>

                  <div className="pt-2 flex justify-between items-center text-[10px] font-bold text-slate-600">
                    <span>By: {notice.author}</span>
                    <span className="text-primary flex items-center gap-1 hover:underline">
                      View PDF <Eye className="w-3 h-3" />
                    </span>
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>
      )}

      {/* PDF PREVIEW MODAL */}
      {selectedNotice && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-6 animate-fadeIn">
          <div className={`bg-white rounded-2xl shadow-2xl border border-slate-700 flex flex-col transition-all duration-300 ${
            isPdfFullscreen ? 'w-full h-full rounded-none' : 'max-w-4xl w-full max-h-[92vh]'
          }`}>
            
            {/* Top Viewer Toolbar */}
            <div className="bg-slate-900 text-white px-5 py-3.5 rounded-t-2xl flex flex-wrap justify-between items-center gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <span className="bg-primary/20 text-primary-light text-[10px] font-black uppercase px-2.5 py-1 rounded border border-primary/40">
                  {selectedNotice.category}
                </span>
                <h4 className="text-xs sm:text-sm font-black tracking-tight text-white line-clamp-1 max-w-md">
                  {selectedNotice.title}
                </h4>
              </div>

              {/* Toolbar Actions */}
              <div className="flex items-center gap-2 text-xs font-bold">
                <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700 text-slate-300">
                  <button 
                    onClick={() => setPdfZoom(z => Math.max(75, z - 15))}
                    className="p-1 hover:text-white" 
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 text-[10px] font-mono">{pdfZoom}%</span>
                  <button 
                    onClick={() => setPdfZoom(z => Math.min(150, z + 15))}
                    className="p-1 hover:text-white" 
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => handlePrintPDF(selectedNotice)}
                  className="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-lg transition-colors border border-slate-700"
                  title="Print Notice"
                >
                  <Printer className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setIsPdfFullscreen(!isPdfFullscreen)}
                  className="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-lg transition-colors border border-slate-700"
                  title="Toggle Fullscreen"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>

                <button 
                  onClick={() => setSelectedNotice(null)}
                  className="bg-red-600/80 hover:bg-red-600 text-white p-2 rounded-lg transition-colors ml-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Document Content Canvas */}
            <div className="p-6 sm:p-10 overflow-y-auto flex-1 bg-slate-100 flex justify-center">
              <div 
                style={{ transform: `scale(${pdfZoom / 100})`, transformOrigin: 'top center' }}
                className="bg-white max-w-2xl w-full p-8 sm:p-12 shadow-xl border border-slate-300 space-y-6 text-slate-800 font-sans transition-transform duration-200"
              >
                {/* Document Letterhead */}
                <div className="border-b-2 border-primary pb-4 flex justify-between items-end">
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-primary tracking-tight">OM SAI PG ADMINISTRATION</h2>
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Official Institutional Notice & Directive</p>
                  </div>
                  <div className="text-right text-[10px] text-slate-500 font-mono font-bold">
                    <p>Ref: {selectedNotice.id.toUpperCase()}-2026</p>
                    <p>Date: {selectedNotice.date}</p>
                  </div>
                </div>

                {/* Notice Title & Metadata */}
                <div className="space-y-2">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                    {selectedNotice.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span>Category: <strong>{selectedNotice.category}</strong></span>
                    <span>•</span>
                    <span>Priority: <strong>{selectedNotice.priority}</strong></span>
                    <span>•</span>
                    <span>Author: <strong>{selectedNotice.author}</strong></span>
                  </div>
                </div>

                {/* Notice Body */}
                <div className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium space-y-4">
                  <p>{selectedNotice.desc}</p>
                  
                  {selectedNotice.eventDetails && (
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl space-y-2 text-xs">
                      <p className="font-black text-blue-900">🗓️ Official Event Schedule Details:</p>
                      <p><strong>Date & Time:</strong> {selectedNotice.eventDetails.eventDate} ({selectedNotice.eventDetails.eventTime})</p>
                      <p><strong>Venue Location:</strong> {selectedNotice.eventDetails.venue}</p>
                      <p><strong>RSVP Status:</strong> {selectedNotice.eventDetails.rsvpCount} Residents Attending</p>
                    </div>
                  )}
                </div>

                {/* Attachments within Document */}
                {selectedNotice.attachments.length > 0 && (
                  <div className="border-t border-slate-200 pt-4 space-y-2">
                    <p className="text-[10px] font-black uppercase text-slate-500">Official Attached Records:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedNotice.attachments.map((a, i) => (
                        <div key={i} className="p-2 border border-slate-200 rounded-lg text-xs font-bold flex items-center justify-between bg-slate-50">
                          <span className="truncate">{a.name}</span>
                          <span className="text-[10px] text-slate-400">{a.size}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Compliance Note */}
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 text-xs text-amber-900 rounded-r-xl space-y-1">
                  <p className="font-black">Notice Compliance Order:</p>
                  <p className="text-[11px] leading-relaxed">
                    All residents are instructed to strictly observe the details outlined in this circular. Queries can be clarified with the Warden Office during official desk hours.
                  </p>
                </div>

                {/* Official Stamp & Sign */}
                <div className="pt-8 border-t border-slate-200 flex justify-between items-end">
                  <div className="text-center space-y-1">
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-primary/40 flex items-center justify-center text-[9px] font-black text-primary uppercase rotate-12 mx-auto">
                      OFFICIAL<br/>SEAL
                    </div>
                    <span className="text-[9px] text-slate-400 font-mono block">VERIFIED DIGITALLY</span>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="font-serif italic text-sm text-slate-800 font-bold">R. K. Sharma</div>
                    <p className="text-xs font-black text-slate-900">Dr. R. K. Sharma</p>
                    <p className="text-[10px] text-slate-500 font-bold">Chief Warden, OM SAI PG</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom Footer Actions */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 rounded-b-2xl flex justify-between items-center shrink-0">
              <span className="text-[10px] font-bold text-text-muted">
                Read Status: Verified {selectedNotice.readAt || 'Just now'}
              </span>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedNotice(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Close
                </button>
                <button
                  onClick={() => handlePrintPDF(selectedNotice)}
                  className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-4 h-4" /> Download PDF File
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
