import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Resolve uploads directory
const uploadDir = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// File filter checking for allowed MIME types to prevent arbitrary malicious file uploads
const fileFilter = (req: any, file: any, cb: any) => {
  // Safe document / media MIME types
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'video/mp4',
    'audio/mpeg',
    'audio/mp3',
    'audio/ogg',
    'audio/wav',
    'audio/webm',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  // Prevent file upload bypass attempts like double extensions (e.g. mal.php.jpg) and direct execution types
  const parsed = path.parse(file.originalname);
  const harmfulExtensions = ['.html', '.htm', '.php', '.js', '.jsx', '.ts', '.tsx', '.exe', '.sh', '.bat', '.cmd', '.scr'];
  const ext = parsed.ext.toLowerCase();

  if (harmfulExtensions.includes(ext) || file.originalname.toLowerCase().includes('.php')) {
    return cb(new Error('Uploaded file extension is restricted for security reasons.'), false);
  }

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type '${file.mimetype}' is not permitted.`), false);
  }
};

// File configuration
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // Enforce 25MB maximum upload limit
  },
});
export { uploadDir };
