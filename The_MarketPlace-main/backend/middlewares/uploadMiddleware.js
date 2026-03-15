const multer = require('multer');
const path = require('path');
const fs = require('fs');

function ensureDir(dir){ if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }

const storage = multer.diskStorage({
  destination(req, file, cb){
    const base = path.join(process.cwd(), 'uploads', 'products');
    ensureDir(base);
    cb(null, base);
  },
  filename(req, file, cb){
    const ext = path.extname(file.originalname) || '';
    const name = path.basename(file.originalname, ext).replace(/[^a-z0-9]/gi, '_').toLowerCase();
    cb(null, `${name}_${Date.now()}${ext}`);
  }
});

function fileFilter(req, file, cb){
  const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
  if (allowed.test(file.originalname)) cb(null, true);
  else cb(new Error('Only image files are allowed'));
}

const upload = multer({ storage, fileFilter, limits: { files: 8, fileSize: 5 * 1024 * 1024 } });

const uploadProductImages = upload.any();

const { pathToFileURL } = require('url');

async function processFilesToUrls(files){
  const results = [];
  let awsConfig = null;
  try {
    // try require first (may fail if config is ESM)
    awsConfig = require('../config/aws.js');
  } catch (e) {
    try {
      const mod = await import(pathToFileURL(require('path').resolve(__dirname, '../config/aws.js')).href);
      awsConfig = mod && (mod.default || mod);
    } catch (ie) { awsConfig = null; }
  }

  for (const f of files || []){
    const localUrl = `/uploads/products/${f.filename || f.originalname}`;
    if (awsConfig && awsConfig.useS3) {
      try {
        // dynamic import of s3Client which is ESM
        const s3mod = await import(pathToFileURL(require('path').resolve(__dirname, '../utils/s3Client.js')).href);
        const s3 = s3mod && (s3mod.uploadFile || s3mod.default && s3mod.default.uploadFile) ? s3mod : s3mod.default;
        const key = `products/${Date.now()}_${f.filename || f.originalname}`;
        const contentType = f.mimetype || 'application/octet-stream';
        const { url } = await s3.uploadFile({ localFilePath: f.path, key, contentType });
        // remove local file
        try { require('fs').unlinkSync(f.path); } catch (e) {}
        results.push({ filename: f.filename || f.originalname, url, fieldname: f.fieldname });
        continue;
      } catch (err) {
        // log and fallback to local URL
        console.warn('[uploadMiddleware] s3 upload failed', err && err.message);
      }
    }
    results.push({ filename: f.filename || f.originalname, url: localUrl, fieldname: f.fieldname });
  }
  return results;
}

function uploadHandler(req, res, next){
  uploadProductImages(req, res, async function(err){
    if (err) return next(err);
    try{
      req.uploadedFiles = await processFilesToUrls(req.files || []);
    } catch(e){ return next(e); }
    next();
  });
}

module.exports = { uploadHandler, uploadProductImages };
