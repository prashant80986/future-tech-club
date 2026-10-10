import React from 'react';
import { Batch, Student, EmailSettings } from '../types.ts';
import {
  Users,
  Award,
  Send,
  Layers,
  FileSpreadsheet,
  Download,
  Settings,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface DashboardOverviewProps {
  batches: Batch[];
  students: Student[];
  emailSettings: EmailSettings | null;
  onNavigate: (tab: string) => void;
  onSelectBatch: (batchId: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  batches,
  students,
  emailSettings,
  onNavigate,
  onSelectBatch,
}) => {
  const totalStudents = students.length;
  const generatedCount = students.filter((s) => s.status === 'generated' || s.status === 'emailed').length;
  const emailedCount = students.filter((s) => s.emailStatus === 'sent').length;
  const pendingCount = totalStudents - emailedCount;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Title & Introduction */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-sans">
          Certificate Operations Console
        </h1>
        <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
          <span>Mount Learner Academy</span>
          <span aria-hidden="true">·</span>
          <span>Academic Honours & Credential Registry</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">{new Date().getFullYear()} Session</span>
        </div>
      </div>

      {/* Primary KPI Grid (High density, tabular figures, no pill enclosures) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Active Batches</span>
            <Layers className="w-4 h-4 text-blue-700" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono tabular-nums">
            {batches.length}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Across STEM, Arts & Olympiads
          </div>
        </div>

        <div className="bg-white p-5 rounded border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Enrolled Candidates</span>
            <Users className="w-4 h-4 text-blue-700" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono tabular-nums">
            {totalStudents}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Ready for bulk generation
          </div>
        </div>

        <div className="bg-white p-5 rounded border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Certificates Ready</span>
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono tabular-nums">
            {generatedCount}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {totalStudents > 0 ? `${Math.round((generatedCount / totalStudents) * 100)}% rendered` : '0%'}
          </div>
        </div>

        <div className="bg-white p-5 rounded border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Dispatched via Email</span>
            <Send className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono tabular-nums">
            {emailedCount}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {totalStudents > 0 ? `${Math.round((emailedCount / totalStudents) * 100)}% delivered` : '0%'}
          </div>
        </div>
      </div>

      {/* Quick Launch Action Ribbon */}
      <div className="bg-blue-900 text-white rounded p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Fast-Track Batch Workflows</h2>
            <p className="text-xs sm:text-sm text-blue-200 mt-0.5">
              Mount Learner Academy supports one-click ingestion, visual canvas design, and bulk ZIP exports for batches of 100+ candidates.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('batches')}
              className="px-4 py-2 bg-white text-blue-950 font-semibold text-xs rounded hover:bg-blue-50 transition-colors whitespace-nowrap shadow-xs"
            >
              Bulk Data Import (CSV/Excel)
            </button>
            <button
              onClick={() => onNavigate('generate')}
              className="px-4 py-2 bg-blue-800 text-white font-semibold text-xs rounded hover:bg-blue-700 transition-colors border border-blue-600 whitespace-nowrap shadow-xs"
            >
              Export Bulk ZIP Archive
            </button>
          </div>
        </div>
      </div>

      {/* Batches Table & System Status Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Batches Overview Table (2 cols on desktop) */}
        <div className="lg:col-span-2 bg-white rounded border border-slate-200 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Academic Batches</h2>
              <p className="text-xs text-slate-500 mt-0.5">Select a batch to inspect students or trigger bulk export</p>
            </div>
            <button
              onClick={() => onNavigate('batches')}
              className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1"
            >
              <span>Manage All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 overflow-x-auto">
            {batches.map((batch) => {
              const batchStudents = students.filter((s) => s.batchId === batch.id);
              const bTotal = batchStudents.length;
              const bSent = batchStudents.filter((s) => s.emailStatus === 'sent').length;

              return (
                <div
                  key={batch.id}
                  className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-slate-900 text-sm">{batch.name}</div>
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                      <span>{batch.competition}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{bTotal} candidates</span>
                      <span aria-hidden="true">·</span>
                      <span>Year {batch.academicYear}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right text-xs">
                      <div className="font-mono tabular-nums font-semibold text-slate-700">
                        {bSent}/{bTotal} Emailed
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        {bTotal > 0 ? `${Math.round((bSent / bTotal) * 100)}% completed` : '0%'}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        onSelectBatch(batch.id);
                        onNavigate('batches');
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                    >
                      Open
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* System & Delivery Readiness Status */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded border border-slate-200">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
              Infrastructure Status
            </h2>
            <div className="space-y-3.5 text-xs">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-800">Persistent Academy DB</div>
                  <div className="text-slate-500 text-[11px]">Active with atomic storage & automated JSON persistence</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-800">Vector & PDF Engine</div>
                  <div className="text-slate-500 text-[11px]">pdf-lib & QR verification engine initialized</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                {emailSettings?.isConfigured ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold text-slate-800">
                    {emailSettings?.isConfigured ? 'SMTP Mailer Configured' : 'SMTP Credentials Needed'}
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    {emailSettings?.isConfigured
                      ? `Connected to ${emailSettings.host} (${emailSettings.senderEmail})`
                      : 'Configure your Gmail App Password to enable automated email delivery'}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100">
              <button
                onClick={() => onNavigate('settings')}
                className="w-full py-2 px-3 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors text-center"
              >
                Configure SMTP Settings
              </button>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded border border-slate-200 text-xs text-slate-600">
            <div className="font-semibold text-slate-800 mb-1">Duplicate Send Protection</div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Automated safeguards prevent duplicate certificates from being dispatched to the same candidate twice. You can override this per student or per batch anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
