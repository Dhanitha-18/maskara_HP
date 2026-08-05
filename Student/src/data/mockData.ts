export interface Student {
  id?: string;
  applicationId?: string;
  name: string;
  usn: string;
  department: string;
  semester: number;
  email: string;
  phone: string;
  address: string;
  parentContact: string;
  year: number;
  photoUrl?: string | null;
  passportPhoto?: string | null;
  applicationData?: any;
}

export interface HostelInfo {
  hostel: string;
  block: string;
  floor: number;
  room: string;
  bed: string;
  sharing: string;
  admissionDate: string;
}

export interface FeeComponent {
  component: string;
  amount: number;
}

export interface FeeSummary {
  total: number;
  paid: number;
  remaining: number;
  dueDate: string;
  components: FeeComponent[];
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  category: 'payment' | 'approval' | 'general';
  read: boolean;
}

export interface ReceiptItem {
  receiptNo: string;
  studentName: string;
  usn: string;
  department: string;
  hostelName: string;
  block: string;
  roomNo: string;
  bedNo: string;
  amountPaid: number;
  remainingAmount: number;
  paymentMethod: string;
  transactionId: string;
  refNo: string;
  date: string;
  status: 'Verified' | 'Pending' | 'Processing' | 'Successful';
}

export interface SupportContact {
  office: string;
  contact: string;
  timing: string;
}

export const mockStudent: Student = {
  id: "",
  applicationId: "",
  name: "",
  usn: "",
  department: "",
  semester: 0,
  year: 0,
  email: "",
  phone: "",
  address: "",
  parentContact: ""
};

export const mockHostel: HostelInfo = {
  hostel: "Unassigned",
  block: "-",
  floor: 0,
  room: "-",
  bed: "-",
  sharing: "-",
  admissionDate: "-"
};

export const mockFees: FeeSummary = {
  total: 140000,
  paid: 0,
  remaining: 140000,
  dueDate: "30 July 2026",
  components: [
    { component: "Hostel Fee", amount: 95000 },
    { component: "Security Deposit", amount: 15000 },
    { component: "Mess Fee", amount: 30000 }
  ]
};

export const mockNotifications: NotificationItem[] = [];

export const mockReceipts: ReceiptItem[] = [];

export const mockSupportContacts: SupportContact[] = [
  {
    office: "Accounts Office",
    contact: "+91 80 2699 1234",
    timing: "Monday-Friday, 9 AM - 5 PM"
  },
  {
    office: "Hostel Office",
    contact: "+91 80 2699 5678",
    timing: "Monday-Saturday, 9 AM - 6 PM"
  },
  {
    office: "Emergency Warden",
    contact: "+91 98450 11223",
    timing: "24/7 Support"
  },
  {
    office: "Technical Support",
    contact: "+91 80 2699 9000",
    timing: "Monday-Friday, 9 AM - 5 PM"
  }
];