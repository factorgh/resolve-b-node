import multer from 'multer';
import { isAllowedUploadMime } from '../utils/safeFilename';

const storage = multer.memoryStorage();
const maxFileSizeMb = Number(process.env.MAX_FILE_SIZE_MB) || 10;

export const upload = multer({
  storage,
  limits: {
    fileSize: maxFileSizeMb * 1024 * 1024,
    files: 5,
  },
  fileFilter: (_req, file, cb) => {
    if (isAllowedUploadMime(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type "${file.mimetype}" is not allowed. Use PDF, JPEG, PNG, or WebP.`));
    }
  },
});
