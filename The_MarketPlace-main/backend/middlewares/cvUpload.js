const multer = require('multer');
const path = require('path');


const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/cvs'),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`)
});

const allowedTypes = ['.pdf', '.doc', '.docx'];
const fileFilter = (req, file, cb) => {
  if (allowedTypes.includes(path.extname(file.originalname).toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};

module.exports = multer({ storage, fileFilter });