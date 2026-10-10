import React from 'react';
import { BookOpen, Check, Copy, ExternalLink, Terminal, Shield } from 'lucide-react';

interface DeploymentGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeploymentGuideModal: React.FC<DeploymentGuideModalProps> = ({ isOpen, onClose }) => {
  const [copiedSnippet, setCopiedSnippet] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-blue-900" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Installation & Deployment Guide</h2>
              <p className="text-[11px] text-slate-500">Mount Learner Academy Enterprise Bulk Certificate System</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg">
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
          {/* Section 1: Quick Start */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-blue-700" />
              <span>1. Local Development Setup</span>
            </h3>
            <p className="text-slate-600 leading-relaxed">
              Clone repository, install dependencies, and run the unified full-stack server (Node.js 18+ or 20+ required):
            </p>
            <div className="bg-slate-900 text-slate-100 p-3 rounded font-mono text-[11px] relative">
              <pre>{`git clone <repository_url>
cd mount-learner-academy-certs
npm install
npm run dev`}</pre>
              <button
                onClick={() => copyToClipboard(`git clone <repository_url>\ncd mount-learner-academy-certs\nnpm install\nnpm run dev`, 'dev')}
                className="absolute right-2 top-2 p-1 text-slate-400 hover:text-white"
              >
                {copiedSnippet === 'dev' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Section 2: Environment Variables */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-700" />
              <span>2. Environment Variables (.env)</span>
            </h3>
            <p className="text-slate-600 leading-relaxed">
              SMTP secrets can be configured via <code>.env</code> on the server or configured via the in-app SMTP Settings panel:
            </p>
            <div className="bg-slate-900 text-slate-100 p-3 rounded font-mono text-[11px] relative">
              <pre>{`PORT=3000
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=office@mountlearner.edu
SMTP_PASS=your-16-char-google-app-password
SMTP_FROM=certifications@mountlearner.edu`}</pre>
              <button
                onClick={() => copyToClipboard(`PORT=3000\nSMTP_HOST=smtp.gmail.com\nSMTP_PORT=465\nSMTP_USER=office@mountlearner.edu\nSMTP_PASS=your-16-char-google-app-password\nSMTP_FROM=certifications@mountlearner.edu`, 'env')}
                className="absolute right-2 top-2 p-1 text-slate-400 hover:text-white"
              >
                {copiedSnippet === 'env' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Section 3: Production Build & Deployment */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900">3. Production Build & Execution</h3>
            <p className="text-slate-600 leading-relaxed">
              To build optimized static bundles and run production Express:
            </p>
            <div className="bg-slate-900 text-slate-100 p-3 rounded font-mono text-[11px] relative">
              <pre>{`npm run build
npm start`}</pre>
              <button
                onClick={() => copyToClipboard(`npm run build\nnpm start`, 'prod')}
                className="absolute right-2 top-2 p-1 text-slate-400 hover:text-white"
              >
                {copiedSnippet === 'prod' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Section 4: Architecture Highlights */}
          <div className="space-y-2 bg-slate-50 p-4 rounded border border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Architecture & Security Features
            </h3>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li><strong>Zero Secrets in Client:</strong> SMTP passwords never leak to client code.</li>
              <li><strong>Persistent Storage:</strong> SQLite/JSON database automatically saves to <code>data/mount_learner.db.json</code>.</li>
              <li><strong>Duplicate Prevention:</strong> Tracks email delivery state per candidate to avoid duplicate sends.</li>
              <li><strong>High-Speed Vector PDF:</strong> Generated on-the-fly via <code>pdf-lib</code> with embedded verification QR code.</li>
              <li><strong>Responsive on Android:</strong> Optimized for tablets and mobile touch screens with touch drag handles.</li>
            </ul>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-900 text-white font-semibold rounded hover:bg-blue-800"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
