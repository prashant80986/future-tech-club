export type EmailStatus = 'draft' | 'generated' | 'queued' | 'sending' | 'sent' | 'failed' | 'skipped';

export interface Student {
  id: string;
  batchId: string;
  name: string;
  studentClass: string;
  section: string;
  project: string;
  competition: string;
  email: string;
  certificateId: string;
  status: 'draft' | 'generated' | 'emailed' | 'failed';
  emailStatus: EmailStatus;
  emailSentAt?: string | null;
  emailError?: string | null;
  createdAt: string;
}

export interface Batch {
  id: string;
  name: string;
  academicYear: string;
  competition: string;
  totalStudents: number;
  generatedCount: number;
  emailedCount: number;
  templateId?: string;
  createdAt: string;
  updatedAt: string;
}

export type ElementType =
  | 'studentName'
  | 'studentClass'
  | 'studentSection'
  | 'project'
  | 'competition'
  | 'date'
  | 'certificateId'
  | 'academyLogo'
  | 'signature'
  | 'signatureName'
  | 'signatureTitle'
  | 'qrCode'
  | 'title'
  | 'subtitle'
  | 'bodyText';

export interface TemplateElement {
  id: ElementType;
  label: string;
  x: number; // percentage from left (0 to 100)
  y: number; // percentage from top (0 to 100)
  width?: number; // percentage width (optional for auto)
  height?: number; // percentage height
  fontSize: number; // pt (10 to 60)
  fontFamily: 'Plus Jakarta Sans' | 'Playfair Display' | 'Cinzel' | 'Times-Roman' | 'Helvetica';
  fontWeight: 'normal' | 'bold' | '500' | '600' | '700';
  color: string; // hex
  textAlign: 'left' | 'center' | 'right';
  visible: boolean;
  textTransform?: 'none' | 'uppercase' | 'capitalize';
  customText?: string; // override for body text, title, etc.
}

export interface CertificateTemplate {
  id: string;
  name: string;
  description: string;
  bgType: 'classic' | 'modern' | 'minimal' | 'custom_image' | 'custom_pdf';
  bgUrl: string;
  orientation: 'landscape' | 'portrait';
  elements: TemplateElement[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmailSettings {
  host: string;
  port: number;
  secure: boolean;
  authUser: string;
  authPass?: string; // Only passed on update, not returned in full
  isConfigured: boolean;
  senderName: string;
  senderEmail: string;
  batchSize: number;
  throttleDelayMs: number;
  subjectTemplate: string;
  bodyTemplate: string;
  updatedAt: string;
}

export interface EmailLog {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  certificateId: string;
  batchId: string;
  status: 'sent' | 'failed' | 'skipped';
  error?: string | null;
  messageId?: string | null;
  previewUrl?: string | null;
  sentAt: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'staff';
}

export interface BatchGenerationProgress {
  total: number;
  completed: number;
  currentStudent?: string;
  isProcessing: boolean;
  errors: string[];
}
