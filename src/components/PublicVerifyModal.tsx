import React, { useState } from 'react';
import { api } from '../services/api.ts';
import { ShieldCheck, Search, Award, CheckCircle2, XCircle } from 'lucide-react';

interface PublicVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCertId?: string;
}

export const PublicVerifyModal: React.FC<PublicVerifyModalProps> = ({
  isOpen,
  onClose,
  initialCertId = 'MLA-2026-STEM-0001',
}) => {
  const [certId, setCertId] = useState(initialCertId);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  if (!isOpen) return null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certId.trim()) return;
    try {
      setIsVerifying(true);
      setHasSearched(true);
      const res = await api.verifyCertificate(certId.trim());
      setVerifyResult(res);
    } catch {
      setVerifyResult({ valid: false, message: 'Verification lookup failed.' });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full overflow-hidden border border-slate-200 text-xs">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-900" />
            <h3 className="font-bold text-slate-900 text-sm">Certificate Authenticity Verification</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-slate-600">
            Enter any unique Certificate ID issued by Mount Learner Academy to verify its cryptographic validity:
          </p>

          <form onSubmit={handleVerify} className="flex gap-2">
            <input
              type="text"
              required
              placeholder="e.g. MLA-2026-STEM-0001"
              value={certId}
              onChange={(e) => setCertId(e.target.value)}
              className="flex-1 p-2 border border-slate-300 rounded font-mono uppercase focus:ring-1 focus:ring-blue-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isVerifying}
              className="px-4 py-2 bg-blue-900 text-white font-semibold rounded hover:bg-blue-800 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{isVerifying ? 'Checking...' : 'Verify'}</span>
            </button>
          </form>

          {hasSearched && verifyResult && (
            <div className="pt-2">
              {verifyResult.valid ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded p-4 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Official Credential Verified</span>
                  </div>
                  <div className="space-y-1 text-slate-700 pt-2 border-t border-emerald-200/60">
                    <div>
                      <span className="font-semibold">Candidate:</span> {verifyResult.studentName}
                    </div>
                    <div>
                      <span className="font-semibold">Class / Sec:</span> {verifyResult.studentClass} - {verifyResult.section}
                    </div>
                    <div>
                      <span className="font-semibold">Project:</span> {verifyResult.project}
                    </div>
                    <div>
                      <span className="font-semibold">Event:</span> {verifyResult.competition}
                    </div>
                    <div>
                      <span className="font-semibold">Issuer:</span> {verifyResult.institution}
                    </div>
                    <div>
                      <span className="font-semibold">Session:</span> {verifyResult.academicYear}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded p-4 space-y-1">
                  <div className="flex items-center gap-2 text-red-900 font-bold">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span>Unverified Credential</span>
                  </div>
                  <p className="text-red-700">{verifyResult.message}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-slate-100 bg-slate-50 text-right">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
