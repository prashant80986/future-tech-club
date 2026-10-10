import nodemailer from 'nodemailer';
import { db } from './db.ts';
import type { Student, CertificateTemplate } from '../src/types.ts';
import { generateStudentPdf } from './pdfGenerator.ts';

export interface SendResult {
  totalProcessed: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  errors: Array<{ studentId: string; studentName: string; error: string }>;
}

export function createTransporter() {
  const settings = db.getEmailSettings();
  if (!settings.authUser || !settings.authPass) {
    throw new Error(
      'Email SMTP credentials are not configured. Please open Email Settings to enter your Gmail/SMTP credentials or click "1-Click Free Test SMTP Account".'
    );
  }

  const isPort465 = Number(settings.port) === 465;
  const transporter = nodemailer.createTransport({
    host: settings.host || 'smtp.gmail.com',
    port: Number(settings.port) || (isPort465 ? 465 : 587),
    secure: settings.secure !== undefined ? settings.secure : isPort465,
    auth: {
      user: settings.authUser,
      pass: settings.authPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
  });

  return transporter;
}

export async function provisionEtherealAccount(): Promise<{
  success: boolean;
  message: string;
  user: string;
  pass: string;
  host: string;
  port: number;
}> {
  try {
    const testAccount = await nodemailer.createTestAccount();
    db.updateEmailSettings({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      authUser: testAccount.user,
      authPass: testAccount.pass,
      senderName: 'Mount Learner Academy Certifications Office',
      senderEmail: testAccount.user,
      isConfigured: true,
    });

    return {
      success: true,
      message: `Provisioned live real test SMTP account (${testAccount.user})! Emails will be transmitted over real SMTP with live web view links.`,
      user: testAccount.user,
      pass: testAccount.pass,
      host: 'smtp.ethereal.email',
      port: 587,
    };
  } catch (err: any) {
    throw new Error(`Failed to provision test SMTP account: ${err.message}`);
  }
}

export async function testSmtpConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    const settings = db.getEmailSettings();
    return {
      success: true,
      message: `SMTP connection to ${settings.host}:${settings.port} verified successfully! Ready to dispatch real emails with PDF attachments.`,
    };
  } catch (err: any) {
    let msg = err.message || 'SMTP connection verification failed.';
    if (msg.includes('Invalid login') || msg.includes('535-5.7.8') || msg.includes('535 5.7.8')) {
      msg = 'Authentication failed: If using Gmail, make sure you generated a 16-character Google App Password (myaccount.google.com/security) rather than your standard account login password.';
    }
    return {
      success: false,
      message: msg,
    };
  }
}

function replaceEmailPlaceholders(template: string, student: Student): string {
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  return template
    .replace(/\{\{name\}\}/gi, student.name)
    .replace(/\{\{class\}\}/gi, student.studentClass)
    .replace(/\{\{section\}\}/gi, student.section)
    .replace(/\{\{project\}\}/gi, student.project)
    .replace(/\{\{competition\}\}/gi, student.competition)
    .replace(/\{\{certificateId\}\}/gi, student.certificateId)
    .replace(/\{\{date\}\}/gi, dateStr)
    .replace(/\{\{school\}\}/gi, 'Mount Learner Academy');
}

export async function sendSingleTestEmail(
  destinationEmail: string,
  template: CertificateTemplate,
  appUrl: string = 'https://mountlearner.edu'
): Promise<{ success: boolean; message: string; messageId?: string; previewUrl?: string | null }> {
  const settings = db.getEmailSettings();
  const transporter = createTransporter();

  // Create sample dummy candidate for test delivery
  const dummyStudent: Student = {
    id: 'test-student',
    batchId: 'test-batch',
    name: 'Academic Honours Candidate (Live Test)',
    studentClass: 'Grade 12',
    section: 'A',
    project: 'Autonomous Solar Spectrometer',
    competition: 'Mount Learner Academy Annual STEM & Innovation Olympiad',
    email: destinationEmail,
    certificateId: 'MLA-2026-LIVE-TEST',
    status: 'generated',
    emailStatus: 'draft',
    createdAt: new Date().toISOString(),
  };

  const pdfBuffer = await generateStudentPdf(dummyStudent, template, appUrl);
  const subject = `[LIVE TEST] Mount Learner Academy Official Certificate: ${dummyStudent.competition}`;
  const textBody = replaceEmailPlaceholders(settings.bodyTemplate, dummyStudent);
  const htmlBody = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
      <div style="border-bottom: 2px solid #1e3a8a; padding-bottom: 16px; margin-bottom: 24px; text-align: center;">
        <h1 style="color: #1e3a8a; margin: 0; font-size: 24px; letter-spacing: 0.5px;">MOUNT LEARNER ACADEMY</h1>
        <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 1.5px;">Office of Academic Honours & Certifications</p>
      </div>
      
      <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 12px 16px; margin-bottom: 20px; color: #1e40af; font-size: 13px;">
        <strong>Live System Test Message:</strong> This email verifies that the server-side SMTP mail dispatch pipeline is fully operational with real PDF certificate attachment.
      </div>

      <div style="color: #1e293b; font-size: 15px; line-height: 1.6; white-space: pre-line;">
${textBody}
      </div>

      <div style="margin-top: 28px; padding: 16px; background-color: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; text-align: center;">
        <p style="margin: 0 0 8px 0; font-size: 13px; color: #475569;">Digital Verification Record</p>
        <p style="margin: 0; font-size: 14px; font-weight: bold; color: #1e3a8a;">Certificate ID: ${dummyStudent.certificateId}</p>
      </div>

      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
        <p style="margin: 0;">Mount Learner Academy • Ad Scientiam Et Veritatem</p>
      </div>
    </div>
  `;

  const info = await transporter.sendMail({
    from: `"${settings.senderName}" <${settings.senderEmail || settings.authUser}>`,
    to: destinationEmail,
    subject,
    text: textBody,
    html: htmlBody,
    attachments: [
      {
        filename: `Mount_Learner_Academy_Test_Certificate_${dummyStudent.certificateId}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });

  const previewUrl = nodemailer.getTestMessageUrl(info) || null;

  return {
    success: true,
    message: `Live test email successfully transmitted to ${destinationEmail}!`,
    messageId: info.messageId,
    previewUrl,
  };
}

export async function sendCertificatesBatch(
  studentIds: string[],
  template: CertificateTemplate,
  options: {
    forceResend?: boolean;
    appUrl?: string;
    onProgress?: (processed: number, total: number) => void;
  } = {}
): Promise<SendResult> {
  const settings = db.getEmailSettings();
  const transporter = createTransporter();
  const appUrl = options.appUrl || 'https://mountlearner.edu';

  const studentsToSend: Student[] = [];
  let skippedCount = 0;

  for (const id of studentIds) {
    const student = db.getStudent(id);
    if (!student) continue;

    // Duplicate check
    if (!options.forceResend && student.emailStatus === 'sent') {
      skippedCount++;
      db.addEmailLog({
        studentId: student.id,
        studentName: student.name,
        studentEmail: student.email,
        certificateId: student.certificateId,
        batchId: student.batchId,
        status: 'skipped',
        error: 'Skipped to prevent duplicate send (already sent). Check "Force Resend" to send again.',
      });
      continue;
    }

    studentsToSend.push(student);
  }

  const result: SendResult = {
    totalProcessed: studentIds.length,
    sentCount: 0,
    failedCount: 0,
    skippedCount,
    errors: [],
  };

  const batchSize = Math.max(1, Math.min(settings.batchSize || 20, 50));
  const delayMs = Math.max(500, settings.throttleDelayMs || 2000);

  // Process in throttled sub-batches
  for (let i = 0; i < studentsToSend.length; i += batchSize) {
    const chunk = studentsToSend.slice(i, i + batchSize);

    for (const student of chunk) {
      try {
        // Generate PDF attachment
        const pdfBuffer = await generateStudentPdf(student, template, appUrl);
        const subject = replaceEmailPlaceholders(settings.subjectTemplate, student);
        const textBody = replaceEmailPlaceholders(settings.bodyTemplate, student);

        const htmlBody = `
          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
            <div style="border-bottom: 2px solid #1e3a8a; padding-bottom: 16px; margin-bottom: 24px; text-align: center;">
              <h1 style="color: #1e3a8a; margin: 0; font-size: 24px; letter-spacing: 0.5px;">MOUNT LEARNER ACADEMY</h1>
              <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 1.5px;">Office of Academic Honours & Certifications</p>
            </div>
            
            <div style="color: #1e293b; font-size: 15px; line-height: 1.6; white-space: pre-line;">
${textBody}
            </div>

            <div style="margin-top: 28px; padding: 16px; background-color: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #475569;">Digital Verification Record</p>
              <p style="margin: 0; font-size: 14px; font-weight: bold; color: #1e3a8a;">Certificate ID: ${student.certificateId}</p>
            </div>

            <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
              <p style="margin: 0;">This official digital credential was issued by Mount Learner Academy. Please retain the attached PDF for your academic portfolio.</p>
            </div>
          </div>
        `;

        const sanitizedName = student.name.replace(/[^a-zA-Z0-9_-]/g, '_');
        const mailOptions = {
          from: `"${settings.senderName}" <${settings.senderEmail || settings.authUser}>`,
          to: student.email,
          subject,
          text: textBody,
          html: htmlBody,
          attachments: [
            {
              filename: `Mount_Learner_Academy_Certificate_${student.certificateId}_${sanitizedName}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf',
            },
          ],
        };

        const info = await transporter.sendMail(mailOptions);
        const previewUrl = (nodemailer.getTestMessageUrl(info) as string) || null;

        // Success
        db.updateStudentStatus(student.id, 'emailed', 'sent', null);
        db.addEmailLog({
          studentId: student.id,
          studentName: student.name,
          studentEmail: student.email,
          certificateId: student.certificateId,
          batchId: student.batchId,
          status: 'sent',
          error: null,
          messageId: info.messageId,
          previewUrl,
        });
        result.sentCount++;
      } catch (err: any) {
        const errorMsg = err.message || 'Email delivery failed';
        db.updateStudentStatus(student.id, 'failed', 'failed', errorMsg);
        db.addEmailLog({
          studentId: student.id,
          studentName: student.name,
          studentEmail: student.email,
          certificateId: student.certificateId,
          batchId: student.batchId,
          status: 'failed',
          error: errorMsg,
        });
        result.failedCount++;
        result.errors.push({
          studentId: student.id,
          studentName: student.name,
          error: errorMsg,
        });
      }

      if (options.onProgress) {
        options.onProgress(result.sentCount + result.failedCount + result.skippedCount, studentIds.length);
      }
    }

    // Delay between sub-batches to respect SMTP throttling limits (unless this is the last chunk)
    if (i + batchSize < studentsToSend.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return result;
}
