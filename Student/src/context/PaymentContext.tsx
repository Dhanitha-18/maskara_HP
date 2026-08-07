import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { apiRequest, API_BASE_URL } from '../services/api';
import { socket } from '../lib/socket';
import type {
  Student,
  HostelInfo,
  FeeSummary,
  NotificationItem,
  ReceiptItem
} from '../data/mockData';
import {
  mockStudent,
  mockHostel,
  mockFees,
  mockNotifications,
  mockReceipts
} from '../data/mockData';

export type PaymentStatusType =
  | 'Pending'
  | 'Processing'
  | 'Successful'
  | 'Waiting for Admin Verification'
  | 'Verified'
  | 'Bed Confirmed';

export interface TicketItem {
  id: string;
  subject: string;
  category: string;
  description: string;
  status: 'Open' | 'Resolved';
  date: string;
}

interface PaymentContextType {
  student: Student;
  hostel: HostelInfo;
  fees: FeeSummary;
  paymentSelection: 'full' | 'half' | null;
  paymentStatus: PaymentStatusType;
  notifications: NotificationItem[];
  receipts: ReceiptItem[];
  tickets: TicketItem[];
  applicationState: 'not_applied' | 'applied' | 'room_allotted' | 'paid';
  backendPayments: any[];
  isLoadingStatus: boolean;
  setPaymentStatus: (status: PaymentStatusType) => void;
  selectInstallment: (type: 'full' | 'half') => void;
  processPayment: (method: string, amount: number) => Promise<boolean>;
  advanceStatus: () => void;
  resetPayment: () => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  addTicket: (subject: string, category: string, description: string) => void;
  submitApplication: (data: any) => Promise<void>;
  allotRoom: () => void;
  updateStudent: (studentData: Partial<Student>) => void;
  setFees: React.Dispatch<React.SetStateAction<FeeSummary>>;
  setApplicationState: React.Dispatch<React.SetStateAction<'not_applied' | 'applied' | 'room_allotted' | 'paid'>>;
  refreshStatus: () => Promise<void>;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export const PaymentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { studentUsn, studentName, isLoggedIn, setStudentName, logout } = useAuth();

  const [student, setStudent] = useState<Student>(mockStudent);
  const [hostel, setHostel] = useState<HostelInfo>(mockHostel);
  const [fees, setFees] = useState<FeeSummary>(() => ({
    ...mockFees,
    paid: 15000,
    remaining: mockFees.total - 15000,
  }));
  const [paymentSelection, setPaymentSelection] = useState<'full' | 'half' | null>(null);
  const [paymentStatus, setPaymentStatusState] = useState<PaymentStatusType>('Pending');
  const [notifications, setNotifications] = useState<NotificationItem[]>(mockNotifications);
  const [receipts, setReceipts] = useState<ReceiptItem[]>(mockReceipts);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [applicationState, setApplicationState] = useState<'not_applied' | 'applied' | 'room_allotted' | 'paid'>(() => {
    // Restore per-student cached state if available
    const usn = localStorage.getItem('student_usn');
    if (usn) {
      const cached = localStorage.getItem(`cached_application_state_${usn}`);
      if (cached === 'applied' || cached === 'room_allotted' || cached === 'paid') return cached;
    }
    return 'applied';
  });
  const [backendPayments, setBackendPayments] = useState<any[]>([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const isRefreshing = useRef(false);
  const hasLoadedOnce = useRef(false);

  // Sync auth credentials to student state instantly on login/mount
  useEffect(() => {
    if (studentName || studentUsn) {
      setStudent(prev => ({
        ...prev,
        name: studentName || prev.name,
        usn: studentUsn || prev.usn
      }));
    }
  }, [studentName, studentUsn]);

  // Cache applicationState to localStorage per student USN
  useEffect(() => {
    if (studentUsn && applicationState) {
      localStorage.setItem(`cached_application_state_${studentUsn}`, applicationState);
    }
  }, [applicationState, studentUsn]);

  // ──────────────────────────────────────────────
  // FETCH REAL STATUS FROM BACKEND
  // ──────────────────────────────────────────────
  const refreshStatus = useCallback(async () => {
    const studentIdentifier = studentUsn || studentPhone || localStorage.getItem('student_phone') || localStorage.getItem('student_usn');
    if (!studentIdentifier || !isLoggedIn) return;
    if (isRefreshing.current) return;
    isRefreshing.current = true;

    if (!hasLoadedOnce.current) setIsLoadingStatus(true);
    try {
      const data = await apiRequest(`/api/student/status/${encodeURIComponent(studentIdentifier)}`);

      if (!data.found || data.error === 'No account exists') {
        setApplicationState('applied');
        return;
      }

      // Map backend applicationState directly
      const stateMap: Record<string, 'not_applied' | 'applied' | 'room_allotted' | 'paid'> = {
        'not_applied': 'applied',
        'applied': 'applied',
        'PENDING': 'applied',
        'APPROVED': 'applied',
        'HOLD': 'applied',
        'REJECTED': 'applied',
        'ALLOCATED': 'room_allotted',
        'room_allotted': 'room_allotted',
        'paid': 'paid'
      };
      const mappedState = stateMap[data.applicationState] || 'applied';
      setApplicationState(mappedState);
      if (studentUsn) {
        localStorage.setItem(`cached_application_state_${studentUsn}`, mappedState);
      }

      // Update student info from real application data
      if (data.application) {
        const app = data.application;
        const formattedAppId = app.id ? (app.id.startsWith('APP-') ? app.id : `APP-2026-${app.id.slice(0, 6).toUpperCase()}`) : (app.phoneNumber ? `APP-2026-${app.phoneNumber}` : 'APP-2026-STUDENT');
        setStudent(prev => ({
          ...prev,
          id: formattedAppId,
          applicationId: formattedAppId,
          name: app.studentName || prev.name,
          usn: app.usn || prev.usn,
          department: app.department || prev.department,
          email: app.email || prev.email,
          phone: app.phoneNumber || app.phone || prev.phone,
          address: app.permanentAddress || app.address || prev.address,
          parentContact: app.fatherName ? `${app.fatherName} (${app.fatherPhone || ''})` : prev.parentContact,
          photoUrl: app.photoUrl || app.passportPhoto || prev.photoUrl,
          passportPhoto: app.passportPhoto || app.photoUrl || prev.passportPhoto,
          applicationData: app
        }));
        setStudentName(app.studentName);
      }

      // Update hostel info from real allocation data
      if (data.hostelInfo) {
        setHostel({
          hostel: data.hostelInfo.hostel,
          block: data.hostelInfo.block,
          floor: data.hostelInfo.floor,
          room: data.hostelInfo.room,
          bed: data.hostelInfo.bed,
          sharing: data.hostelInfo.sharing,
          admissionDate: data.hostelInfo.admissionDate,
        });
      }

      // Update payment information from real data
      if (data.payments && data.payments.length > 0) {
        setBackendPayments(data.payments);

        // Derive payment status for the UI
        const hasApproved = data.payments.some((p: any) => p.status === 'APPROVED');
        const hasPending = data.payments.some((p: any) => p.status === 'PENDING_REVIEW');

        if (hasApproved) {
          setPaymentStatusState('Verified');
        } else if (hasPending) {
          setPaymentStatusState('Waiting for Admin Verification');
        }

        // Compute fee totals
        const approvedAmount = data.payments
          .filter((p: any) => p.status === 'APPROVED')
          .reduce((_sum: number) => _sum + 70000, 0); // simplified per-installment logic
        setFees(prev => ({
          ...prev,
          paid: 15000 + approvedAmount,
          remaining: Math.max(0, prev.total - 15000 - approvedAmount),
        }));
      } else {
        setBackendPayments([]);
      }

      // Fetch notices from backend (only on first load, not every poll)
      if (!hasLoadedOnce.current) {
        try {
          const noticesData = await apiRequest('/api/notices');
          const noticesList = noticesData.notices || [];
          const readIds = JSON.parse(localStorage.getItem('read_notifications') || '[]');
          
          const mappedNotifs: NotificationItem[] = noticesList.map((notice: any) => {
            const createdDate = new Date(notice.createdAt);
            const dateStr = notice.date || createdDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
            const timeStr = createdDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            
            return {
              id: notice.id,
              title: notice.title,
              description: notice.desc,
              date: dateStr,
              time: timeStr,
              category: notice.category?.toLowerCase() || 'general',
              read: readIds.includes(notice.id)
            };
          });
          
          setNotifications(mappedNotifs);
        } catch {
          // Notices fetch failure is non-critical
        }
      }

    } catch (error) {
      console.error('Failed to fetch student status:', error);
    } finally {
      hasLoadedOnce.current = true;
      isRefreshing.current = false;
      setIsLoadingStatus(false);
    }
  }, [studentUsn, isLoggedIn, setStudentName]);

  // Fetch status on login; poll every 30s for background sync
  useEffect(() => {
    if (!isLoggedIn) return;

    refreshStatus();
    const interval = setInterval(refreshStatus, 30000);
    return () => clearInterval(interval);
  }, [isLoggedIn, refreshStatus]);

  // Listen for real-time socket events so changes reflect instantly
  useEffect(() => {
    if (!isLoggedIn) return;

    const handleDataUpdated = () => { refreshStatus(); };
    const handleAccountDeleted = (data: any) => {
      if (data?.usns?.includes(studentUsn) || data?.phones?.includes(studentPhone)) {
        localStorage.removeItem('cached_application_state');
        logout();
      }
    };

    socket.on('data_updated', handleDataUpdated);
    socket.on('BED_ALLOCATED', handleDataUpdated);
    socket.on('APPLICATION_UPDATED', handleDataUpdated);
    socket.on('STUDENT_UPDATED', handleDataUpdated);
    socket.on('student_account_deleted', handleAccountDeleted);

    return () => {
      socket.off('data_updated', handleDataUpdated);
      socket.off('BED_ALLOCATED', handleDataUpdated);
      socket.off('APPLICATION_UPDATED', handleDataUpdated);
      socket.off('STUDENT_UPDATED', handleDataUpdated);
      socket.off('student_account_deleted', handleAccountDeleted);
    };
  }, [isLoggedIn, studentUsn, studentPhone, refreshStatus, logout]);

  // ──────────────────────────────────────────────
  // EXISTING FUNCTIONS (kept for compatibility)
  // ──────────────────────────────────────────────

  const setPaymentStatus = (status: PaymentStatusType) => {
    setPaymentStatusState(status);
  };

  const selectInstallment = (type: 'full' | 'half') => {
    setPaymentSelection(type);
    const amountToPay = type === 'full' ? fees.total : fees.total / 2;
    setFees(prev => ({
      ...prev,
      paid: amountToPay,
      remaining: prev.total - amountToPay,
    }));
  };

  const submitApplication = async (data: any) => {
    try {
      const response = await apiRequest("/api/applications", {
        method: "POST",
        body: JSON.stringify(data),
      });

      console.log("API Response:", response);
      setApplicationState("applied");

      // Refresh status to get latest from backend
      setTimeout(() => refreshStatus(), 1000);
      return response;
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const allotRoom = () => {
    // This is now a no-op since allocation happens from admin portal
    // Kept for interface compatibility
    refreshStatus();
  };

  const processPayment = async (method: string, amount: number): Promise<boolean> => {
    setPaymentStatus('Processing');

    await new Promise(resolve => setTimeout(resolve, 2000));

    setPaymentStatus('Successful');
    setApplicationState('paid');

    setFees(prev => {
      const newPaid = prev.paid + amount;
      return {
        ...prev,
        paid: newPaid,
        remaining: Math.max(0, prev.total - newPaid)
      };
    });

    const txId = 'TXN' + Math.floor(1000000000 + Math.random() * 9000000000);
    const refNo = 'REF' + Math.floor(1000000 + Math.random() * 9000000);
    const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const newReceipt: ReceiptItem = {
      receiptNo: `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      studentName: student.name,
      usn: student.usn,
      department: student.department,
      hostelName: hostel.hostel,
      block: hostel.block,
      roomNo: hostel.room,
      bedNo: hostel.bed,
      amountPaid: amount,
      remainingAmount: fees.total - amount,
      paymentMethod: method,
      transactionId: txId,
      refNo: refNo,
      date: dateStr,
      status: 'Pending'
    };

    setReceipts(prev => [newReceipt, ...prev]);

    setTimeout(() => {
      setPaymentStatus('Waiting for Admin Verification');
    }, 1000);

    return true;
  };

  const advanceStatus = () => {
    // Now triggers a refresh from backend instead of simulating
    refreshStatus();
  };

  const resetPayment = () => {
    setPaymentSelection(null);
    setFees({
      ...mockFees,
      paid: 15000,
      remaining: mockFees.total - 15000
    });
    setPaymentStatus('Pending');
    setApplicationState('not_applied');
  };

  const markNotificationRead = (id: string) => {
    const readIds = JSON.parse(localStorage.getItem('read_notifications') || '[]');
    if (!readIds.includes(id)) {
      readIds.push(id);
      localStorage.setItem('read_notifications', JSON.stringify(readIds));
    }
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllNotificationsRead = () => {
    const allIds = notifications.map(n => n.id);
    localStorage.setItem('read_notifications', JSON.stringify(allIds));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const addTicket = (subject: string, category: string, description: string) => {
    const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const newTicket: TicketItem = {
      id: `TCK-${Math.floor(100000 + Math.random() * 900000)}`,
      subject,
      category,
      description,
      status: 'Open',
      date: dateStr
    };
    setTickets(prev => [newTicket, ...prev]);

  };

  const updateStudent = (studentData: Partial<Student>) => {
    setStudent(prev => ({
      ...prev,
      ...studentData
    }));
  };

  return (
    <PaymentContext.Provider value={{
      student,
      hostel,
      fees,
      paymentSelection,
      paymentStatus,
      notifications,
      receipts,
      tickets,
      applicationState,
      backendPayments,
      isLoadingStatus,
      setPaymentStatus,
      selectInstallment,
      processPayment,
      advanceStatus,
      resetPayment,
      markNotificationRead,
      markAllNotificationsRead,
      addTicket,
      submitApplication,
      allotRoom,
      updateStudent,
      setFees,
      setApplicationState,
      refreshStatus
    }}>
      {children}
    </PaymentContext.Provider>
  );
};

export const usePayment = () => {
  const context = useContext(PaymentContext);
  if (context === undefined) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
};
