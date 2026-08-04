import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { socket } from '../lib/socket';
import { motion } from 'framer-motion';
import {
  Mail,
  Search,
  Filter,
  Loader2,
  CheckCircle,
  AlertCircle,
  Edit,
  Send,
  Eye,
  Clock,
  Building,
  GraduationCap,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

// Reusable Types
type WorkflowType = 'ALLOCATION' | 'REJECTION' | 'PAYMENT_CONFIRMATION' | 'PAYMENT_REMINDER' | 'ANNUAL_FEE_REMINDER';

interface StudentData {
  id: string;
  studentName: string;
  usn: string;
  email: string;
  fatherEmail?: string;
  motherEmail?: string;
  guardianEmail?: string;
  studentEmailSent?: boolean;
  fatherEmailSent?: boolean;
  motherEmailSent?: boolean;
  emailResults?: Record<string, { email: string; sent: boolean }>;
  gender: string;
  yearSem: string;
  status: string;
  blockId: string;
  blockName: string;
  roomNo: string;
  floor: string;
  lastEmailStatus: 'Sent' | 'Pending' | 'Not Sent' | 'Failed';
  lastSentDate?: string;
  hasApprovedPayment?: boolean;
  allocationStatus?: string;
  bedNo?: string;
}

// Fallback student dataset matching the system entities in case tables are empty
const FALLBACK_STUDENTS: StudentData[] = [
  { id: 'app-001', studentName: 'Aditya Sharma', usn: '1BM21CS001', email: 'aditya.sharma@bmsit.in', gender: 'MALE', blockId: 'boys-a', blockName: 'Boys Block A', roomNo: '102', floor: '1', yearSem: '3 Year', status: 'ALLOCATED', lastEmailStatus: 'Sent', lastSentDate: '2026-07-19 10:15' },
  { id: 'app-002', studentName: 'Meera Nair', usn: '1BM21IS042', email: 'meera.nair@bmsit.in', gender: 'FEMALE', blockId: 'girls-a', blockName: 'Girls Block A', roomNo: '204', floor: '2', yearSem: '3 Year', status: 'ALLOCATED', lastEmailStatus: 'Not Sent' },
  { id: 'app-003', studentName: 'Rohan Patil', usn: '1BM21EC088', email: 'rohan.patil@bmsit.in', gender: 'MALE', blockId: 'boys-b', blockName: 'Boys Block B', roomNo: '312', floor: '3', yearSem: '4 Year', status: 'ALLOCATED', lastEmailStatus: 'Failed', lastSentDate: '2026-07-18 16:30' },
  { id: 'app-004', studentName: 'Sanya Gupta', usn: '1BM22CS120', email: 'sanya.gupta@bmsit.in', gender: 'FEMALE', blockId: 'girls-a', blockName: 'Girls Block A', roomNo: '201', floor: '2', yearSem: '2 Year', status: 'REJECTED', lastEmailStatus: 'Sent', lastSentDate: '2026-07-19 11:22' },
  { id: 'app-005', studentName: 'Vikram Singh', usn: '1BM22ME054', email: 'vikram.singh@bmsit.in', gender: 'MALE', blockId: '', blockName: 'Unassigned', roomNo: 'N/A', floor: '', yearSem: '2 Year', status: 'APPROVED', lastEmailStatus: 'Not Sent' },
  { id: 'app-006', studentName: 'Ananya Rao', usn: '1BM23CS010', email: 'ananya.rao@bmsit.in', gender: 'FEMALE', blockId: '', blockName: 'Unassigned', roomNo: 'N/A', floor: '', yearSem: '1 Year', status: 'PENDING', lastEmailStatus: 'Not Sent' },
  { id: 'app-007', studentName: 'Kabir Verma', usn: '1BM23EE030', email: 'kabir.verma@bmsit.in', gender: 'MALE', blockId: '', blockName: 'Unassigned', roomNo: 'N/A', floor: '', yearSem: '1 Year', status: 'PENDING', lastEmailStatus: 'Not Sent' },
  { id: 'app-008', studentName: 'Neha Deshmukh', usn: '1BM21CS099', email: 'neha.d@bmsit.in', gender: 'FEMALE', blockId: 'girls-a', blockName: 'Girls Block A', roomNo: '203', floor: '2', yearSem: '4 Year', status: 'ALLOCATED', lastEmailStatus: 'Sent', lastSentDate: '2026-07-15 09:00' }
];

// Initial Master Email Templates
const DEFAULT_TEMPLATES: Record<WorkflowType, { subject: string; body: string }> = {
  ALLOCATION: {
    subject: 'Hostel Bed Allocation Confirmed - {name}',
    body: 'Dear {name} (USN: {usn}),\n\nWe are pleased to inform you that you have been allocated a bed in Block {block}, Room {room} for this academic block. Please complete the admission formalities and pay the hostel fees within 3 working days.\n\nBest regards,\nHostel Administration Board'
  },
  REJECTION: {
    subject: 'Hostel Accommodation Application Status Update',
    body: 'Dear {name} (USN: {usn}),\n\nThank you for your application seeking accommodation in our hostels. We regret to inform you that due to high demand and limited bed availability, we are unable to allot a bed to you at this time. Your application remains on the waitlist.\n\nBest regards,\nHostel Admissions Board'
  },
  PAYMENT_CONFIRMATION: {
    subject: 'Hostel Fee Payment Receipt Confirmation',
    body: 'Dear {name} (USN: {usn}),\n\nThis is to confirm that your fee payment for the hostel accommodation has been successfully received and credited to your account. Your room allocation is now fully active.\n\nBest regards,\nHostel Accounts Department'
  },
  PAYMENT_REMINDER: {
    subject: 'IMPORTANT: Pending Hostel Fee Payment Reminder',
    body: 'Dear {name} (USN: {usn}),\n\nThis is a friendly reminder that your hostel fees for this semester are currently unpaid/overdue. Please clear the pending dues immediately to secure and maintain your room allocation.\n\nBest regards,\nHostel Accounts Department'
  },
  ANNUAL_FEE_REMINDER: {
    subject: 'Notice: Annual Hostel Fee Payment Schedule',
    body: 'Dear {name} (USN: {usn}),\n\nThis is to notify all hostellers that the annual hostel fee schedule for the upcoming academic year is now open. Kindly complete the payment before the deadline to ensure reservation of your block and room.\n\nBest regards,\nHostel Management Team'
  }
};

// Helper function to replace template placeholders with student details
const replacePlaceholders = (text: string, student: StudentData) => {
  if (!text) return '';
  const blockName = student.blockName || '';
  const roomNo = student.roomNo || '';
  const floorNo = student.floor || '';
  const bedNo = student.bedNo || '';
 
  return text
    // Double curly brace placeholders
    .replace(/\{\{StudentName\}\}/g, student.studentName || '')
    .replace(/\{\{name\}\}/g, student.studentName || '')
    .replace(/\{\{USN\}\}/g, student.usn || '')
    .replace(/\{\{usn\}\}/g, student.usn || '')
    .replace(/\{\{Email\}\}/g, student.email || '')
    .replace(/\{\{email\}\}/g, student.email || '')
    .replace(/\{\{Block\}\}/g, blockName)
    .replace(/\{\{block\}\}/g, blockName)
    .replace(/\{\{Floor\}\}/g, floorNo)
    .replace(/\{\{floor\}\}/g, floorNo)
    .replace(/\{\{Room\}\}/g, roomNo)
    .replace(/\{\{room\}\}/g, roomNo)
    .replace(/\{\{Bed\}\}/g, bedNo)
    .replace(/\{\{bed\}\}/g, bedNo)
    // Single curly brace placeholders
    .replace(/\{name\}/g, student.studentName || '')
    .replace(/\{usn\}/g, student.usn || '')
    .replace(/\{email\}/g, student.email || '')
    .replace(/\{block\}/g, blockName)
    .replace(/\{floor\}/g, floorNo)
    .replace(/\{room\}/g, roomNo)
    .replace(/\{bed\}/g, bedNo);
};

const getWorkflowHistoryName = (key: WorkflowType): string => {
  switch (key) {
    case 'ALLOCATION': return 'Allocation';
    case 'REJECTION': return 'Rejection';
    case 'PAYMENT_CONFIRMATION': return 'Payment Confirmation';
    case 'PAYMENT_REMINDER': return 'Payment Reminder';
    case 'ANNUAL_FEE_REMINDER': return 'Annual Hostel Fee Reminder';
    default: return key;
  }
};

interface EmailHistoryRecord {
  id: string;
  studentName: string;
  usn: string;
  email: string;
  workflow: string;
  subject: string;
  date: string;
  time: string;
  status: 'Sent' | 'Failed' | 'Pending';
  mode: 'Manual' | 'Automatic';
}

const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCurrentTimeString = () => {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

export default function CommunicationCenter() {
  const queryClient = useQueryClient();
  // Tabs Config
  const tabs: { label: string; key: WorkflowType | 'HISTORY' }[] = [
    { label: 'Allocation Emails', key: 'ALLOCATION' },
    { label: 'Rejection Emails', key: 'REJECTION' },
    { label: 'Payment Confirmation', key: 'PAYMENT_CONFIRMATION' },
    { label: 'Payment Reminder', key: 'PAYMENT_REMINDER' },
    { label: 'Annual Hostel Fee Reminder', key: 'ANNUAL_FEE_REMINDER' },
    { label: 'Email History', key: 'HISTORY' }
  ];

  const [activeTab, setActiveTab] = useState<WorkflowType | 'HISTORY'>('ALLOCATION');

  // Active statistics card filter state
  const [activeCardFilter, setActiveCardFilter] = useState<'sentToday' | 'pending' | 'reminders' | 'failed' | null>(null);

  // Email History audit log (fetched from backend)
  const { data: emailHistory = [] } = useQuery<EmailHistoryRecord[]>({
    queryKey: ['email-history-list'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/email-history');
      if (!res.ok) throw new Error('Failed to fetch email history');
      return res.json();
    }
  });

  // Automation Switch State (fetched from backend and persisted in DB)
  const { data: emailModeData, refetch: refetchEmailMode } = useQuery({
    queryKey: ['email-mode'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/settings/email-mode');
      if (!res.ok) throw new Error('Failed to fetch email mode');
      return res.json();
    }
  });

  const automationEnabled = emailModeData?.mode === 'Automatic';

  // Phase 3 States
  const [showConfirmToggle, setShowConfirmToggle] = useState(false);
  const [pendingEmailsCount, setPendingEmailsCount] = useState(0);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressState, setProgressState] = useState<{ current: number; total: number; workflow: string } | null>(null);
  const [summaryState, setSummaryState] = useState<Record<string, { sent: number; failed: number }> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const handleProgress = (data: { current: number; total: number; workflow: string }) => {
      setProgressState(data);
    };

    const handleComplete = (data: { summary: Record<string, { sent: number; failed: number }> }) => {
      setSummaryState(data.summary);
      setIsProcessing(false);
      // Invalidate queries so tables are updated once bulk processing completes
      queryClient.invalidateQueries({ queryKey: ['email-history-list'] });
      queryClient.invalidateQueries({ queryKey: ['applications-list-comm'] });
    };

    socket.on('bulk_email_progress', handleProgress);
    socket.on('bulk_email_complete', handleComplete);

    return () => {
      socket.off('bulk_email_progress', handleProgress);
      socket.off('bulk_email_complete', handleComplete);
    };
  }, [queryClient]);

  const executeToggleAutomation = async () => {
    const targetMode = !automationEnabled ? 'Automatic' : 'Manual';
    try {
      const res = await fetch('http://localhost:5000/api/settings/email-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: targetMode })
      });
      if (res.ok) {
        refetchEmailMode();
        queryClient.invalidateQueries({ queryKey: ['email-history-list'] });
        queryClient.invalidateQueries({ queryKey: ['applications-list-comm'] });
        toast.success(`Switched to ${targetMode} Mode`, {
          description: targetMode === 'Automatic'
            ? 'Automatic email processing has been enabled.'
            : 'Emails must now be sent manually.'
        });
      } else {
        toast.error("Failed to update email mode.");
      }
    } catch (err) {
      toast.error("Error updating email mode.");
      console.error(err);
    }
  };

  const handleToggleAutomation = async () => {
    // If turning ON automatic mode
    if (!automationEnabled) {
      try {
        const res = await fetch('http://localhost:5000/api/settings/email-pending-count');
        const data = await res.json();
        if (data.pendingCount > 0) {
          setPendingEmailsCount(data.pendingCount);
          setShowConfirmToggle(true);
          return;
        }
      } catch (err) {
        console.error(err);
      }
    }
   
    // Otherwise toggle immediately (if turning OFF or pendingCount === 0)
    await executeToggleAutomation();
  };

  const handleConfirmBulkSend = async () => {
    setShowConfirmToggle(false);
    setShowProgressModal(true);
    setIsProcessing(true);
    setProgressState({ current: 0, total: pendingEmailsCount, workflow: 'Initializing...' });
    setSummaryState(null);

    // Call toggle automation API
    await executeToggleAutomation();
  };

  // Templates Management (UI-only, React state)
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);

  // Email Statuses Management (State to track sent/pending/failed statuses per student and workflow)
  const [emailStatuses, setEmailStatuses] = useState<Record<string, { status: 'Sent' | 'Pending' | 'Not Sent' | 'Failed'; date?: string }>>(() => {
    const initial: Record<string, { status: 'Sent' | 'Pending' | 'Not Sent' | 'Failed'; date?: string }> = {};
    // Seed initial states from FALLBACK_STUDENTS to preserve consistency
    FALLBACK_STUDENTS.forEach(student => {
      const tabsList: WorkflowType[] = ['ALLOCATION', 'REJECTION', 'PAYMENT_CONFIRMATION', 'PAYMENT_REMINDER', 'ANNUAL_FEE_REMINDER'];
      tabsList.forEach(t => {
        initial[`${student.id}_${t}`] = {
          status: student.lastEmailStatus,
          date: student.lastSentDate
        };
      });
    });
    return initial;
  });


  // Dynamic Blocks and Occupancy Query (to populate block dropdown and matching students)
  const { data: blocks = [] } = useQuery({
    queryKey: ['blocks-list-comm'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/blocks');
      if (!res.ok) throw new Error('Failed to fetch blocks list');
      return res.json();
    }
  });

  const { data: applications = [], isLoading: loadingApps } = useQuery({
    queryKey: ['applications-list-comm'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/applications');
      if (!res.ok) throw new Error('Failed to fetch applications');
      return res.json();
    }
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['allocations-list-comm'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/allocations');
      if (!res.ok) throw new Error('Failed to fetch allocations');
      return res.json();
    }
  });

  // Reusable Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [hostelType, setHostelType] = useState('ALL');
  const [blockFilter, setBlockFilter] = useState('ALL');
  const [floorFilter, setFloorFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');

  // Modals States
  const [editingTemplateKey, setEditingTemplateKey] = useState<WorkflowType | null>(null);
  const [templateSubjectInput, setTemplateSubjectInput] = useState('');
  const [templateBodyInput, setTemplateBodyInput] = useState('');

  const [previewStudent, setPreviewStudent] = useState<StudentData | null>(null);

  // Map backend models dynamically to student rows
  const mappedStudents: StudentData[] = useMemo(() => {
    if (!applications || applications.length === 0) return [];
   
    return applications.map((app: any) => {
      const allocation = allocations.find((a: any) => a.applicationId === app.id);
     
      // Determine year search match mapping "1 Year" to "1", "2 Year" to "2" etc.
      let formattedYear = app.yearSem || '';
      if (formattedYear.includes('Year')) {
        formattedYear = formattedYear.replace(' Year', '');
      }

      const sentInfo = app.sentEmails?.[activeTab];
      const isSent = !!sentInfo;
      const sentDate = sentInfo?.date ? new Date(sentInfo.date).toLocaleString('en-IN') : undefined;

      return {
        id: app.id,
        studentName: app.studentName,
        usn: app.usn,
        email: app.email || `${app.studentName.toLowerCase().replace(/\s+/g, '')}@bmsit.in`,
        fatherEmail: app.fatherEmail || undefined,
        motherEmail: app.motherEmail || undefined,
        guardianEmail: app.guardianEmail || undefined,
        studentEmailSent: sentInfo ? sentInfo.student : Boolean(app.studentEmailSent),
        fatherEmailSent: sentInfo ? sentInfo.father : Boolean(app.fatherEmailSent),
        motherEmailSent: sentInfo ? sentInfo.mother : Boolean(app.motherEmailSent),
        gender: app.gender, // MALE, FEMALE
        yearSem: app.yearSem, // e.g. "1 Year", "2 Year"
        status: app.status, // PENDING, APPROVED, REJECTED, ALLOCATED
        blockId: allocation?.bed?.room?.block?.id || '',
        blockName: allocation?.bed?.room?.block?.name || 'Unassigned',
        roomNo: allocation?.bed?.room?.roomNo || 'N/A',
        floor: allocation?.bed?.room?.floor?.toString() || '',
        lastEmailStatus: (isSent ? 'Sent' : 'Not Sent') as 'Sent' | 'Pending' | 'Not Sent' | 'Failed',
        lastSentDate: sentDate,
        hasApprovedPayment: app.hasApprovedPayment,
        allocationStatus: allocation?.status || 'NONE',
        bedNo: allocation?.bed?.bedNo || ''
      };
    });
  }, [applications, allocations, activeTab]);

  // Combine fetched backend data or fall back to static list if none exists yet
  const studentList = useMemo<StudentData[]>(() => {
    const list = mappedStudents.length > 0 ? mappedStudents : FALLBACK_STUDENTS;
    return list.map(student => {
      const statusKey = `${student.id}_${activeTab === 'HISTORY' ? 'ALLOCATION' : activeTab}`;
      const customStatus = emailStatuses[statusKey];
      if (customStatus) {
        return {
          ...student,
          lastEmailStatus: customStatus.status,
          lastSentDate: customStatus.date,
          emailResults: customStatus.results
        };
      }
      return student;
    });
  }, [mappedStudents, activeTab, emailStatuses]);

  // Filter students based on active workflow tab, search inputs, and active card filter
  const filteredStudents = useMemo<StudentData[]>(() => {
    return studentList.filter((student: StudentData) => {
      // 1. Filter by workflow-relevance
      switch (activeTab) {
        case 'ALLOCATION':
          if (student.status !== 'ALLOCATED') return false;
          if (student.hasApprovedPayment) return false;
          break;
        case 'REJECTION':
          if (student.status !== 'REJECTED') return false;
          break;
        case 'PAYMENT_CONFIRMATION':
          if (student.status !== 'ALLOCATED') return false;
          if (!student.hasApprovedPayment) return false;
          break;
        case 'PAYMENT_REMINDER':
          if (student.status !== 'ALLOCATED') return false;
          if (student.hasApprovedPayment) return false;
          break;
        case 'ANNUAL_FEE_REMINDER':
          if (student.status !== 'ALLOCATED') return false;
          if (student.allocationStatus !== 'ACTIVE') return false;
          break;
        default:
          return false;
      }

      // 2. Hostel Type (Gender) Filter
      if (hostelType !== 'ALL' && student.gender !== hostelType) return false;

      // 3. Block Filter
      if (blockFilter !== 'ALL' && student.blockId !== blockFilter && student.blockName !== blockFilter) return false;

      // 4. Floor Filter
      if (floorFilter !== 'ALL' && student.floor !== floorFilter) return false;

      // 5. Year / Semester Filter
      if (yearFilter !== 'ALL') {
        const studentYearString = student.yearSem?.toString() || '';
        if (!studentYearString.startsWith(yearFilter)) return false;
      }

      // 6. Search student (Name / USN / Email)
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        const matchesName = student.studentName.toLowerCase().includes(search);
        const matchesUsn = student.usn.toLowerCase().includes(search);
        const matchesEmail = student.email.toLowerCase().includes(search);
        if (!matchesName && !matchesUsn && !matchesEmail) return false;
      }

      // 7. Active Card Filter
      if (activeCardFilter) {
        const todayStr = getTodayDateString();
        switch (activeCardFilter) {
          case 'sentToday':
            return student.lastEmailStatus === 'Sent' && student.lastSentDate?.startsWith(todayStr);
          case 'pending':
            return student.lastEmailStatus === 'Pending' || student.lastEmailStatus === 'Not Sent';
          case 'reminders':
            if (activeTab === 'PAYMENT_REMINDER' || activeTab === 'ANNUAL_FEE_REMINDER') {
              return student.lastEmailStatus === 'Pending' || student.lastEmailStatus === 'Not Sent';
            } else {
              const pKey = `${student.id}_PAYMENT_REMINDER`;
              const aKey = `${student.id}_ANNUAL_FEE_REMINDER`;
              const pStatus = emailStatuses[pKey]?.status || 'Not Sent';
              const aStatus = emailStatuses[aKey]?.status || 'Not Sent';
              return pStatus === 'Pending' || pStatus === 'Not Sent' || aStatus === 'Pending' || aStatus === 'Not Sent';
            }
          case 'failed':
            return student.lastEmailStatus === 'Failed';
        }
      }

      return true;
    });
  }, [studentList, activeTab, hostelType, blockFilter, floorFilter, yearFilter, searchQuery, activeCardFilter, emailStatuses]);

  // Filter email history records based on search query and active card filter
  const filteredEmailHistory = useMemo(() => {
    let list = emailHistory;

    // Apply search query to history
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      list = list.filter(h =>
        h.studentName.toLowerCase().includes(search) ||
        h.usn.toLowerCase().includes(search) ||
        h.email.toLowerCase().includes(search) ||
        h.subject.toLowerCase().includes(search) ||
        h.workflow.toLowerCase().includes(search)
      );
    }

    // Apply card filter to history
    if (activeCardFilter) {
      const todayStr = getTodayDateString();
      list = list.filter(h => {
        switch (activeCardFilter) {
          case 'sentToday':
            return h.status === 'Sent' && h.date === todayStr;
          case 'pending':
            return h.status === 'Pending';
          case 'reminders':
            return h.workflow.toLowerCase().includes('reminder');
          case 'failed':
            return h.status === 'Failed';
          default:
            return true;
        }
      });
    }

    return list;
  }, [emailHistory, searchQuery, activeCardFilter]);

useEffect(() => {
  if (activeTab === "HISTORY") return;

  const loadTemplate = async () => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/email-templates/${activeTab}`
      );

      if (!res.ok) return;

      const data = await res.json();

      if (data) {
        setTemplates((prev) => ({
          ...prev,
          [activeTab]: {
            subject: data.subject,
            body: data.body,
          },
        }));
      }
    } catch (err) {
      console.error("Failed to load template", err);
    }
  };

  loadTemplate();
}, [activeTab]);



  // Calculate dynamic display stats based on mapped data (before card filter is applied)
  const stats = useMemo(() => {
    const todayStr = getTodayDateString();
   
    // Get base list before card filter
    const baseList = studentList.filter((student: StudentData) => {
      // 1. Filter by workflow-relevance
      switch (activeTab) {
        case 'ALLOCATION':
          if (student.status !== 'ALLOCATED') return false;
          if (student.hasApprovedPayment) return false;
          break;
        case 'REJECTION':
          if (student.status !== 'REJECTED') return false;
          break;
        case 'PAYMENT_CONFIRMATION':
          if (student.status !== 'ALLOCATED') return false;
          if (!student.hasApprovedPayment) return false;
          break;
        case 'PAYMENT_REMINDER':
          if (student.status !== 'ALLOCATED') return false;
          if (student.hasApprovedPayment) return false;
          break;
        case 'ANNUAL_FEE_REMINDER':
          if (student.status !== 'ALLOCATED') return false;
          if (student.allocationStatus !== 'ACTIVE') return false;
          break;
        default:
          return true; // Include all for HISTORY/fallback
      }

      // 2. Hostel Type (Gender) Filter
      if (hostelType !== 'ALL' && student.gender !== hostelType) return false;

      // 3. Block Filter
      if (blockFilter !== 'ALL' && student.blockId !== blockFilter && student.blockName !== blockFilter) return false;

      // 4. Floor Filter
      if (floorFilter !== 'ALL' && student.floor !== floorFilter) return false;

      // 5. Year / Semester Filter
      if (yearFilter !== 'ALL') {
        const studentYearString = student.yearSem?.toString() || '';
        if (!studentYearString.startsWith(yearFilter)) return false;
      }

      // 6. Search student (Name / USN / Email)
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        const matchesName = student.studentName.toLowerCase().includes(search);
        const matchesUsn = student.usn.toLowerCase().includes(search);
        const matchesEmail = student.email.toLowerCase().includes(search);
        if (!matchesName && !matchesUsn && !matchesEmail) return false;
      }

      return true;
    });

    if (activeTab === 'HISTORY') {
      const sentTodayCount = emailHistory.filter(h => h.date === todayStr && h.status === 'Sent').length;
      const pendingCount = emailHistory.filter(h => h.status === 'Pending').length;
      const failedCount = emailHistory.filter(h => h.status === 'Failed').length;
      const reminderCount = emailHistory.filter(h => h.workflow.toLowerCase().includes('reminder')).length;

      return {
        sentToday: sentTodayCount,
        pending: pendingCount,
        reminders: reminderCount,
        failed: failedCount
      };
    } else {
      const sentTodayCount = baseList.filter(s => s.lastEmailStatus === 'Sent' && s.lastSentDate?.startsWith(todayStr)).length;
      const pendingCount = baseList.filter(s => s.lastEmailStatus === 'Pending' || s.lastEmailStatus === 'Not Sent').length;
      const failedCount = baseList.filter(s => s.lastEmailStatus === 'Failed').length;
     
      let reminderCount = 0;
      if (activeTab === 'PAYMENT_REMINDER' || activeTab === 'ANNUAL_FEE_REMINDER') {
        reminderCount = pendingCount;
      } else {
        reminderCount = baseList.filter(s => {
          const pKey = `${s.id}_PAYMENT_REMINDER`;
          const aKey = `${s.id}_ANNUAL_FEE_REMINDER`;
          const pStatus = emailStatuses[pKey]?.status || 'Not Sent';
          const aStatus = emailStatuses[aKey]?.status || 'Not Sent';
          return pStatus === 'Pending' || pStatus === 'Not Sent' || aStatus === 'Pending' || aStatus === 'Not Sent';
        }).length;
      }

      return {
        sentToday: sentTodayCount,
        pending: pendingCount,
        reminders: reminderCount,
        failed: failedCount
      };
    }
  }, [studentList, activeTab, hostelType, blockFilter, floorFilter, yearFilter, searchQuery, emailStatuses, emailHistory]);

  // Handle Edit Template Form
  const openEditTemplateModal = (key: WorkflowType) => {
    const tmpl = templates[key];
    setEditingTemplateKey(key);
    setTemplateSubjectInput(tmpl.subject);
    setTemplateBodyInput(tmpl.body);
  };

  const handleSaveTemplate = async () => {
  if (!editingTemplateKey) return;

  try {
    const res = await fetch(
      "http://localhost:5000/api/email-templates",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key: editingTemplateKey,
          subject: templateSubjectInput,
          body: templateBodyInput,
        }),
      }
    );

    if (!res.ok) {
      throw new Error("Failed to save template");
    }

    setTemplates((prev) => ({
      ...prev,
      [editingTemplateKey]: {
        subject: templateSubjectInput,
        body: templateBodyInput,
      },
    }));

    toast.success("Template saved successfully!");
  } catch (err) {
    toast.error("Unable to save template.");
    console.error(err);
  }

  setEditingTemplateKey(null);
};

  // Handle Email Send Trigger with Clean Frontend Integration Point
  const handleSendEmail = async (student: StudentData) => {
    if (activeTab === 'HISTORY') return;
    const tmpl = templates[activeTab as WorkflowType];
    const subject = replacePlaceholders(tmpl.subject, student);
    const body = replacePlaceholders(tmpl.body, student);
    const dateStr = getTodayDateString();
    const timeStr = getCurrentTimeString();
    const nowStr = `${dateStr} ${timeStr.substring(0, 5)}`;

    try {
      const response = await fetch("http://localhost:5000/api/emails/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: activeTab,
          studentId: student.id,
          usn: student.usn,
          email: student.email,
          subject,
          body,
        }),
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.message || "Failed to send email");
      }

      const results = resData.results || {};

      // Update email status and sent date in local state
      setEmailStatuses(prev => ({
        ...prev,
        [`${student.id}_${activeTab}`]: {
          status: 'Sent',
          date: nowStr,
          results
        }
      }));

      queryClient.invalidateQueries({ queryKey: ['email-history-list'] });
      queryClient.invalidateQueries({ queryKey: ['applications-list-comm'] });

      toast.success(`Email successfully dispatched for ${student.studentName}!`, {
        description: `Sent to Student, Father & Mother/Guardian emails.`,
        duration: 5000
      });
    } catch (err: any) {
      console.error(err);

      setEmailStatuses((prev) => ({
        ...prev,
        [`${student.id}_${activeTab}`]: {
          status: "Failed",
          date: nowStr,
        },
      }));

      toast.error("Email sending failed.");
    }
  };

  // Compile Dynamic Template Preview with actual placeholder replacements
  const compiledPreview = useMemo(() => {
    if (!previewStudent) return { subject: '', body: '' };
    if (activeTab === 'HISTORY') return { subject: '', body: '' };
    const tmpl = templates[activeTab as WorkflowType];
    return {
      subject: replacePlaceholders(tmpl.subject, previewStudent),
      body: replacePlaceholders(tmpl.body, previewStudent)
    };
  }, [previewStudent, templates, activeTab]);

  // Group students for Annual Fee Reminder tab
  const groupedStudents = useMemo(() => {
    if (activeTab !== 'ANNUAL_FEE_REMINDER') return null;
   
    // Grouping by gender-based Hostel and then Block name
    const groups: Record<string, Record<string, StudentData[]>> = {};
   
    for (const student of filteredStudents) {
      // Girls Hostel vs Boys Hostel (or other genders if defined, with fallback to their gender string + ' Hostel')
      const hostel = student.gender === 'FEMALE'
        ? 'Girls Hostel'
        : student.gender === 'MALE'
          ? 'Boys Hostel'
          : `${student.gender.charAt(0).toUpperCase()}${student.gender.slice(1).toLowerCase()} Hostel`;
         
      const block = student.blockName || 'Unassigned Block';
     
      if (!groups[hostel]) {
        groups[hostel] = {};
      }
      if (!groups[hostel][block]) {
        groups[hostel][block] = [];
      }
      groups[hostel][block].push(student);
    }
   
    return groups;
  }, [filteredStudents, activeTab]);

  const renderStudentRow = (student: StudentData) => {
    const isGirls = student.gender === 'FEMALE';
    return (
      <tr
        key={student.id}
        className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
      >
        {/* Student Name */}
        <td className="p-4">
          <div className="flex items-center">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold mr-3 shadow-sm border shrink-0 ${
              isGirls
                ? 'bg-rose-50 text-rose-700 border-rose-100'
                : 'bg-indigo-50 text-indigo-700 border-indigo-100'
            }`}>
              {student.studentName.charAt(0)}
            </div>
            <span className="font-extrabold text-slate-800">{student.studentName}</span>
          </div>
        </td>

        {/* USN */}
        <td className="p-4 font-semibold text-slate-600 text-sm">
          {student.usn}
        </td>

        {/* Block */}
        <td className="p-4">
          <div className="flex items-center">
            <Building className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            <span className={`font-bold text-sm ${student.blockId ? 'text-indigo-600' : 'text-slate-400'}`}>
              {student.blockName}
            </span>
          </div>
        </td>

        {/* Room */}
        <td className="p-4 font-bold text-slate-700 text-sm">
          {student.roomNo !== 'N/A' ? (
            <span>Room {student.roomNo}</span>
          ) : (
            <span className="text-xs italic text-slate-400 font-normal">Not Allocated</span>
          )}
        </td>

        {/* Year/Semester */}
        <td className="p-4 font-semibold text-slate-700 text-sm">
          <div className="flex items-center">
            <GraduationCap className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            {student.yearSem}
          </div>
        </td>

        {/* Email Status */}
        <td className="p-4">
          <div className="space-y-1.5">
            {/* Student Email Status */}
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-500 min-w-[90px]">Student Email</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                student.emailResults?.student ? (student.emailResults.student.sent ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200') : (student.studentEmailSent || student.lastEmailStatus === 'Sent' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : student.lastEmailStatus === 'Failed' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-50 text-slate-500 border-slate-200')
              }`}>
                {student.emailResults?.student ? (student.emailResults.student.sent ? '✓ Sent' : '❌ Failed') : (student.studentEmailSent || student.lastEmailStatus === 'Sent' ? '✓ Sent' : student.lastEmailStatus === 'Failed' ? '❌ Failed' : 'Pending')}
              </span>
            </div>

            {/* Father Email Status */}
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-500 min-w-[90px]">Father Email</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                student.emailResults?.father ? (student.emailResults.father.sent ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200') : (student.fatherEmailSent || student.lastEmailStatus === 'Sent' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200')
              }`}>
                {student.emailResults?.father ? (student.emailResults.father.sent ? '✓ Sent' : '❌ Failed') : (student.fatherEmailSent || student.lastEmailStatus === 'Sent' ? '✓ Sent' : 'Pending')}
              </span>
            </div>

            {/* Mother / Guardian Email Status */}
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-500 min-w-[90px]">
                {student.guardianEmail && !student.motherEmail ? 'Guardian Email' : 'Mother Email'}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                (student.emailResults?.mother || student.emailResults?.guardian) ? ((student.emailResults?.mother?.sent || student.emailResults?.guardian?.sent) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200') : (student.motherEmailSent || student.lastEmailStatus === 'Sent' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200')
              }`}>
                {(student.emailResults?.mother || student.emailResults?.guardian) ? ((student.emailResults?.mother?.sent || student.emailResults?.guardian?.sent) ? '✓ Sent' : '❌ Failed') : (student.motherEmailSent || student.lastEmailStatus === 'Sent' ? '✓ Sent' : 'Pending')}
              </span>
            </div>
          </div>
        </td>

        {/* Row Actions */}
        <td className="p-4 text-right">
          <div className="inline-flex items-center space-x-2">
            {/* Preview */}
            <Button
              onClick={() => setPreviewStudent(student)}
              variant="outline"
              size="sm"
              className="rounded-xl font-bold bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-800 h-8 px-3"
            >
              <Eye className="w-3.5 h-3.5 mr-1.5" />
              Preview
            </Button>

            {/* Send Email */}
            <Button
              onClick={() => handleSendEmail(student)}
              size="sm"
              className="rounded-xl font-bold h-8 px-3 text-white transition-all bg-gradient-to-r from-indigo-500 to-violet-600 hover:shadow-md hover:shadow-indigo-500/10"
              title="Send single email"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Send Email
            </Button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-800">Communication Center</h2>
        <p className="text-slate-500 font-medium mt-1">Manage and automate hostel email notifications</p>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Sent Today */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          onClick={() => setActiveCardFilter(activeCardFilter === 'sentToday' ? null : 'sentToday')}
          className={`rounded-3xl p-6 bg-white/80 backdrop-blur-md border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-b-4 border-b-indigo-500 hover:shadow-lg transition-all cursor-pointer select-none ${activeCardFilter === 'sentToday' ? 'ring-4 ring-indigo-500/50 scale-[1.02]' : ''}`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Emails Sent Today</p>
              <h3 className="text-4xl font-black text-indigo-600 tracking-tight">{stats.sentToday}</h3>
            </div>
            <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600 shadow-inner">
              <Mail className="w-7 h-7" />
            </div>
          </div>
        </motion.div>

        {/* Pending Emails */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          onClick={() => setActiveCardFilter(activeCardFilter === 'pending' ? null : 'pending')}
          className={`rounded-3xl p-6 bg-white/80 backdrop-blur-md border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-b-4 border-b-amber-500 hover:shadow-lg transition-all cursor-pointer select-none ${activeCardFilter === 'pending' ? 'ring-4 ring-amber-500/50 scale-[1.02]' : ''}`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Pending Emails</p>
              <h3 className="text-4xl font-black text-amber-600 tracking-tight">{stats.pending}</h3>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50 text-amber-600 shadow-inner">
              <Clock className="w-7 h-7" />
            </div>
          </div>
        </motion.div>

        {/* Reminder Emails */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          onClick={() => setActiveCardFilter(activeCardFilter === 'reminders' ? null : 'reminders')}
          className={`rounded-3xl p-6 bg-white/80 backdrop-blur-md border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-b-4 border-b-blue-500 hover:shadow-lg transition-all cursor-pointer select-none ${activeCardFilter === 'reminders' ? 'ring-4 ring-blue-500/50 scale-[1.02]' : ''}`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Reminder Emails</p>
              <h3 className="text-4xl font-black text-blue-600 tracking-tight">{stats.reminders}</h3>
            </div>
            <div className="p-4 rounded-2xl bg-blue-50 text-blue-600 shadow-inner">
              <Mail className="w-7 h-7" />
            </div>
          </div>
        </motion.div>

        {/* Failed Emails */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          onClick={() => setActiveCardFilter(activeCardFilter === 'failed' ? null : 'failed')}
          className={`rounded-3xl p-6 bg-white/80 backdrop-blur-md border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-b-4 border-b-rose-500 hover:shadow-lg transition-all cursor-pointer select-none ${activeCardFilter === 'failed' ? 'ring-4 ring-rose-500/50 scale-[1.02]' : ''}`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Failed Emails</p>
              <h3 className="text-4xl font-black text-rose-600 tracking-tight">{stats.failed}</h3>
            </div>
            <div className="p-4 rounded-2xl bg-rose-50 text-rose-600 shadow-inner">
              <AlertCircle className="w-7 h-7" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Automation Control Panel */}
      <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center">
            <Sparkles className="w-5 h-5 text-indigo-500 mr-2 animate-pulse" />
            Notification Automation
          </h3>
          <p className="text-sm text-slate-500 font-medium mt-1">
            {automationEnabled
              ? 'System is in Automatic Mode: Emails will be dispatched automatically on matching workflow events.'
              : 'System is in Manual Mode: Select students and trigger emails manually.'}
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-slate-50 border border-slate-200/50 px-4 py-2.5 rounded-2xl shadow-inner">
          <span className={`text-xs font-black uppercase tracking-wider transition-colors duration-300 ${!automationEnabled ? 'text-indigo-600' : 'text-slate-400'}`}>
            Manual
          </span>
          <button
            onClick={handleToggleAutomation}
            className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none ${automationEnabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
            role="switch"
            aria-checked={automationEnabled}
          >
            <span
              className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-in-out ${automationEnabled ? 'translate-x-8' : 'translate-x-0'}`}
            />
          </button>
          <span className={`text-xs font-black uppercase tracking-wider transition-colors duration-300 ${automationEnabled ? 'text-indigo-600' : 'text-slate-400'}`}>
            Automatic
          </span>
        </div>
      </div>

      {/* Workflow Tabs Navigation */}
      <div className="space-y-6">
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50 shadow-inner flex-wrap md:flex-nowrap gap-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setActiveCardFilter(null);
                }}
                className={`flex-1 text-center py-3 px-4 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Panel Content */}
        <div className="space-y-6">
          {/* Advanced Filters Toolbar (reused from Live Occupancy page layout) */}
          <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-slate-700 text-base">
                  {activeTab === 'HISTORY' ? 'Filter Log History' : 'Filter Candidates'}
                </h3>
              </div>
              {/* Reset Filters button */}
              <button
                onClick={() => {
                  setSearchQuery('');
                  setHostelType('ALL');
                  setBlockFilter('ALL');
                  setFloorFilter('ALL');
                  setYearFilter('ALL');
                  setActiveCardFilter(null);
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Reset Filters
              </button>
            </div>
           
            {activeTab !== 'HISTORY' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Hostel Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hostel Type</label>
                  <select
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={hostelType}
                    onChange={e => setHostelType(e.target.value)}
                  >
                    <option value="ALL">All Types</option>
                    <option value="FEMALE">Girls</option>
                    <option value="MALE">Boys</option>
                  </select>
                </div>

                {/* Block */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Block</label>
                  <select
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={blockFilter}
                    onChange={e => setBlockFilter(e.target.value)}
                  >
                    <option value="ALL">All Blocks</option>
                    {blocks.filter((b: any) => hostelType === 'ALL' || b.gender === hostelType).map((b: any) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                    {/* Fallback block options in case DB is unseeded */}
                    {blocks.length === 0 && (
                      <>
                        <option value="Boys Block A">Boys Block A</option>
                        <option value="Boys Block B">Boys Block B</option>
                        <option value="Boys Block C">Boys Block C</option>
                        <option value="Girls Block A">Girls Block A</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Floor */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Floor</label>
                  <select
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={floorFilter}
                    onChange={e => setFloorFilter(e.target.value)}
                  >
                    <option value="ALL">All Floors</option>
                    <option value="1">1st Floor</option>
                    <option value="2">2nd Floor</option>
                    <option value="3">3rd Floor</option>
                  </select>
                </div>

                {/* Year / Semester */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Year / Semester</label>
                  <select
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={yearFilter}
                    onChange={e => setYearFilter(e.target.value)}
                  >
                    <option value="ALL">All Years</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>
              </div>
            )}

            {/* Row Search */}
            <div className="pt-2 border-t border-slate-100 flex items-center">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={activeTab === 'HISTORY' ? "Search history log by student name, USN, email, subject, or workflow..." : "Search student by Name, USN, or Email..."}
                  className="pl-9 w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Workflow Header & Single Master Edit Button */}
          {activeTab !== 'HISTORY' && (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 bg-white border border-slate-200/60 rounded-2xl shadow-sm gap-4">
              <div>
                <h3 className="font-extrabold text-slate-800 text-lg flex items-center">
                  <Mail className="w-5 h-5 text-indigo-500 mr-2" />
                  {tabs.find(t => t.key === activeTab)?.label} Workflow
                </h3>
                <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-wider">
                  Active Template: <span className="font-bold text-slate-600">{templates[activeTab as WorkflowType].subject}</span>
                </p>
              </div>
             
              <Button
                onClick={() => openEditTemplateModal(activeTab as WorkflowType)}
                variant="outline"
                className="rounded-xl font-bold bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 shadow-sm"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Template
              </Button>
            </div>
          )}

          {/* Payment module integration notice */}
          {(activeTab === 'PAYMENT_CONFIRMATION' || activeTab === 'PAYMENT_REMINDER') && (
            <div className="bg-emerald-50 border border-emerald-200/60 p-4 rounded-3xl flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-emerald-800 font-extrabold text-sm">Payment Module Integrated</h4>
                <p className="text-emerald-700 text-xs mt-1 font-medium leading-relaxed">
                  The payment management system is fully active. You can approve, reject, and send reminders from the dedicated{' '}
                  <a href="/payments" className="underline font-bold hover:text-emerald-900 transition-colors">Payments Dashboard</a>.
                  Email templates configured here will be used for payment notifications.
                </p>
              </div>
            </div>
          )}

          {/* Active Card Filter Badge */}
          {activeCardFilter && (
            <div className="flex items-center space-x-2 bg-indigo-50 text-indigo-700 px-4 py-2.5 rounded-2xl border border-indigo-100 self-start text-xs font-black uppercase tracking-wider shadow-sm">
              <span>
                Filtered by: <span className="text-indigo-900 font-bold">{activeCardFilter === 'sentToday' ? 'Emails Sent Today' : activeCardFilter === 'pending' ? 'Pending Emails' : activeCardFilter === 'reminders' ? 'Reminder Emails' : 'Failed Emails'}</span>
              </span>
              <button
                onClick={() => setActiveCardFilter(null)}
                className="w-4 h-4 bg-indigo-200/50 hover:bg-indigo-200 text-indigo-800 rounded-full flex items-center justify-center font-bold transition-colors text-[10px]"
                title="Clear filter"
              >
                ×
              </button>
            </div>
          )}

          {/* Student List or History Table */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              {activeTab === 'HISTORY' ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student Name</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">USN</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Workflow</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Subject</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Time</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Mode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmailHistory.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-16 text-center">
                          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-slate-200">
                            <Mail className="w-6 h-6 text-slate-300" />
                          </div>
                          <h4 className="text-slate-800 font-bold text-lg">No History Log Records</h4>
                          <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">
                            Try adjusting your filters or dispatching some emails.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredEmailHistory.map((record) => (
                        <tr
                          key={record.id}
                          className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="p-4">
                            <span className="font-extrabold text-slate-800">{record.studentName}</span>
                          </td>
                          <td className="p-4 font-semibold text-slate-600 text-sm">
                            {record.usn}
                          </td>
                          <td className="p-4 font-semibold text-slate-500 text-sm">
                            {record.email}
                          </td>
                          <td className="p-4 font-bold text-indigo-600 text-sm">
                            {record.workflow}
                          </td>
                          <td className="p-4 text-sm font-semibold text-slate-700 truncate max-w-[200px]" title={record.subject}>
                            {record.subject}
                          </td>
                          <td className="p-4 text-sm text-slate-600">
                            <div className="font-bold text-slate-700">{record.date}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{record.time}</div>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                              record.status === 'Sent'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : record.status === 'Failed'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-slate-50 text-slate-500 border-slate-200'
                            }`}>
                              {record.status === 'Sent' ? (
                                <CheckCircle className="w-3.5 h-3.5 mr-1" />
                              ) : record.status === 'Failed' ? (
                                <AlertCircle className="w-3.5 h-3.5 mr-1" />
                              ) : null}
                              {record.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                              record.mode === 'Automatic'
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {record.mode}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student Name</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">USN</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Block</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Room</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Year/Semester</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Email Status</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingApps ? (
                      <tr>
                        <td colSpan={7} className="p-12 text-center">
                          <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
                          <p className="text-slate-400 text-sm mt-2 font-medium">Fetching candidate data...</p>
                        </td>
                      </tr>
                    ) : filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-16 text-center">
                          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-slate-200">
                            <Mail className="w-6 h-6 text-slate-300" />
                          </div>
                          {activeTab === 'PAYMENT_CONFIRMATION' || activeTab === 'PAYMENT_REMINDER' ? (
                            <>
                              <h4 className="text-amber-600 font-extrabold text-lg">No Eligible Candidates Found</h4>
                              <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto font-medium">
                                Try adjusting filters, clearing active card filters, or allocating beds to new applicants.
                              </p>
                            </>
                          ) : (
                            <>
                              <h4 className="text-slate-800 font-bold text-lg">No Students Matched</h4>
                              <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">
                                Try adjusting your active tab or advanced filter values.
                              </p>
                            </>
                          )}
                        </td>
                      </tr>
                    ) : (
                      activeTab === 'ANNUAL_FEE_REMINDER' && groupedStudents ? (
                        Object.entries(groupedStudents).map(([hostel, blocks]) => (
                          <React.Fragment key={hostel}>
                            {/* Hostel Level Header Row */}
                            <tr className="bg-slate-100/70 border-b border-slate-200">
                              <td colSpan={7} className="p-3 pl-4 font-black text-slate-700 uppercase tracking-widest text-[11px]">
                                🏢 {hostel}
                              </td>
                            </tr>
                            {Object.entries(blocks).map(([block, students]) => (
                              <React.Fragment key={block}>
                                {/* Block Level Header Row */}
                                <tr className="bg-indigo-50/30 border-b border-slate-100">
                                  <td colSpan={7} className="p-2.5 pl-6 font-extrabold text-indigo-600 text-xs">
                                    🔑 {block}
                                  </td>
                                </tr>
                                {students.map((student: StudentData) => renderStudentRow(student))}
                              </React.Fragment>
                            ))}
                          </React.Fragment>
                        ))
                      ) : (
                        filteredStudents.map((student: StudentData) => renderStudentRow(student))
                      )
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Template Modal Dialog */}
      {editingTemplateKey && (
        <Dialog
          open={!!editingTemplateKey}
          onOpenChange={(open) => !open && setEditingTemplateKey(null)}
        >
          <DialogContent className="sm:max-w-[600px] rounded-3xl bg-white/95 backdrop-blur-md p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-extrabold text-slate-800">
                Edit Workflow Template
              </DialogTitle>
              <DialogDescription className="font-semibold text-slate-500">
                Modify the master email body. Click save to persist templates.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="subject" className="text-sm font-extrabold text-slate-700">Email Subject</Label>
                <input
                  id="subject"
                  type="text"
                  value={templateSubjectInput}
                  onChange={(e) => setTemplateSubjectInput(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Bed Confirmation for {name}"
                />
              </div>

              {/* Body */}
              <div className="space-y-2">
                <Label htmlFor="body" className="text-sm font-extrabold text-slate-700">Email Content</Label>
                <textarea
                  id="body"
                  rows={8}
                  value={templateBodyInput}
                  onChange={(e) => setTemplateBodyInput(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono leading-relaxed"
                  placeholder="Dear {name}..."
                />
              </div>

              {/* Variables Helper Box */}
              <div className="bg-slate-50 border border-slate-200/50 p-4 rounded-2xl">
                <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1.5">Dynamic Placeholders</h4>
                <p className="text-[11px] font-semibold text-slate-500 leading-normal mb-2">
                  Inject candidate properties. Type these tags directly in the subject or body:
                </p>
                <div className="flex flex-wrap gap-2 text-[10px] font-mono font-bold">
                  <span className="bg-white border border-slate-200 px-2 py-1 rounded text-slate-600">{"{name}"}</span>
                  <span className="bg-white border border-slate-200 px-2 py-1 rounded text-slate-600">{"{usn}"}</span>
                  <span className="bg-white border border-slate-200 px-2 py-1 rounded text-slate-600">{"{email}"}</span>
                  <span className="bg-white border border-slate-200 px-2 py-1 rounded text-slate-600">{"{block}"}</span>
                  <span className="bg-white border border-slate-200 px-2 py-1 rounded text-slate-600">{"{room}"}</span>
                </div>
              </div>
            </div>

            <DialogFooter className="flex justify-end gap-3">
              <Button
                onClick={() => setEditingTemplateKey(null)}
                variant="outline"
                className="rounded-xl font-bold bg-white text-slate-600 border-slate-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveTemplate}
                className="rounded-xl font-bold bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20"
              >
                Save Master Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Student Preview Modal Dialog */}
      {previewStudent && (
        <Dialog
          open={!!previewStudent}
          onOpenChange={(open) => !open && setPreviewStudent(null)}
        >
          <DialogContent className="sm:max-w-[550px] rounded-3xl bg-white/95 backdrop-blur-md p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-extrabold text-slate-800">
                Email Dispatch Preview
              </DialogTitle>
              <DialogDescription className="font-semibold text-slate-500">
                Verify exactly how this email will appear in the candidate's inbox.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Recipient Details */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-200/50 p-4 rounded-2xl text-xs font-semibold text-slate-600">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">To</p>
                  <p className="font-bold text-slate-800 mt-0.5 truncate">{previewStudent.email}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Student</p>
                  <p className="font-bold text-slate-800 mt-0.5 truncate">{previewStudent.studentName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">USN / ID</p>
                  <p className="font-bold text-slate-800 mt-0.5 truncate">{previewStudent.usn}</p>
                </div>
              </div>

              {/* Subject Display */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subject</Label>
                <div className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm font-extrabold text-slate-800">
                  {compiledPreview.subject}
                </div>
              </div>

              {/* Body Content Box */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Message Content</Label>
                <div className="w-full p-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 whitespace-pre-wrap leading-relaxed min-h-[180px] max-h-[250px] overflow-y-auto font-sans">
                  {compiledPreview.body}
                </div>
              </div>
            </div>

            <DialogFooter className="flex justify-end gap-3">
              <Button
                onClick={() => setPreviewStudent(null)}
                variant="outline"
                className="rounded-xl font-bold bg-white text-slate-600 border-slate-200"
              >
                Close Preview
              </Button>
              <Button
                onClick={() => {
                  handleSendEmail(previewStudent);
                  setPreviewStudent(null);
                }}
                className="rounded-xl font-bold bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20"
              >
                Send Now
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Bulk Processing Confirmation Dialog */}
      <Dialog open={showConfirmToggle} onOpenChange={setShowConfirmToggle}>
        <DialogContent className="sm:max-w-[450px] rounded-3xl bg-white/95 backdrop-blur-md p-6 border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-slate-800">
              Bulk Processing Confirmation
            </DialogTitle>
            <DialogDescription className="font-semibold text-slate-500 mt-2">
              There are <span className="text-indigo-600 font-extrabold">{pendingEmailsCount}</span> pending emails in the system.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-sm font-medium text-slate-600">
            Are you sure you want to switch to Automatic Mode and send all pending emails now?
          </div>
          <DialogFooter className="flex justify-end gap-3 mt-4">
            <Button
              onClick={() => {
                setShowConfirmToggle(false);
              }}
              variant="outline"
              className="rounded-xl font-bold bg-white text-slate-600 border-slate-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmBulkSend}
              className="rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/20"
            >
              Send All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Email Progress / Completion Summary Dialog */}
      <Dialog open={showProgressModal} onOpenChange={(open) => {
        if (!isProcessing) {
          setShowProgressModal(open);
        }
      }}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl bg-white/95 backdrop-blur-md p-6 border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-slate-800">
              {isProcessing ? 'Bulk Processing Emails' : 'Processing Complete'}
            </DialogTitle>
            <DialogDescription className="font-semibold text-slate-500 mt-1">
              {isProcessing
                ? 'Please wait while the system dispatches pending notifications...'
                : 'All pending emails have been processed.'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            {isProcessing && progressState && (
              <div className="space-y-4">
                <div className="flex justify-between text-sm font-bold text-slate-700">
                  <span>{progressState.workflow}</span>
                  <span>{progressState.current} / {progressState.total}</span>
                </div>
                {/* Custom Progress Bar */}
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-violet-600 h-3 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progressState.total > 0 ? (progressState.current / progressState.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}

            {!isProcessing && summaryState && (
              <div className="space-y-4">
                <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest border-b pb-2">
                  Completion Summary
                </h4>
                <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                  {Object.entries(summaryState).map(([key, val]) => {
                    const label = key === 'ANNUAL_FEE_REMINDER'
                      ? 'Annual Fee Reminder'
                      : key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
                    return (
                      <div key={key} className="flex justify-between items-center py-2.5 text-sm">
                        <span className="font-bold text-slate-700">{label}</span>
                        <div className="flex space-x-3 font-semibold">
                          <span className="text-emerald-600">{val.sent} Sent</span>
                          <span className={`${val.failed > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                            {val.failed} Failed
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-end">
            <Button
              disabled={isProcessing}
              onClick={() => {
                setShowProgressModal(false);
                setProgressState(null);
                setSummaryState(null);
              }}
              className="rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
