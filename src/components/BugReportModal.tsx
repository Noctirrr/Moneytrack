import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  AlertCircle, 
  X, 
  Send, 
  CheckCircle2, 
  Clock, 
  Search, 
  Trash2, 
  MessageSquare, 
  Check, 
  AlertTriangle,
  RefreshCw,
  HelpCircle,
  ExternalLink,
  Laptop
} from 'lucide-react';
import { Language, BugReport, BugReportStatus, BugReportType } from '../types';
import { translations } from '../constants/translations';
import { 
  submitBugReport, 
  subscribeToBugReports, 
  updateBugReportStatus, 
  deleteBugReport,
  isUserAdmin 
} from '../services/firestoreService';

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  user: User | null;
  initialTab?: 'create' | 'list';
}

export const BugReportModal: React.FC<BugReportModalProps> = ({
  isOpen,
  onClose,
  lang,
  user,
  initialTab = 'create'
}) => {
  const t = translations[lang];
  const isAdmin = isUserAdmin(user);

  const [activeTab, setActiveTab] = useState<'create' | 'list'>(initialTab);
  const [reportType, setReportType] = useState<BugReportType>('bug');
  const [message, setMessage] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // List of reports
  const [reports, setReports] = useState<BugReport[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Admin interactive state for resolving/editing
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [adminNoteInput, setAdminNoteInput] = useState('');
  const [adminStatusInput, setAdminStatusInput] = useState<BugReportStatus>('investigating');

  // Reset tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setIsConfirming(false);
      setSubmitSuccess(false);
      setErrorMessage('');
    }
  }, [isOpen, initialTab]);

  // Subscribe to live Firestore bug_reports
  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeToBugReports((updatedReports) => {
      setReports(updatedReports || []);
    });
    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle pre-submit click (open confirmation dialog)
  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setErrorMessage(t.validationEmptyMessage);
      return;
    }
    setErrorMessage('');
    setIsConfirming(true);
  };

  // Handle actual send to Firebase
  const handleConfirmSend = async () => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await submitBugReport({
        message: message.trim(),
        reportType,
        userId: user ? user.uid : 'guest',
        userEmail: user?.email || '',
        userDisplayName: user?.displayName || (lang === 'th' ? 'ผู้ใช้งานทั่วไป' : 'Guest User'),
        language: lang,
      });

      setIsSubmitting(false);
      setIsConfirming(false);
      setSubmitSuccess(true);
      setMessage('');
      
      // Auto transition to list after 1.5s to let user check the status immediately
      setTimeout(() => {
        setSubmitSuccess(false);
        setActiveTab('list');
      }, 1400);
    } catch (err: any) {
      console.error('Error submitting bug report:', err);
      setIsSubmitting(false);
      setIsConfirming(false);
      setErrorMessage(lang === 'th' ? 'เกิดข้อผิดพลาดในการส่งข้อมูลเข้า Firebase' : 'Failed to send report to Firebase');
    }
  };

  // Handle Admin updating status
  const handleSaveAdminUpdate = async (reportId: string) => {
    try {
      await updateBugReportStatus(reportId, adminStatusInput, adminNoteInput);
      setEditingReportId(null);
      setAdminNoteInput('');
    } catch (err) {
      console.error('Admin update failed:', err);
      alert(lang === 'th' ? 'ไม่สามารถอัปเดตสถานะได้' : 'Failed to update status');
    }
  };

  // Handle deleting report
  const handleDeleteReport = async (reportId: string) => {
    if (confirm(t.deleteReportConfirm)) {
      try {
        await deleteBugReport(reportId);
      } catch (err) {
        console.error('Delete report failed:', err);
      }
    }
  };

  const getStatusBadge = (status: BugReportStatus) => {
    switch (status) {
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
            <span>{t.statusResolved}</span>
          </span>
        );
      case 'investigating':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <RefreshCw size={12} className="animate-spin text-blue-600 dark:text-blue-400" />
            <span>{t.statusInvestigating}</span>
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock size={12} className="text-amber-600 dark:text-amber-400" />
            <span>{t.statusPending}</span>
          </span>
        );
    }
  };

  const getTypeLabel = (type?: BugReportType) => {
    switch (type) {
      case 'calculation':
        return t.reportCategoryCalculation;
      case 'ui':
        return t.reportCategoryUi;
      case 'feature':
        return t.reportCategoryFeature;
      case 'other':
        return t.reportCategoryOther;
      case 'bug':
      default:
        return t.reportCategoryBug;
    }
  };

  const filteredReports = reports.filter((r) => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesSearch =
      !searchFilter.trim() ||
      r.message.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (r.userEmail && r.userEmail.toLowerCase().includes(searchFilter.toLowerCase())) ||
      (r.adminResponse && r.adminResponse.toLowerCase().includes(searchFilter.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div 
      id="bug-report-modal-overlay" 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div 
        id="bug-report-modal-card" 
        className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col overflow-hidden text-neutral-900 dark:text-neutral-100"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-start justify-between gap-4 bg-neutral-50/70 dark:bg-neutral-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-sm">
              <AlertCircle size={22} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                {t.reportBugModalTitle}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{t.dataSavedInFirebase}</span>
              </p>
            </div>
          </div>

          <button 
            id="close-bug-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs (Report vs Check Status) */}
        <div className="flex items-center border-b border-neutral-100 dark:border-neutral-800 px-6 pt-3 gap-2 bg-neutral-50/30 dark:bg-neutral-900/40">
          <button
            id="tab-create-report"
            onClick={() => { setActiveTab('create'); setIsConfirming(false); }}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'create'
                ? 'border-rose-600 text-rose-600 dark:border-rose-400 dark:text-rose-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <MessageSquare size={16} />
            <span>{t.reportBugBtn}</span>
          </button>

          <button
            id="tab-check-reports"
            onClick={() => { setActiveTab('list'); setIsConfirming(false); }}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'list'
                ? 'border-rose-600 text-rose-600 dark:border-rose-400 dark:text-rose-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <Search size={16} />
            <span>{t.checkReportsTitle}</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
              {reports.length}
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: CREATE / SEND REPORT */}
          {activeTab === 'create' && (
            <div>
              {submitSuccess ? (
                <div className="p-8 text-center space-y-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40 animate-fade-in">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 size={32} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                      {t.reportSuccessTitle}
                    </h3>
                    <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 mt-1">
                      {t.reportSuccessDesc}
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handlePreSubmit} className="space-y-4">
                  <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {t.reportBugDesc}
                  </p>

                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2 border border-rose-200 dark:border-rose-900/50">
                      <AlertTriangle size={16} className="flex-shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* Category Selector */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                      {t.reportCategoryLabel}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'bug', label: t.reportCategoryBug },
                        { id: 'calculation', label: t.reportCategoryCalculation },
                        { id: 'ui', label: t.reportCategoryUi },
                        { id: 'feature', label: t.reportCategoryFeature },
                        { id: 'other', label: t.reportCategoryOther },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          id={`category-choice-${item.id}`}
                          onClick={() => setReportType(item.id as BugReportType)}
                          className={`p-2.5 rounded-xl text-xs font-semibold text-left transition-all border ${
                            reportType === item.id
                              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white shadow-sm'
                              : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/50'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Text Box (กล่องข้อความ) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label 
                        htmlFor="bug-message-box" 
                        className="text-xs font-bold text-neutral-700 dark:text-neutral-300"
                      >
                        {t.reportMessageLabel} <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[11px] text-neutral-400 font-mono">
                        {message.length} / 3000
                      </span>
                    </div>
                    <textarea
                      id="bug-message-box"
                      rows={5}
                      maxLength={3000}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={t.reportMessagePlaceholder}
                      className="w-full p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all resize-y"
                    />
                  </div>

                  {/* Device / User Details Tag */}
                  <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/60 dark:border-neutral-700/60 text-xs text-neutral-500 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{lang === 'th' ? 'ผู้ส่ง:' : 'Submitted by:'}</span>
                      <span className="text-neutral-800 dark:text-neutral-200 font-medium">
                        {user ? `${user.displayName || user.email}` : (lang === 'th' ? 'ผู้ใช้ทั่วไป (Guest)' : 'Guest')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{lang === 'th' ? 'ภาษาที่บันทึก:' : 'Language:'}</span>
                      <span>{lang.toUpperCase()} (UTF-8 รองรับทุกภาษา)</span>
                    </div>
                  </div>

                  {/* Action Buttons (ปุ่มส่ง) */}
                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      id="cancel-report-btn"
                      onClick={onClose}
                      className="px-5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                    >
                      {t.reportCancelBtn}
                    </button>
                    <button
                      type="submit"
                      id="send-report-pre-btn"
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all"
                    >
                      <Send size={15} />
                      <span>{t.reportSendBtn}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: CHECK REPORTS & STATUS ("เช็คได้เลยว่าเป็นยังไงบ้าง") */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              {/* Header and Filter */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    {t.checkReportsTitle}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    {t.checkReportsDesc}
                  </p>
                </div>

                {/* Filter by Status */}
                <div className="flex items-center gap-1.5">
                  {[
                    { id: 'all', label: lang === 'th' ? 'ทั้งหมด' : 'All' },
                    { id: 'pending', label: t.statusPending },
                    { id: 'investigating', label: t.statusInvestigating },
                    { id: 'resolved', label: t.statusResolved },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setStatusFilter(s.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        statusFilter === s.id
                          ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder={lang === 'th' ? 'ค้นหาข้อความ หรือผู้ส่ง...' : 'Search reports or sender...'}
                  className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                />
              </div>

              {/* Reports List */}
              {filteredReports.length === 0 ? (
                <div className="p-10 text-center space-y-2 bg-neutral-50 dark:bg-neutral-800/30 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-700">
                  <AlertCircle size={28} className="mx-auto text-neutral-400" />
                  <p className="text-xs text-neutral-500 font-medium">
                    {t.noReportsYet}
                  </p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline pt-1 inline-block"
                  >
                    + {t.reportBugBtn}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredReports.map((item) => (
                    <div
                      key={item.id}
                      id={`report-item-${item.id}`}
                      className="p-4 rounded-2xl bg-white dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/80 space-y-3 shadow-sm hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {getStatusBadge(item.status)}
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                            {getTypeLabel(item.reportType)}
                          </span>
                          <span className="text-[11px] text-neutral-400">
                            {new Date(item.createdAt).toLocaleString(lang === 'th' ? 'th-TH' : 'en-US', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>

                        {/* Admin Action Bar */}
                        {isAdmin && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingReportId(item.id);
                                setAdminStatusInput(item.status);
                                setAdminNoteInput(item.adminResponse || '');
                              }}
                              className="px-2 py-1 rounded text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300"
                            >
                              {t.adminUpdateStatus}
                            </button>
                            <button
                              onClick={() => handleDeleteReport(item.id)}
                              className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              title="Delete report"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* The error message text */}
                      <p className="text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap leading-relaxed font-sans">
                        {item.message}
                      </p>

                      {/* Admin Note if present */}
                      {item.adminResponse && (
                        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs space-y-1">
                          <p className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                            <Check size={14} />
                            <span>{t.adminResponseLabel}</span>
                          </p>
                          <p className="text-emerald-900 dark:text-emerald-200 leading-normal">
                            {item.adminResponse}
                          </p>
                        </div>
                      )}

                      {/* Editing panel if admin selected */}
                      {isAdmin && editingReportId === item.id && (
                        <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-900/90 border border-neutral-300 dark:border-neutral-700 space-y-2 mt-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold">{lang === 'th' ? 'เปลี่ยนสถานะ:' : 'Change Status:'}</span>
                            <select
                              value={adminStatusInput}
                              onChange={(e) => setAdminStatusInput(e.target.value as BugReportStatus)}
                              className="text-xs p-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                            >
                              <option value="pending">{t.statusPending}</option>
                              <option value="investigating">{t.statusInvestigating}</option>
                              <option value="resolved">{t.statusResolved}</option>
                            </select>
                          </div>

                          <input
                            type="text"
                            value={adminNoteInput}
                            onChange={(e) => setAdminNoteInput(e.target.value)}
                            placeholder={t.adminNotesPlaceholder}
                            className="w-full text-xs p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                          />

                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              onClick={() => setEditingReportId(null)}
                              className="px-3 py-1 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700"
                            >
                              {t.cancelBtn}
                            </button>
                            <button
                              onClick={() => handleSaveAdminUpdate(item.id)}
                              className="px-3 py-1 text-xs font-bold rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                            >
                              {t.saveBtn}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Footer info: submitter & device */}
                      <div className="pt-1 flex items-center justify-between text-[11px] text-neutral-400 border-t border-neutral-100 dark:border-neutral-700/50">
                        <span>{item.userDisplayName || item.userEmail || 'Guest'}</span>
                        <span className="font-mono text-[10px] truncate max-w-[200px]">
                          ID: {item.id.slice(0, 8)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* CONFIRMATION DIALOG OVERLAY (มียกเลิก กับส่ง ตามที่ผู้ใช้สั่ง) */}
        {isConfirming && (
          <div 
            id="bug-report-confirm-overlay"
            className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          >
            <div 
              id="bug-report-confirm-box"
              className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <Send size={24} />
              </div>

              <div>
                <h4 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
                  {t.reportConfirmTitle}
                </h4>
                <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">
                  {t.reportConfirmDesc}
                </p>
              </div>

              {/* Message preview snippet */}
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-700 dark:text-neutral-300 max-h-28 overflow-y-auto">
                <span className="font-semibold text-neutral-400 block mb-1">
                  [{getTypeLabel(reportType)}]
                </span>
                <p className="whitespace-pre-wrap">{message}</p>
              </div>

              {/* Confirmation Buttons: [ยกเลิก] และ [ส่ง] */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  id="confirm-dialog-cancel-btn"
                  disabled={isSubmitting}
                  onClick={() => setIsConfirming(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  {t.reportConfirmCancelBtn}
                </button>
                <button
                  type="button"
                  id="confirm-dialog-send-btn"
                  disabled={isSubmitting}
                  onClick={handleConfirmSend}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>{t.reportSubmitting}</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>{t.reportConfirmSendBtn}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
