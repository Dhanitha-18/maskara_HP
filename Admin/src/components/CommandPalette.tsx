import { API_BASE_URL } from '../lib/api';
import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, User, DoorOpen, Loader2, ArrowRight } from 'lucide-react';

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Keyboard shortcut listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setSearchQuery('');
    }
  }, [isOpen]);

  // Fetch data
  const { data: applications = [], isLoading: loadingApps } = useQuery({
    queryKey: ['applications'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/applications`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isOpen,
    staleTime: Infinity
  });

  const { data: blocks = [], isLoading: loadingBlocks } = useQuery({
    queryKey: ['occupancy'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/occupancy`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isOpen,
    staleTime: Infinity
  });

  const isLoading = loadingApps || loadingBlocks;

  // Filter Data
  const filteredApps = applications.filter((app: any) => {
    if (!searchQuery) return false; // Don't show all if empty, or show a few recent? Let's hide if empty.
    const query = searchQuery.toLowerCase();
    return app.studentName.toLowerCase().includes(query) || app.usn.toLowerCase().includes(query);
  }).slice(0, 5); // Limit to top 5

  const filteredRooms = React.useMemo(() => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase();
    let rooms: any[] = [];
    blocks.forEach((block: any) => {
      block.rooms.forEach((room: any) => {
        if (room.roomNo.toLowerCase().includes(query)) {
          rooms.push({ ...room, blockName: block.name });
        }
      });
    });
    return rooms.slice(0, 5); // Limit to top 5
  }, [blocks, searchQuery]);

  const hasResults = filteredApps.length > 0 || filteredRooms.length > 0;
  const showInitialState = !searchQuery && !isLoading;
  const showNoResults = searchQuery && !isLoading && !hasResults;

  const handleSelectApp = (app: any) => {
    setIsOpen(false);
    navigate('/applications');
    // Ideally we would pass state or query params to auto-expand the student
  };

  const handleSelectRoom = (room: any) => {
    setIsOpen(false);
    navigate('/occupancy');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full max-w-2xl bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/60 overflow-hidden relative z-10 flex flex-col max-h-[70vh]"
          >
            {/* Search Input Area */}
            <div className="flex items-center px-4 border-b border-slate-200/60 bg-white/50">
              <Search className="w-6 h-6 text-indigo-500 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                className="w-full bg-transparent border-none outline-none py-5 px-4 text-xl text-slate-800 placeholder-slate-400 font-medium"
                placeholder="Search students (name/USN) or rooms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {isLoading && <Loader2 className="w-5 h-5 text-slate-400 animate-spin shrink-0" />}
              <div className="shrink-0 flex items-center space-x-1 ml-2">
                <kbd className="hidden sm:inline-block px-2 py-1 bg-slate-100 border border-slate-200 rounded text-xs font-bold text-slate-500 font-mono">ESC</kbd>
              </div>
            </div>

            {/* Results Area */}
            <div className="overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-200 flex-1">
              
              {showInitialState && (
                <div className="py-12 px-6 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-700">Quick Search</h3>
                  <p className="text-slate-500 mt-1">Start typing to quickly find students, applications, and rooms across the system.</p>
                </div>
              )}

              {showNoResults && (
                <div className="py-12 px-6 text-center">
                  <p className="text-slate-500 font-medium">No results found for "{searchQuery}"</p>
                </div>
              )}

              {filteredApps.length > 0 && (
                <div className="mb-4">
                  <div className="px-3 py-2 text-xs font-bold text-indigo-500 uppercase tracking-wider">
                    Students
                  </div>
                  <div className="space-y-1">
                    {filteredApps.map((app: any) => (
                      <button
                        key={app.id}
                        onClick={() => handleSelectApp(app)}
                        className="w-full flex items-center p-3 rounded-xl hover:bg-indigo-50 text-left transition-colors group focus:outline-none focus:bg-indigo-50"
                      >
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mr-4 shrink-0">
                          <User className="w-5 h-5" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="font-bold text-slate-800 truncate">{app.studentName}</p>
                          <p className="text-xs text-slate-500 truncate">{app.usn} • {app.department}</p>
                        </div>
                        <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowRight className="w-4 h-4 text-indigo-500" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {filteredRooms.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-bold text-teal-500 uppercase tracking-wider">
                    Rooms
                  </div>
                  <div className="space-y-1">
                    {filteredRooms.map((room: any) => (
                      <button
                        key={room.id}
                        onClick={() => handleSelectRoom(room)}
                        className="w-full flex items-center p-3 rounded-xl hover:bg-teal-50 text-left transition-colors group focus:outline-none focus:bg-teal-50"
                      >
                        <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 mr-4 shrink-0">
                          <DoorOpen className="w-5 h-5" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="font-bold text-slate-800 truncate">Room {room.roomNo}</p>
                          <p className="text-xs text-slate-500 truncate">{room.blockName} • Floor {room.floor}</p>
                        </div>
                        <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowRight className="w-4 h-4 text-teal-500" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
