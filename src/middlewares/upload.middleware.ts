import multer from 'multer';

const storage = multer.memoryStorage();
const maxFileSizeMb = Number(process.env.MAX_FILE_SIZE_MB) || 10;

export const upload = multer({ 
  storage,
  limits: {
    fileSize: maxFileSizeMb * 1024 * 1024,
  }
});
