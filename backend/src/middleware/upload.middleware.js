const multer = require("multer");

const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 5 * 1024 * 1024); 

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  const isCsvMime = file.mimetype === "text/csv" || file.mimetype === "application/vnd.ms-excel";
  const isCsvExt = file.originalname.toLowerCase().endsWith(".csv");

  if (isCsvMime || isCsvExt) {
    return cb(null, true);
  }
  return cb(new Error("Only .csv files are supported."));
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_UPLOAD_BYTES },
});

module.exports = { upload, MAX_UPLOAD_BYTES };