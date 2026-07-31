import express from 'express';
import { upload } from '../utils/upload.js';

const router = express.Router();

/**
 * Extract text content from uploaded PDF file
 * POST /api/pdf-extract/extract-text
 */
router.post('/extract-text', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    console.log('📄 PDF File received:', {
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    // For now, return file info and path
    // In production, use pdf-parse or pdfjs-dist to extract text
    const fileUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/uploads/attachments/${req.file.filename}`;

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        filename: req.file.filename,
        path: req.file.path,
        fileUrl: fileUrl,
        size: req.file.size,
        mimetype: req.file.mimetype,
        uploadedAt: new Date().toISOString(),
        note: 'Actual text extraction requires PDF parsing library. For preview, file is stored and ready for manual review.'
      }
    });

  } catch (error) {
    console.error('❌ PDF extraction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to extract PDF',
      error: error.message
    });
  }
});

export default router;
