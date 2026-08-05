import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, UserPlus, Trash2, Edit3, Key, Mail, User, Shield, 
  CheckSquare, Square, RefreshCw, AlertCircle, CheckCircle2, Lock, Eye, EyeOff, Building
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../store/useAuthStore';

interface AdminAccountItem {
  id: string;
  email: string;
  name: string;
  role: 'CHIEF' | 'SUB_ADMIN';
  title: string;
  status: string;
  allowedTabs: string[];
  allowedBlocks: string[];
  createdAt?: string;
}

const AVAILABLE_TABS = [
  { id: '/', label: 'Dashboard', category: 'Overview' },
  { id: '/applications', label: 'Applications Queue', category: 'Admissions' },
  { id: '/database', label: 'Student Database', category: 'Records' },
  { id: '/blocks', label: 'Block Overview', category: 'Infrastructure' },
  { id: '/occupancy', label: 'Live Occupancy', category: 'Infrastructure' },
  { id: '/communication', label: 'Communication Center', category: 'Broadcast' },
  { id: '/payments', label: 'Payments Dashboard', category: 'Finance' },
  { id: '/student-controls', label: 'Student Controls', category: 'Management' },
  { id: '/settings', label: 'System Settings', category: 'System' },
];

export default function AdminManagement() {
  const { role, logout } = useAuthStore();
  const [admins, setAdmins] = useState<AdminAccountItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminAccountItem | null>(null);
  const [systemBlocks, setSystemBlocks] = useState<string[]>(['Block A', 'Block B', 'Block C', 'Girls PG']);

  // Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formTitle, setFormTitle] = useState('Assistant Warden');
  const [formRole, setFormRole] = useState<'CHIEF' | 'SUB_ADMIN'>('SUB_ADMIN');
  const [selectedTabs, setSelectedTabs] = useState<string[]>([
    '/', '/applications', '/database', '/blocks', '/occupancy'
  ]);
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>(['ALL']);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch('http://localhost:5000/api/blocks')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const names = data.map((b: any) => b.name);
          if (names.length > 0) setSystemBlocks(names);
        }
      })
      .catch(() => {});
  }, []);

  const fetchAdmins = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/admin/accounts');
      const data = await res.json();
      if (res.ok && data.accounts) {
        setAdmins(data.accounts);
      }
    } catch (err) {
      console.error('Failed to fetch admin accounts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormTitle('Assistant Warden');
    setFormRole('SUB_ADMIN');
    setSelectedTabs(['/', '/applications', '/database', '/blocks', '/occupancy']);
    setSelectedBlocks(['ALL']);
    setEditingAdmin(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleOpenEdit = (admin: AdminAccountItem) => {
    setEditingAdmin(admin);
    setFormName(admin.name);
    setFormEmail(admin.email);
    setFormPassword(''); // blank unless changing
    setFormTitle(admin.title);
    setFormRole(admin.role);
    setSelectedTabs(admin.allowedTabs || []);
    setSelectedBlocks(admin.allowedBlocks && admin.allowedBlocks.length > 0 ? admin.allowedBlocks : ['ALL']);
    setShowCreateModal(true);
  };

  const toggleTab = (tabId: string) => {
    if (selectedTabs.includes(tabId)) {
      setSelectedTabs(selectedTabs.filter(t => t !== tabId));
    } else {
      setSelectedTabs([...selectedTabs, tabId]);
    }
  };

  const toggleBlock = (bName: string) => {
    if (bName === 'ALL') {
      setSelectedBlocks(['ALL']);
      return;
    }
    const current = selectedBlocks.filter(b => b !== 'ALL');
    if (current.includes(bName)) {
      const next = current.filter(b => b !== bName);
      setSelectedBlocks(next.length === 0 ? ['ALL'] : next);
    } else {
      setSelectedBlocks([...current, bName]);
    }
  };

  const handleSelectAllTabs = () => {
    setSelectedTabs(AVAILABLE_TABS.map(t => t.id));
  };

  const handleDeselectAllTabs = () => {
    setSelectedTabs([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      toast.error('Please enter name and email.');
      return;
    }
    if (!editingAdmin && !formPassword.trim()) {
      toast.error('Password is required for new sub-admin accounts.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingAdmin) {
        // UPDATE
        const res = await fetch(`http://localhost:5000/api/admin/accounts/${editingAdmin.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName,
            email: formEmail,
            password: formPassword || undefined,
            title: formTitle,
            role: formRole,
            allowedTabs: selectedTabs,
            allowedBlocks: selectedBlocks
          })
        });
        const data = await res.json();
        if (res.ok) {
          toast.success(`Updated permissions for ${formName}!`);
          setShowCreateModal(false);
          resetForm();
          fetchAdmins();
        } else {
          toast.error(data.error || 'Failed to update admin account.');
        }
      } else {
        // CREATE
        const res = await fetch('http://localhost:5000/api/admin/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName,
            email: formEmail,
            password: formPassword,
            title: formTitle,
            role: formRole,
            allowedTabs: selectedTabs,
            allowedBlocks: selectedBlocks
          })
        });
        const data = await res.json();
        if (res.ok) {
          toast.success(`Sub-Admin account created for ${formName}!`);
          setShowCreateModal(false);
          resetForm();
          fetchAdmins();
        } else {
          toast.error(data.error || 'Failed to create admin account.');
        }
      }
    } catch (err: any) {
      toast.error('Network error during admin account operation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAdmin = async (admin: AdminAccountItem) => {
    if (admin.role === 'CHIEF') {
      toast.error('Chief Admin accounts cannot be deleted.');
      return;
    }
    if (!confirm(`Are you sure you want to delete admin account "${admin.name}" (${admin.email})?`)) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/admin/accounts/${admin.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Deleted admin account "${admin.name}"`);
        fetchAdmins();
      } else {
        toast.error(data.error || 'Failed to delete admin.');
      }
    } catch {
      toast.error('Error deleting admin account.');
    }
  };

  if (role !== 'CHIEF') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-8 bg-white/70 backdrop-blur-2xl rounded-3xl border border-white/60 shadow-xl">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-800">Access Restricted</h2>
        <p className="text-sm font-semibold text-slate-500 max-w-md mt-2">
          Only the Chief Administrator can create and manage admin accounts or assign tab permissions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-indigo-500/30 border border-indigo-400/30 px-3 py-1 rounded-full text-xs font-bold text-indigo-200">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Chief Admin Privileges</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight">Admin & Role Management</h1>
            <p className="text-sm font-semibold text-indigo-200/90 max-w-xl">
              Create sub-admin accounts, manage credentials, and choose custom tab access permissions for each administrator.
            </p>
          </div>

          <button
            onClick={handleOpenCreate}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black px-6 py-3.5 rounded-2xl shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <UserPlus className="w-5 h-5" />
            <span>Create New Admin</span>
          </button>
        </div>
      </div>

      {/* Admin Accounts List */}
      <div className="bg-white/80 backdrop-blur-2xl border border-white/60 rounded-3xl p-6 shadow-[10px_10px_40px_-10px_rgba(0,0,0,0.05)] space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-800">System Administrators ({admins.length})</h2>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              Administrators created by Chief Admin with custom assigned tabs
            </p>
          </div>

          <button
            onClick={fetchAdmins}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-400 font-semibold text-sm">
            Loading administrators...
          </div>
        ) : admins.length === 0 ? (
          <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <User className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-600">No sub-admin accounts created yet</p>
            <p className="text-xs text-slate-400 mt-1">Click "Create New Admin" above to add sub-administrators.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {admins.map((admin) => {
              const isChief = admin.role === 'CHIEF';
              return (
                <div 
                  key={admin.id}
                  className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                >
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-lg ${
                        isChief ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                      }`}>
                        {admin.name.charAt(0)}
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-base font-black text-slate-800">{admin.name}</h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isChief ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                          }`}>
                            {isChief ? 'Chief Admin' : 'Sub-Admin'}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5 flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{admin.email}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-indigo-600 font-bold">{admin.title}</span>
                        </p>
                      </div>
                    </div>

                    {/* Block Jurisdiction Pills */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Block Jurisdiction:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(!admin.allowedBlocks || admin.allowedBlocks.includes('ALL')) ? (
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1">
                            <Building className="w-3 h-3 text-emerald-600" />
                            All Blocks (Full Access)
                          </span>
                        ) : (
                          admin.allowedBlocks.map((bName) => (
                            <span 
                              key={bName}
                              className="px-2.5 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1"
                            >
                              <Building className="w-3 h-3 text-indigo-600" />
                              {bName}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Accessible Tabs Pills */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Accessible Tabs ({admin.allowedTabs?.length || 0}):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(admin.allowedTabs || []).map((tabId) => {
                          const matched = AVAILABLE_TABS.find(t => t.id === tabId);
                          return (
                            <span 
                              key={tabId}
                              className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200/80 rounded-lg text-xs font-bold"
                            >
                              {matched ? matched.label : tabId}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <button
                      onClick={() => handleOpenEdit(admin)}
                      className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Tabs & Access</span>
                    </button>
                    {!isChief && (
                      <button
                        onClick={() => handleDeleteAdmin(admin)}
                        className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl text-xs flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE / EDIT ADMIN MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl max-w-2xl w-full p-8 space-y-6 shadow-2xl border border-white max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  {editingAdmin ? `Edit Permissions: ${editingAdmin.name}` : 'Create New Sub-Admin Account'}
                </h3>
                <p className="text-xs font-semibold text-slate-500 mt-1">
                  Assign credentials and decide which tabs this admin will have access to.
                </p>
              </div>
              <button 
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="text-slate-400 hover:text-slate-700 text-xl font-black p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Email Address (Login Credential) *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={formEmail}
                      onChange={e => setFormEmail(e.target.value)}
                      placeholder="e.g. ramesh@omsai.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Password {editingAdmin ? '(Leave blank to keep unchanged)' : '*'}
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formPassword}
                      onChange={e => setFormPassword(e.target.value)}
                      placeholder={editingAdmin ? '••••••••' : 'Enter password'}
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      required={!editingAdmin}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Designation / Title
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
                    placeholder="e.g. Assistant Warden / Block Manager"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              </div>

              {/* TAB PERMISSIONS DECISION SECTION */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-slate-800">Decide Tab Access Permissions</h4>
                    <p className="text-xs font-semibold text-slate-500">
                      Select which tabs this admin will be allowed to view and manage in the sidebar.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllTabs}
                      className="text-xs font-bold text-indigo-600 hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={handleDeselectAllTabs}
                      className="text-xs font-bold text-slate-500 hover:underline"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                  {AVAILABLE_TABS.map((tab) => {
                    const isChecked = selectedTabs.includes(tab.id);
                    return (
                      <div
                        key={tab.id}
                        onClick={() => toggleTab(tab.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          isChecked 
                            ? 'bg-indigo-50/70 border-indigo-300 text-indigo-900 font-black shadow-sm' 
                            : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100 font-semibold'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <span className="text-xs">{tab.label}</span>
                        </div>
                        <span className="text-[9.5px] uppercase font-bold text-slate-400 px-2 py-0.5 bg-white rounded-md border border-slate-200">
                          {tab.category}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* BLOCK ACCESS CONTROL SECTION */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div>
                  <h4 className="text-sm font-black text-slate-800">Assign Block Jurisdiction</h4>
                  <p className="text-xs font-semibold text-slate-500">
                    Select which hostel blocks this admin is permitted to access data for across assigned pages.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  <div
                    onClick={() => toggleBlock('ALL')}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-2 ${
                      selectedBlocks.includes('ALL')
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-black shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 font-semibold'
                    }`}
                  >
                    {selectedBlocks.includes('ALL') ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span className="text-xs">All Blocks (Full)</span>
                  </div>

                  {systemBlocks.map((bName) => {
                    const isChecked = !selectedBlocks.includes('ALL') && selectedBlocks.includes(bName);
                    return (
                      <div
                        key={bName}
                        onClick={() => toggleBlock(bName)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-2 ${
                          isChecked
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-black shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-600 font-semibold'
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span className="text-xs">{bName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); resetForm(); }}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{editingAdmin ? 'Save Permissions' : 'Create Admin Account'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
