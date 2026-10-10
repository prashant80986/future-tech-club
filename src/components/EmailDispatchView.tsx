import React, { useState } from 'react';
import { Batch, Student, CertificateTemplate, EmailSettings, EmailLog } from '../types.ts';
import { api } from '../services/api.ts';
import {
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Sliders,
  RotateCcw,
  ShieldCheck,
  Mail,
  FileText,
  AlertTriangle,
  Trash2,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

interface EmailDispatchViewProps {
  batches: Batch[];
  selectedBatchId: string;
  onSelectBatchId: (id: string) => void;
  students: Student[];
  templates: CertificateTemplate[];
  emailSettings: EmailSettings | null;
  onRefreshData: () => Promise<void>;
  onNavigateToSettings: () => void;
}

export const EmailDispatchView: React.FC<EmailDispatchViewProps> = ({
  batches,
  selectedBatchId,
  onSelectBatchId,
  students,
  templates,
  emailSettings,
  onRefreshData,
  onNavigateToSettings,
}) => {
  const currentBatch = batches.find((b) => b.id === selectedBatchId) || batches[0];
  const batchStudents = students.filter((s) => s.batchId === currentBatch?.id);

  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [forceResend, setForceResend] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    currentBatch?.templateId || templates[0]?.id || 'tmpl-classic-blue'
  );

  // SMTP Testing state
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isProvisioning, setIsProvisioning] = useState(false);

  // Single Live Test Email
  const [testRecipient, setTestRecipient] = useState('contact.prashantcreator@gmail.com');
  const [isSendingSingleTest, setIsSendingSingleTest] = useState(false);
  const [singleTestResult, setSingleTestResult] = useState<{
    success: boolean;
    message: string;
    previewUrl?: string | null;
  } | null>(null);

  // Direct Gmail Connection State
  const [gmailAppPass, setGmailAppPass] = useState('');
  const [isConnectingGmail, setIsConnectingGmail] = useState(false);
  const [gmailConnectMsg, setGmailConnectMsg] = useState<{ success: boolean; text: string } | null>(null);

  // Dispatch progress state
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<any | null>(null);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  // Email Logs
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Fetch logs on mount or batch change
  const loadLogs = async () => {
    try {
      setIsLoadingLogs(true);
      const res = await api.getEmailLogs(currentBatch?.id);
      setLogs(res.logs);
    } catch {
      // ignore
    } finally {
      setIsLoadingLogs(false);
    }
  };

  React.useEffect(() => {
    loadLogs();
  }, [currentBatch?.id]);

  // Quick selectors
  const handleSelectAll = () => {
    if (selectedStudentIds.length === batchStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(batchStudents.map((s) => s.id));
    }
  };

  const handleSelectPendingOnly = () => {
    const pending = batchStudents.filter((s) => s.emailStatus !== 'sent');
    setSelectedStudentIds(pending.map((s) => s.id));
  };

  const handleSelectFailedOnly = () => {
    const failed = batchStudents.filter((s) => s.emailStatus === 'failed');
    setSelectedStudentIds(failed.map((s) => s.id));
  };

  // Test SMTP connection
  const handleTestSmtp = async () => {
    try {
      setIsTestingSmtp(true);
      setSmtpTestResult(null);
      const res = await api.testSmtpConnection();
      setSmtpTestResult(res);
    } catch (err: any) {
      setSmtpTestResult({
        success: false,
        message: err.message || 'SMTP connection failed. Check your host, username, and App Password.',
      });
    } finally {
      setIsTestingSmtp(false);
    }
  };

  // 1-Click Provision Real Test SMTP
  const handleProvisionTestSmtp = async () => {
    try {
      setIsProvisioning(true);
      setSmtpTestResult(null);
      const res = await api.provisionTestAccount();
      await onRefreshData();
      setSmtpTestResult({
        success: true,
        message: `Real test SMTP server configured successfully (${res.user})! All sent messages will include live browser preview links.`,
      });
    } catch (err: any) {
      setSmtpTestResult({
        success: false,
        message: err.message || 'Failed to provision test SMTP server.',
      });
    } finally {
      setIsProvisioning(false);
    }
  };

  // Send Single Live Test Email
  const handleSendSingleTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipient || !testRecipient.includes('@')) {
      alert('Please enter a valid destination email address.');
      return;
    }
    try {
      setIsSendingSingleTest(true);
      setSingleTestResult(null);
      const res = await api.sendSingleTestEmail(testRecipient.trim(), selectedTemplateId);
      setSingleTestResult(res);
      await loadLogs();
    } catch (err: any) {
      setSingleTestResult({
        success: false,
        message: err.message || 'Test email sending failed.',
      });
    } finally {
      setIsSendingSingleTest(false);
    }
  };

  // Direct Gmail Connect handler
  const handleConnectGmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gmailAppPass.trim()) {
      alert('Please enter your 16-character Google App Password.');
      return;
    }
    try {
      setIsConnectingGmail(true);
      setGmailConnectMsg(null);
      const cleanedPass = gmailAppPass.trim().replace(/\s+/g, '');
      await api.updateEmailSettings({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        authUser: 'contact.prashantcreator@gmail.com',
        authPass: cleanedPass,
        senderName: 'Mount Learner Academy Certifications Office',
        senderEmail: 'contact.prashantcreator@gmail.com',
        isConfigured: true,
      });
      await onRefreshData();
      const testRes = await api.testSmtpConnection();
      if (testRes.success) {
        setGmailConnectMsg({
          success: true,
          text: '✓ Successfully connected to Gmail (contact.prashantcreator@gmail.com)! All certificates will be delivered directly from your Google account.',
        });
      } else {
        setGmailConnectMsg({
          success: false,
          text: testRes.message,
        });
      }
    } catch (err: any) {
      setGmailConnectMsg({
        success: false,
        text: err.message || 'Gmail connection failed.',
      });
    } finally {
      setIsConnectingGmail(false);
    }
  };

  // Dispatch batch emails
  const handleSendEmails = async () => {
    if (selectedStudentIds.length === 0) {
      alert('Please select at least one candidate to email.');
      return;
    }

    if (!emailSettings?.isConfigured) {
      alert('SMTP settings are not configured. Click "1-Click Free Test SMTP Account" or enter your Gmail App Password.');
      return;
    }

    try {
      setIsDispatching(true);
      setDispatchError(null);
      setDispatchResult(null);

      const res = await api.sendBatchEmails(selectedStudentIds, selectedTemplateId, forceResend);
      setDispatchResult(res);
      await onRefreshData();
      await loadLogs();
    } catch (err: any) {
      setDispatchError(err.message || 'Failed to dispatch emails.');
    } finally {
      setIsDispatching(false);
    }
  };

  // Clear logs
  const handleClearLogs = async () => {
    if (confirm('Clear email delivery history for this batch?')) {
      await api.clearEmailLogs(currentBatch?.id);
      await loadLogs();
    }
  };

  const sentCount = batchStudents.filter((s) => s.emailStatus === 'sent').length;
  const failedCount = batchStudents.filter((s) => s.emailStatus === 'failed').length;
  const pendingCount = batchStudents.length - sentCount;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Controller Strip */}
      <div className="bg-white p-6 rounded border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Real Email Delivery & SMTP Dispatch System
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Automated server-side delivery with personalized messages, PDF attachments, rate throttling, and duplicate suppression.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPreviewModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Preview Template</span>
            </button>

            <button
              onClick={onNavigateToSettings}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>SMTP Settings</span>
            </button>
          </div>
        </div>

        {/* SMTP Status & Quick Setup Bar */}
        <div className="bg-slate-50 p-4 rounded border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full shrink-0 ${
                emailSettings?.isConfigured ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <div className="text-xs">
              <span className="font-semibold text-slate-800">
                {emailSettings?.isConfigured ? 'Live SMTP Connection:' : 'SMTP Mailer Needs Setup:'}
              </span>{' '}
              <span className="text-slate-600">
                {emailSettings?.isConfigured
                  ? `${emailSettings.host}:${emailSettings.port} (${emailSettings.senderEmail})`
                  : 'Requires Gmail SMTP or Free Test SMTP account'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!emailSettings?.isConfigured && (
              <button
                onClick={handleProvisionTestSmtp}
                disabled={isProvisioning}
                className="px-3 py-1.5 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{isProvisioning ? 'Setting Up...' : '1-Click Free Test SMTP Account'}</span>
              </button>
            )}

            <button
              onClick={handleTestSmtp}
              disabled={isTestingSmtp}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTestingSmtp ? 'animate-spin' : ''}`} />
              <span>{isTestingSmtp ? 'Verifying Host...' : 'Test SMTP Connection'}</span>
            </button>
          </div>
        </div>

        {/* Test Result Message */}
        {smtpTestResult && (
          <div
            className={`p-3 text-xs rounded border ${
              smtpTestResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {smtpTestResult.message}
          </div>
        )}

        {/* Dedicated Gmail Connection Assistant */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50/60 rounded border border-blue-200 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-900" />
              <span className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                Connect Gmail: contact.prashantcreator@gmail.com
              </span>
            </div>
            <a
              href="https://myaccount.google.com/apppasswords"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-950 underline"
            >
              <span>Get 16-Letter App Password from Google ↗</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <p className="text-[11px] text-slate-600 leading-relaxed">
            Google requires a <strong>16-character Google App Password</strong> (not your normal account password) to dispatch emails through Gmail SMTP. Open your Google Security settings, create an App Password named <em>Mount Learner Academy</em>, and paste it below:
          </p>

          <form onSubmit={handleConnectGmail} className="flex flex-col sm:flex-row gap-2">
            <input
              type="password"
              required
              value={gmailAppPass}
              onChange={(e) => setGmailAppPass(e.target.value)}
              placeholder="Paste 16-character App Password (e.g. abcd efgh ijkl mnop)"
              className="flex-1 p-2 border border-blue-300 rounded text-xs text-slate-900 font-mono bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
            <button
              type="submit"
              disabled={isConnectingGmail}
              className="px-4 py-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white font-bold text-xs rounded transition-colors whitespace-nowrap shadow-xs"
            >
              {isConnectingGmail ? 'Connecting Gmail...' : 'Connect & Verify Gmail'}
            </button>
          </form>

          {gmailConnectMsg && (
            <div
              className={`p-2.5 rounded text-xs border ${
                gmailConnectMsg.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              {gmailConnectMsg.text}
            </div>
          )}
        </div>

        {/* Live Personal Test Email Dispatcher */}
        <div className="p-4 bg-white rounded border border-blue-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-950 uppercase tracking-wider">
              <Mail className="w-4 h-4 text-blue-800" />
              <span>Send Live Test Email with PDF Certificate</span>
            </div>
            <span className="text-[11px] text-slate-400">Transmits real email to any inbox</span>
          </div>

          <form onSubmit={handleSendSingleTest} className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              required
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              placeholder="Enter your personal email (e.g. yourname@gmail.com)"
              className="flex-1 p-2 border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
            <button
              type="submit"
              disabled={isSendingSingleTest}
              className="px-4 py-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white font-semibold text-xs rounded flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSendingSingleTest ? 'Sending Test...' : 'Send Live Test Certificate'}</span>
            </button>
          </form>

          {singleTestResult && (
            <div
              className={`p-3 rounded border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                singleTestResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              <div>
                <strong>{singleTestResult.success ? 'Delivered:' : 'Failed:'}</strong> {singleTestResult.message}
              </div>
              {singleTestResult.previewUrl && (
                <a
                  href={singleTestResult.previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold underline text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 shrink-0"
                >
                  <span>View Delivered Email & PDF in Web Inbox</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Metrics Row (Zero-pill discipline, tabular nums) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-50 p-4 rounded border border-slate-200 text-xs">
            <span className="text-slate-500 uppercase tracking-wider font-medium">Total Candidates</span>
            <div className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-1">
              {batchStudents.length}
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded border border-slate-200 text-xs">
            <span className="text-emerald-700 uppercase tracking-wider font-medium">Delivered</span>
            <div className="text-xl font-bold text-emerald-700 font-mono tabular-nums mt-1">{sentCount}</div>
          </div>

          <div className="bg-slate-50 p-4 rounded border border-slate-200 text-xs">
            <span className="text-slate-600 uppercase tracking-wider font-medium">Pending Send</span>
            <div className="text-xl font-bold text-slate-700 font-mono tabular-nums mt-1">{pendingCount}</div>
          </div>

          <div className="bg-slate-50 p-4 rounded border border-slate-200 text-xs">
            <span className="text-red-700 uppercase tracking-wider font-medium">Failed</span>
            <div className="text-xl font-bold text-red-700 font-mono tabular-nums mt-1">{failedCount}</div>
          </div>
        </div>

        {/* Dispatch Controls */}
        <div className="bg-blue-50/50 p-4 rounded border border-blue-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={forceResend}
                  onChange={(e) => setForceResend(e.target.checked)}
                  className="rounded text-blue-900"
                />
                <span>Force Resend (Override duplicate suppression)</span>
              </label>
            </div>
            <p className="text-[11px] text-slate-500">
              When unchecked, candidates who already received a certificate are automatically skipped to prevent double-sends.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="bg-white border border-slate-300 rounded text-xs p-2 font-medium"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <button
              onClick={handleSendEmails}
              disabled={isDispatching || selectedStudentIds.length === 0}
              className="py-2 px-5 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white font-bold text-xs rounded transition-colors flex items-center gap-2 whitespace-nowrap shadow-xs"
            >
              {isDispatching ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Dispatching in Progress...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send {selectedStudentIds.length} Selected Emails</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dispatch Progress / Summary */}
        {dispatchResult && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-950 space-y-1">
            <div className="font-bold">Batch Dispatch Completed:</div>
            <p>
              Sent: <span className="font-mono font-bold">{dispatchResult.sentCount}</span> | Skipped:{' '}
              <span className="font-mono font-bold">{dispatchResult.skippedCount}</span> | Failed:{' '}
              <span className="font-mono font-bold">{dispatchResult.failedCount}</span>
            </p>
            {dispatchResult.errors?.length > 0 && (
              <div className="mt-2 text-red-700">
                Errors encountered: {dispatchResult.errors.map((e: any) => `${e.studentName}: ${e.error}`).join('; ')}
              </div>
            )}
          </div>
        )}

        {dispatchError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded text-xs text-red-800">
            {dispatchError}
          </div>
        )}
      </div>

      {/* Candidates Selection Table */}
      <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Select Candidates to Email
            </h2>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              ({selectedStudentIds.length} selected of {batchStudents.length})
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={handleSelectAll}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 text-slate-700 font-medium"
            >
              {selectedStudentIds.length === batchStudents.length ? 'Deselect All' : 'Select All'}
            </button>
            <button
              onClick={handleSelectPendingOnly}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 text-slate-700 font-medium"
            >
              Select Pending ({pendingCount})
            </button>
            {failedCount > 0 && (
              <button
                onClick={handleSelectFailedOnly}
                className="px-2.5 py-1 bg-red-50 border border-red-200 text-red-700 rounded hover:bg-red-100 font-medium"
              >
                Select Failed ({failedCount})
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-white sticky top-0 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold z-10">
              <tr>
                <th className="py-2.5 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.length === batchStudents.length && batchStudents.length > 0}
                    onChange={handleSelectAll}
                    className="rounded text-blue-900"
                  />
                </th>
                <th className="py-2.5 px-4">Candidate Name</th>
                <th className="py-2.5 px-4">Email Address</th>
                <th className="py-2.5 px-4">Certificate ID</th>
                <th className="py-2.5 px-4">Delivery Status</th>
                <th className="py-2.5 px-4">Sent Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {batchStudents.map((student) => {
                const isSelected = selectedStudentIds.includes(student.id);
                return (
                  <tr
                    key={student.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedStudentIds(selectedStudentIds.filter((id) => id !== student.id));
                      } else {
                        setSelectedStudentIds([...selectedStudentIds, student.id]);
                      }
                    }}
                    className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    <td className="py-2.5 px-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded text-blue-900"
                      />
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{student.name}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">{student.email}</td>
                    <td className="py-2.5 px-4 font-mono font-semibold text-slate-800 tabular-nums">
                      {student.certificateId}
                    </td>
                    <td className="py-2.5 px-4">
                      {student.emailStatus === 'sent' ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Sent</span>
                        </span>
                      ) : student.emailStatus === 'failed' ? (
                        <span className="text-red-700 font-semibold flex items-center gap-1" title={student.emailError || ''}>
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Failed</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">Pending</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">
                      {student.emailSentAt ? new Date(student.emailSentAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Real Server Email Logs with Web Inbox Viewer */}
      <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Audit Logs & Live Delivery History
            </h2>
            <p className="text-[11px] text-slate-500">Real-time server records with direct web view links for verified transmissions</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadLogs}
              className="p-1.5 text-slate-500 hover:text-slate-800 rounded"
              title="Refresh Logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleClearLogs}
              className="p-1.5 text-slate-500 hover:text-red-600 rounded"
              title="Clear Logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-72">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No email dispatch activity recorded for this batch yet.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-white sticky top-0 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-2 px-4">Time</th>
                  <th className="py-2 px-4">Recipient</th>
                  <th className="py-2 px-4">Certificate ID</th>
                  <th className="py-2 px-4">Status</th>
                  <th className="py-2 px-4">Message / Web Viewer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-2 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.sentAt).toLocaleTimeString()}
                    </td>
                    <td className="py-2 px-4 font-medium text-slate-900">{log.studentName}</td>
                    <td className="py-2 px-4 font-mono font-semibold text-slate-700">{log.certificateId}</td>
                    <td className="py-2 px-4 font-semibold">
                      {log.status === 'sent' ? (
                        <span className="text-emerald-700">Delivered</span>
                      ) : log.status === 'skipped' ? (
                        <span className="text-amber-700">Skipped (Duplicate)</span>
                      ) : (
                        <span className="text-red-700">Failed</span>
                      )}
                    </td>
                    <td className="py-2 px-4 text-slate-600">
                      <span>{log.error || 'Delivered with PDF attachment'}</span>
                      {log.previewUrl && (
                        <a
                          href={log.previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-2 inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-bold underline text-[11px]"
                        >
                          <span>View in Inbox ↗</span>
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Email Template Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 border border-slate-200 text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Email Dispatch Format Preview</h3>
              <button onClick={() => setShowPreviewModal(false)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <div>
                <span className="font-semibold text-slate-700">From:</span>{' '}
                <span className="text-slate-600">
                  {emailSettings?.senderName} &lt;{emailSettings?.senderEmail}&gt;
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-700">Subject:</span>{' '}
                <span className="text-slate-800 font-medium">
                  Your Official Certificate of Excellence: {currentBatch?.competition} — Mount Learner Academy
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded border border-slate-200 space-y-3">
              <div className="border-b border-blue-900 pb-2 text-center">
                <div className="font-bold text-blue-900 tracking-wide">MOUNT LEARNER ACADEMY</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest">
                  Office of Academic Honours & Certifications
                </div>
              </div>

              <div className="text-slate-700 whitespace-pre-line leading-relaxed">
                Dear Aarav Sharma,
                {'\n\n'}
                Congratulations on your commendable achievement in the {currentBatch?.competition}!
                {'\n\n'}
                We are pleased to confer upon you the official Mount Learner Academy Certificate of Excellence in recognition of your distinguished performance.
              </div>

              <div className="p-2.5 bg-white rounded border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-red-600" />
                  <span className="font-semibold text-slate-800">
                    Mount_Learner_Academy_Certificate_MLA-2026-STEM-0001.pdf
                  </span>
                </div>
                <span className="text-slate-400 font-mono text-[10px]">PDF (Vector)</span>
              </div>
            </div>

            <div className="text-right">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-1.5 bg-blue-900 text-white font-semibold rounded hover:bg-blue-800"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
