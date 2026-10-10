import React from 'react';
import {
  LayoutDashboard,
  Users,
  Palette,
  Send,
  Sliders,
  BookOpen,
  ShieldCheck,
  Download,
  X,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenGuide: () => void;
  onOpenVerify: () => void;
  batchCount: number;
  studentCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isMobileOpen,
  onCloseMobile,
  onOpenGuide,
  onOpenVerify,
  batchCount,
  studentCount,
}) => {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Overview',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'batches',
      label: 'Batches & Data',
      icon: Users,
      badge: `${studentCount} Students`,
    },
    {
      id: 'editor',
      label: 'Certificate Designer',
      icon: Palette,
      badge: null,
    },
    {
      id: 'generate',
      label: 'Bulk PDF & ZIP',
      icon: Download,
      badge: 'Batch 100+',
    },
    {
      id: 'email',
      label: 'Email Dispatch',
      icon: Send,
      badge: null,
    },
    {
      id: 'settings',
      label: 'SMTP Settings',
      icon: Sliders,
      badge: null,
    },
  ];

  const content = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Academy Crest / Header inside sidebar */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/src/assets/images/mount_learner_crest_1791599731443.jpg"
            alt="Mount Learner Academy Crest"
            className="w-9 h-9 object-contain rounded-sm"
          />
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">MOUNT LEARNER</h2>
            <p className="text-[11px] text-slate-500 font-medium tracking-wider uppercase">Honours Registry</p>
          </div>
        </div>
        <button
          onClick={onCloseMobile}
          className="md:hidden p-1.5 text-slate-500 hover:text-slate-800"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Certificate Workspace
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-700' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[11px] font-mono tabular-nums text-slate-500">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <div className="pt-4 px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Validation & Docs
        </div>
        <button
          onClick={() => {
            onOpenVerify();
            onCloseMobile();
          }}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded transition-colors"
        >
          <ShieldCheck className="w-4 h-4 text-slate-400" />
          <span>Verify Credential</span>
        </button>
        <button
          onClick={() => {
            onOpenGuide();
            onCloseMobile();
          }}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded transition-colors"
        >
          <BookOpen className="w-4 h-4 text-slate-400" />
          <span>Setup & Deploy Guide</span>
        </button>
      </nav>

      {/* Academy Motto Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="text-[11px] text-slate-500 leading-tight">
          <p className="font-semibold text-slate-700">Mount Learner Academy</p>
          <p className="italic text-slate-400 mt-0.5">Ad Scientiam Et Veritatem</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (visible on md and up) */}
      <aside className="hidden md:block w-64 shrink-0 fixed inset-y-0 left-0 pt-16 z-20">
        {content}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onCloseMobile} />
          <div className="fixed inset-y-0 left-0 w-72 max-w-[80vw] bg-white shadow-xl z-50">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
