import React, { useState } from 'react';
import { Batch, Student, CertificateTemplate } from '../types.ts';
import { api } from '../services/api.ts';
import {
  Download,
  Archive,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  Search,
  FileDown,
  Layers,
  Sparkles,
} from 'lucide-react';

interface GeneratorViewProps {
  batches: Batch[];
  selectedBatchId: string;
  onSelectBatchId: (id: string) => void;
  students: Student[];
  templates: CertificateTemplate[];
  onRefreshData: () => Promise<void>;
  onNavigateToEmail: (batchId: string) => void;
}

export const GeneratorView: React.FC<GeneratorViewProps> = ({
  batches,
  selectedBatchId,
  onSelectBatchId,
  students,
  templates,
  onRefreshData,
  onNavigateToEmail,
}) => {
  const currentBatch = batches.find((b) => b.id === selectedBatchId) || batches[0];
  const batchStudents = students.filter((s) => s.batchId === currentBatch?.id);

  const [selectedTemplateId, setSelectedTemplateId] = useState(
    currentBatch?.templateId || templates[0]?.id || 'tmpl-classic-blue'
  );
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [singleDownloadId, setSingleDownloadId] = useState<string | null>(null);
  const [isExportingReport, setIsExportingReport] = useState(false);

  const filteredStudents = batchStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.certificateId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Trigger bulk ZIP generation
  const handleBulkZipDownload = async () => {
    if (!currentBatch || batchStudents.length === 0) return;
    try {
      setIsGeneratingZip(true);
      setDownloadProgress({ current: 0, total: batchStudents.length });
      await api.downloadBatchZip(currentBatch.id, selectedTemplateId, currentBatch.name);
      await onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Bulk ZIP generation failed.');
    } finally {
      setIsGeneratingZip(false);
      setDownloadProgress(null);
    }
  };

  // Trigger individual PDF download
  const handleSingleDownload = async (student: Student) => {
    try {
      setSingleDownloadId(student.id);
      await api.downloadStudentPdf(student.id, selectedTemplateId, student.name, student.certificateId);
      await onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Certificate download failed.');
    } finally {
      setSingleDownloadId(null);
    }
  };

  // Mark all generated
  const handleMarkAllGenerated = async () => {
    if (!currentBatch) return;
    try {
      await api.markBatchGenerated(currentBatch.id);
      await onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to update certificate statuses.');
    }
  };

  // Download Reports
  const handleExportReport = async (format: 'csv' | 'xlsx') => {
    if (!currentBatch) return;
    try {
      setIsExportingReport(true);
      await api.downloadReport(currentBatch.id, format);
    } catch (err: any) {
      alert(err.message || 'Report download failed.');
    } finally {
      setIsExportingReport(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Generation Controller */}
      <div className="bg-white p-6 rounded border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              High-Capacity Bulk Certificate Engine
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Produce separate print-ready PDF credentials for all candidate records in batch{' '}
              <span className="font-semibold text-slate-800">{currentBatch?.name}</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleExportReport('csv')}
              disabled={isExportingReport || batchStudents.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => handleExportReport('xlsx')}
              disabled={isExportingReport || batchStudents.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-700" />
              <span>Export Excel</span>
            </button>

            <button
              onClick={() => onNavigateToEmail(currentBatch?.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
            >
              <span>Email Dispatcher →</span>
            </button>
          </div>
        </div>

        {/* Configuration Bar */}
        <div className="bg-slate-50 p-4 rounded border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-center">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Target Batch
            </label>
            <select
              value={currentBatch?.id}
              onChange={(e) => onSelectBatchId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded text-xs p-2 font-medium"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({students.filter((s) => s.batchId === b.id).length} candidates)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Diploma Template
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded text-xs p-2 font-medium"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleBulkZipDownload}
              disabled={isGeneratingZip || batchStudents.length === 0}
              className="w-full py-2.5 px-4 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white font-bold text-xs rounded transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              {isGeneratingZip ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Packaging {batchStudents.length} Certificates into ZIP...</span>
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4 text-amber-300" />
                  <span>Download Bulk ZIP ({batchStudents.length} Certificates)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Processing State Notice */}
        {isGeneratingZip && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded text-xs text-blue-950 space-y-2">
            <div className="flex items-center justify-between font-semibold">
              <span>Generating High-Resolution PDFs with QR Authenticity Codes...</span>
              <span className="font-mono tabular-nums">{batchStudents.length} / {batchStudents.length} items</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
              <div className="bg-blue-800 h-full w-full animate-pulse" />
            </div>
          </div>
        )}
      </div>

      {/* Candidates List for Individual PDF Downloads */}
      <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Individual PDF Inspection & Downloads
            </h2>
            <p className="text-[11px] text-slate-500">
              Download separate PDF certificates or review student details
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Filter candidates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none"
              />
            </div>
            <button
              onClick={handleMarkAllGenerated}
              className="px-2.5 py-1 text-xs text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100 whitespace-nowrap"
            >
              Mark All Ready
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-2.5 px-4">Certificate ID</th>
                <th className="py-2.5 px-4">Student Name</th>
                <th className="py-2.5 px-4">Class & Sec</th>
                <th className="py-2.5 px-4">Project</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Individual PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.slice(0, 100).map((student) => (
                <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-4 font-mono font-semibold text-slate-800 tabular-nums">
                    {student.certificateId}
                  </td>
                  <td className="py-2.5 px-4 font-medium text-slate-900">{student.name}</td>
                  <td className="py-2.5 px-4 text-slate-600">
                    {student.studentClass} - {student.section}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600 truncate max-w-xs">{student.project}</td>
                  <td className="py-2.5 px-4">
                    {student.status === 'generated' || student.status === 'emailed' ? (
                      <span className="text-emerald-700 font-medium">Ready</span>
                    ) : (
                      <span className="text-slate-400 font-medium">Draft</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      onClick={() => handleSingleDownload(student)}
                      disabled={singleDownloadId === student.id}
                      className="px-2.5 py-1 text-[11px] font-medium text-blue-900 bg-blue-50 hover:bg-blue-100 rounded transition-colors inline-flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>{singleDownloadId === student.id ? 'Generating...' : 'Download PDF'}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredStudents.length > 100 && (
          <div className="p-3 text-center text-xs text-slate-500 bg-slate-50 border-t border-slate-200">
            Showing first 100 candidates of {filteredStudents.length}. Use "Download Bulk ZIP" to download the complete set.
          </div>
        )}
      </div>
    </div>
  );
};
