import React, { useState, useId } from 'react';
import {
  Batch,
  Student,
  CertificateTemplate,
} from '../types.ts';
import { api } from '../services/api.ts';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Plus,
  Trash2,
  Download,
  Search,
  CheckCircle,
  AlertTriangle,
  Send,
  Eye,
  RefreshCw,
  FolderPlus,
  Sparkles,
} from 'lucide-react';

interface BatchManagerProps {
  batches: Batch[];
  selectedBatchId: string;
  onSelectBatchId: (id: string) => void;
  students: Student[];
  templates: CertificateTemplate[];
  onRefreshData: () => Promise<void>;
  onNavigateToGenerator: (batchId: string) => void;
  onNavigateToEmail: (batchId: string) => void;
}

export const BatchManager: React.FC<BatchManagerProps> = ({
  batches,
  selectedBatchId,
  onSelectBatchId,
  students,
  templates,
  onRefreshData,
  onNavigateToGenerator,
  onNavigateToEmail,
}) => {
  const currentBatch = batches.find((b) => b.id === selectedBatchId) || batches[0];
  const currentBatchStudents = students.filter((s) => s.batchId === currentBatch?.id);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal states
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCreateBatchModal, setShowCreateBatchModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);

  // Ingestion modal sub-tabs: 'upload' | 'paste' | 'preset'
  const [importTab, setImportTab] = useState<'upload' | 'paste' | 'preset'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedPreview, setParsedPreview] = useState<any | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // New Batch Form state
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchYear, setNewBatchYear] = useState('2025-2026');
  const [newBatchCompetition, setNewBatchCompetition] = useState('');
  const [newBatchTemplateId, setNewBatchTemplateId] = useState('tmpl-classic-blue');

  // Add Single Student Form state
  const [singleStudent, setSingleStudent] = useState({
    name: '',
    studentClass: 'Grade 10',
    section: 'A',
    project: '',
    competition: currentBatch?.competition || '',
    email: '',
    certificateId: '',
  });

  // Action loading states
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isExportingReport, setIsExportingReport] = useState(false);

  // Unique classes in current batch for filter
  const uniqueClasses = Array.from(new Set(currentBatchStudents.map((s) => s.studentClass))).filter(Boolean);

  // Filtered student list
  const filteredStudents = currentBatchStudents.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.project.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.certificateId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesClass = selectedClass === 'ALL' || s.studentClass === selectedClass;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'draft' && s.status === 'draft') ||
      (statusFilter === 'generated' && s.status === 'generated') ||
      (statusFilter === 'sent' && s.emailStatus === 'sent') ||
      (statusFilter === 'failed' && s.emailStatus === 'failed');

    return matchesSearch && matchesClass && matchesStatus;
  });

  // Handle file select
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setIsParsing(true);
    setImportError(null);

    try {
      const result = await api.uploadFile(file, currentBatch?.competition);
      setParsedPreview(result);
    } catch (err: any) {
      setImportError(err.message || 'Failed to parse file.');
    } finally {
      setIsParsing(false);
    }
  };

  // Handle pasted text parse
  const handleParsePasted = async () => {
    if (!pastedText.trim()) return;
    setIsParsing(true);
    setImportError(null);

    try {
      const result = await api.parsePastedText(pastedText, currentBatch?.competition);
      setParsedPreview(result);
    } catch (err: any) {
      setImportError(err.message || 'Failed to parse text.');
    } finally {
      setIsParsing(false);
    }
  };

  // Commit imported rows
  const handleCommitImport = async () => {
    if (!parsedPreview || !parsedPreview.students?.length || !currentBatch) return;
    setIsImporting(true);
    setImportError(null);

    try {
      const validOnly = parsedPreview.students.filter((s: any) => s.isValid);
      await api.addStudentsBulk(currentBatch.id, validOnly);
      await onRefreshData();
      setShowImportModal(false);
      setParsedPreview(null);
      setPastedText('');
      setSelectedFile(null);
    } catch (err: any) {
      setImportError(err.message || 'Failed to import students.');
    } finally {
      setIsImporting(false);
    }
  };

  // Quick preset: Load 120 STEM students directly
  const handleLoadDemoPreset = async () => {
    if (!currentBatch) return;
    setIsImporting(true);
    try {
      const sampleNames = [
        ['Rohan', 'Verma', 'Grade 10', 'A', 'Robotic Vision Navigation', 'rohan.verma@student.mountlearner.edu'],
        ['Ananya', 'Deshmukh', 'Grade 11', 'B', 'Algae Biofuel Catalysis', 'ananya.deshmukh@student.mountlearner.edu'],
        ['Dev', 'Chopra', 'Grade 9', 'C', 'Solar Tracking Heliostat', 'dev.chopra@student.mountlearner.edu'],
        ['Ishaan', 'Malhotra', 'Grade 12', 'A', 'Quantum Simulator in Python', 'ishaan.malhotra@student.mountlearner.edu'],
        ['Sanya', 'Bansal', 'Grade 10', 'B', 'Smart Irrigation Soil Sensor', 'sanya.bansal@student.mountlearner.edu'],
        ['Kabir', 'Sethi', 'Grade 11', 'A', 'Aero-Foil Drag Optimization', 'kabir.sethi@student.mountlearner.edu'],
        ['Diya', 'Nambiar', 'Grade 12', 'C', 'Deep Learning Skin Lesion Classifier', 'diya.nambiar@student.mountlearner.edu'],
        ['Vihaan', 'Kashyap', 'Grade 9', 'B', 'Atmospheric Water Generator', 'vihaan.kashyap@student.mountlearner.edu'],
      ];

      const generatedList: any[] = [];
      for (let i = 1; i <= 100; i++) {
        const item = sampleNames[i % sampleNames.length];
        const num = String(i).padStart(3, '0');
        generatedList.push({
          name: `${item[0]} ${item[1]} ${num}`,
          studentClass: item[2],
          section: item[3],
          project: `${item[4]} - Phase ${num}`,
          competition: currentBatch.competition,
          email: `${item[0].toLowerCase()}.${item[1].toLowerCase()}${num}@student.mountlearner.edu`,
          certificateId: `MLA-2026-STEM-${String(i + 200).padStart(4, '0')}`,
        });
      }

      await api.addStudentsBulk(currentBatch.id, generatedList);
      await onRefreshData();
      setShowImportModal(false);
    } catch (err: any) {
      setImportError(err.message || 'Failed to load demo students.');
    } finally {
      setIsImporting(false);
    }
  };

  // Create Batch
  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchName || !newBatchCompetition) return;
    try {
      const res = await api.createBatch({
        name: newBatchName,
        academicYear: newBatchYear,
        competition: newBatchCompetition,
        templateId: newBatchTemplateId,
      });
      await onRefreshData();
      onSelectBatchId(res.batch.id);
      setShowCreateBatchModal(false);
      setNewBatchName('');
      setNewBatchCompetition('');
    } catch (err: any) {
      alert(err.message || 'Could not create batch.');
    }
  };

  // Delete Batch
  const handleDeleteBatch = async () => {
    if (!currentBatch) return;
    if (confirm(`Are you sure you want to delete batch "${currentBatch.name}" and all its candidate records?`)) {
      try {
        await api.deleteBatch(currentBatch.id);
        await onRefreshData();
      } catch (err: any) {
        alert(err.message || 'Could not delete batch.');
      }
    }
  };

  // Add Single Student
  const handleAddSingleStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleStudent.name || !singleStudent.email || !currentBatch) return;
    try {
      await api.addStudentsBulk(currentBatch.id, [
        {
          ...singleStudent,
          competition: singleStudent.competition || currentBatch.competition,
        },
      ]);
      await onRefreshData();
      setShowAddStudentModal(false);
      setSingleStudent({
        name: '',
        studentClass: 'Grade 10',
        section: 'A',
        project: '',
        competition: currentBatch.competition,
        email: '',
        certificateId: '',
      });
    } catch (err: any) {
      alert(err.message || 'Failed to add student.');
    }
  };

  // Delete Single Student
  const handleDeleteStudent = async (studentId: string, name: string) => {
    if (confirm(`Remove student ${name} from this batch?`)) {
      try {
        await api.deleteStudent(studentId);
        await onRefreshData();
      } catch (err: any) {
        alert(err.message || 'Failed to delete student.');
      }
    }
  };

  // Download Individual PDF
  const handleDownloadPdf = async (student: Student) => {
    try {
      setDownloadingId(student.id);
      await api.downloadStudentPdf(student.id, currentBatch?.templateId, student.name, student.certificateId);
      await onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to download certificate PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  // Export Reports
  const handleExportReport = async (format: 'csv' | 'xlsx') => {
    if (!currentBatch) return;
    try {
      setIsExportingReport(true);
      await api.downloadReport(currentBatch.id, format);
    } catch (err: any) {
      alert(err.message || `Failed to export ${format.toUpperCase()}`);
    } finally {
      setIsExportingReport(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Controls: Batch Selector & Action Buttons */}
      <div className="bg-white p-4 sm:p-5 rounded border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
            Selected Batch:
          </label>
          <div className="flex items-center gap-2">
            <select
              value={currentBatch?.id || ''}
              onChange={(e) => onSelectBatchId(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded px-3 py-1.5 focus:ring-1 focus:ring-blue-600 focus:outline-none font-medium min-w-[240px]"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({students.filter((s) => s.batchId === b.id).length} candidates)
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowCreateBatchModal(true)}
              className="p-1.5 text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded transition-colors"
              title="Create New Batch"
            >
              <FolderPlus className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded transition-colors whitespace-nowrap shadow-xs"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Bulk Data Input (CSV/Excel/Docx)</span>
          </button>

          <button
            onClick={() => setShowAddStudentModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Single Candidate</span>
          </button>

          <button
            onClick={() => onNavigateToGenerator(currentBatch?.id)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-600 rounded transition-colors whitespace-nowrap shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Generate & ZIP</span>
          </button>

          <button
            onClick={() => onNavigateToEmail(currentBatch?.id)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-900 bg-blue-50 hover:bg-blue-100 rounded transition-colors whitespace-nowrap"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Dispatch Emails</span>
          </button>
        </div>
      </div>

      {/* Batch Details Summary Strip */}
      {currentBatch && (
        <div className="bg-slate-50 p-4 rounded border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <span className="font-semibold text-slate-800">Competition:</span> {currentBatch.competition}
            </div>
            <span aria-hidden="true" className="text-slate-300">|</span>
            <div>
              <span className="font-semibold text-slate-800">Academic Year:</span> {currentBatch.academicYear}
            </div>
            <span aria-hidden="true" className="text-slate-300">|</span>
            <div>
              <span className="font-semibold text-slate-800">Candidates:</span>{' '}
              <span className="font-mono tabular-nums font-bold text-slate-900">{currentBatchStudents.length}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleExportReport('csv')}
              disabled={isExportingReport || currentBatchStudents.length === 0}
              className="text-slate-600 hover:text-slate-900 font-medium hover:underline flex items-center gap-1"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Export CSV</span>
            </button>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <button
              onClick={() => handleExportReport('xlsx')}
              disabled={isExportingReport || currentBatchStudents.length === 0}
              className="text-slate-600 hover:text-slate-900 font-medium hover:underline flex items-center gap-1"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-700" />
              <span>Export Excel</span>
            </button>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <button
              onClick={handleDeleteBatch}
              className="text-red-600 hover:text-red-800 font-medium hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Batch</span>
            </button>
          </div>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, email, project, or certificate ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Class:</span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-slate-700 text-xs focus:outline-none"
            >
              <option value="ALL">All Classes</option>
              {uniqueClasses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-slate-700 text-xs focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="draft">Draft / Pending</option>
              <option value="generated">Generated PDF</option>
              <option value="sent">Emailed</option>
              <option value="failed">Delivery Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Student Data Table (Clean, high density, tabular nums, responsive horizontal scroll) */}
      <div className="bg-white rounded border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Certificate ID</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Class & Sec</th>
                <th className="py-3 px-4">Project Title</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <p className="font-medium">No candidates found matching the criteria.</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Upload candidate records or click "Bulk Data Input" to get started.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono tabular-nums font-semibold text-slate-800">
                        {student.certificateId}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{student.name}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {student.studentClass} - {student.section}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={student.project}>
                        {student.project}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 truncate max-w-[200px]" title={student.email}>
                        {student.email}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {student.emailStatus === 'sent' ? (
                          <span className="text-emerald-700 font-medium">Emailed</span>
                        ) : student.emailStatus === 'failed' ? (
                          <span className="text-red-700 font-medium" title={student.emailError || ''}>
                            Failed
                          </span>
                        ) : student.status === 'generated' ? (
                          <span className="text-blue-700 font-medium">Ready</span>
                        ) : (
                          <span className="text-slate-400 font-medium">Draft</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleDownloadPdf(student)}
                          disabled={downloadingId === student.id}
                          className="px-2.5 py-1 text-[11px] font-medium text-blue-900 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                          title="Generate & Download PDF Certificate"
                        >
                          {downloadingId === student.id ? 'Saving...' : 'PDF'}
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student.id, student.name)}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                          title="Remove Candidate"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 border-t border-slate-100 bg-slate-50/60 text-xs text-slate-500 flex items-center justify-between">
          <span className="font-mono tabular-nums">
            Showing {filteredStudents.length} of {currentBatchStudents.length} candidates
          </span>
          <span className="text-[11px]">Supports batches of 100+ candidates</span>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* BULK IMPORT MODAL (Upload CSV / XLSX / DOCX / PDF / Paste Text / Demo Preset) */}
      {/* ---------------------------------------------------------------- */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Bulk Candidate Ingestion</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Import candidates into batch: <span className="font-semibold">{currentBatch?.name}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setParsedPreview(null);
                  setSelectedFile(null);
                }}
                className="text-slate-400 hover:text-slate-700 text-lg"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 bg-white px-4 pt-2 gap-4 text-xs font-medium">
              <button
                onClick={() => {
                  setImportTab('upload');
                  setParsedPreview(null);
                }}
                className={`pb-2 border-b-2 transition-colors ${
                  importTab === 'upload' ? 'border-blue-700 text-blue-900 font-bold' : 'border-transparent text-slate-500'
                }`}
              >
                Upload File (CSV, XLSX, DOCX, PDF)
              </button>
              <button
                onClick={() => {
                  setImportTab('paste');
                  setParsedPreview(null);
                }}
                className={`pb-2 border-b-2 transition-colors ${
                  importTab === 'paste' ? 'border-blue-700 text-blue-900 font-bold' : 'border-transparent text-slate-500'
                }`}
              >
                Paste Rows / Spreadsheet Data
              </button>
              <button
                onClick={() => {
                  setImportTab('preset');
                  setParsedPreview(null);
                }}
                className={`pb-2 border-b-2 transition-colors ${
                  importTab === 'preset' ? 'border-blue-700 text-blue-900 font-bold' : 'border-transparent text-slate-500'
                }`}
              >
                Load 100+ Candidate Preset
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {importError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
                  {importError}
                </div>
              )}

              {/* TAB 1: FILE UPLOAD */}
              {importTab === 'upload' && !parsedPreview && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors bg-slate-50/50">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-800">
                      Drag and drop your candidate file, or browse
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Supported formats: CSV, Excel (.xlsx, .xls), Word (.docx), and PDF tables (up to 15MB)
                    </p>
                    <input
                      type="file"
                      accept=".csv, .xlsx, .xls, .docx, .pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      id="bulk-file-input"
                    />
                    <label
                      htmlFor="bulk-file-input"
                      className="mt-4 inline-block px-4 py-2 bg-blue-900 text-white text-xs font-semibold rounded cursor-pointer hover:bg-blue-800"
                    >
                      Select File From Computer
                    </label>
                  </div>

                  <div className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded border border-slate-200">
                    <p className="font-semibold text-slate-700 mb-1">Expected Column Headers:</p>
                    <p>
                      <code>Name</code>, <code>Class</code>, <code>Section</code>, <code>Project</code>,{' '}
                      <code>Competition</code>, <code>Email</code>, <code>CertificateID</code> (optional).
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 2: PASTE TEXT */}
              {importTab === 'paste' && !parsedPreview && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600">
                    Paste rows directly from Microsoft Excel, Google Sheets, or CSV text:
                  </p>
                  <textarea
                    rows={8}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Name, Class, Section, Project, Competition, Email&#10;Aarav Sharma, Grade 10, A, Solar Desalination, STEM Olympiad, aarav.s@student.mountlearner.edu&#10;Sophia Chen, Grade 11, B, Autonomous Rover, STEM Olympiad, sophia.c@student.mountlearner.edu"
                    className="w-full p-3 font-mono text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:outline-none"
                  />
                  <button
                    onClick={handleParsePasted}
                    disabled={isParsing || !pastedText.trim()}
                    className="px-4 py-2 bg-blue-900 text-white text-xs font-semibold rounded hover:bg-blue-800 disabled:opacity-50"
                  >
                    {isParsing ? 'Parsing Rows...' : 'Analyze & Preview Rows'}
                  </button>
                </div>
              )}

              {/* TAB 3: DEMO PRESET */}
              {importTab === 'preset' && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded text-xs space-y-3">
                  <div className="flex items-center gap-2 font-bold text-blue-950">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Instant High-Volume Test (100 Candidates)</span>
                  </div>
                  <p className="text-blue-900 leading-relaxed">
                    This tool generates a batch of 100 candidates with realistic names, classes, STEM project titles, and emails so you can immediately test high-capacity bulk PDF rendering, ZIP packaging, and batch email dispatching.
                  </p>
                  <button
                    onClick={handleLoadDemoPreset}
                    disabled={isImporting}
                    className="px-4 py-2 bg-blue-900 text-white font-semibold rounded hover:bg-blue-800"
                  >
                    {isImporting ? 'Loading Candidates...' : 'Load 100 Candidates into Batch'}
                  </button>
                </div>
              )}

              {/* PARSED PREVIEW REPORT */}
              {parsedPreview && (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-3 rounded border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-800">Total Detected:</span>{' '}
                      <span className="font-mono tabular-nums font-bold">{parsedPreview.totalRows}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-emerald-700">Valid:</span>{' '}
                      <span className="font-mono tabular-nums font-bold text-emerald-700">{parsedPreview.validRows}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-red-700">Errors:</span>{' '}
                      <span className="font-mono tabular-nums font-bold text-red-700">{parsedPreview.invalidRows}</span>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded overflow-hidden">
                    <div className="p-2 bg-slate-100 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Sample Ingestion Preview (First 5 Rows)
                    </div>
                    <div className="overflow-x-auto max-h-48">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3">Name</th>
                            <th className="py-2 px-3">Class/Sec</th>
                            <th className="py-2 px-3">Project</th>
                            <th className="py-2 px-3">Email</th>
                            <th className="py-2 px-3">Valid?</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedPreview.samplePreview?.map((row: any, i: number) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="py-1.5 px-3 font-semibold">{row.name}</td>
                              <td className="py-1.5 px-3">
                                {row.studentClass} - {row.section}
                              </td>
                              <td className="py-1.5 px-3 truncate max-w-[150px]">{row.project}</td>
                              <td className="py-1.5 px-3 font-mono">{row.email}</td>
                              <td className="py-1.5 px-3">
                                {row.isValid ? (
                                  <span className="text-emerald-700 font-medium">Valid</span>
                                ) : (
                                  <span className="text-red-700 font-medium" title={row.errors.join(', ')}>
                                    Error
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => {
                  setParsedPreview(null);
                  setSelectedFile(null);
                  setPastedText('');
                }}
                className="text-xs text-slate-600 hover:text-slate-900"
              >
                Reset Form
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
                >
                  Cancel
                </button>
                {parsedPreview && (
                  <button
                    onClick={handleCommitImport}
                    disabled={isImporting || parsedPreview.validRows === 0}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded disabled:opacity-50"
                  >
                    {isImporting ? 'Importing Records...' : `Import ${parsedPreview.validRows} Candidates`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* CREATE BATCH MODAL */}
      {/* ---------------------------------------------------------------- */}
      {showCreateBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm mb-4">Create New Academic Batch</h3>
            <form onSubmit={handleCreateBatch} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Batch Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Arts & Literature Honours 2026"
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Academic Year</label>
                <input
                  type="text"
                  required
                  value={newBatchYear}
                  onChange={(e) => setNewBatchYear(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Competition / Event Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mount Learner Academy Annual Literary Gala"
                  value={newBatchCompetition}
                  onChange={(e) => setNewBatchCompetition(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Default Certificate Template</label>
                <select
                  value={newBatchTemplateId}
                  onChange={(e) => setNewBatchTemplateId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:outline-none"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateBatchModal(false)}
                  className="px-3 py-1.5 text-slate-700 bg-slate-100 rounded hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-900 text-white font-semibold rounded hover:bg-blue-800"
                >
                  Create Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* ADD SINGLE CANDIDATE MODAL */}
      {/* ---------------------------------------------------------------- */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm mb-4">Add Single Candidate</h3>
            <form onSubmit={handleAddSingleStudent} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Liam Tanaka"
                  value={singleStudent.name}
                  onChange={(e) => setSingleStudent({ ...singleStudent, name: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Class</label>
                  <input
                    type="text"
                    required
                    value={singleStudent.studentClass}
                    onChange={(e) => setSingleStudent({ ...singleStudent, studentClass: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Section</label>
                  <input
                    type="text"
                    required
                    value={singleStudent.section}
                    onChange={(e) => setSingleStudent({ ...singleStudent, section: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="liam.tanaka@student.mountlearner.edu"
                  value={singleStudent.email}
                  onChange={(e) => setSingleStudent({ ...singleStudent, email: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Project Title</label>
                <input
                  type="text"
                  placeholder="e.g. Atmospheric Water Condenser"
                  value={singleStudent.project}
                  onChange={(e) => setSingleStudent({ ...singleStudent, project: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-3 py-1.5 text-slate-700 bg-slate-100 rounded hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-900 text-white font-semibold rounded hover:bg-blue-800"
                >
                  Save Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
