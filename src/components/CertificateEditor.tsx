import React, { useState, useRef } from 'react';
import {
  CertificateTemplate,
  TemplateElement,
  Student,
  ElementType,
} from '../types.ts';
import { api } from '../services/api.ts';
import {
  Save,
  Upload,
  Eye,
  EyeOff,
  Move,
  Type,
  Maximize2,
  FileDown,
  RotateCcw,
  Check,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';

interface CertificateEditorProps {
  templates: CertificateTemplate[];
  selectedTemplate: CertificateTemplate;
  onSelectTemplate: (template: CertificateTemplate) => void;
  students: Student[];
  onRefreshTemplates: () => Promise<void>;
}

export const CertificateEditor: React.FC<CertificateEditorProps> = ({
  templates,
  selectedTemplate,
  onSelectTemplate,
  students,
  onRefreshTemplates,
}) => {
  const [template, setTemplate] = useState<CertificateTemplate>(selectedTemplate);
  const [selectedElementId, setSelectedElementId] = useState<ElementType>('studentName');
  const [previewStudentIndex, setPreviewStudentIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Active student for previewing data
  const sampleStudent: Student = students[previewStudentIndex] || {
    id: 'demo-student',
    batchId: 'demo',
    name: 'Aarav Sharma',
    studentClass: 'Grade 10',
    section: 'A',
    project: 'Autonomous Rover Terrain Navigation',
    competition: 'Mount Learner Academy Annual STEM & Innovation Olympiad',
    email: 'aarav.sharma@student.mountlearner.edu',
    certificateId: 'MLA-2026-STEM-0001',
    status: 'draft',
    emailStatus: 'draft',
    createdAt: new Date().toISOString(),
  };

  // Sync if selectedTemplate prop changes
  React.useEffect(() => {
    setTemplate(selectedTemplate);
  }, [selectedTemplate]);

  const activeElement = template.elements.find((el) => el.id === selectedElementId) || template.elements[0];

  const updateActiveElement = (updates: Partial<TemplateElement>) => {
    setTemplate((prev) => ({
      ...prev,
      elements: prev.elements.map((el) => (el.id === selectedElementId ? { ...el, ...updates } : el)),
    }));
  };

  const handleSaveTemplate = async () => {
    try {
      setIsSaving(true);
      await api.updateTemplate(template.id, {
        elements: template.elements,
        orientation: template.orientation,
        bgUrl: template.bgUrl,
        bgType: template.bgType,
      });
      await onRefreshTemplates();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      alert(err.message || 'Failed to save certificate template.');
    } finally {
      setIsSaving(false);
    }
  };

  // Upload Custom Background Image or PDF
  const handleUploadBg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingBg(true);
      const res = await api.uploadBackground(file);
      setTemplate((prev) => ({
        ...prev,
        bgUrl: res.url,
        bgType: res.isPdf ? 'custom_pdf' : 'custom_image',
      }));
    } catch (err: any) {
      alert(err.message || 'Background upload failed.');
    } finally {
      setIsUploadingBg(false);
    }
  };

  // Test Download Sample PDF from Editor
  const handleDownloadSample = async () => {
    try {
      setIsDownloading(true);
      // Save template first so server renders latest coordinates
      await api.updateTemplate(template.id, {
        elements: template.elements,
        orientation: template.orientation,
        bgUrl: template.bgUrl,
        bgType: template.bgType,
      });
      await api.downloadStudentPdf(sampleStudent.id, template.id, sampleStudent.name, sampleStudent.certificateId);
    } catch (err: any) {
      alert(err.message || 'Sample PDF download failed.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Resolve preview text for an element
  const getElementPreviewText = (el: TemplateElement): string => {
    switch (el.id) {
      case 'studentName':
        return sampleStudent.name;
      case 'studentClass':
        return `${sampleStudent.studentClass} • Section ${sampleStudent.section}`;
      case 'project':
        return `Project: "${sampleStudent.project}"`;
      case 'competition':
        return sampleStudent.competition;
      case 'date':
        return `Issued: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
      case 'certificateId':
        return `ID: ${sampleStudent.certificateId}`;
      case 'title':
        return el.customText || 'CERTIFICATE OF EXCELLENCE';
      case 'subtitle':
        return el.customText || 'THIS CERTIFICATE IS PROUDLY PRESENTED TO';
      case 'bodyText':
        return el.customText || 'for exemplary merit, intellectual vigor, and distinguished performance in';
      case 'signatureName':
        return el.customText || 'Dr. Arthur Vance, Ph.D.';
      case 'signatureTitle':
        return el.customText || 'Headmaster, Mount Learner Academy';
      default:
        return el.customText || el.label;
    }
  };

  // Canvas Drag Handling
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleCanvasMouseDown = (e: React.MouseEvent, elId: ElementType) => {
    setSelectedElementId(elId);
    setIsDragging(true);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const xPct = Math.round(Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100)));
    const yPct = Math.round(Math.max(5, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100)));
    updateActiveElement({ x: xPct, y: yPct });
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Bar / Template Selector & Action Controls */}
      <div className="bg-white p-4 rounded border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
            Template:
          </label>
          <select
            value={template.id}
            onChange={(e) => {
              const found = templates.find((t) => t.id === e.target.value);
              if (found) onSelectTemplate(found);
            }}
            className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded px-3 py-1.5 focus:ring-1 focus:ring-blue-600 focus:outline-none font-medium min-w-[240px]"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.isDefault ? '(Default)' : ''}
              </option>
            ))}
          </select>

          {/* Student Preview Switcher */}
          {students.length > 0 && (
            <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200 text-xs">
              <span className="text-slate-500 font-medium">Candidate:</span>
              <button
                onClick={() => setPreviewStudentIndex((prev) => (prev > 0 ? prev - 1 : students.length - 1))}
                className="p-1 text-slate-600 hover:text-slate-900 bg-slate-100 rounded"
                title="Previous Student"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-semibold text-slate-800 max-w-[120px] truncate" title={sampleStudent.name}>
                {sampleStudent.name}
              </span>
              <button
                onClick={() => setPreviewStudentIndex((prev) => (prev + 1) % students.length)}
                className="p-1 text-slate-600 hover:text-slate-900 bg-slate-100 rounded"
                title="Next Student"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleDownloadSample}
            disabled={isDownloading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
          >
            <FileDown className="w-3.5 h-3.5 text-slate-600" />
            <span>{isDownloading ? 'Generating...' : 'Test PDF Download'}</span>
          </button>

          <button
            onClick={handleSaveTemplate}
            disabled={isSaving}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded text-white transition-colors shadow-xs ${
              saveSuccess ? 'bg-emerald-600' : 'bg-blue-900 hover:bg-blue-800'
            }`}
          >
            {saveSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saveSuccess ? 'Saved!' : isSaving ? 'Saving...' : 'Save Template'}</span>
          </button>
        </div>
      </div>

      {/* Main Studio Viewport: Canvas on Left/Center, Properties Inspector on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Certificate WYSIWYG Canvas (lg:col-span-8) */}
        <div className="lg:col-span-8 bg-white p-4 sm:p-6 rounded border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-slate-700">
              Interactive Canvas (Drag elements or click to inspect)
            </span>
            <div className="flex items-center gap-3">
              <span>{template.orientation === 'landscape' ? 'A4 Landscape (297×210mm)' : 'A4 Portrait'}</span>
            </div>
          </div>

          {/* Certificate Board */}
          <div
            ref={canvasRef}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            className="relative w-full aspect-[1.414/1] bg-slate-100 border border-slate-300 rounded overflow-hidden select-none shadow-md cursor-crosshair"
            style={{
              backgroundImage: template.bgUrl ? `url(${template.bgUrl})` : undefined,
              backgroundSize: '100% 100%',
              backgroundPosition: 'center',
            }}
          >
            {/* Fallback Vector Border if no image */}
            {!template.bgUrl && (
              <div className="absolute inset-4 border-4 border-blue-900 p-2 pointer-events-none">
                <div className="w-full h-full border border-amber-500" />
              </div>
            )}

            {/* Elements Layer */}
            {template.elements.map((el) => {
              if (!el.visible) return null;
              const isSelected = el.id === selectedElementId;
              const previewText = getElementPreviewText(el);

              // Special graphic elements
              if (el.id === 'academyLogo') {
                return (
                  <div
                    key={el.id}
                    onMouseDown={(e) => handleCanvasMouseDown(e, el.id)}
                    style={{
                      left: `${el.x}%`,
                      top: `${el.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className={`absolute cursor-move transition-transform ${
                      isSelected ? 'ring-2 ring-blue-600 ring-offset-2' : 'hover:outline hover:outline-1 hover:outline-blue-400'
                    }`}
                  >
                    <img
                      src="/src/assets/images/mount_learner_crest_1791599731443.jpg"
                      alt="Academy Crest"
                      className="w-14 sm:w-16 h-14 sm:h-16 object-contain pointer-events-none drop-shadow-xs"
                    />
                  </div>
                );
              }

              if (el.id === 'signature') {
                return (
                  <div
                    key={el.id}
                    onMouseDown={(e) => handleCanvasMouseDown(e, el.id)}
                    style={{
                      left: `${el.x}%`,
                      top: `${el.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className={`absolute cursor-move transition-transform ${
                      isSelected ? 'ring-2 ring-blue-600 ring-offset-2' : 'hover:outline hover:outline-1 hover:outline-blue-400'
                    }`}
                  >
                    <img
                      src="/src/assets/images/official_signature_1791599779254.jpg"
                      alt="Official Signature"
                      className="w-20 sm:w-28 h-10 sm:h-14 object-contain pointer-events-none mix-blend-multiply"
                    />
                  </div>
                );
              }

              if (el.id === 'qrCode') {
                return (
                  <div
                    key={el.id}
                    onMouseDown={(e) => handleCanvasMouseDown(e, el.id)}
                    style={{
                      left: `${el.x}%`,
                      top: `${el.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className={`absolute cursor-move bg-white p-1 rounded shadow-xs ${
                      isSelected ? 'ring-2 ring-blue-600 ring-offset-2' : 'hover:outline hover:outline-1 hover:outline-blue-400'
                    }`}
                  >
                    <div className="w-9 sm:w-12 h-9 sm:h-12 bg-slate-900 flex items-center justify-center text-white text-[9px] font-mono font-bold text-center">
                      QR CODE
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={el.id}
                  onMouseDown={(e) => handleCanvasMouseDown(e, el.id)}
                  style={{
                    left: `${el.x}%`,
                    top: `${el.y}%`,
                    transform: el.textAlign === 'center' ? 'translate(-50%, -50%)' : el.textAlign === 'right' ? 'translate(-100%, -50%)' : 'translate(0, -50%)',
                    fontFamily: el.fontFamily,
                    fontSize: `clamp(${el.fontSize * 0.4}px, ${el.fontSize * 0.08}vw, ${el.fontSize}px)`,
                    fontWeight: el.fontWeight,
                    color: el.color,
                    textTransform: el.textTransform || 'none',
                    textAlign: el.textAlign,
                  }}
                  className={`absolute cursor-move px-2 py-0.5 rounded whitespace-nowrap transition-shadow ${
                    isSelected
                      ? 'bg-blue-500/10 ring-2 ring-blue-600 ring-offset-1'
                      : 'hover:bg-slate-200/40'
                  }`}
                >
                  {previewText}
                </div>
              );
            })}
          </div>

          <div className="text-[11px] text-slate-500 flex items-center justify-between">
            <span>Tip: Click any element to drag and reposition across coordinates</span>
            <span className="font-mono tabular-nums">
              X: {activeElement.x}% | Y: {activeElement.y}%
            </span>
          </div>
        </div>

        {/* Properties Inspector & Background Selector (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Element Selection & Position Inspector */}
          <div className="bg-white p-5 rounded border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Element Properties
              </h3>
              <button
                onClick={() => updateActiveElement({ visible: !activeElement.visible })}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                {activeElement.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-red-500" />}
                <span>{activeElement.visible ? 'Visible' : 'Hidden'}</span>
              </button>
            </div>

            {/* Element Picker */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Select Field to Style</label>
              <select
                value={selectedElementId}
                onChange={(e) => setSelectedElementId(e.target.value as ElementType)}
                className="w-full p-2 border border-slate-300 rounded text-xs bg-slate-50 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                {template.elements.map((el) => (
                  <option key={el.id} value={el.id}>
                    {el.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Position Sliders */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1">
                  Horizontal X (<span className="font-mono">{activeElement.x}%</span>)
                </label>
                <input
                  type="range"
                  min={5}
                  max={95}
                  value={activeElement.x}
                  onChange={(e) => updateActiveElement({ x: Number(e.target.value) })}
                  className="w-full accent-blue-700"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">
                  Vertical Y (<span className="font-mono">{activeElement.y}%</span>)
                </label>
                <input
                  type="range"
                  min={5}
                  max={95}
                  value={activeElement.y}
                  onChange={(e) => updateActiveElement({ y: Number(e.target.value) })}
                  className="w-full accent-blue-700"
                />
              </div>
            </div>

            {/* Typography Controls (if text element) */}
            {activeElement.id !== 'academyLogo' && activeElement.id !== 'signature' && activeElement.id !== 'qrCode' && (
              <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
                <div>
                  <label className="block text-slate-600 mb-1">Font Family</label>
                  <select
                    value={activeElement.fontFamily}
                    onChange={(e) => updateActiveElement({ fontFamily: e.target.value as any })}
                    className="w-full p-1.5 border border-slate-300 rounded bg-white text-xs"
                  >
                    <option value="Playfair Display">Playfair Display (Formal Academic Serif)</option>
                    <option value="Cinzel">Cinzel (Classical Roman Honours)</option>
                    <option value="Plus Jakarta Sans">Plus Jakarta Sans (Contemporary Sans)</option>
                    <option value="Times-Roman">Times-Roman (Standard Diploma Serif)</option>
                    <option value="Helvetica">Helvetica (Clean Technical)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1">
                      Font Size (<span className="font-mono">{activeElement.fontSize}pt</span>)
                    </label>
                    <input
                      type="range"
                      min={9}
                      max={48}
                      value={activeElement.fontSize}
                      onChange={(e) => updateActiveElement({ fontSize: Number(e.target.value) })}
                      className="w-full accent-blue-700"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1">Weight</label>
                    <select
                      value={activeElement.fontWeight}
                      onChange={(e) => updateActiveElement({ fontWeight: e.target.value as any })}
                      className="w-full p-1.5 border border-slate-300 rounded bg-white text-xs"
                    >
                      <option value="normal">Normal (400)</option>
                      <option value="500">Medium (500)</option>
                      <option value="600">SemiBold (600)</option>
                      <option value="bold">Bold (700)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1">Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={activeElement.color}
                        onChange={(e) => updateActiveElement({ color: e.target.value })}
                        className="w-8 h-8 rounded border border-slate-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={activeElement.color}
                        onChange={(e) => updateActiveElement({ color: e.target.value })}
                        className="w-20 p-1 font-mono text-xs border border-slate-300 rounded uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1">Alignment</label>
                    <select
                      value={activeElement.textAlign}
                      onChange={(e) => updateActiveElement({ textAlign: e.target.value as any })}
                      className="w-full p-1.5 border border-slate-300 rounded bg-white text-xs"
                    >
                      <option value="center">Center</option>
                      <option value="left">Left</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                </div>

                {/* Custom Text Override for Static labels */}
                {(activeElement.id === 'title' ||
                  activeElement.id === 'subtitle' ||
                  activeElement.id === 'bodyText' ||
                  activeElement.id === 'signatureName' ||
                  activeElement.id === 'signatureTitle') && (
                  <div>
                    <label className="block text-slate-600 mb-1">Custom Text Override</label>
                    <input
                      type="text"
                      value={activeElement.customText || ''}
                      onChange={(e) => updateActiveElement({ customText: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded text-xs"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Background & Template Theme Selector */}
          <div className="bg-white p-5 rounded border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-3">
              Background & Paper Template
            </h3>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700">Stock Academy Styles</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() =>
                    setTemplate((prev) => ({
                      ...prev,
                      bgUrl: '/src/assets/images/cert_bg_classic_blue_1791599752611.jpg',
                      bgType: 'classic',
                    }))
                  }
                  className={`p-2.5 rounded border text-left transition-colors ${
                    template.bgUrl?.includes('classic') ? 'border-blue-700 bg-blue-50 font-semibold text-blue-900' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Classic Navy & Gold
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setTemplate((prev) => ({
                      ...prev,
                      bgUrl: '/src/assets/images/cert_bg_modern_blue_1791599765167.jpg',
                      bgType: 'modern',
                    }))
                  }
                  className={`p-2.5 rounded border text-left transition-colors ${
                    template.bgUrl?.includes('modern') ? 'border-blue-700 bg-blue-50 font-semibold text-blue-900' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Sapphire & Silver
                </button>
              </div>
            </div>

            {/* Custom Background Upload */}
            <div className="pt-3 border-t border-slate-100">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Upload Custom Background / PDF Template
              </label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                id="bg-upload-input"
                className="hidden"
                onChange={handleUploadBg}
              />
              <label
                htmlFor="bg-upload-input"
                className="w-full flex items-center justify-center gap-2 p-2 border border-dashed border-slate-300 rounded text-xs text-slate-600 hover:border-blue-600 hover:text-blue-900 cursor-pointer bg-slate-50/50"
              >
                <Upload className="w-4 h-4" />
                <span>{isUploadingBg ? 'Uploading...' : 'Choose JPG, PNG, or PDF template'}</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
