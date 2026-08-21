/**
 * QR Forge — backend server
 * ---------------------------------------------------------
 * Serves the static frontend and exposes a small REST API
 * that turns arbitrary payload strings into real, scannable
 * QR codes (PNG data-URL + raw SVG) using the battle-tested
 * `qrcode` library — the same algorithmic QR encoder used
 * by countless production tools, so output is 100% spec
 * compliant and readable by Google Lens, iOS Camera, and
 * any standard barcode/QR scanner.
 * ---------------------------------------------------------
 */

const express = require("express");
const cors = require("cors");
const QRCode = require("qrcode");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

// ---- constants / validation -------------------------------------------

const MAX_TEXT_LENGTH = 2000; // generous ceiling; QR spec tops out ~4296 alnum
const VALID_ECL = ["L", "M", "Q", "H"];
const MIN_SIZE = 128;
const MAX_SIZE = 1024;

function isHexColor(value) {
  return typeof value === "string" && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(value);
}

function validatePayload(body) {
  const errors = [];
  const text = typeof body.text === "string" ? body.text.trim() : "";

  if (!text) errors.push("Isi/teks QR code tidak boleh kosong.");
  if (text.length > MAX_TEXT_LENGTH) {
    errors.push(`Teks terlalu panjang (maks ${MAX_TEXT_LENGTH} karakter).`);
  }

  const errorCorrectionLevel = VALID_ECL.includes(body.errorCorrectionLevel)
    ? body.errorCorrectionLevel
    : "M";

  let size = Number(body.size) || 512;
  size = Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.round(size)));

  let margin = Number.isFinite(Number(body.margin)) ? Number(body.margin) : 2;
  margin = Math.min(10, Math.max(0, Math.round(margin)));

  const darkColor = isHexColor(body.darkColor) ? body.darkColor : "#0B0E11";
  const lightColor = isHexColor(body.lightColor) ? body.lightColor : "#FFFFFF";

  return {
    errors,
    value: { text, errorCorrectionLevel, size, margin, darkColor, lightColor },
  };
}

// ---- routes -------------------------------------------------------------

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "qr-forge", time: new Date().toISOString() });
});

// Main generation endpoint: returns both a PNG data URL and raw SVG markup
app.post("/api/generate", async (req, res) => {
  const { errors, value } = validatePayload(req.body || {});

  if (errors.length) {
    return res.status(400).json({ success: false, errors });
  }

  const { text, errorCorrectionLevel, size, margin, darkColor, lightColor } = value;

  const qrOptions = {
    errorCorrectionLevel,
    type: "image/png",
    margin,
    width: size,
    color: {
      dark: darkColor,
      light: lightColor,
    },
  };

  try {
    const [dataUrl, svg] = await Promise.all([
      QRCode.toDataURL(text, qrOptions),
      QRCode.toString(text, { ...qrOptions, type: "svg" }),
    ]);

    res.json({
      success: true,
      dataUrl,
      svg,
      meta: { text, errorCorrectionLevel, size, margin, darkColor, lightColor },
    });
  } catch (err) {
    console.error("QR generation failed:", err.message);
    res.status(500).json({
      success: false,
      errors: ["Gagal membuat QR code. Coba kurangi panjang teks atau ganti pengaturan."],
    });
  }
});

// Fallback to index.html for any other GET (simple SPA-style serve)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`✔ QR Forge server running → http://localhost:${PORT}`);
});
