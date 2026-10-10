import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { fileURLToPath } from 'url';
import { db } from './server/db.ts';
import { authMiddleware, handleLogin, handleLogout, handleGetMe } from './server/auth.ts';
import type { AuthenticatedRequest } from './server/auth.ts';
import { parseCsvOrText, parseExcelBuffer, parseDocxBuffer } from './server/parsers.ts';
import { generateStudentPdf, generateBulkZip } from './server/pdfGenerator.ts';
import { testSmtpConnection, sendCertificatesBatch, provisionEtherealAccount, sendSingleTestEmail } from './server/mailer.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Setup directories
const UPLOADS_DIR = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage for uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: (_req, file, cb) => {
    const allowed = ['.csv', '.xlsx', '.xls', '.docx', '.pdf', '.png', '.jpg', '.jpeg', '.svg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File format ${ext} is not supported. Please upload CSV, XLSX, DOCX, PDF, or image files.`));
    }
  },
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

// ----------------------------------------------------
// Public Authentication Endpoints
// ----------------------------------------------------
app.post('/api/auth/login', handleLogin);
app.post('/api/auth/logout', authMiddleware, handleLogout);
app.get('/api/auth/me', authMiddleware, handleGetMe);

app.post('/api/auth/change-password', authMiddleware, (req: AuthenticatedRequest, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }
  const admins = db.getAdmins();
  const admin = admins.find((a) => a.id === req.adminId);
  if (!admin) {
    return res.status(404).json({ error: 'Admin not found.' });
  }
  db.updateAdminPassword(admin.id, newPassword);
  return res.json({ success: true, message: 'Password updated successfully.' });
});

// ----------------------------------------------------
// Public Certificate Verification Endpoint
// ----------------------------------------------------
app.get('/api/verify/:certificateId', (req, res) => {
  const certId = req.params.certificateId;
  const allStudents = db.getStudents();
  const student = allStudents.find((s) => s.certificateId.toLowerCase() === certId.toLowerCase());

  if (!student) {
    return res.status(404).json({
      valid: false,
      message: `No certificate found matching ID "${certId}". Please contact Mount Learner Academy Registrar.`,
    });
  }

  const batch = db.getBatch(student.batchId);
  return res.json({
    valid: true,
    certificateId: student.certificateId,
    studentName: student.name,
    studentClass: student.studentClass,
    section: student.section,
    project: student.project,
    competition: student.competition,
    institution: 'Mount Learner Academy',
    academicYear: batch?.academicYear || '2025-2026',
    issuedAt: student.createdAt,
    emailStatus: student.emailStatus,
  });
});

// ----------------------------------------------------
// Protected Batch Endpoints
// ----------------------------------------------------
app.get('/api/batches', authMiddleware, (_req, res) => {
  const batches = db.getBatches();
  return res.json({ batches });
});

app.get('/api/batches/:id', authMiddleware, (req, res) => {
  const batch = db.getBatch(req.params.id);
  if (!batch) return res.status(404).json({ error: 'Batch not found.' });
  const students = db.getStudents(batch.id);
  return res.json({ batch, students });
});

app.post('/api/batches', authMiddleware, (req, res) => {
  const { name, academicYear, competition, templateId } = req.body;
  if (!name || !competition) {
    return res.status(400).json({ error: 'Batch name and competition are required.' });
  }
  const newBatch = db.createBatch({
    name,
    academicYear: academicYear || '2025-2026',
    competition,
    totalStudents: 0,
    templateId: templateId || 'tmpl-classic-blue',
  });
  return res.json({ batch: newBatch });
});

app.delete('/api/batches/:id', authMiddleware, (req, res) => {
  db.deleteBatch(req.params.id);
  return res.json({ success: true, message: 'Batch deleted.' });
});

// ----------------------------------------------------
// Protected Student Endpoints
// ----------------------------------------------------
app.get('/api/students', authMiddleware, (req, res) => {
  const batchId = req.query.batchId as string | undefined;
  const students = db.getStudents(batchId);
  return res.json({ students });
});

app.post('/api/students/bulk', authMiddleware, (req, res) => {
  const { batchId, students } = req.body;
  if (!batchId || !Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ error: 'Valid batchId and student list required.' });
  }
  const added = db.addStudentsToBatch(batchId, students);
  return res.json({ success: true, count: added.length, students: added });
});

app.put('/api/students/:id', authMiddleware, (req, res) => {
  const updated = db.updateStudent(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Student not found.' });
  return res.json({ student: updated });
});

app.delete('/api/students/:id', authMiddleware, (req, res) => {
  db.deleteStudent(req.params.id);
  return res.json({ success: true, message: 'Student removed.' });
});

// ----------------------------------------------------
// File Parsing & Data Ingestion Endpoints
// ----------------------------------------------------
app.post('/api/import/parse-text', authMiddleware, (req, res) => {
  const { rawText, competition } = req.body;
  if (!rawText || !rawText.trim()) {
    return res.status(400).json({ error: 'No text provided to parse.' });
  }
  try {
    const result = parseCsvOrText(rawText, competition);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: `Text parse failed: ${err.message}` });
  }
});

app.post('/api/import/upload-file', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const defaultComp = (req.body.competition as string) || '';
  const filePath = req.file.path;
  const ext = path.extname(req.file.originalname).toLowerCase();

  try {
    const fileBuffer = fs.readFileSync(filePath);
    let result;

    if (ext === '.csv') {
      result = parseCsvOrText(fileBuffer.toString('utf-8'), defaultComp);
    } else if (ext === '.xlsx' || ext === '.xls') {
      result = parseExcelBuffer(fileBuffer, defaultComp);
    } else if (ext === '.docx') {
      result = await parseDocxBuffer(fileBuffer, defaultComp);
    } else if (ext === '.pdf') {
      // Basic fallback text parse for PDF tabular lines
      const text = fileBuffer.toString('latin1');
      result = parseCsvOrText(text, defaultComp);
    } else {
      return res.status(400).json({ error: `Unsupported file format: ${ext}` });
    }

    // Clean up temporary uploaded file
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      // ignore
    }

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: `File processing error: ${err.message}` });
  }
});

// ----------------------------------------------------
// Certificate Templates Endpoints
// ----------------------------------------------------
app.get('/api/templates', authMiddleware, (_req, res) => {
  const templates = db.getTemplates();
  return res.json({ templates });
});

app.get('/api/templates/:id', authMiddleware, (req, res) => {
  const template = db.getTemplate(req.params.id);
  if (!template) return res.status(404).json({ error: 'Template not found.' });
  return res.json({ template });
});

app.post('/api/templates', authMiddleware, (req, res) => {
  const template = db.createTemplate(req.body);
  return res.json({ template });
});

app.put('/api/templates/:id', authMiddleware, (req, res) => {
  const updated = db.updateTemplate(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Template not found.' });
  return res.json({ template: updated });
});

// Upload background image or PDF template
app.post('/api/templates/upload-bg', authMiddleware, upload.single('background'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No background file uploaded.' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  const isPdf = req.file.originalname.toLowerCase().endsWith('.pdf');
  return res.json({
    url: fileUrl,
    filename: req.file.originalname,
    isPdf,
  });
});

// ----------------------------------------------------
// PDF Generation & Bulk ZIP Endpoints
// ----------------------------------------------------
app.get('/api/generate/student/:id/pdf', authMiddleware, async (req, res) => {
  const student = db.getStudent(req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found.' });

  const batch = db.getBatch(student.batchId);
  const templateId = (req.query.templateId as string) || batch?.templateId || 'tmpl-classic-blue';
  const template = db.getTemplate(templateId) || db.getTemplates()[0];

  try {
    const appUrl = (req.headers['x-forwarded-proto'] || 'https') + '://' + (req.headers.host || 'mountlearner.edu');
    const pdfBuffer = await generateStudentPdf(student, template, appUrl);

    db.updateStudentStatus(student.id, 'generated');

    const sanitizedName = student.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Mount_Learner_Academy_${student.certificateId}_${sanitizedName}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err: any) {
    console.error('PDF generation error:', err);
    return res.status(500).json({ error: `PDF generation failed: ${err.message}` });
  }
});

// Bulk ZIP archive download for an entire batch
app.post('/api/generate/batch/:id/zip', authMiddleware, async (req, res) => {
  const batch = db.getBatch(req.params.id);
  if (!batch) return res.status(404).json({ error: 'Batch not found.' });

  const students = db.getStudents(batch.id);
  if (students.length === 0) {
    return res.status(400).json({ error: 'Batch has no students to generate certificates for.' });
  }

  const templateId = (req.body.templateId as string) || batch.templateId || 'tmpl-classic-blue';
  const template = db.getTemplate(templateId) || db.getTemplates()[0];

  try {
    const appUrl = (req.headers['x-forwarded-proto'] || 'https') + '://' + (req.headers.host || 'mountlearner.edu');
    const zipBuffer = await generateBulkZip(students, template, appUrl);

    // Update students status
    students.forEach((s) => {
      if (s.status === 'draft') {
        db.updateStudentStatus(s.id, 'generated');
      }
    });

    const sanitizedBatchName = batch.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="Mount_Learner_Academy_Certificates_${sanitizedBatchName}.zip"`);
    return res.send(zipBuffer);
  } catch (err: any) {
    console.error('Bulk ZIP generation error:', err);
    return res.status(500).json({ error: `Bulk ZIP generation failed: ${err.message}` });
  }
});

// Mark batch as generated
app.post('/api/generate/batch/:id/mark-generated', authMiddleware, (req, res) => {
  const batch = db.getBatch(req.params.id);
  if (!batch) return res.status(404).json({ error: 'Batch not found.' });

  const students = db.getStudents(batch.id);
  students.forEach((s) => {
    if (s.status === 'draft') {
      db.updateStudentStatus(s.id, 'generated');
    }
  });
  return res.json({ success: true, count: students.length });
});

// ----------------------------------------------------
// Reports Export Endpoints (CSV & XLSX)
// ----------------------------------------------------
app.get('/api/reports/batch/:id/csv', authMiddleware, (req, res) => {
  const batch = db.getBatch(req.params.id);
  if (!batch) return res.status(404).json({ error: 'Batch not found.' });

  const students = db.getStudents(batch.id);
  const rows = students.map((s) => ({
    'Certificate ID': s.certificateId,
    'Student Name': s.name,
    Class: s.studentClass,
    Section: s.section,
    Project: s.project,
    Competition: s.competition,
    Email: s.email,
    'Generation Status': s.status,
    'Email Status': s.emailStatus,
    'Email Sent At': s.emailSentAt || 'N/A',
    'Email Error': s.emailError || 'None',
  }));

  const csv = Papa.unparse(rows);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="Mount_Learner_Academy_Report_${batch.id}.csv"`);
  return res.send(csv);
});

app.get('/api/reports/batch/:id/xlsx', authMiddleware, (req, res) => {
  const batch = db.getBatch(req.params.id);
  if (!batch) return res.status(404).json({ error: 'Batch not found.' });

  const students = db.getStudents(batch.id);
  const rows = students.map((s) => ({
    'Certificate ID': s.certificateId,
    'Student Name': s.name,
    Class: s.studentClass,
    Section: s.section,
    Project: s.project,
    Competition: s.competition,
    Email: s.email,
    'Generation Status': s.status,
    'Email Status': s.emailStatus,
    'Email Sent At': s.emailSentAt || 'N/A',
    'Email Error': s.emailError || 'None',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Certificates Summary');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="Mount_Learner_Academy_Report_${batch.id}.xlsx"`);
  return res.send(buffer);
});

// ----------------------------------------------------
// Email Dispatch, Settings & Logs Endpoints
// ----------------------------------------------------
app.get('/api/settings/email', authMiddleware, (_req, res) => {
  const settings = db.getEmailSettings();
  // Return safe settings object without exposing authPass
  return res.json({
    settings: {
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      authUser: settings.authUser,
      isConfigured: settings.isConfigured,
      senderName: settings.senderName,
      senderEmail: settings.senderEmail,
      batchSize: settings.batchSize,
      throttleDelayMs: settings.throttleDelayMs,
      subjectTemplate: settings.subjectTemplate,
      bodyTemplate: settings.bodyTemplate,
      updatedAt: settings.updatedAt,
    },
  });
});

app.post('/api/settings/email', authMiddleware, (req, res) => {
  const updated = db.updateEmailSettings(req.body);
  return res.json({
    success: true,
    message: 'Email settings saved successfully.',
    settings: {
      host: updated.host,
      port: updated.port,
      secure: updated.secure,
      authUser: updated.authUser,
      isConfigured: updated.isConfigured,
      senderName: updated.senderName,
      senderEmail: updated.senderEmail,
      batchSize: updated.batchSize,
      throttleDelayMs: updated.throttleDelayMs,
      subjectTemplate: updated.subjectTemplate,
      bodyTemplate: updated.bodyTemplate,
      updatedAt: updated.updatedAt,
    },
  });
});

app.post('/api/email/test-connection', authMiddleware, async (_req, res) => {
  const result = await testSmtpConnection();
  if (result.success) {
    return res.json(result);
  } else {
    return res.status(400).json(result);
  }
});

app.post('/api/email/provision-test-account', authMiddleware, async (_req, res) => {
  try {
    const result = await provisionEtherealAccount();
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to provision test SMTP account.' });
  }
});

app.post('/api/email/send-test-single', authMiddleware, async (req, res) => {
  const { destinationEmail, templateId } = req.body;
  if (!destinationEmail || !destinationEmail.includes('@')) {
    return res.status(400).json({ error: 'Valid recipient email address is required.' });
  }
  const template = db.getTemplate(templateId) || db.getTemplates()[0];
  const appUrl = (req.headers['x-forwarded-proto'] || 'https') + '://' + (req.headers.host || 'mountlearner.edu');

  try {
    const result = await sendSingleTestEmail(destinationEmail, template, appUrl);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Test email delivery failed.' });
  }
});

app.post('/api/email/send-batch', authMiddleware, async (req, res) => {
  const { studentIds, templateId, forceResend } = req.body;
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ error: 'Please select one or more students to email.' });
  }

  const template = db.getTemplate(templateId) || db.getTemplates()[0];
  const appUrl = (req.headers['x-forwarded-proto'] || 'https') + '://' + (req.headers.host || 'mountlearner.edu');

  try {
    const result = await sendCertificatesBatch(studentIds, template, {
      forceResend: !!forceResend,
      appUrl,
    });
    return res.json(result);
  } catch (err: any) {
    console.error('Batch email dispatch error:', err);
    return res.status(500).json({ error: err.message || 'Email dispatch failed.' });
  }
});

app.get('/api/email/logs', authMiddleware, (req, res) => {
  const batchId = req.query.batchId as string | undefined;
  const logs = db.getEmailLogs(batchId);
  return res.json({ logs });
});

app.post('/api/email/clear-logs', authMiddleware, (req, res) => {
  const batchId = req.body.batchId as string | undefined;
  db.clearEmailLogs(batchId);
  return res.json({ success: true, message: 'Email logs cleared.' });
});

// ----------------------------------------------------
// Frontend Mounting: Vite Middleware in Dev, Static in Prod
// ----------------------------------------------------
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Mount Learner Academy Certificate Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
