import React, { useState, useRef, useEffect } from 'react';
import { usePayment } from '../../context/PaymentContext';
import { useAuth } from '../../context/AuthContext';
import { HeroBanner } from '../../components/layout/HeroBanner';
import { 
  Send, ShieldAlert, Heart, Plus, ShoppingBag, 
  Search, Pin, Tag, MessageSquare, Users, 
  Sparkles, HelpCircle, Eye, Trash2
} from 'lucide-react';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../../services/api';

interface ChatMessage {
  id: string;
  senderName: string;
  usn: string;
  roomNo: string;
  message: string;
  time: string;
  isSelf: boolean;
  likes: number;
  likedByMe?: boolean;
  price?: string;
  categoryTag?: string;
  imgUrl?: string;
  createdAt?: string;
}

interface Channel {
  id: string;
  name: string;
  iconName: string;
  desc: string;
  badge?: string;
}

function formatChannelTitle(name?: string): string {
  if (!name) return 'GENERAL LOUNGE';
  return name.replace(/^#/, '').replace(/-/g, ' ').toUpperCase();
}

export const SocialConnect: React.FC = () => {
  const { student: paymentStudent, hostel } = usePayment() || {};
  const { user: authUser } = useAuth() || {};
  
  const student = paymentStudent || authUser || { name: 'Student', usn: '1BY24CS000' };
  const studentUsn = student?.usn || '1BY24CS000';
  const studentName = student?.name || 'Student';
  
  const socketRef = useRef<any>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [activeChannelId, setActiveChannelId] = useState<string>('general');
  const [inputText, setInputText] = useState('');
  
  // Channels and messages state
  const [channels, setChannels] = useState<Channel[]>([
    { id: 'general', name: 'general', iconName: 'MessageSquare', desc: 'General hostel discussion and announcements' },
    { id: 'marketplace', name: 'marketplace', iconName: 'ShoppingBag', desc: 'Buy and sell items within the hostel community' }
  ]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<Record<string, string>>({
    general: 'Notice: Keep hostel lounge noise low after 10:00 PM. Clean up common tables after meals.',
    marketplace: 'Tip: Always verify the condition of electrical appliances before purchasing.',
    study: 'Exam Notice: Mid-semester exams start on Monday. Study rooms are open 24/7.',
    lostfound: 'Notice: Unclaimed items will be donated to charity at the end of the semester.',
    sports: 'Announcement: Hostel Cricket Premier League registrations close tomorrow!'
  });

  // Left sidebar tab
  const [leftTab, setLeftTab] = useState<'channels' | 'directory'>('channels');
  const [directorySearch, setDirectorySearch] = useState('');
  const [residents, setResidents] = useState<any[]>([]);

  // Marketplace item publish state
  const [showMarketplaceModal, setShowMarketplaceModal] = useState(false);
  const [itemTitle, setItemTitle] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCategory, setItemCategory] = useState('Books');
  const [itemDesc, setItemDesc] = useState('');
  const [itemImagePreset, setItemImagePreset] = useState<string>('none');

  const [selectedResident, setSelectedResident] = useState<any>(null);
  const [interestedItem, setInterestedItem] = useState<ChatMessage | null>(null);
  const [interestOfferMessage, setInterestOfferMessage] = useState('Hey! Is this item still available? I would like to buy it.');

  // Mention autocomplete popup state
  const [showMentionPopup, setShowMentionPopup] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');

  const studentBlock = (student as any)?.allocatedBlock || (student as any)?.block || hostel?.block || '';

  // Fetch Channels on Mount or Student Block change
  useEffect(() => {
    const blockParam = studentBlock ? `?block=${encodeURIComponent(studentBlock)}` : '';
    fetch(`${API_BASE_URL}/api/chat/channels${blockParam}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          // Client side safety check for block assignment
          const filtered = data.filter((c: any) => {
            if (!c.targetBlock || c.targetBlock === 'ALL') return true;
            if (!studentBlock) return true;
            const cBlock = String(c.targetBlock).trim().toLowerCase();
            const sBlock = String(studentBlock).trim().toLowerCase();
            return cBlock === sBlock || sBlock.includes(cBlock) || cBlock.includes(sBlock);
          });
          setChannels(filtered);
          if (!filtered.some((c: any) => c.id === activeChannelId)) {
            setActiveChannelId(filtered[0]?.id || 'general');
          }
        }
      })
      .catch(err => console.error('Failed to load channels', err));

    // Fetch Resident list from applications (filtered strictly by student block)
    fetch(`${API_BASE_URL}/api/applications`)
      .then(res => res.json())
      .then(all => {
        if (Array.isArray(all)) {
          const approved = all.filter((a: any) => {
            const isApp = a.status === 'APPROVED' || a.status === 'ALLOCATED';
            if (!isApp) return false;
            if (!studentBlock) return true;
            const aBlock = (a.block || a.hostelPref || a.allocations?.[0]?.bed?.room?.block?.name || '').trim().toLowerCase();
            const sBlock = studentBlock.trim().toLowerCase();
            return !aBlock || aBlock.includes(sBlock) || sBlock.includes(aBlock);
          });
          setResidents(approved);
        }
      })
      .catch(err => console.error('Failed to load residents', err));
  }, [studentBlock]);

  // Handle Input typing and @ mention suggestion popup
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    const lastAtIdx = val.lastIndexOf('@');
    if (lastAtIdx !== -1 && lastAtIdx >= val.lastIndexOf(' ')) {
      const q = val.slice(lastAtIdx + 1);
      setMentionQuery(q);
      setShowMentionPopup(true);
    } else {
      setShowMentionPopup(false);
    }
  };

  const handleSelectMention = (residentName: string) => {
    const lastAtIdx = inputText.lastIndexOf('@');
    if (lastAtIdx !== -1) {
      const prefix = inputText.slice(0, lastAtIdx);
      setInputText(`${prefix}@${residentName} `);
    } else {
      setInputText(prev => `${prev}@${residentName} `);
    }
    setShowMentionPopup(false);
  };

  // Fetch messages when active channel changes
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/chat/channels/${activeChannelId}/messages`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMessages(data.map((m: any) => ({
            ...m,
            isSelf: m.usn === studentUsn
          })));
        } else {
          setMessages([]);
        }
      })
      .catch(err => console.error('Failed to load messages', err));
  }, [activeChannelId, studentUsn]);

  // Socket.IO Listener Setup
  useEffect(() => {
    socketRef.current = io(API_BASE_URL);

    socketRef.current.on('chat_message_received', (data: { channelId: string; message: any }) => {
      if (data.channelId === activeChannelId) {
        setMessages(prev => {
          if (prev.some(m => m.id === data.message.id)) return prev;
          return [...prev, { ...data.message, isSelf: data.message.usn === studentUsn }];
        });
      }
    });

    socketRef.current.on('chat_channel_created', (newChan: Channel) => {
      setChannels(prev => {
        if (prev.some(c => c.id === newChan.id)) return prev;
        if (newChan.targetBlock && newChan.targetBlock !== 'ALL' && studentBlock) {
          const cBlock = String(newChan.targetBlock).trim().toLowerCase();
          const sBlock = String(studentBlock).trim().toLowerCase();
          if (cBlock !== sBlock && !sBlock.includes(cBlock) && !cBlock.includes(sBlock)) {
            return prev;
          }
        }
        return [...prev, newChan];
      });
    });

    socketRef.current.on('chat_channel_updated', (updatedChan: Channel) => {
      setChannels(prev => prev.map(c => c.id === updatedChan.id ? updatedChan : c));
    });

    socketRef.current.on('chat_channel_deleted', (deletedId: string) => {
      setChannels(prev => prev.filter(c => c.id !== deletedId));
      if (activeChannelId === deletedId) {
        setActiveChannelId('general');
      }
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [activeChannelId, student.usn, studentBlock]);

  // Scroll window to top on page mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const activeChannel = channels.find(c => c.id === activeChannelId) || channels[0] || { name: 'general-lounge', desc: '' };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const payload = {
      senderName: studentName,
      usn: studentUsn,
      roomNo: hostel ? `Room ${hostel.room}` : 'Room 304',
      message: inputText.trim(),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    setInputText('');

    try {
      await fetch(`${API_BASE_URL}/api/chat/channels/${activeChannelId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  const handlePostMarketplaceItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemTitle || !itemPrice) return;

    let finalImgUrl: string | undefined = undefined;
    if (itemImagePreset === 'book') finalImgUrl = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=400&q=80';
    if (itemImagePreset === 'kettle') finalImgUrl = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=400&q=80';
    if (itemImagePreset === 'chair') finalImgUrl = 'https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=400&q=80';
    if (itemImagePreset === 'cycle') finalImgUrl = 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=400&q=80';

    const payload = {
      senderName: studentName,
      usn: studentUsn,
      roomNo: hostel ? `Room ${hostel.room}` : 'Room 304',
      message: `${itemTitle}: ${itemDesc}`,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      price: `₹${itemPrice}`,
      categoryTag: itemCategory,
      imgUrl: finalImgUrl
    };

    setItemTitle('');
    setItemPrice('');
    setItemDesc('');
    setItemImagePreset('none');
    setShowMarketplaceModal(false);

    try {
      await fetch(`${API_BASE_URL}/api/chat/channels/marketplace/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setActiveChannelId('marketplace');
    } catch (err) {
      console.error('Failed to post marketplace item', err);
    }
  };

  const handleBuyInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interestedItem) return;

    const payload = {
      senderName: studentName,
      usn: studentUsn,
      roomNo: hostel ? `Room ${hostel.room}` : 'Room 304',
      message: `[INQUIRY] Hey ${interestedItem.senderName}, I am interested in your listing '${interestedItem.message.split(':')[0]}'. ${interestOfferMessage}`,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    setInterestedItem(null);
    setInterestOfferMessage('Hey! Is this item still available? I would like to buy it.');

    try {
      await fetch(`${API_BASE_URL}/api/chat/channels/marketplace/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setActiveChannelId('marketplace');
    } catch (err) {
      console.error('Failed to submit purchase inquiry', err);
    }
  };

  const getChannelIcon = (iconName: string) => {
    switch (iconName) {
      case 'ShoppingBag': return ShoppingBag;
      case 'Users': return Users;
      case 'HelpCircle': return HelpCircle;
      case 'Sparkles': return Sparkles;
      default: return MessageSquare;
    }
  };

  // Filtered resident list
  const filteredResidents = residents.filter((r: any) => 
    (r.studentName || '').toLowerCase().includes(directorySearch.toLowerCase()) ||
    (r.phoneNumber || '').toLowerCase().includes(directorySearch.toLowerCase()) ||
    (r.usn || '').toLowerCase().includes(directorySearch.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      <HeroBanner 
        image="https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=80"
        title="Hostel Lounge & Social Connect"
      />

      {/* Mobile Channel Selector Pills */}
      <div className="flex lg:hidden overflow-x-auto gap-2 p-2 bg-white border border-border rounded-xl shadow-soft">
        {channels.map(ch => (
          <button
            key={ch.id}
            onClick={() => setActiveChannelId(ch.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              activeChannelId === ch.id 
                ? 'bg-primary text-white shadow-sm' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {formatChannelTitle(ch.name)}
          </button>
        ))}
      </div>

      {/* Main Container */}
      <div className="bg-white border border-border rounded-2xl shadow-card overflow-hidden grid grid-cols-1 lg:grid-cols-4 h-[650px] sm:h-[700px]">
        
        {/* Left Column: Channels & Directory */}
        <div className="hidden lg:flex flex-col justify-between border-r border-border bg-slate-50/70 p-4 text-xs font-semibold overflow-y-auto">
          
          <div className="space-y-5 flex-grow flex flex-col min-h-0">
            {/* Sidebar Sub-tabs */}
            <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl shrink-0">
              <button
                onClick={() => setLeftTab('channels')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  leftTab === 'channels' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Channels
              </button>
              <button
                onClick={() => setLeftTab('directory')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  leftTab === 'directory' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Directory
              </button>
            </div>

            {leftTab === 'channels' ? (
              <div className="space-y-4 flex-grow overflow-y-auto min-h-0">
                <div>
                  <span className="text-[10px] font-black text-text-muted uppercase tracking-wider block mb-2">Hostel Channels</span>
                  <div className="space-y-1">
                    {channels.map(ch => {
                      return (
                        <button
                          key={ch.id}
                          onClick={() => setActiveChannelId(ch.id)}
                          className={`w-full text-left px-3 py-2.5 rounded-xl font-bold transition-all flex items-center justify-between ${
                            activeChannelId === ch.id 
                              ? 'bg-primary text-white shadow-sm' 
                              : 'text-slate-700 hover:bg-slate-200/60'
                          }`}
                        >
                          <div className="truncate">
                            <span className="truncate">{formatChannelTitle(ch.name)}</span>
                          </div>
                          {ch.badge && (
                            <span className={`text-[8.5px] px-1.5 py-0.5 rounded font-black uppercase ${
                              activeChannelId === ch.id ? 'bg-white text-primary' : 'bg-primary/10 text-primary'
                            }`}>
                              {ch.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 flex-grow overflow-y-auto min-h-0 flex flex-col">
                <div className="relative shrink-0">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none">
                    <Search className="w-3 h-3 text-slate-400" />
                  </span>
                  <input
                    type="text"
                    value={directorySearch}
                    onChange={e => setDirectorySearch(e.target.value)}
                    placeholder="Search residents by name or USN..."
                    className="w-full pl-8 pr-2.5 py-1.5 text-[10px] font-bold bg-white border border-border rounded-lg outline-none"
                  />
                </div>
                
                <div className="space-y-1 overflow-y-auto flex-grow">
                  {directorySearch.trim() === '' ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center text-slate-400 space-y-2">
                      <Search className="w-8 h-8 text-slate-300" />
                      <p className="text-[11px] font-semibold">Type a resident's name or USN above to search the directory.</p>
                    </div>
                  ) : (
                    <>
                      {filteredResidents.map((r: any) => (
                        <div 
                          key={r.id}
                          onClick={() => setSelectedResident({
                            name: r.studentName,
                            usn: r.usn,
                            room: `Room ${r.roomNo || 'N/A'}`,
                            gender: r.gender,
                            status: 'Active'
                          })}
                          className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-200/50 cursor-pointer border border-transparent hover:border-slate-200"
                        >
                          <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-black text-primary uppercase">
                            {r.studentName.charAt(0)}
                          </div>
                          <div className="truncate">
                            <div className="text-[10px] font-black text-slate-800 truncate">{r.studentName}</div>
                            <div className="text-[8px] font-mono text-slate-400 mt-0.5">{r.usn}</div>
                          </div>
                        </div>
                      ))}
                      {filteredResidents.length === 0 && (
                        <div className="text-center py-6 text-slate-400 italic text-[10px]">No resident matches found</div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Conduct warning */}
          <div className="bg-slate-900 text-white p-3.5 rounded-xl space-y-1.5 border border-slate-800 mt-4 shrink-0">
            <div className="flex gap-1.5 items-center text-warning font-black text-[9px] uppercase tracking-widest">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Community Conduct</span>
            </div>
            <p className="text-[9.5px] text-slate-300 leading-relaxed font-medium">
              Respect all residents. Spamming, fake items, or harassment results in immediate portal suspension.
            </p>
          </div>

        </div>

        {/* Right 3 columns: Active Chat Area */}
        <div className="lg:col-span-3 flex flex-col justify-between h-full bg-white min-h-0">
          
          <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-success rounded-full animate-pulse" />
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 tracking-wider">
                  {formatChannelTitle(activeChannel.name)}
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold">{activeChannel.desc}</p>
              </div>
            </div>

            {activeChannelId === 'marketplace' && (
              <button
                onClick={() => setShowMarketplaceModal(true)}
                className="bg-primary hover:bg-primary-dark text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Post Item for Sale</span>
              </button>
            )}
          </div>

          {/* Pinned announcement header */}
          {pinnedMessages[activeChannelId] && (
            <div className="bg-primary/5 border-b border-primary/10 px-6 py-2 flex items-center justify-between text-[11px] font-semibold text-slate-700 shrink-0">
              <div className="flex items-center gap-2">
                <Pin className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>{pinnedMessages[activeChannelId]}</span>
              </div>
              <button
                onClick={() => setPinnedMessages(prev => ({ ...prev, [activeChannelId]: '' }))}
                className="text-text-muted hover:text-slate-800 text-[10px]"
              >
                Clear Pin
              </button>
            </div>
          )}

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
            {messages.map(msg => (
              <div 
                key={msg.id}
                className={`flex gap-3 max-w-[88%] ${msg.isSelf ? 'ml-auto flex-row-reverse' : ''}`}
              >
                <div 
                  onClick={() => setSelectedResident({ name: msg.senderName, room: msg.roomNo, usn: msg.usn, status: 'Active' })}
                  className={`w-9 h-9 rounded-full border flex items-center justify-center font-black text-xs shrink-0 uppercase shadow-sm cursor-pointer hover:scale-105 transition-transform ${
                    msg.isSelf 
                      ? 'bg-primary text-white border-primary' 
                      : 'bg-slate-100 text-slate-800 border-slate-200'
                  }`}
                >
                  {msg.senderName.charAt(0)}
                </div>

                <div className="space-y-1">
                  <div className={`flex items-baseline gap-2 text-[10px] font-bold text-text-muted ${msg.isSelf ? 'justify-end' : ''}`}>
                    <span 
                      onClick={() => setSelectedResident({ name: msg.senderName, room: msg.roomNo, usn: msg.usn, status: 'Active' })}
                      className="text-slate-900 font-black cursor-pointer hover:underline"
                    >
                      {msg.senderName}
                    </span>
                    <span className="font-mono text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{msg.roomNo}</span>
                    <span className="font-mono text-[9px]">{msg.time}</span>
                  </div>

                  <div className={`p-4 rounded-2xl text-xs leading-relaxed font-semibold shadow-sm border space-y-2 text-left ${
                    msg.isSelf 
                      ? 'bg-primary/5 text-slate-800 border-primary/20 rounded-tr-none' 
                      : 'bg-white text-slate-800 border-border rounded-tl-none'
                  }`}>
                    
                    {msg.price && (
                      <div className="flex items-center justify-between bg-slate-900 text-white p-2 rounded-xl text-xs font-bold mb-1">
                        <div className="flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-warning" />
                          <span>FOR SALE</span>
                        </div>
                        <span className="font-mono text-success text-sm font-black">{msg.price}</span>
                      </div>
                    )}

                    <p>{msg.message}</p>

                    {msg.imgUrl && (
                      <div className="rounded-xl overflow-hidden max-w-xs border border-border">
                        <img src={msg.imgUrl} alt="Listing" className="w-full h-36 object-cover" />
                      </div>
                    )}

                    <div className={`flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] ${msg.isSelf ? 'flex-row-reverse' : ''}`}>
                      <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                            setPinnedMessages(prev => ({ ...prev, [activeChannelId]: msg.message }));
                            alert('Message pinned to channel header');
                          }}
                          className="text-slate-400 hover:text-primary font-bold px-1.5 py-0.5 rounded-lg transition-colors text-[9px]"
                        >
                          Pin
                        </button>
                        {msg.price && !msg.isSelf && (
                          <button
                            onClick={() => setInterestedItem(msg)}
                            className="bg-primary text-white font-bold px-2 py-0.5 rounded-lg transition-colors text-[9px]"
                          >
                            Buy/Inquire
                          </button>
                        )}
                      </div>
                      <span className="text-[9.5px] text-slate-400 font-mono">
                        {msg.categoryTag ? `#${msg.categoryTag}` : ''}
                      </span>
                    </div>

                  </div>
                </div>
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat input footer with @ mention autocomplete */}
          <form onSubmit={handleSendMessage} className="relative h-16 border-t border-border flex items-center px-4 gap-3 bg-white shrink-0">
            {showMentionPopup && (
              <div className="absolute bottom-16 left-4 right-4 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-44 overflow-y-auto p-1 font-sans">
                <div className="px-2.5 py-1 text-[9px] font-black uppercase text-slate-400 border-b border-slate-100 flex justify-between items-center">
                  <span>Mention Resident ({studentBlock ? `Block ${studentBlock}` : 'All Blocks'})</span>
                  <span className="text-[8px] font-normal text-slate-300">Click to tag</span>
                </div>
                {residents
                  .filter((r: any) => r.studentName && r.studentName.toLowerCase().includes(mentionQuery.toLowerCase()))
                  .slice(0, 6)
                  .map((r: any) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleSelectMention(r.studentName)}
                      className="w-full text-left px-3 py-2 hover:bg-indigo-50 rounded-lg text-xs font-bold text-slate-800 flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-[10px] uppercase">
                          {r.studentName.charAt(0)}
                        </div>
                        <span>@{r.studentName}</span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-mono">{r.usn}</span>
                    </button>
                  ))}
                {residents.filter((r: any) => r.studentName && r.studentName.toLowerCase().includes(mentionQuery.toLowerCase())).length === 0 && (
                  <div className="px-3 py-2 text-[10px] text-slate-400 italic">No resident found in this block</div>
                )}
              </div>
            )}

            <input 
              type="text" 
              placeholder={`Message #${activeChannel.name}... (type @ to mention)`}
              value={inputText}
              onChange={handleInputChange}
              className="flex-1 border border-border rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none"
            />
            
            <button
              type="submit"
              className="bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-xl shadow transition-colors flex items-center gap-1.5 font-bold text-xs cursor-pointer"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

        </div>

      </div>

      {/* MODAL: Post Marketplace Item */}
      {showMarketplaceModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-border shadow-2xl animate-fadeIn">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-black text-slate-900">Post Item for Sale / Exchange</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Visible to all hostel residents in #buy-sell-market</p>
              </div>
              <button onClick={() => setShowMarketplaceModal(false)} className="text-slate-400 hover:text-slate-700 text-lg font-bold">✕</button>
            </div>

            <form onSubmit={handlePostMarketplaceItem} className="space-y-3 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Item Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Study Lamp / Physics Textbook"
                  value={itemTitle}
                  onChange={e => setItemTitle(e.target.value)}
                  required
                  className="w-full border border-border rounded-xl p-2.5 font-bold outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Price (₹) *</label>
                  <input
                    type="number"
                    placeholder="350"
                    value={itemPrice}
                    onChange={e => setItemPrice(e.target.value)}
                    required
                    className="w-full border border-border rounded-xl p-2.5 font-bold outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Category</label>
                  <select
                    value={itemCategory}
                    onChange={e => setItemCategory(e.target.value)}
                    className="w-full border border-border rounded-xl p-2.5 font-bold bg-white outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="Books">Textbooks & Notes</option>
                    <option value="Appliance">Electronics & Kettle</option>
                    <option value="Furniture">Chair / Mattress</option>
                    <option value="Sports">Cycle / Badminton</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Simulated Item Image Preset</label>
                <select
                  value={itemImagePreset}
                  onChange={e => setItemImagePreset(e.target.value)}
                  className="w-full border border-border rounded-xl p-2.5 font-bold bg-white outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="none">No Image (Default)</option>
                  <option value="book">Textbook Image</option>
                  <option value="kettle">Electric Kettle Image</option>
                  <option value="chair">Study Chair Image</option>
                  <option value="cycle">Bicycle Image</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Item Description</label>
                <textarea
                  rows={3}
                  placeholder="Mention age, condition, and room contact details..."
                  value={itemDesc}
                  onChange={e => setItemDesc(e.target.value)}
                  className="w-full border border-border rounded-xl p-2.5 font-semibold outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-xl shadow flex items-center justify-center gap-1.5 transition-colors mt-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Publish Listing</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* RESIDENT PROFILE CARD MODAL */}
      {selectedResident && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-5 shadow-2xl border border-border">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-black text-slate-900">Resident Profile</h3>
                <p className="text-xs text-text-muted mt-0.5 font-semibold">Verified hostel resident card</p>
              </div>
              <button onClick={() => setSelectedResident(null)} className="text-slate-400 hover:text-slate-700 text-lg font-bold">✕</button>
            </div>

            <div className="text-center space-y-3 pt-2 text-xs font-semibold">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-xl mx-auto border border-primary/20 shadow-sm uppercase">
                {selectedResident.name.charAt(0)}
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">{selectedResident.name}</h4>
                <span className="text-[10px] text-text-muted font-mono">{selectedResident.usn}</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-left">
                <div>
                  <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider block">Room Number</span>
                  <span className="text-slate-800 font-bold">{selectedResident.room || 'Hostel Resident'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedResident(null);
                setLeftTab('channels');
                setInputText(`@${selectedResident.name} `);
              }}
              className="w-full bg-slate-950 hover:bg-slate-900 text-white font-bold py-2.5 rounded-xl text-xs transition-colors"
            >
              Mention in Chat
            </button>
          </div>
        </div>
      )}

      {/* INQUIRY MESSAGE MODAL */}
      {interestedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-border shadow-2xl">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-black text-slate-900">Express Purchase Interest</h3>
                <p className="text-xs text-text-muted mt-0.5 font-semibold">An inquiry message will be sent in #buy-sell-market</p>
              </div>
              <button onClick={() => setInterestedItem(null)} className="text-slate-400 hover:text-slate-700 text-lg font-bold">✕</button>
            </div>

            <div className="bg-slate-50 p-3.5 border border-slate-200 rounded-xl space-y-1.5 text-xs text-left">
              <div><strong>Seller:</strong> {interestedItem.senderName} ({interestedItem.roomNo})</div>
              <div><strong>Item:</strong> {interestedItem.message.split(':')[0]}</div>
              <div><strong>Price:</strong> <span className="font-mono text-success font-black">{interestedItem.price}</span></div>
            </div>

            <form onSubmit={handleBuyInquirySubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Your Message / Offer Details</label>
                <textarea
                  rows={2}
                  value={interestOfferMessage}
                  onChange={e => setInterestOfferMessage(e.target.value)}
                  className="w-full border border-border rounded-xl p-2.5 font-semibold focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2.5 rounded-xl shadow transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Buy Inquiry</span>
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};