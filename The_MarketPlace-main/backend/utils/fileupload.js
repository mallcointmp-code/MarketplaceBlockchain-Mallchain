const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadDir = path.resolve('uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({ storage });

export async function uploadFile(file) {
  // returns local url for now; replace with S3/uploader when configured
  return `/uploads/${file.filename}`;
}

module.exports = { upload, uploadFile };

module.exports = { fs, path, multer, uploadDir, storage, uniqueSuffix, upload };