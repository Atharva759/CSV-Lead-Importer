require("dotenv").config();
const express = require("express");
const cors = require("cors");

const importRoutes = require("./routes/import.routes");

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3000";

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => {
  res.json({ status: "ok", aiProvider: process.env.AI_PROVIDER || "mock" });
});

app.use("/api/import", importRoutes);

// Centralized error handler (multer errors, JSON parse errors, etc. land here)
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 400;
  res.status(status).json({ error: err.message || "Something went wrong." });
});

app.listen(PORT, () => {
  console.log(`GrowEasy CSV Importer backend running on port ${PORT}`);
});