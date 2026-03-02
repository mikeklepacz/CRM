import multer from "multer";

export const alignerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedExtensions = [".txt", ".md", ".pdf", ".docx", ".csv"];
    const extension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf("."));
    if (allowedExtensions.includes(extension)) {
      cb(null, true);
      return;
    }
    cb(new Error(`File type not allowed. Supported formats: ${allowedExtensions.join(", ")}`));
  },
});
