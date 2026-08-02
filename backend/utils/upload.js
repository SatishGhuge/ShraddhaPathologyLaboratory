import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure uploads directory exists
const uploadDir = 'uploads/attachments';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `attachment_${Date.now()}${ext}`);
  }
});

const memoryStorage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = [
    'image/jpeg', 
    'image/png', 
    'image/gif', 
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel' // .xls
  ];
  allowed.includes(file.mimetype) 
    ? cb(null, true) 
    : cb(new Error('Only images, PDFs, and Excel files allowed'));
};

export const upload = multer({ storage: diskStorage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB for disk uploads

export const excelUpload = multer({ storage: memoryStorage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB for Excel files in memory
