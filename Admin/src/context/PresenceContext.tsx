import React, { createContext, useContext, useEffect, useState } from 'react';
import { socket } from '../lib/socket';
import type { AdminPresence, EditingLock } from '../lib/socket';
import { useLocation } from 'react-router-dom';

interface PresenceContextType {
  onlineAdmins: AdminPresence[];
  activeLocks: EditingLock[];
  acquireLock: (resourceId: string, resourceType: string) => void;
  releaseLock: (resourceId: string, resourceType: string) => void;
  isLockedByOther: (resourceId: string, resourceType: string) => AdminPresence | undefined;
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined);

export const PresenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [onlineAdmins, setOnlineAdmins] = useState<AdminPresence[]>([]);
  const [activeLocks, setActiveLocks] = useState<EditingLock[]>([]);
  const location = useLocation();

  useEffect(() => {
    // Determine admin name (for demo purposes, use localStorage or default)
    const adminName = localStorage.getItem('adminName') || 'Chief Warden';
    const role = localStorage.getItem('adminRole') || 'Administrator';

    // On connect, emit join
    socket.emit('admin_join', { adminName, role });

    socket.on('presence_updated', (admins: AdminPresence[]) => {
      setOnlineAdmins(admins);
    });

    socket.on('locks_updated', (locks: EditingLock[]) => {
      setActiveLocks(locks);
    });

    return () => {
      socket.off('presence_updated');
      socket.off('locks_updated');
    };
  }, []);

  // Update current module when route changes
  useEffect(() => {
    socket.emit('admin_navigate', location.pathname);
  }, [location.pathname]);

  const acquireLock = (resourceId: string, resourceType: string) => {
    socket.emit('lock_acquire', { resourceId, resourceType });
  };

  const releaseLock = (resourceId: string, resourceType: string) => {
    socket.emit('lock_release', { resourceId, resourceType });
  };

  const isLockedByOther = (resourceId: string, resourceType: string) => {
    const lock = activeLocks.find(l => l.resourceId === resourceId && l.resourceType === resourceType);
    if (!lock) return undefined;
    if (lock.socketId === socket.id) return undefined; // Locked by us
    
    // Find who locked it
    return onlineAdmins.find(a => a.socketId === lock.socketId) || 
           { adminName: lock.adminName } as AdminPresence;
  };

  return (
    <PresenceContext.Provider value={{ onlineAdmins, activeLocks, acquireLock, releaseLock, isLockedByOther }}>
      {children}
    </PresenceContext.Provider>
  );
};

export const usePresence = () => {
  const context = useContext(PresenceContext);
  if (!context) {
    throw new Error('usePresence must be used within a PresenceProvider');
  }
  return context;
};
