import { Batch, Student, CertificateTemplate, EmailSettings, EmailLog, AdminUser } from '../types.ts';

let authToken = localStorage.getItem('mla_auth_token') || '';
let csrfToken = localStorage.getItem('mla_csrf_token') || '';

export function setAuthSession(token: string, csrf: string) {
  authToken = token;
  csrfToken = csrf;
  localStorage.setItem('mla_auth_token', token);
  localStorage.setItem('mla_csrf_token', csrf);
}

export function clearAuthSession() {
  authToken = '';
  csrfToken = '';
  localStorage.removeItem('mla_auth_token');
  localStorage.removeItem('mla_csrf_token');
}

export function getAuthToken(): string {
  return authToken;
}

export function getCsrfToken(): string {
  return csrfToken;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }
  if (csrfToken && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method || 'GET')) {
    headers.set('x-csrf-token', csrfToken);
  }

  // If not FormData, default to application/json
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearAuthSession();
    window.dispatchEvent(new CustomEvent('mla_auth_expired'));
    throw new Error('Session expired or unauthorized. Please log in.');
  }

  if (!response.ok) {
    let errorMsg = `Request failed (${response.status})`;
    try {
      const errorJson = await response.json();
      if (errorJson.error) errorMsg = errorJson.error;
      else if (errorJson.message) errorMsg = errorJson.message;
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ token: string; csrfToken: string; user: AdminUser }> {
    const data = await request<{ token: string; csrfToken: string; user: AdminUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthSession(data.token, data.csrfToken);
    return data;
  },

  async logout(): Promise<void> {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } finally {
      clearAuthSession();
    }
  },

  async getMe(): Promise<{ user: AdminUser; csrfToken: string }> {
    const data = await request<{ user: AdminUser; csrfToken: string }>('/api/auth/me');
    if (data.csrfToken) {
      csrfToken = data.csrfToken;
      localStorage.setItem('mla_csrf_token', data.csrfToken);
    }
    return data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return request('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  // Batches
  async getBatches(): Promise<{ batches: Batch[] }> {
    return request('/api/batches');
  },

  async getBatch(id: string): Promise<{ batch: Batch; students: Student[] }> {
    return request(`/api/batches/${id}`);
  },

  async createBatch(batchData: { name: string; academicYear: string; competition: string; templateId?: string }): Promise<{ batch: Batch }> {
    return request('/api/batches', {
      method: 'POST',
      body: JSON.stringify(batchData),
    });
  },

  async deleteBatch(id: string): Promise<{ success: boolean }> {
    return request(`/api/batches/${id}`, { method: 'DELETE' });
  },

  // Students
  async getStudents(batchId?: string): Promise<{ students: Student[] }> {
    return request(`/api/students${batchId ? `?batchId=${batchId}` : ''}`);
  },

  async addStudentsBulk(batchId: string, students: Array<Partial<Student>>): Promise<{ success: boolean; count: number; students: Student[] }> {
    return request('/api/students/bulk', {
      method: 'POST',
      body: JSON.stringify({ batchId, students }),
    });
  },

  async updateStudent(id: string, updates: Partial<Student>): Promise<{ student: Student }> {
    return request(`/api/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteStudent(id: string): Promise<{ success: boolean }> {
    return request(`/api/students/${id}`, { method: 'DELETE' });
  },

  // Import
  async parsePastedText(rawText: string, competition?: string) {
    return request<any>('/api/import/parse-text', {
      method: 'POST',
      body: JSON.stringify({ rawText, competition }),
    });
  },

  async uploadFile(file: File, competition?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (competition) formData.append('competition', competition);

    return request<any>('/api/import/upload-file', {
      method: 'POST',
      body: formData,
    });
  },

  // Templates
  async getTemplates(): Promise<{ templates: CertificateTemplate[] }> {
    return request('/api/templates');
  },

  async getTemplate(id: string): Promise<{ template: CertificateTemplate }> {
    return request(`/api/templates/${id}`);
  },

  async createTemplate(template: Partial<CertificateTemplate>): Promise<{ template: CertificateTemplate }> {
    return request('/api/templates', {
      method: 'POST',
      body: JSON.stringify(template),
    });
  },

  async updateTemplate(id: string, updates: Partial<CertificateTemplate>): Promise<{ template: CertificateTemplate }> {
    return request(`/api/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async uploadBackground(file: File): Promise<{ url: string; filename: string; isPdf: boolean }> {
    const formData = new FormData();
    formData.append('background', file);
    return request('/api/templates/upload-bg', {
      method: 'POST',
      body: formData,
    });
  },

  // Generation & Downloads
  async downloadStudentPdf(studentId: string, templateId?: string, studentName?: string, certId?: string): Promise<void> {
    const url = `/api/generate/student/${studentId}/pdf${templateId ? `?templateId=${templateId}` : ''}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    if (!response.ok) throw new Error('Failed to generate PDF');
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `MLA_Certificate_${certId || studentId}_${(studentName || 'Student').replace(/\s+/g, '_')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },

  async downloadBatchZip(batchId: string, templateId?: string, batchName?: string): Promise<void> {
    const response = await fetch(`/api/generate/batch/${batchId}/zip`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify({ templateId }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to generate bulk ZIP');
    }
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `Mount_Learner_Academy_Certificates_${(batchName || 'Batch').replace(/\s+/g, '_')}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },

  async markBatchGenerated(batchId: string): Promise<void> {
    await request(`/api/generate/batch/${batchId}/mark-generated`, { method: 'POST' });
  },

  // Reports
  async downloadReport(batchId: string, format: 'csv' | 'xlsx'): Promise<void> {
    const url = `/api/reports/batch/${batchId}/${format}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    if (!response.ok) throw new Error(`Failed to generate ${format.toUpperCase()} report`);
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `Mount_Learner_Academy_Report_${batchId}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },

  // Email
  async getEmailSettings(): Promise<{ settings: EmailSettings }> {
    return request('/api/settings/email');
  },

  async updateEmailSettings(settings: Partial<EmailSettings>): Promise<{ success: boolean; settings: EmailSettings }> {
    return request('/api/settings/email', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  },

  async testSmtpConnection(): Promise<{ success: boolean; message: string }> {
    return request('/api/email/test-connection', { method: 'POST' });
  },

  async provisionTestAccount(): Promise<{
    success: boolean;
    message: string;
    user: string;
    pass: string;
    host: string;
    port: number;
  }> {
    return request('/api/email/provision-test-account', { method: 'POST' });
  },

  async sendSingleTestEmail(
    destinationEmail: string,
    templateId?: string
  ): Promise<{
    success: boolean;
    message: string;
    messageId?: string;
    previewUrl?: string | null;
  }> {
    return request('/api/email/send-test-single', {
      method: 'POST',
      body: JSON.stringify({ destinationEmail, templateId }),
    });
  },

  async sendBatchEmails(
    studentIds: string[],
    templateId: string,
    forceResend: boolean = false
  ): Promise<{
    totalProcessed: number;
    sentCount: number;
    failedCount: number;
    skippedCount: number;
    errors: Array<{ studentId: string; studentName: string; error: string }>;
  }> {
    return request('/api/email/send-batch', {
      method: 'POST',
      body: JSON.stringify({ studentIds, templateId, forceResend }),
    });
  },

  async getEmailLogs(batchId?: string): Promise<{ logs: EmailLog[] }> {
    return request(`/api/email/logs${batchId ? `?batchId=${batchId}` : ''}`);
  },

  async clearEmailLogs(batchId?: string): Promise<{ success: boolean }> {
    return request('/api/email/clear-logs', {
      method: 'POST',
      body: JSON.stringify({ batchId }),
    });
  },

  // Public verification
  async verifyCertificate(certId: string): Promise<any> {
    const res = await fetch(`/api/verify/${certId}`);
    return res.json();
  },
};
