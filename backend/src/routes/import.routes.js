const express = require("express");
const { upload } = require("../middleware/upload.middleware");
const { importCsv, retryRows } = require("../controller/import.controller");

const router = express.Router();

router.post("/", upload.single("file"), importCsv);

router.post("/retry", express.json({ limit: "5mb" }), retryRows);

module.exports = router;