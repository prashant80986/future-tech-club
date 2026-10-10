import React, { useState } from 'react';
import { api } from '../services/api.js';
import { AdminUser } from '../types.js';
import { Award, Lock, Mail, ArrowRight, Sparkles } from 'lucide-react';

interface LoginModalProps {
  onLoginSuccess: (user: AdminUser) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('admin@mountlearner.edu');
  const [password, setPassword] = useState('Admin@MLA2026');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await api.login(email, password);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('admin@mountlearner.edu');
    setPassword('Admin@MLA2026');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        {/* Academic Header Banner */}
        <div className="bg-blue-900 text-white p-6 text-center space-y-2">
          <img
            src="/src/assets/images/mount_learner_crest_1791599731443.jpg"
            alt="Mount Learner Academy Crest"
            className="w-16 h-16 mx-auto object-contain drop-shadow-md rounded"
          />
          <h1 className="text-xl font-bold tracking-tight">Mount Learner Academy</h1>
          <p className="text-xs text-blue-200 uppercase tracking-wider font-medium">
            Administrative Honours & Certificate Portal
          </p>
        </div>

        {/* Login Form */}
        <div className="p-6 space-y-5 text-xs">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Academy Admin Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@mountlearner.edu"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Administrative Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white font-bold rounded transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <span>{isLoading ? 'Authenticating...' : 'Sign In to Honours Console'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Credentials Assistant */}
          <div className="pt-3 border-t border-slate-100 bg-slate-50 p-3 rounded text-[11px] text-slate-600 flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-800">Default Credentials:</span>
              <div>admin@mountlearner.edu / Admin@MLA2026</div>
            </div>
            <button
              type="button"
              onClick={handleFillDemo}
              className="px-2.5 py-1 bg-white border border-slate-200 text-blue-900 font-semibold rounded hover:bg-slate-100 flex items-center gap-1 shrink-0"
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Fill</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
