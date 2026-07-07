const express = require("express");
const { upload } = require("../middleware/upload.middleware");
const { importCsv } = require("../controller/import.controller");

const router = express.Router();

// POST /api/import  (multipart/form-data, field name "file")
router.post("/", upload.single("file"), importCsv);

module.exports = router;