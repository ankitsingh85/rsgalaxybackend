import multer from 'multer';

const storage = multer.memoryStorage();

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (!file.mimetype.startsWith('image/')) {
    cb(new Error('Only image files are allowed'));
    return;
  }
  cb(null, true);
};

export const uploadImages = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
});

const videoFileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (!file.mimetype.startsWith('video/')) {
    cb(new Error('Only video files are allowed'));
    return;
  }
  cb(null, true);
};

export const uploadVideos = multer({
  storage,
  fileFilter: videoFileFilter,
  limits: { fileSize: 50 * 1024 * 1024, files: 4 },
});

const pdfFileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype !== 'application/pdf') {
    cb(new Error('Only PDF files are allowed'));
    return;
  }
  cb(null, true);
};

export const uploadDocuments = multer({
  storage,
  fileFilter: pdfFileFilter,
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
});
