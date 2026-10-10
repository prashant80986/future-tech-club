import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { Batch, Student, CertificateTemplate, EmailSettings, EmailLog, AdminUser, TemplateElement } from '../src/types.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'mount_learner.db.json');

export interface SessionData {
  token: string;
  adminId: string;
  csrfToken: string;
  expiresAt: number;
}

export interface AdminRecord extends AdminUser {
  passwordHash: string;
  salt: string;
  createdAt: string;
}

export interface DatabaseSchema {
  admins: AdminRecord[];
  batches: Batch[];
  students: Student[];
  templates: CertificateTemplate[];
  emailSettings: EmailSettings;
  emailLogs: EmailLog[];
  sessions: SessionData[];
}

export const defaultTemplateElements: TemplateElement[] = [
  {
    id: 'academyLogo',
    label: 'Academy Crest',
    x: 50,
    y: 13,
    fontSize: 20,
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: 'normal',
    color: '#1e3a8a',
    textAlign: 'center',
    visible: true,
  },
  {
    id: 'title',
    label: 'Certificate Title',
    x: 50,
    y: 28,
    fontSize: 30,
    fontFamily: 'Cinzel',
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
    visible: true,
    textTransform: 'uppercase',
    customText: 'CERTIFICATE OF EXCELLENCE',
  },
  {
    id: 'subtitle',
    label: 'Subtitle / Header',
    x: 50,
    y: 36,
    fontSize: 14,
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '500',
    color: '#475569',
    textAlign: 'center',
    visible: true,
    customText: 'THIS CERTIFICATE IS PROUDLY PRESENTED TO',
  },
  {
    id: 'studentName',
    label: 'Student Name',
    x: 50,
    y: 45,
    fontSize: 34,
    fontFamily: 'Playfair Display',
    fontWeight: 'bold',
    color: '#1e3a8a',
    textAlign: 'center',
    visible: true,
  },
  {
    id: 'studentClass',
    label: 'Class & Section',
    x: 50,
    y: 53,
    fontSize: 14,
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
    visible: true,
  },
  {
    id: 'bodyText',
    label: 'Commendation Text',
    x: 50,
    y: 60,
    fontSize: 13,
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: 'normal',
    color: '#334155',
    textAlign: 'center',
    visible: true,
    customText: 'for exemplary merit, intellectual vigor, and distinguished performance in',
  },
  {
    id: 'competition',
    label: 'Competition Name',
    x: 50,
    y: 66,
    fontSize: 18,
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
    visible: true,
  },
  {
    id: 'project',
    label: 'Project Title',
    x: 50,
    y: 72,
    fontSize: 13,
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '500',
    color: '#475569',
    textAlign: 'center',
    visible: true,
  },
  {
    id: 'date',
    label: 'Issuance Date',
    x: 24,
    y: 84,
    fontSize: 12,
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
    visible: true,
  },
  {
    id: 'signature',
    label: 'Principal Signature',
    x: 76,
    y: 83,
    fontSize: 14,
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: 'normal',
    color: '#1e3a8a',
    textAlign: 'center',
    visible: true,
  },
  {
    id: 'signatureName',
    label: 'Signatory Name',
    x: 76,
    y: 89,
    fontSize: 12,
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
    visible: true,
    customText: 'Dr. Arthur Vance, Ph.D.',
  },
  {
    id: 'signatureTitle',
    label: 'Signatory Title',
    x: 76,
    y: 92,
    fontSize: 10,
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: 'normal',
    color: '#64748b',
    textAlign: 'center',
    visible: true,
    customText: 'Headmaster, Mount Learner Academy',
  },
  {
    id: 'certificateId',
    label: 'Certificate ID',
    x: 24,
    y: 91,
    fontSize: 10,
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
    visible: true,
  },
  {
    id: 'qrCode',
    label: 'Verification QR',
    x: 50,
    y: 85,
    fontSize: 10,
    fontFamily: 'Plus Jakarta Sans',
    fontWeight: 'normal',
    color: '#0f172a',
    textAlign: 'center',
    visible: true,
  },
];

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function createPasswordRecord(password: string) {
  const salt = generateSalt();
  const passwordHash = hashPassword(password, salt);
  return { salt, passwordHash };
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const calculated = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(calculated, 'hex'), Buffer.from(expectedHash, 'hex'));
}

function generateInitialStudents(batchId: string): Student[] {
  const firstNames = ['Aarav', 'Sophia', 'Ethan', 'Zoya', 'Liam', 'Ananya', 'Lucas', 'Maya', 'Noah', 'Elena', 'Benjamin', 'Chloe', 'Daniel', 'Aaliyah', 'Alexander', 'Fatima', 'William', 'Priya', 'James', 'Kavya'];
  const lastNames = ['Sharma', 'Chen', 'Patel', 'Kim', 'O\'Connor', 'Gupta', 'Silva', 'Tanaka', 'Müller', 'Dubois', 'Ibrahim', 'Rao', 'Nakamura', 'Novak', 'Singh', 'Al-Mansoor', 'Kowalski', 'Santos', 'Mehta', 'Rossi'];
  const classes = ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
  const sections = ['A', 'B', 'C', 'Delta', 'Sigma'];
  const projects = [
    'Autonomous Rover Terrain Navigation',
    'AI-Assisted Microplastic Water Filtration',
    'Quantum Encryption Simulation System',
    'Solar Photovoltaic Efficiency Optimizer',
    'Biomimetic Wind Turbine Blade Aerodynamics',
    'CRISPR Gene Synthesis Ethical Modeling',
    'Neural Interface for Prosthetic Feedback',
    'Microgravity Plant Growth Chambers',
    'Decentralized Peer-to-Peer Sensor Network',
    'Atmospheric Carbon Capture Bioreactor'
  ];

  const students: Student[] = [];
  // Generate 120 realistic students for immediate testing of 100+ batch size
  for (let i = 1; i <= 120; i++) {
    const fn = firstNames[(i * 3 + 1) % firstNames.length];
    const ln = lastNames[(i * 5 + 2) % lastNames.length];
    const sClass = classes[(i + 2) % classes.length];
    const sSec = sections[i % sections.length];
    const project = projects[i % projects.length];
    const certNum = String(i).padStart(4, '0');
    const emailPrefix = `${fn.toLowerCase()}.${ln.toLowerCase().replace(/[^a-z]/g, '')}${i}`;

    students.push({
      id: `std-mla-${certNum}`,
      batchId,
      name: `${fn} ${ln}`,
      studentClass: sClass,
      section: sSec,
      project,
      competition: 'Mount Learner Academy Annual STEM & Innovation Olympiad',
      email: `${emailPrefix}@student.mountlearner.edu`,
      certificateId: `MLA-2026-STEM-${certNum}`,
      status: 'draft',
      emailStatus: 'draft',
      emailSentAt: null,
      emailError: null,
      createdAt: new Date(Date.now() - (120 - i) * 60000).toISOString(),
    });
  }
  return students;
}

function getInitialData(): DatabaseSchema {
  const defaultSalt = generateSalt();
  const defaultHash = hashPassword('Admin@MLA2026', defaultSalt);

  const initialBatchId = 'batch-stem-olympiad-2026';
  const initialStudents = generateInitialStudents(initialBatchId);

  return {
    admins: [
      {
        id: 'admin-01',
        email: 'admin@mountlearner.edu',
        name: 'Mount Learner Academy Administration',
        role: 'admin',
        salt: defaultSalt,
        passwordHash: defaultHash,
        createdAt: new Date().toISOString(),
      },
    ],
    batches: [
      {
        id: initialBatchId,
        name: 'Annual STEM & Innovation Olympiad 2026',
        academicYear: '2025-2026',
        competition: 'Mount Learner Academy Annual STEM & Innovation Olympiad',
        totalStudents: initialStudents.length,
        generatedCount: 0,
        emailedCount: 0,
        templateId: 'tmpl-classic-blue',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    students: initialStudents,
    templates: [
      {
        id: 'tmpl-classic-blue',
        name: 'Classic Academy Honours Diploma',
        description: 'Prestigious classical certificate with royal blue guilloche border and gold accents',
        bgType: 'classic',
        bgUrl: '/src/assets/images/cert_bg_classic_blue_1791599752611.jpg',
        orientation: 'landscape',
        elements: defaultTemplateElements,
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tmpl-modern-sapphire',
        name: 'Sapphire & Silver Innovation Laureate',
        description: 'Contemporary geometric diploma frame with sapphire blue and metallic silver lines',
        bgType: 'modern',
        bgUrl: '/src/assets/images/cert_bg_modern_blue_1791599765167.jpg',
        orientation: 'landscape',
        elements: defaultTemplateElements,
        isDefault: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    emailSettings: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true,
      authUser: process.env.SMTP_USER || '',
      authPass: process.env.SMTP_PASS || '',
      isConfigured: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
      senderName: 'Mount Learner Academy Certifications Office',
      senderEmail: process.env.SMTP_USER || 'certifications@mountlearner.edu',
      batchSize: 20,
      throttleDelayMs: 2500,
      subjectTemplate: 'Your Official Certificate of Excellence: {{competition}} — Mount Learner Academy',
      bodyTemplate: `Dear {{name}},

Congratulations on your commendable achievement in the {{competition}}!

We are pleased to confer upon you the official Mount Learner Academy Certificate of Excellence in recognition of your distinguished performance and contribution to "{{project}}".

Certificate Details:
• Recipient: {{name}}
• Class & Section: {{class}} - {{section}}
• Certificate ID: {{certificateId}}
• Issuance Date: {{date}}

Your verified PDF certificate is attached to this email. You may also present this Certificate ID to the Academy Registrar for digital validation.

Warm regards,
Office of Academic Affairs & Honours
Mount Learner Academy
www.mountlearner.edu`,
      updatedAt: new Date().toISOString(),
    },
    emailLogs: [],
    sessions: [],
  };
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        // Ensure schemas have required keys
        if (!this.data.admins || !this.data.admins.length) {
          const init = getInitialData();
          this.data.admins = init.admins;
        }
        if (!this.data.emailSettings) {
          this.data.emailSettings = getInitialData().emailSettings;
        }
        if (!this.data.templates || !this.data.templates.length) {
          this.data.templates = getInitialData().templates;
        }
      } catch (err) {
        console.error('Error reading database file, reinitializing:', err);
        this.data = getInitialData();
        this.persist();
      }
    } else {
      this.data = getInitialData();
      this.persist();
    }
  }

  private persist() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write database file:', e);
    }
  }

  // Admin & Session
  getAdmins(): AdminRecord[] {
    return this.data.admins;
  }

  getAdminByEmail(email: string): AdminRecord | undefined {
    return this.data.admins.find((a) => a.email.toLowerCase() === email.toLowerCase());
  }

  updateAdminPassword(adminId: string, newPassword: string): boolean {
    const admin = this.data.admins.find((a) => a.id === adminId);
    if (!admin) return false;
    const { salt, passwordHash } = createPasswordRecord(newPassword);
    admin.salt = salt;
    admin.passwordHash = passwordHash;
    this.persist();
    return true;
  }

  createSession(adminId: string): SessionData {
    // Clean old expired sessions
    const now = Date.now();
    this.data.sessions = this.data.sessions.filter((s) => s.expiresAt > now);

    const token = crypto.randomBytes(32).toString('hex');
    const csrfToken = crypto.randomBytes(24).toString('hex');
    const session: SessionData = {
      token,
      adminId,
      csrfToken,
      expiresAt: now + 7 * 24 * 3600 * 1000, // 7 days
    };
    this.data.sessions.push(session);
    this.persist();
    return session;
  }

  getSession(token: string): SessionData | undefined {
    const now = Date.now();
    const session = this.data.sessions.find((s) => s.token === token && s.expiresAt > now);
    return session;
  }

  deleteSession(token: string): void {
    this.data.sessions = this.data.sessions.filter((s) => s.token !== token);
    this.persist();
  }

  // Batches
  getBatches(): Batch[] {
    return this.data.batches;
  }

  getBatch(id: string): Batch | undefined {
    return this.data.batches.find((b) => b.id === id);
  }

  createBatch(batch: Omit<Batch, 'id' | 'createdAt' | 'updatedAt' | 'generatedCount' | 'emailedCount'>): Batch {
    const id = `batch-${Date.now()}`;
    const newBatch: Batch = {
      ...batch,
      id,
      generatedCount: 0,
      emailedCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.batches.unshift(newBatch);
    this.persist();
    return newBatch;
  }

  updateBatchCounts(batchId: string): void {
    const batch = this.data.batches.find((b) => b.id === batchId);
    if (!batch) return;
    const batchStudents = this.data.students.filter((s) => s.batchId === batchId);
    batch.totalStudents = batchStudents.length;
    batch.generatedCount = batchStudents.filter((s) => s.status === 'generated' || s.status === 'emailed').length;
    batch.emailedCount = batchStudents.filter((s) => s.emailStatus === 'sent').length;
    batch.updatedAt = new Date().toISOString();
    this.persist();
  }

  deleteBatch(batchId: string): void {
    this.data.batches = this.data.batches.filter((b) => b.id !== batchId);
    this.data.students = this.data.students.filter((s) => s.batchId !== batchId);
    this.persist();
  }

  // Students
  getStudents(batchId?: string): Student[] {
    if (batchId) {
      return this.data.students.filter((s) => s.batchId === batchId);
    }
    return this.data.students;
  }

  getStudent(id: string): Student | undefined {
    return this.data.students.find((s) => s.id === id);
  }

  addStudentsToBatch(batchId: string, studentsData: Array<Omit<Student, 'id' | 'batchId' | 'status' | 'emailStatus' | 'createdAt'>>): Student[] {
    const newStudents: Student[] = studentsData.map((item, idx) => {
      const studentId = `std-${Date.now()}-${idx}`;
      return {
        ...item,
        id: studentId,
        batchId,
        certificateId: item.certificateId || `MLA-${new Date().getFullYear()}-${String(this.data.students.length + idx + 1).padStart(4, '0')}`,
        status: 'draft',
        emailStatus: 'draft',
        emailSentAt: null,
        emailError: null,
        createdAt: new Date().toISOString(),
      };
    });

    this.data.students.push(...newStudents);
    this.updateBatchCounts(batchId);
    this.persist();
    return newStudents;
  }

  updateStudent(id: string, updates: Partial<Student>): Student | null {
    const student = this.data.students.find((s) => s.id === id);
    if (!student) return null;
    Object.assign(student, updates);
    this.updateBatchCounts(student.batchId);
    this.persist();
    return student;
  }

  updateStudentStatus(id: string, status: Student['status'], emailStatus?: Student['emailStatus'], emailError?: string | null): void {
    const student = this.data.students.find((s) => s.id === id);
    if (!student) return;
    student.status = status;
    if (emailStatus) student.emailStatus = emailStatus;
    if (emailError !== undefined) student.emailError = emailError;
    if (emailStatus === 'sent') student.emailSentAt = new Date().toISOString();
    this.updateBatchCounts(student.batchId);
    this.persist();
  }

  deleteStudent(id: string): void {
    const student = this.data.students.find((s) => s.id === id);
    if (!student) return;
    const batchId = student.batchId;
    this.data.students = this.data.students.filter((s) => s.id !== id);
    this.updateBatchCounts(batchId);
    this.persist();
  }

  // Templates
  getTemplates(): CertificateTemplate[] {
    return this.data.templates;
  }

  getTemplate(id: string): CertificateTemplate | undefined {
    return this.data.templates.find((t) => t.id === id);
  }

  createTemplate(template: Omit<CertificateTemplate, 'id' | 'createdAt' | 'updatedAt'>): CertificateTemplate {
    const newTemplate: CertificateTemplate = {
      ...template,
      id: `tmpl-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (newTemplate.isDefault) {
      this.data.templates.forEach((t) => (t.isDefault = false));
    }
    this.data.templates.push(newTemplate);
    this.persist();
    return newTemplate;
  }

  updateTemplate(id: string, updates: Partial<CertificateTemplate>): CertificateTemplate | null {
    const template = this.data.templates.find((t) => t.id === id);
    if (!template) return null;
    if (updates.isDefault) {
      this.data.templates.forEach((t) => (t.isDefault = false));
    }
    Object.assign(template, updates, { updatedAt: new Date().toISOString() });
    this.persist();
    return template;
  }

  // Email Settings
  getEmailSettings(): EmailSettings {
    return this.data.emailSettings;
  }

  updateEmailSettings(settings: Partial<EmailSettings>): EmailSettings {
    // If empty authPass is sent, preserve the existing password
    if (settings.authPass === '' && this.data.emailSettings.authPass) {
      delete settings.authPass;
    }
    this.data.emailSettings = {
      ...this.data.emailSettings,
      ...settings,
      isConfigured: !!(settings.authUser || this.data.emailSettings.authUser) && !!(settings.authPass || this.data.emailSettings.authPass),
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    return this.data.emailSettings;
  }

  // Email Logs
  addEmailLog(log: Omit<EmailLog, 'id' | 'sentAt'>): EmailLog {
    const newLog: EmailLog = {
      ...log,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sentAt: new Date().toISOString(),
    };
    this.data.emailLogs.unshift(newLog);
    // Keep max 1000 logs
    if (this.data.emailLogs.length > 1000) {
      this.data.emailLogs = this.data.emailLogs.slice(0, 1000);
    }
    this.persist();
    return newLog;
  }

  getEmailLogs(batchId?: string): EmailLog[] {
    if (batchId) {
      return this.data.emailLogs.filter((l) => l.batchId === batchId);
    }
    return this.data.emailLogs;
  }

  clearEmailLogs(batchId?: string): void {
    if (batchId) {
      this.data.emailLogs = this.data.emailLogs.filter((l) => l.batchId !== batchId);
    } else {
      this.data.emailLogs = [];
    }
    this.persist();
  }
}

export const db = new Database();
