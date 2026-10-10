import React from 'react';
import { Award, LogOut, Menu, X, ShieldCheck, HelpCircle } from 'lucide-react';
import { AdminUser } from '../types.ts';

interface NavbarProps {
  user: AdminUser | null;
  onLogout: () => void;
  onOpenGuide: () => void;
  onOpenVerify: () => void;
  onToggleMobileMenu: () => void;
  isMobileMenuOpen: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  onOpenGuide,
  onOpenVerify,
  onToggleMobileMenu,
  isMobileMenuOpen,
  activeTab,
  setActiveTab,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-8">
          {/* Zone 1: Brand wordmark (single clean element) */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onToggleMobileMenu}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <a
              href="#dashboard"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('dashboard');
              }}
              className="flex items-center gap-2.5 text-slate-900 font-bold tracking-tight text-lg whitespace-nowrap shrink-0 hover:text-blue-900 transition-colors"
            >
              <div className="w-8 h-8 rounded bg-blue-900 flex items-center justify-center text-white shadow-xs">
                <Award className="w-5 h-5 text-amber-300" />
              </div>
              <span>Mount Learner Academy</span>
            </a>
          </div>

          {/* Zone 2: Navigation Links (single line, clean typography) */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`hover:text-blue-900 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'dashboard' ? 'text-blue-900 font-semibold' : ''
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('batches')}
              className={`hover:text-blue-900 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'batches' ? 'text-blue-900 font-semibold' : ''
              }`}
            >
              Batches & Data
            </button>
            <button
              onClick={() => setActiveTab('editor')}
              className={`hover:text-blue-900 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'editor' ? 'text-blue-900 font-semibold' : ''
              }`}
            >
              Certificate Designer
            </button>
            <button
              onClick={() => setActiveTab('email')}
              className={`hover:text-blue-900 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'email' ? 'text-blue-900 font-semibold' : ''
              }`}
            >
              Email Dispatch
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`hover:text-blue-900 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'settings' ? 'text-blue-900 font-semibold' : ''
              }`}
            >
              SMTP Settings
            </button>
          </nav>

          {/* Zone 3: Primary Actions & Admin Profile */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onOpenVerify}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors whitespace-nowrap shrink-0"
              title="Verify a Certificate ID"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
              <span>Verify Credential</span>
            </button>

            <button
              onClick={onOpenGuide}
              className="p-1.5 text-slate-500 hover:text-slate-900 transition-colors"
              title="Deployment & Setup Guide"
            >
              <HelpCircle className="w-5 h-5" />
            </button>

            {user && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <span className="hidden lg:inline text-xs font-medium text-slate-600 truncate max-w-[160px]">
                  {user.name.split(' ')[0]}
                </span>
                <button
                  onClick={onLogout}
                  className="p-1.5 text-slate-500 hover:text-red-700 rounded transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
