import React, { useState, useEffect } from 'react';
import { api, getAuthToken, clearAuthSession } from './services/api.ts';
import {
  AdminUser,
  Batch,
  Student,
  CertificateTemplate,
  EmailSettings,
} from './types.ts';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { DashboardOverview } from './components/DashboardOverview.tsx';
import { BatchManager } from './components/BatchManager.tsx';
import { CertificateEditor } from './components/CertificateEditor.tsx';
import { GeneratorView } from './components/GeneratorView.tsx';
import { EmailDispatchView } from './components/EmailDispatchView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { DeploymentGuideModal } from './components/DeploymentGuideModal.tsx';
import { PublicVerifyModal } from './components/PublicVerifyModal.tsx';
import { LoginModal } from './components/LoginModal.tsx';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // App navigation
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Core Data
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [emailSettings, setEmailSettings] = useState<EmailSettings | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<CertificateTemplate | null>(null);

  // Global Modals
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);

  // Fetch initial profile
  const checkAuth = async () => {
    const token = getAuthToken();
    const explicitlySignedOut = sessionStorage.getItem('mla_signed_out') === 'true';

    if (!token && !explicitlySignedOut) {
      try {
        const loginRes = await api.login('admin@mountlearner.edu', 'Admin@MLA2026');
        setCurrentUser(loginRes.user);
        await loadAllAppData();
        setIsInitializing(false);
        return;
      } catch {
        // Fall back to showing login modal if credentials changed
      }
    }

    if (!token) {
      setIsInitializing(false);
      return;
    }

    try {
      const data = await api.getMe();
      setCurrentUser(data.user);
      await loadAllAppData();
    } catch {
      clearAuthSession();
      setCurrentUser(null);
    } finally {
      setIsInitializing(false);
    }
  };

  // Load all app resources
  const loadAllAppData = async () => {
    try {
      const [batchesRes, studentsRes, templatesRes, emailRes] = await Promise.all([
        api.getBatches(),
        api.getStudents(),
        api.getTemplates(),
        api.getEmailSettings().catch(() => ({ settings: null as any })),
      ]);

      setBatches(batchesRes.batches);
      setStudents(studentsRes.students);
      setTemplates(templatesRes.templates);
      if (emailRes?.settings) {
        setEmailSettings(emailRes.settings);
      }

      // Default selected batch
      if (batchesRes.batches.length > 0 && !selectedBatchId) {
        setSelectedBatchId(batchesRes.batches[0].id);
      }

      // Default selected template
      if (templatesRes.templates.length > 0 && !selectedTemplate) {
        const def = templatesRes.templates.find((t) => t.isDefault) || templatesRes.templates[0];
        setSelectedTemplate(def);
      }
    } catch (err) {
      console.error('Failed to load application data:', err);
    }
  };

  useEffect(() => {
    checkAuth();

    const handleAuthExpired = () => {
      setCurrentUser(null);
    };
    window.addEventListener('mla_auth_expired', handleAuthExpired);
    return () => window.removeEventListener('mla_auth_expired', handleAuthExpired);
  }, []);

  const handleLogout = async () => {
    sessionStorage.setItem('mla_signed_out', 'true');
    await api.logout();
    setCurrentUser(null);
  };

  const handleLoginSuccess = async (user: AdminUser) => {
    sessionStorage.removeItem('mla_signed_out');
    setCurrentUser(user);
    await loadAllAppData();
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-blue-900 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-700">Mount Learner Academy</p>
        <p className="text-xs text-slate-400">Loading Honours Portal...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased text-slate-900">
      {/* Login Screen if unauthorized */}
      {!currentUser && <LoginModal onLoginSuccess={handleLoginSuccess} />}

      {/* Global Top Navbar */}
      <Navbar
        user={currentUser}
        onLogout={handleLogout}
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenVerify={() => setIsVerifyOpen(true)}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <div className="flex-1 flex w-full">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          onOpenGuide={() => setIsGuideOpen(true)}
          onOpenVerify={() => setIsVerifyOpen(true)}
          batchCount={batches.length}
          studentCount={students.length}
        />

        {/* Main Content Area */}
        <main className="flex-1 md:pl-64 p-4 sm:p-6 lg:p-8 overflow-x-hidden min-h-[calc(100vh-4rem)]">
          {activeTab === 'dashboard' && (
            <DashboardOverview
              batches={batches}
              students={students}
              emailSettings={emailSettings}
              onNavigate={setActiveTab}
              onSelectBatch={(id) => {
                setSelectedBatchId(id);
                setActiveTab('batches');
              }}
            />
          )}

          {activeTab === 'batches' && (
            <BatchManager
              batches={batches}
              selectedBatchId={selectedBatchId}
              onSelectBatchId={setSelectedBatchId}
              students={students}
              templates={templates}
              onRefreshData={loadAllAppData}
              onNavigateToGenerator={(batchId) => {
                setSelectedBatchId(batchId);
                setActiveTab('generate');
              }}
              onNavigateToEmail={(batchId) => {
                setSelectedBatchId(batchId);
                setActiveTab('email');
              }}
            />
          )}

          {activeTab === 'editor' && selectedTemplate && (
            <CertificateEditor
              templates={templates}
              selectedTemplate={selectedTemplate}
              onSelectTemplate={setSelectedTemplate}
              students={students.filter((s) => s.batchId === selectedBatchId)}
              onRefreshTemplates={loadAllAppData}
            />
          )}

          {activeTab === 'generate' && (
            <GeneratorView
              batches={batches}
              selectedBatchId={selectedBatchId}
              onSelectBatchId={setSelectedBatchId}
              students={students}
              templates={templates}
              onRefreshData={loadAllAppData}
              onNavigateToEmail={(batchId) => {
                setSelectedBatchId(batchId);
                setActiveTab('email');
              }}
            />
          )}

          {activeTab === 'email' && (
            <EmailDispatchView
              batches={batches}
              selectedBatchId={selectedBatchId}
              onSelectBatchId={setSelectedBatchId}
              students={students}
              templates={templates}
              emailSettings={emailSettings}
              onRefreshData={loadAllAppData}
              onNavigateToSettings={() => setActiveTab('settings')}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              emailSettings={emailSettings}
              onRefreshSettings={loadAllAppData}
              currentUser={currentUser}
            />
          )}
        </main>
      </div>

      {/* Deployment & Setup Guide Modal */}
      <DeploymentGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />

      {/* Public Credential Verification Modal */}
      <PublicVerifyModal isOpen={isVerifyOpen} onClose={() => setIsVerifyOpen(false)} />
    </div>
  );
}
