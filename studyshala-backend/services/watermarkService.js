/**
 * watermarkService.js
 * ===================
 * Embeds a small, subtle watermark into PDF and image files before
 * they are uploaded to Google Drive.
 *
 * Watermark text format:
 *   "StudyShala.dev | Uploaded by: [Faculty Name] | [Email]"
 *
 * PDF:   pdf-lib  — draws text at the bottom of every page
 * Image: sharp    — composites an SVG text strip at the bottom
 *
 * Both functions are safe: if processing fails for any reason, they
 * log a warning and return the original buffer unchanged so uploads
 * are never blocked.
 */

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const sharp = require('sharp');
const logger = require('../utils/logger');

// ── PDF watermark ────────────────────────────────────────────────────────────

const addPdfWatermark = async (buffer, watermarkText) => {
  try {
    const pdf   = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const font  = await pdf.embedFont(StandardFonts.Helvetica);
    const pages = pdf.getPages();

    for (const page of pages) {
      const { width } = page.getSize();
      const textWidth = font.widthOfTextAtSize(watermarkText, 8);
      const x = Math.max(10, (width - textWidth) / 2); // centered, min 10px from left

      page.drawText(watermarkText, {
        x,
        y:       12,         // near the very bottom
        size:    8,
        font,
        color:   rgb(0.50, 0.50, 0.50),
        opacity: 0.55
      });
    }

    const saved = await pdf.save();
    logger.info(`Watermark applied to PDF (${pages.length} pages)`);
    return Buffer.from(saved);
  } catch (err) {
    logger.warn(`PDF watermark failed — uploading original: ${err.message}`);
    return buffer;
  }
};

// ── Image watermark ──────────────────────────────────────────────────────────

const addImageWatermark = async (buffer, watermarkText, mimeType) => {
  // GIF not supported by sharp for compositing
  if (mimeType === 'image/gif') return buffer;

  try {
    const meta = await sharp(buffer).metadata();
    const imgWidth  = meta.width  || 800;
    const imgHeight = meta.height || 600;

    // Estimate text pixel width (rough: ~6.5px per char at font-size 13)
    const estTextWidth = watermarkText.length * 6.5;
    const svgWidth     = Math.max(imgWidth, Math.ceil(estTextWidth) + 20);

    const svgText = `
      <svg width="${svgWidth}" height="26" xmlns="http://www.w3.org/2000/svg">
        <rect width="${svgWidth}" height="26" fill="rgba(0,0,0,0.28)" rx="0"/>
        <text
          x="10" y="18"
          font-size="12"
          font-family="Arial, Helvetica, sans-serif"
          fill="rgba(255,255,255,0.75)"
          font-weight="normal"
        >${watermarkText}</text>
      </svg>`;

    const svgBuffer = Buffer.from(svgText);

    const result = await sharp(buffer)
      .composite([{
        input:   svgBuffer,
        gravity: 'south',        // always at bottom
        blend:   'over'
      }])
      .toBuffer();

    logger.info(`Watermark applied to image (${mimeType})`);
    return result;
  } catch (err) {
    logger.warn(`Image watermark failed — uploading original: ${err.message}`);
    return buffer;
  }
};

// ── Build watermark text ─────────────────────────────────────────────────────

const buildWatermarkText = (facultyName, email) => {
  return `StudyShala.dev | Uploaded by: ${facultyName} | ${email}`;
};

// ── Main entry point ─────────────────────────────────────────────────────────

const applyWatermark = async (buffer, mimeType, facultyName, email) => {
  const text = buildWatermarkText(facultyName, email);

  if (mimeType === 'application/pdf') {
    return addPdfWatermark(buffer, text);
  }

  if (mimeType.startsWith('image/')) {
    return addImageWatermark(buffer, text, mimeType);
  }

  // Other file types (DOCX, PPTX, ZIP, MP4, etc.) — no watermark
  return buffer;
};

module.exports = { applyWatermark, buildWatermarkText };
