import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import type { Student } from '../src/types.ts';

export interface ParsedStudentRow {
  name: string;
  studentClass: string;
  section: string;
  project: string;
  competition: string;
  email: string;
  certificateId?: string;
  isValid: boolean;
  errors: string[];
}

export interface ParseResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  students: ParsedStudentRow[];
  headersDetected: string[];
  samplePreview: ParsedStudentRow[];
}

// Intelligent column header mapper
function normalizeHeaders(rawRow: Record<string, any>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, val] of Object.entries(rawRow)) {
    const k = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const stringVal = val !== undefined && val !== null ? String(val).trim() : '';

    if (k === 'name' || k === 'studentname' || k === 'fullname' || k === 'candidate' || k === 'student') {
      normalized.name = stringVal;
    } else if (k === 'class' || k === 'grade' || k === 'standard' || k === 'studentclass') {
      normalized.studentClass = stringVal;
    } else if (k === 'section' || k === 'sec' || k === 'division' || k === 'studentsection') {
      normalized.section = stringVal;
    } else if (k === 'project' || k === 'projecttitle' || k === 'topic' || k === 'work' || k === 'title') {
      normalized.project = stringVal;
    } else if (k === 'competition' || k === 'event' || k === 'contest' || k === 'olympiad' || k === 'category') {
      normalized.competition = stringVal;
    } else if (k === 'email' || k === 'emailaddress' || k === 'studentemail' || k === 'mail') {
      normalized.email = stringVal;
    } else if (k === 'certificateid' || k === 'certid' || k === 'id' || k === 'rollno' || k === 'rollnumber') {
      normalized.certificateId = stringVal;
    }
  }
  return normalized;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateAndMapRow(raw: Record<string, string>, defaultCompetition = ''): ParsedStudentRow {
  const errors: string[] = [];

  const name = raw.name || '';
  const studentClass = raw.studentClass || 'Grade 10';
  const section = raw.section || 'A';
  const project = raw.project || 'Academic Excellence';
  const competition = raw.competition || defaultCompetition || 'Mount Learner Academy Annual Academic Honours';
  const email = raw.email || '';
  const certificateId = raw.certificateId || '';

  if (!name || name.trim().length < 2) {
    errors.push('Student name is missing or too short');
  }
  if (!email) {
    errors.push('Email address is missing');
  } else if (!EMAIL_REGEX.test(email)) {
    errors.push('Invalid email format');
  }

  return {
    name: name.trim(),
    studentClass: studentClass.trim(),
    section: section.trim(),
    project: project.trim(),
    competition: competition.trim(),
    email: email.trim(),
    certificateId: certificateId.trim() || undefined,
    isValid: errors.length === 0,
    errors,
  };
}

export function parseCsvOrText(rawText: string, defaultCompetition = ''): ParseResult {
  const parsed = Papa.parse<Record<string, any>>(rawText.trim(), {
    header: true,
    skipEmptyLines: 'greedy',
    dynamicTyping: false,
  });

  const headersDetected = parsed.meta.fields || [];
  const students: ParsedStudentRow[] = [];

  for (const rawRow of parsed.data) {
    // If header wasn't properly detected (e.g. raw comma separated values without matching keys)
    const normalized = normalizeHeaders(rawRow);
    const row = validateAndMapRow(normalized, defaultCompetition);
    // Ignore completely blank rows
    if (row.name || row.email) {
      students.push(row);
    }
  }

  const validRows = students.filter((s) => s.isValid).length;
  return {
    totalRows: students.length,
    validRows,
    invalidRows: students.length - validRows,
    students,
    headersDetected,
    samplePreview: students.slice(0, 5),
  };
}

export function parseExcelBuffer(buffer: Buffer, defaultCompetition = ''): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

  const headersDetected = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
  const students: ParsedStudentRow[] = [];

  for (const rawRow of jsonData) {
    const normalized = normalizeHeaders(rawRow);
    const row = validateAndMapRow(normalized, defaultCompetition);
    if (row.name || row.email) {
      students.push(row);
    }
  }

  const validRows = students.filter((s) => s.isValid).length;
  return {
    totalRows: students.length,
    validRows,
    invalidRows: students.length - validRows,
    students,
    headersDetected,
    samplePreview: students.slice(0, 5),
  };
}

export async function parseDocxBuffer(buffer: Buffer, defaultCompetition = ''): Promise<ParseResult> {
  const result = await mammoth.extractRawText({ buffer });
  const rawText = result.value;

  // Split lines
  const lines = rawText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  // Attempt to see if it's tab-separated, comma-separated, or labeled key-value pairs
  const tsvText = lines.join('\n');
  return parseCsvOrText(tsvText, defaultCompetition);
}

export function parsePdfText(rawText: string, defaultCompetition = ''): ParseResult {
  // Simple delimiter parser for extracted text from PDF
  return parseCsvOrText(rawText, defaultCompetition);
}
