import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import type { Student, CertificateTemplate } from '../src/types.ts';

// Cache images in memory for speed during bulk generation of 100+ certificates
const imageCache: Map<string, Buffer> = new Map();

function getFileBuffer(filePathOrUrl: string): Buffer | null {
  if (imageCache.has(filePathOrUrl)) {
    return imageCache.get(filePathOrUrl)!;
  }
  try {
    // Resolve relative path to root or public directory
    const resolvedPath = filePathOrUrl.startsWith('/')
      ? path.resolve(process.cwd(), filePathOrUrl.slice(1))
      : path.resolve(process.cwd(), filePathOrUrl);

    if (fs.existsSync(resolvedPath)) {
      const buffer = fs.readFileSync(resolvedPath);
      imageCache.set(filePathOrUrl, buffer);
      return buffer;
    }
  } catch (err) {
    console.warn(`Could not read image file at ${filePathOrUrl}:`, err);
  }
  return null;
}

// Convert hex color '#1e3a8a' to pdf-lib rgb values 0-1
function hexToRgb(hex: string) {
  let cleaned = hex.replace('#', '');
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map((c) => c + c).join('');
  }
  const num = parseInt(cleaned, 16);
  if (isNaN(num)) return rgb(0.1, 0.2, 0.5);
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  return rgb(r, g, b);
}

export async function generateStudentPdf(
  student: Student,
  template: CertificateTemplate,
  appUrl: string = 'https://mountlearner.edu'
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();

  // A4 Landscape: 841.89 x 595.28 points
  const pageWidth = template.orientation === 'portrait' ? 595.28 : 841.89;
  const pageHeight = template.orientation === 'portrait' ? 841.89 : 595.28;
  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  // Embed standard typography fonts
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Background handling
  let bgEmbedded = false;
  if (template.bgUrl) {
    const bgBuffer = getFileBuffer(template.bgUrl);
    if (bgBuffer) {
      try {
        const isJpg = template.bgUrl.endsWith('.jpg') || template.bgUrl.endsWith('.jpeg');
        const bgImg = isJpg ? await pdfDoc.embedJpg(bgBuffer) : await pdfDoc.embedPng(bgBuffer);
        page.drawImage(bgImg, {
          x: 0,
          y: 0,
          width: pageWidth,
          height: pageHeight,
        });
        bgEmbedded = true;
      } catch (err) {
        console.warn('Failed to embed bg image:', err);
      }
    }
  }

  // If no background image, draw vector academy frame & ornaments
  if (!bgEmbedded) {
    // Outer border
    page.drawRectangle({
      x: 20,
      y: 20,
      width: pageWidth - 40,
      height: pageHeight - 40,
      borderColor: rgb(0.12, 0.23, 0.54), // Deep Navy
      borderWidth: 4,
      color: rgb(0.99, 0.99, 0.98), // Ivory Parchment
    });
    // Inner decorative gold border
    page.drawRectangle({
      x: 28,
      y: 28,
      width: pageWidth - 56,
      height: pageHeight - 56,
      borderColor: rgb(0.82, 0.68, 0.35), // Antique Gold
      borderWidth: 1.5,
    });
    page.drawRectangle({
      x: 34,
      y: 34,
      width: pageWidth - 68,
      height: pageHeight - 68,
      borderColor: rgb(0.12, 0.23, 0.54),
      borderWidth: 0.5,
    });
  }

  // Pre-load Crest Logo
  const crestPath = '/src/assets/images/mount_learner_crest_1791599731443.jpg';
  const crestBuffer = getFileBuffer(crestPath);
  let crestImg: any = null;
  if (crestBuffer) {
    try {
      crestImg = await pdfDoc.embedJpg(crestBuffer);
    } catch (e) {
      // ignore
    }
  }

  // Pre-load Signature
  const sigPath = '/src/assets/images/official_signature_1791599779254.jpg';
  const sigBuffer = getFileBuffer(sigPath);
  let sigImg: any = null;
  if (sigBuffer) {
    try {
      sigImg = await pdfDoc.embedJpg(sigBuffer);
    } catch (e) {
      // ignore
    }
  }

  // Pre-generate Verification QR Code
  let qrImg: any = null;
  try {
    const verifyUrl = `${appUrl}/verify/${student.certificateId}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 160,
      color: {
        dark: '#1e3a8a',
        light: '#ffffff',
      },
    });
    const qrBuffer = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
    qrImg = await pdfDoc.embedPng(qrBuffer);
  } catch (err) {
    console.warn('QR code generation failed:', err);
  }

  // Render elements in template order
  for (const el of template.elements) {
    if (!el.visible) continue;

    // Convert percentage coordinates (x: 0-100%, y: 0-100% from TOP) to pdf points (0,0 at BOTTOM-LEFT)
    const targetX = (el.x / 100) * pageWidth;
    const targetY = pageHeight - (el.y / 100) * pageHeight;

    if (el.id === 'academyLogo' && crestImg) {
      const imgWidth = 72;
      const imgHeight = 72;
      page.drawImage(crestImg, {
        x: targetX - imgWidth / 2,
        y: targetY - imgHeight / 2,
        width: imgWidth,
        height: imgHeight,
      });
      continue;
    }

    if (el.id === 'signature' && sigImg) {
      const sigWidth = 110;
      const sigHeight = 55;
      page.drawImage(sigImg, {
        x: targetX - sigWidth / 2,
        y: targetY - sigHeight / 2 + 5,
        width: sigWidth,
        height: sigHeight,
      });
      continue;
    }

    if (el.id === 'qrCode' && qrImg) {
      const qrSize = 50;
      page.drawImage(qrImg, {
        x: targetX - qrSize / 2,
        y: targetY - qrSize / 2,
        width: qrSize,
        height: qrSize,
      });
      continue;
    }

    // Determine element text
    let textToDraw = '';
    switch (el.id) {
      case 'studentName':
        textToDraw = student.name;
        break;
      case 'studentClass':
        textToDraw = `${student.studentClass} • Section ${student.section}`;
        break;
      case 'project':
        textToDraw = `Project: "${student.project}"`;
        break;
      case 'competition':
        textToDraw = student.competition;
        break;
      case 'date':
        textToDraw = `Issued: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
        break;
      case 'certificateId':
        textToDraw = `ID: ${student.certificateId}`;
        break;
      case 'title':
        textToDraw = el.customText || 'CERTIFICATE OF EXCELLENCE';
        break;
      case 'subtitle':
        textToDraw = el.customText || 'THIS CERTIFICATE IS PROUDLY PRESENTED TO';
        break;
      case 'bodyText':
        textToDraw = el.customText || 'for exemplary merit, intellectual vigor, and distinguished performance in';
        break;
      case 'signatureName':
        textToDraw = el.customText || 'Dr. Arthur Vance, Ph.D.';
        break;
      case 'signatureTitle':
        textToDraw = el.customText || 'Headmaster, Mount Learner Academy';
        break;
      default:
        textToDraw = el.customText || '';
    }

    if (!textToDraw) continue;

    if (el.textTransform === 'uppercase') {
      textToDraw = textToDraw.toUpperCase();
    }

    // Font selection
    let fontToUse = helvetica;
    if (el.fontFamily === 'Playfair Display' || el.fontFamily === 'Cinzel' || el.fontFamily === 'Times-Roman') {
      fontToUse = el.fontWeight === 'bold' || el.fontWeight === '700' ? timesBold : timesRoman;
    } else {
      fontToUse = el.fontWeight === 'bold' || el.fontWeight === '700' ? helveticaBold : helvetica;
    }

    const fontSize = el.fontSize || 14;
    const textColor = hexToRgb(el.color || '#0f172a');
    const textWidth = fontToUse.widthOfTextAtSize(textToDraw, fontSize);

    let drawX = targetX;
    if (el.textAlign === 'center') {
      drawX = targetX - textWidth / 2;
    } else if (el.textAlign === 'right') {
      drawX = targetX - textWidth;
    }

    page.drawText(textToDraw, {
      x: drawX,
      y: targetY - fontSize / 3, // visual vertical alignment
      size: fontSize,
      font: fontToUse,
      color: textColor,
    });
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function generateBulkZip(
  students: Student[],
  template: CertificateTemplate,
  appUrl: string = 'https://mountlearner.edu'
): Promise<Buffer> {
  const zip = new JSZip();
  const folder = zip.folder('Mount_Learner_Academy_Certificates') || zip;

  for (const student of students) {
    const pdfBuffer = await generateStudentPdf(student, template, appUrl);
    const sanitizedName = student.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${student.certificateId}_${sanitizedName}.pdf`;
    folder.file(fileName, pdfBuffer);
  }

  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return zipBuffer;
}
