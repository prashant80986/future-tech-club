import React, { useState } from 'react';
import { EmailSettings, AdminUser } from '../types.ts';
import { api } from '../services/api.ts';
import {
  Sliders,
  Shield,
  Key,
  Mail,
  Check,
  AlertCircle,
  HelpCircle,
  Lock,
  RefreshCw,
  ExternalLink,
  Send,
} from 'lucide-react';

interface SettingsViewProps {
  emailSettings: EmailSettings | null;
  onRefreshSettings: () => Promise<void>;
  currentUser: AdminUser | null;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  emailSettings,
  onRefreshSettings,
  currentUser,
}) => {
  // SMTP Form state
  const [host, setHost] = useState(emailSettings?.host || 'smtp.gmail.com');
  const [port, setPort] = useState(emailSettings?.port || 465);
  const [secure, setSecure] = useState(emailSettings?.secure !== undefined ? emailSettings.secure : true);
  const [authUser, setAuthUser] = useState(emailSettings?.authUser || '');
  const [authPass, setAuthPass] = useState('');
  const [senderName, setSenderName] = useState(
    emailSettings?.senderName || 'Mount Learner Academy Certifications Office'
  );
  const [senderEmail, setSenderEmail] = useState(emailSettings?.senderEmail || '');
  const [batchSize, setBatchSize] = useState(emailSettings?.batchSize || 20);
  const [throttleDelayMs, setThrottleDelayMs] = useState(emailSettings?.throttleDelayMs || 2500);
  const [subjectTemplate, setSubjectTemplate] = useState(emailSettings?.subjectTemplate || '');
  const [bodyTemplate, setBodyTemplate] = useState(emailSettings?.bodyTemplate || '');

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Live Test Email State
  const [testRecipient, setTestRecipient] = useState(currentUser?.email || 'contact.prashantcreator@gmail.com');
  const [isSendingSingleTest, setIsSendingSingleTest] = useState(false);
  const [singleTestResult, setSingleTestResult] = useState<{
    success: boolean;
    message: string;
    previewUrl?: string | null;
  } | null>(null);

  // Password Change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passMessage, setPassMessage] = useState<{ success: boolean; text: string } | null>(null);

  const handleSendSingleTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipient || !testRecipient.includes('@')) {
      alert('Please enter a valid destination email address.');
      return;
    }
    try {
      setIsSendingSingleTest(true);
      setSingleTestResult(null);
      const res = await api.sendSingleTestEmail(testRecipient.trim());
      setSingleTestResult(res);
    } catch (err: any) {
      setSingleTestResult({
        success: false,
        message: err.message || 'Test email sending failed.',
      });
    } finally {
      setIsSendingSingleTest(false);
    }
  };

  // Sync if emailSettings changes
  React.useEffect(() => {
    if (emailSettings) {
      setHost(emailSettings.host);
      setPort(emailSettings.port);
      setSecure(emailSettings.secure);
      setAuthUser(emailSettings.authUser);
      setSenderName(emailSettings.senderName);
      setSenderEmail(emailSettings.senderEmail);
      setBatchSize(emailSettings.batchSize);
      setThrottleDelayMs(emailSettings.throttleDelayMs);
      setSubjectTemplate(emailSettings.subjectTemplate);
      setBodyTemplate(emailSettings.bodyTemplate);
    }
  }, [emailSettings]);

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await api.updateEmailSettings({
        host,
        port: Number(port),
        secure,
        authUser,
        authPass: authPass || undefined, // only send if non-empty
        senderName,
        senderEmail: senderEmail || authUser,
        batchSize: Number(batchSize),
        throttleDelayMs: Number(throttleDelayMs),
        subjectTemplate,
        bodyTemplate,
      });
      await onRefreshSettings();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      alert(err.message || 'Failed to save SMTP settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestSmtp = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);
      // Auto-save form first if password was typed
      if (authPass) {
        await api.updateEmailSettings({
          host,
          port: Number(port),
          secure,
          authUser,
          authPass,
          senderName,
          senderEmail: senderEmail || authUser,
          batchSize: Number(batchSize),
          throttleDelayMs: Number(throttleDelayMs),
        });
        await onRefreshSettings();
      }
      const res = await api.testSmtpConnection();
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Connection test failed.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPassMessage({ success: false, text: 'New passwords do not match.' });
      return;
    }
    try {
      setIsChangingPass(true);
      setPassMessage(null);
      await api.changePassword(currentPassword, newPassword);
      setPassMessage({ success: true, text: 'Admin password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPassMessage({ success: false, text: err.message || 'Failed to update password.' });
    } finally {
      setIsChangingPass(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System & SMTP Configuration</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Configure server-side email dispatching, rate throttling, templates, and administrative security.
        </p>
      </div>

      {/* SMTP Configuration Card */}
      <div className="bg-white p-6 rounded border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2.5">
            <Mail className="w-5 h-5 text-blue-900" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Gmail & SMTP Mail Server</h2>
              <p className="text-[11px] text-slate-500">
                Credentials are kept strictly server-side and never exposed to the frontend.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTestSmtp}
            disabled={isTesting}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            <span>{isTesting ? 'Verifying...' : 'Test Connection'}</span>
          </button>
        </div>

        {testResult && (
          <div
            className={`p-3 text-xs rounded border ${
              testResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {testResult.message}
          </div>
        )}

        <div className="bg-slate-50 p-4 rounded border border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">Quick Presets:</span>
            <button
              type="button"
              onClick={() => {
                setHost('smtp.gmail.com');
                setPort(465);
                setSecure(true);
                if (!authUser) setAuthUser('contact.prashantcreator@gmail.com');
                if (!senderEmail) setSenderEmail('contact.prashantcreator@gmail.com');
              }}
              className="px-2.5 py-1 text-xs font-semibold text-blue-900 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 flex items-center gap-1"
            >
              <span>Google / Gmail (Port 465 SSL)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setHost('smtp.office365.com');
                setPort(587);
                setSecure(false);
              }}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100"
            >
              Office 365
            </button>
          </div>

          <button
            type="button"
            onClick={async () => {
              try {
                setIsTesting(true);
                setTestResult(null);
                const res = await api.provisionTestAccount();
                await onRefreshSettings();
                setTestResult({
                  success: true,
                  message: `Configured real test SMTP server! Username: ${res.user}`,
                });
              } catch (err: any) {
                setTestResult({
                  success: false,
                  message: err.message || 'Failed to setup test account.',
                });
              } finally {
                setIsTesting(false);
              }
            }}
            disabled={isTesting}
            className="px-3 py-1.5 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded transition-colors shadow-xs"
          >
            {isTesting ? 'Configuring...' : '1-Click Free Real Test SMTP Inbox'}
          </button>
        </div>

        <form onSubmit={handleSaveSmtp} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-slate-700 font-medium mb-1">SMTP Host</label>
              <input
                type="text"
                required
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="smtp.gmail.com"
                className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Port</label>
              <input
                type="number"
                required
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                placeholder="465"
                className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Gmail / Username</label>
              <input
                type="text"
                required
                value={authUser}
                onChange={(e) => setAuthUser(e.target.value)}
                placeholder="office@gmail.com"
                className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Google 16-Char App Password
                {emailSettings?.isConfigured && (
                  <span className="text-[11px] text-emerald-600 font-normal ml-2">✓ Stored securely on server</span>
                )}
              </label>
              <input
                type="password"
                value={authPass}
                onChange={(e) => setAuthPass(e.target.value)}
                placeholder={emailSettings?.isConfigured ? '•••••••••••••••• (Leave blank to keep existing)' : 'Enter 16-char app password'}
                className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Sender Display Name</label>
              <input
                type="text"
                required
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Mount Learner Academy Certifications Office"
                className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Reply-To / Sender Email</label>
              <input
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="certifications@mountlearner.edu"
                className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Rate throttling and sub-batching */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Sub-Batch Size (<span className="font-mono font-bold">{batchSize}</span> emails / batch)
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value))}
                className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:outline-none font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Recommended 20-25 to stay within provider quota bounds.
              </p>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Inter-Batch Delay (<span className="font-mono font-bold">{throttleDelayMs}ms</span>)
              </label>
              <input
                type="number"
                min={500}
                max={10000}
                step={500}
                value={throttleDelayMs}
                onChange={(e) => setThrottleDelayMs(Number(e.target.value))}
                className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:outline-none font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Pause interval between sub-batches to prevent rate limit triggers.
              </p>
            </div>
          </div>

          {/* Email Subject & Body Customization */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Email Subject Template</label>
              <input
                type="text"
                required
                value={subjectTemplate}
                onChange={(e) => setSubjectTemplate(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Email Body Template</label>
              <textarea
                rows={7}
                required
                value={bodyTemplate}
                onChange={(e) => setBodyTemplate(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:outline-none font-sans text-xs"
              />
              <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap gap-2">
                <span className="font-semibold text-slate-700">Supported Placeholders:</span>
                <code>{`{{name}}`}</code>
                <code>{`{{class}}`}</code>
                <code>{`{{section}}`}</code>
                <code>{`{{project}}`}</code>
                <code>{`{{competition}}`}</code>
                <code>{`{{certificateId}}`}</code>
                <code>{`{{date}}`}</code>
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-blue-900 text-white font-semibold text-xs rounded hover:bg-blue-800 transition-colors shadow-xs"
            >
              {saveSuccess ? 'Settings Saved!' : isSaving ? 'Saving...' : 'Save SMTP Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* Live Test Certificate Delivery Card */}
      <div className="bg-white p-6 rounded border border-blue-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <Send className="w-5 h-5 text-blue-900" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Send Live Test Certificate to Your Inbox</h2>
              <p className="text-[11px] text-slate-500">
                Transmits an official sample certificate PDF attachment over SMTP directly to your personal email.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSendSingleTest} className="flex flex-col sm:flex-row gap-2 max-w-xl">
          <input
            type="email"
            required
            value={testRecipient}
            onChange={(e) => setTestRecipient(e.target.value)}
            placeholder="Enter your Gmail address"
            className="flex-1 p-2 border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
          <button
            type="submit"
            disabled={isSendingSingleTest}
            className="px-4 py-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white font-semibold text-xs rounded flex items-center justify-center gap-1.5 whitespace-nowrap shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSendingSingleTest ? 'Sending Test PDF...' : 'Send Test Certificate PDF'}</span>
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
              <strong>{singleTestResult.success ? '✓ Delivered:' : '✗ Failed:'}</strong> {singleTestResult.message}
            </div>
            {singleTestResult.previewUrl && (
              <a
                href={singleTestResult.previewUrl}
                target="_blank"
                rel="noreferrer"
                className="font-bold underline text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 shrink-0"
              >
                <span>View Web Inbox ↗</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Gmail App Password Setup Instructions (Accordion / Helper Box) */}
      <div className="bg-blue-50/70 p-5 rounded border border-blue-200 text-xs text-blue-950 space-y-3">
        <div className="flex items-center gap-2 font-bold text-sm text-blue-900">
          <HelpCircle className="w-4 h-4" />
          <span>How to Generate a Google App Password for Gmail SMTP</span>
        </div>
        <p className="leading-relaxed">
          Google accounts require an <strong>App Password</strong> rather than your standard account password when authenticating SMTP servers:
        </p>
        <ol className="list-decimal list-inside space-y-1.5 pl-2 text-blue-900 leading-normal">
          <li>
            Visit your Google Account at <span className="font-mono underline">myaccount.google.com/security</span>
          </li>
          <li>Ensure <strong>2-Step Verification</strong> is switched ON</li>
          <li>Search for or navigate to <strong>App Passwords</strong> in the security search bar</li>
          <li>Name the application <code>Mount Learner Academy</code> and click <strong>Create</strong></li>
          <li>Copy the 16-character code (e.g. <code>abcd efgh ijkl mnop</code>) and paste it into the password field above</li>
        </ol>
      </div>

      {/* Admin Security & Password Change */}
      <div className="bg-white p-6 rounded border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
          <Lock className="w-5 h-5 text-slate-700" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">Administrator Credentials</h2>
            <p className="text-[11px] text-slate-500">
              Active account: <span className="font-mono font-medium">{currentUser?.email}</span>
            </p>
          </div>
        </div>

        {passMessage && (
          <div
            className={`p-3 text-xs rounded border ${
              passMessage.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {passMessage.text}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-3 text-xs max-w-md">
          <div>
            <label className="block text-slate-700 font-medium mb-1">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">New Password (min 6 characters)</label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Confirm New Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isChangingPass}
              className="px-4 py-2 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800"
            >
              {isChangingPass ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
