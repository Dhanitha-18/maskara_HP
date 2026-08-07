import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Send, ShieldAlert, Heart, Plus, ShoppingBag, 
  Search, Pin, Tag, Trash2, Edit2, MessageSquare, 
  Users, Sparkles, HelpCircle, Loader2, Image, 
  X, Eye, Edit3
} from 'lucide-react';
import { toast } from 'sonner';
import { socket } from '../../lib/socket';
import { useAuthStore } from '../../store/useAuthStore';

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

export default function SocialControl() {
  const queryClient = useQueryClient();
  const { role, allowedBlocks } = useAuthStore();

  const isBlockAllowed = (itemBlock?: string) => {
    if (role === 'CHIEF') return true;
    if (!allowedBlocks || allowedBlocks.includes('ALL')) return true;
    if (!itemBlock) return true;
    const cleanItemBlock = itemBlock.trim().toLowerCase();
    return allowedBlocks.some(b => {
      const cleanB = b.trim().toLowerCase();
      return cleanItemBlock.includes(cleanB) || cleanB.includes(cleanItemBlock);
    });
  };

  const [activeChannelId, setActiveChannelId] = useState<string>('general');
  const [inputText, setInputText] = useState('');
  
  // Left panel active tab
  const [leftTab, setLeftTab] = useState<'channels' | 'directory'>('channels');
  const [directorySearch, setDirectorySearch] = useState('');

  // Socket instance
  const socketRef = useRef<any>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // States for messages and channels to allow instant socket updates
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<Record<string, string>>({
    general: 'Notice: Keep hostel lounge noise low after 10:00 PM. Clean up common tables after meals.',
    marketplace: 'Tip: Always verify the condition of electrical appliances before purchasing.',
    study: 'Exam Notice: Mid-semester exams start on Monday. Study rooms are open 24/7.',
    lostfound: 'Notice: Unclaimed items will be donated to charity at the end of the semester.',
    sports: 'Announcement: Hostel Cricket Premier League registrations close tomorrow!'
  });

  // Modal / Dialog States
  const [selectedResident, setSelectedResident] = useState<any>(null);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [newChannelIcon, setNewChannelIcon] = useState('MessageSquare');
  const [newChannelBadge, setNewChannelBadge] = useState('');

  const [showRenameChannelModal, setShowRenameChannelModal] = useState<Channel | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameDescValue, setRenameDescValue] = useState('');
  const [newChannelBlock, setNewChannelBlock] = useState<string>('ALL');

  // Fetch available hostel blocks
  const { data: availableBlocks = [] } = useQuery({
    queryKey: ['available-blocks'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/blocks');
      if (!res.ok) throw new Error('Failed to fetch blocks');
      return res.json();
    }
  });

  // Fetch Channels
  const { data: serverChannels, isLoading: isChannelsLoading } = useQuery({
    queryKey: ['chat-channels'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/chat/channels');
      if (!res.ok) throw new Error('Failed to fetch channels');
      return res.json();
    }
  });

  // Fetch active channel messages
  const { data: serverMessages, isLoading: isMessagesLoading, refetch: refetchMessages } = useQuery({
    queryKey: ['chat-messages', activeChannelId],
    queryFn: async () => {
      const res = await fetch(`http://localhost:5000/api/chat/channels/${activeChannelId}/messages`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      return res.json();
    }
  });

  // Fetch resident directory from applications
  const { data: residents } = useQuery({
    queryKey: ['residents-list'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/applications');
      if (!res.ok) throw new Error('Failed to fetch residents');
      const all = await res.json();
      // Only show approved/allocated students
      return all.filter((a: any) => a.status === 'APPROVED' || a.status === 'ALLOCATED');
    }
  });

  // Connect sockets on mount
  useEffect(() => {
    const handleMsg = (data: { channelId: string; message: any }) => {
      if (data.channelId === activeChannelId) {
        setMessages(prev => {
          if (prev.some(m => m.id === data.message.id)) return prev;
          return [...prev, { ...data.message, isSelf: data.message.usn === 'ADMIN-01' }];
        });
      }
    };

    const handleChanCreated = (newChan: Channel) => {
      setChannels(prev => {
        if (prev.some(c => c.id === newChan.id)) return prev;
        return [...prev, newChan];
      });
    };

    const handleChanUpdated = (updatedChan: Channel) => {
      setChannels(prev => prev.map(c => c.id === updatedChan.id ? updatedChan : c));
    };

    const handleChanDeleted = (deletedId: string) => {
      setChannels(prev => prev.filter(c => c.id !== deletedId));
      if (activeChannelId === deletedId) {
        setActiveChannelId('general');
      }
    };

    socket.on('chat_message_received', handleMsg);
    socket.on('chat_channel_created', handleChanCreated);
    socket.on('chat_channel_updated', handleChanUpdated);
    socket.on('chat_channel_deleted', handleChanDeleted);

    return () => {
      socket.off('chat_message_received', handleMsg);
      socket.off('chat_channel_created', handleChanCreated);
      socket.off('chat_channel_updated', handleChanUpdated);
      socket.off('chat_channel_deleted', handleChanDeleted);
    };
  }, [activeChannelId]);

  // Sync servers query results to local state
  useEffect(() => {
    if (serverChannels) setChannels(serverChannels);
  }, [serverChannels]);

  useEffect(() => {
    if (serverMessages) {
      setMessages(serverMessages.map((msg: any) => ({
        ...msg,
        isSelf: msg.usn === 'ADMIN-01'
      })));
    }
  }, [serverMessages]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Scroll window to top on page mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const visibleMessages = messages.filter(msg => msg.isSelf || isBlockAllowed((msg as any).block));

  const activeChannel = channels.find(c => c.id === activeChannelId) || channels[0] || { name: 'general-lounge', desc: '' };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const payload = {
      senderName: 'Hostel Admin',
      usn: 'ADMIN-01',
      roomNo: 'Warden Office',
      message: inputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    try {
      const res = await fetch(`http://localhost:5000/api/chat/channels/${activeChannelId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send message');

      setInputText('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to deliver message');
    }
  };

  const safeParseJson = async (res: Response) => {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { error: `Server error (${res.status})` };
    }
  };

  // Channels CRUD handlers
  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    try {
      const res = await fetch('http://localhost:5000/api/chat/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newChannelName.trim(),
          desc: newChannelDesc.trim(),
          iconName: newChannelIcon,
          badge: newChannelBadge.trim() || undefined,
          targetBlock: newChannelBlock
        })
      });
      const data = await safeParseJson(res);
      if (!res.ok) throw new Error(data.error || 'Failed to create channel');

      queryClient.invalidateQueries({ queryKey: ['chat-channels'] });
      toast.success('Channel created successfully');
      setShowCreateChannelModal(false);
      setNewChannelName('');
      setNewChannelDesc('');
      setNewChannelBadge('');
      setNewChannelBlock('ALL');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create channel');
    }
  };

  const handleRenameChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRenameChannelModal || !renameValue.trim()) return;

    try {
      const res = await fetch(`http://localhost:5000/api/chat/channels/${showRenameChannelModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: renameValue.trim(),
          desc: renameDescValue.trim()
        })
      });
      const data = await safeParseJson(res);
      if (!res.ok) throw new Error(data.error || 'Failed to rename channel');

      queryClient.invalidateQueries({ queryKey: ['chat-channels'] });
      toast.success('Channel updated');
      setShowRenameChannelModal(null);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const formatChannelTitle = (name: string) => {
    if (!name) return '';
    const cleanName = name.replace(/^#/, '').replace(/[-_]+/g, ' ');
    return cleanName
      .split(' ')
      .map(w => w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : '')
      .join(' ');
  };

  const handleDeleteChannel = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete channel "${formatChannelTitle(name)}"? This will permanently clear all its chat history.`)) {
      try {
        const res = await fetch(`http://localhost:5000/api/chat/channels/${id}`, {
          method: 'DELETE'
        });
        if (!res.ok) {
          const data = await safeParseJson(res);
          throw new Error(data.error || 'Failed to delete channel');
        }
        queryClient.invalidateQueries({ queryKey: ['chat-channels'] });
        toast.success('Channel deleted successfully');
      } catch (err: any) {
        toast.error(err.message);
      }
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
  const filteredResidents = (residents || []).filter((r: any) => 
    r.studentName.toLowerCase().includes(directorySearch.toLowerCase()) ||
    r.usn.toLowerCase().includes(directorySearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md">
        <div>
          <h2 className="text-base font-black uppercase tracking-wider text-indigo-400 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            Social Connect Center
          </h2>
          <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
            Monitor and manage multi-channel PG student chatrooms, marketplace, and resident directory.
          </p>
        </div>
        <button
          onClick={() => setShowCreateChannelModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md cursor-pointer hover:-translate-y-0.5 duration-200"
        >
          Create Channel
        </button>
      </div>

      {/* Main Social Connect Layout Grid */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-4 h-[650px] sm:h-[700px]">
        
        {/* Left column: Sidebar list of channels/directory */}
        <div className="hidden lg:flex flex-col justify-between border-r border-slate-200 bg-slate-50/70 p-4 text-xs font-semibold overflow-y-auto">
          
          <div className="space-y-5 flex-grow flex flex-col min-h-0">
            {/* Toggle tabs for Channels vs Directory */}
            <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl shrink-0">
              <button
                onClick={() => setLeftTab('channels')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  leftTab === 'channels' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Channels
              </button>
              <button
                onClick={() => setLeftTab('directory')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  leftTab === 'directory' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Directory
              </button>
            </div>

            {/* Channels tab view */}
            {leftTab === 'channels' ? (
              <div className="space-y-4 flex-grow overflow-y-auto min-h-0">
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Hostel Channels</span>
                  <div className="space-y-1">
                    {channels.map(ch => {
                      const Icon = getChannelIcon(ch.iconName);

                      return (
                        <div 
                          key={ch.id}
                          className={`w-full group flex items-center justify-between px-3 py-2 rounded-xl transition-all cursor-pointer ${
                            activeChannelId === ch.id 
                              ? 'bg-indigo-600 text-white shadow-sm' 
                              : 'text-slate-700 hover:bg-slate-200/60'
                          }`}
                          onClick={() => setActiveChannelId(ch.id)}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{formatChannelTitle(ch.name)}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {ch.badge && (
                              <span className={`text-[8px] px-1 rounded font-black uppercase ${
                                activeChannelId === ch.id ? 'bg-white text-indigo-600' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                              }`}>
                                {ch.badge}
                              </span>
                            )}
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRenameValue(ch.name);
                                  setRenameDescValue(ch.desc);
                                  setShowRenameChannelModal(ch);
                                }}
                                className={`p-0.5 rounded hover:bg-slate-300 ${activeChannelId === ch.id ? 'text-white hover:text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                                title="Edit Channel"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteChannel(ch.id, ch.name);
                                }}
                                className={`p-0.5 rounded hover:bg-red-500 hover:text-white ${activeChannelId === ch.id ? 'text-white' : 'text-slate-400'}`}
                                title="Delete Channel"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              // Directory tab view
              <div className="space-y-3 flex-grow overflow-y-auto min-h-0 flex flex-col">
                <div className="relative shrink-0">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none">
                    <Search className="w-3 h-3 text-slate-400" />
                  </span>
                  <input
                    type="text"
                    value={directorySearch}
                    onChange={e => setDirectorySearch(e.target.value)}
                    placeholder="Search resident directory..."
                    className="w-full pl-8 pr-2.5 py-1.5 text-[10px] font-bold bg-white border border-slate-200 rounded-lg outline-none"
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
                            phone: r.phoneNumber
                          })}
                          className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-200/50 cursor-pointer border border-transparent hover:border-slate-200"
                        >
                          <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-black text-indigo-700 uppercase">
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

          {/* Conduct Rules panel */}
          <div className="bg-slate-900 text-white p-3.5 rounded-xl space-y-1.5 border border-slate-800 mt-4 shrink-0">
            <div className="flex gap-1.5 items-center text-amber-400 font-black text-[9px] uppercase tracking-widest">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Community Conduct</span>
            </div>
            <p className="text-[9.5px] text-slate-300 leading-relaxed font-medium">
              Respect all residents. Spamming, fake items, or harassment results in immediate portal suspension.
            </p>
          </div>

        </div>

        {/* Right 3 columns: Chat Area */}
        <div className="lg:col-span-3 flex flex-col justify-between h-full bg-white min-h-0">
          
          {/* Header info bar */}
          <div className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 tracking-wider">
                  {formatChannelTitle(activeChannel.name)}
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold">{activeChannel.desc}</p>
              </div>
            </div>
          </div>

          {/* Pinned announcement inside channel */}
          {pinnedMessages[activeChannelId] && (
            <div className="bg-indigo-50/50 border-b border-indigo-100 px-6 py-2 flex items-center justify-between text-[11px] font-semibold text-slate-700 shrink-0">
              <div className="flex items-center gap-2">
                <Pin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>{pinnedMessages[activeChannelId]}</span>
              </div>
              <button
                onClick={() => setPinnedMessages(prev => ({ ...prev, [activeChannelId]: '' }))}
                className="text-slate-400 hover:text-slate-800 text-[10px]"
              >
                Clear Pin
              </button>
            </div>
          )}

          {/* Messages display container */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
            {visibleMessages.map(msg => (
              <div 
                key={msg.id}
                className={`flex gap-3 max-w-[88%] ${msg.isSelf ? 'ml-auto flex-row-reverse' : ''}`}
              >
                {/* User avatar */}
                <div 
                  onClick={() => setSelectedResident({ name: msg.senderName, room: msg.roomNo, usn: msg.usn })}
                  className={`w-9 h-9 rounded-full border flex items-center justify-center font-black text-xs shrink-0 uppercase shadow-sm cursor-pointer hover:scale-105 transition-transform ${
                    msg.isSelf 
                      ? 'bg-indigo-600 text-white border-indigo-600' 
                      : 'bg-slate-100 text-slate-800 border-slate-200'
                  }`}
                >
                  {msg.senderName.charAt(0)}
                </div>

                {/* Message detail container */}
                <div className="space-y-1">
                  <div className={`flex items-baseline gap-2 text-[10px] font-bold text-slate-400 ${msg.isSelf ? 'justify-end' : ''}`}>
                    <span 
                      onClick={() => setSelectedResident({ name: msg.senderName, room: msg.roomNo, usn: msg.usn })}
                      className="text-slate-900 font-black cursor-pointer hover:underline"
                    >
                      {msg.senderName}
                    </span>
                    <span className="font-mono text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{msg.roomNo}</span>
                    <span className="font-mono text-[9px]">{msg.time}</span>
                  </div>

                  <div className={`p-4 rounded-2xl text-xs leading-relaxed font-semibold shadow-sm border space-y-2 text-left ${
                    msg.isSelf 
                      ? 'bg-indigo-50 text-slate-800 border-indigo-200/60 rounded-tr-none' 
                      : 'bg-white text-slate-800 border-slate-200 rounded-tl-none'
                  }`}>
                    
                    {msg.price && (
                      <div className="flex items-center justify-between bg-slate-900 text-white p-2 rounded-xl text-xs font-bold mb-1">
                        <div className="flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-amber-400" />
                          <span>FOR SALE</span>
                        </div>
                        <span className="font-mono text-emerald-400 text-sm font-black">{msg.price}</span>
                      </div>
                    )}

                    <p>{msg.message}</p>

                    {msg.imgUrl && (
                      <div className="rounded-xl overflow-hidden max-w-xs border border-slate-200">
                        <img src={msg.imgUrl} alt="Listing" className="w-full h-36 object-cover" />
                      </div>
                    )}

                    {/* Footer interactions */}
                    <div className={`flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] ${msg.isSelf ? 'flex-row-reverse' : ''}`}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setPinnedMessages(prev => ({ ...prev, [activeChannelId]: msg.message }));
                            toast.success('Message pinned to channel header');
                          }}
                          className="text-slate-400 hover:text-indigo-600 font-bold px-1.5 py-0.5 rounded-lg transition-colors text-[9px] cursor-pointer"
                        >
                          Pin
                        </button>
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

          {/* Chat input box form */}
          <form onSubmit={handleSendMessage} className="h-16 border-t border-slate-200 flex items-center px-4 gap-3 bg-white shrink-0">
            <input 
              type="text" 
              placeholder={`Message #${activeChannel.name}...`}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
            />
            
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl shadow transition-colors flex items-center gap-1.5 font-bold text-xs cursor-pointer"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

        </div>

      </div>

      {/* CREATE CHANNEL DIALOG */}
      {showCreateChannelModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase">Create Hostel Channel</h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Define a new chat space for student PG residents.</p>
              </div>
              <button onClick={() => setShowCreateChannelModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateChannel} className="space-y-3 text-xs font-semibold">
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-black mb-1">Channel Name *</label>
                <input 
                  type="text"
                  placeholder="e.g. general-talk or mess-feedback"
                  value={newChannelName}
                  onChange={e => setNewChannelName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 outline-none font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-black mb-1">Target Hostel Block *</label>
                <select
                  value={newChannelBlock}
                  onChange={e => setNewChannelBlock(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 outline-none font-bold bg-white text-slate-800"
                >
                  <option value="ALL">All Blocks (Global Channel)</option>
                  {availableBlocks.map((b: any) => (
                    <option key={b.id} value={b.name}>
                      {b.name} ({b.gender ? String(b.gender).toUpperCase() : 'All'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-black mb-1">Description *</label>
                <textarea 
                  placeholder="What is this channel about?"
                  value={newChannelDesc}
                  onChange={e => setNewChannelDesc(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 outline-none font-semibold"
                  rows={2}
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all cursor-pointer shadow-md mt-2"
              >
                Create Channel
              </button>
            </form>
          </div>
        </div>
      )}

      {/* RENAME/EDIT CHANNEL DIALOG */}
      {showRenameChannelModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase">Edit Channel #{showRenameChannelModal.name}</h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Rename channel or update its description.</p>
              </div>
              <button onClick={() => setShowRenameChannelModal(null)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>

            <form onSubmit={handleRenameChannel} className="space-y-3 text-xs font-semibold">
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-black mb-1">Channel Name *</label>
                <input 
                  type="text"
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 outline-none font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-black mb-1">Description</label>
                <textarea 
                  value={renameDescValue}
                  onChange={e => setRenameDescValue(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 outline-none font-semibold"
                  rows={2}
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowRenameChannelModal(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition">Apply Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESIDENT PROFILE PROFILE DETAIL POPOVER */}
      {selectedResident && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase">Resident Profile</h3>
                <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">Verified hostel directory card</p>
              </div>
              <button onClick={() => setSelectedResident(null)} className="text-slate-400 hover:text-slate-700 text-lg font-bold">✕</button>
            </div>

            <div className="text-center space-y-3 pt-2 text-xs font-semibold">
              <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xl mx-auto uppercase shadow-sm">
                {selectedResident.name.charAt(0)}
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">{selectedResident.name}</h4>
                <span className="text-[10px] text-slate-400 font-mono">{selectedResident.usn}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-200 p-3 rounded-xl text-left">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Room Number</span>
                  <span className="text-slate-800 font-bold">{selectedResident.room || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Gender Group</span>
                  <span className="text-indigo-600 font-black">{selectedResident.gender || 'N/A'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedResident(null);
                setLeftTab('channels');
                setInputText(`@${selectedResident.name} `);
              }}
              className="w-full bg-slate-950 hover:bg-slate-900 text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
            >
              Mention in Chat
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
