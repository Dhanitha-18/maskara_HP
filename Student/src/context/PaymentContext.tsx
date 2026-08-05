import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { apiRequest } from '../services/api';
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
  const [applicationState, setApplicationState] = useState<'not_applied' | 'applied' | 'room_allotted' | 'paid'>('not_applied');
  const [backendPayments, setBackendPayments] = useState<any[]>([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);

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

  // ──────────────────────────────────────────────
  // FETCH REAL STATUS FROM BACKEND
  // ──────────────────────────────────────────────
  const refreshStatus = useCallback(async () => {
    if (!studentUsn || !isLoggedIn) return;

    setIsLoadingStatus(true);
    try {
      const data = await apiRequest(`/api/student/status/${studentUsn}`);

      if (!data.found || data.error === 'No account exists' || data.applicationState === 'rejected') {
        if (data.error === 'No account exists' || data.applicationState === 'rejected') {
          logout();
        }
        setApplicationState('not_applied');
        setIsLoadingStatus(false);
        return;
      }

      // Map backend applicationState to our local states
      const stateMap: Record<string, 'not_applied' | 'applied' | 'room_allotted' | 'paid'> = {
        'not_applied': 'not_applied',
        'applied': 'applied',
        'PENDING': 'applied',
        'APPROVED': 'applied',
        'HOLD': 'applied',
        'REJECTED': 'applied',
        'ALLOCATED': 'room_allotted',
        'on_hold': 'applied',
        'rejected': 'applied',
        'room_allotted': 'room_allotted',
        'paid': 'paid'
      };
      const mappedState = stateMap[data.applicationState.toUpperCase()] || stateMap[data.applicationState] || 'not_applied';
      setApplicationState(mappedState);

      // Update student info from real application data
      if (data.application) {
        const app = data.application;
        const formattedAppId = app.id ? (app.id.startsWith('APP-') ? app.id : `APP-2026-${app.id.slice(0, 6).toUpperCase()}`) : `APP-2026-${app.usn}`;
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

      // Fetch notices from backend and update notifications list
      const noticesRes = await fetch('http://localhost:5000/api/notices');
      if (noticesRes.ok) {
        const noticesData = await noticesRes.json();
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
      }

    } catch (error) {
      console.error('Failed to fetch student status:', error);
    } finally {
      setIsLoadingStatus(false);
    }
  }, [studentUsn, isLoggedIn, setStudentName]);

  // Fetch status on login and poll every 3 seconds for real-time updates
  useEffect(() => {
    if (!studentUsn || !isLoggedIn) return;

    refreshStatus();
    const interval = setInterval(refreshStatus, 3000);
    return () => clearInterval(interval);
  }, [studentUsn, isLoggedIn, refreshStatus]);

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
