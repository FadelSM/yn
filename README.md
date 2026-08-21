# QR Forge — Generator QR Code (Backend + Frontend)

Generator QR code full-stack: backend **Node.js/Express** dengan REST API,
frontend **HTML/CSS/JS murni** (tanpa framework) bertema "viewfinder kamera".
QR yang dihasilkan memakai encoder standar (`qrcode` npm package) sehingga
100% valid secara spesifikasi dan **bisa dipindai oleh Google Lens, kamera
bawaan iOS/Android, maupun aplikasi scanner barcode manapun**.

## Fitur

- 5 tipe konten: Tautan (URL), Teks bebas, WiFi (SSID+password+enkripsi),
  Email (mailto dengan subjek & isi), Nomor telepon (tel:)
- Pengaturan ukuran (128–1024px), warna modul & latar, level ketahanan
  error (L/M/Q/H)
- Peringatan otomatis jika kontras warna terlalu rendah (bisa gagal discan)
- Unduh sebagai **PNG** atau **SVG**, dan tombol **salin ke clipboard**
- Riwayat 6 QR terakhir (tersimpan di localStorage browser)
- Indikator status API (online/offline) di pojok kanan atas
- Validasi input di backend maupun frontend + pesan error jelas

## Struktur proyek

```
qrgen/
├── server.js           # Express server + REST API
├── package.json
├── public/
│   ├── index.html       # markup halaman
│   ├── style.css        # tema "scanner viewfinder"
│   └── script.js        # logic frontend (fetch API, download, history)
└── README.md
```

## Cara menjalankan

1. Pastikan Node.js versi 16+ terpasang.
2. Install dependency:
   ```bash
   npm install
   ```
3. Jalankan server:
   ```bash
   npm start
   ```
4. Buka browser ke `http://localhost:3000`

Server otomatis melayani frontend (folder `public/`) dan API pada domain
yang sama — jadi tidak ada masalah CORS saat dijalankan secara lokal.

## API Reference

### `GET /api/health`
Cek status server.
```json
{ "status": "ok", "service": "qr-forge", "time": "2026-08-21T..." }
```

### `POST /api/generate`
Body (JSON):
```json
{
  "text": "https://anthropic.com",
  "size": 512,
  "margin": 2,
  "errorCorrectionLevel": "M",
  "darkColor": "#0B0E11",
  "lightColor": "#FFFFFF"
}
```

Respon sukses:
```json
{
  "success": true,
  "dataUrl": "data:image/png;base64,...",
  "svg": "<svg ...>...</svg>",
  "meta": { "text": "...", "errorCorrectionLevel": "M", "size": 512, "margin": 2, "darkColor": "#0B0E11", "lightColor": "#FFFFFF" }
}
```

Respon gagal (contoh: teks kosong):
```json
{ "success": false, "errors": ["Isi/teks QR code tidak boleh kosong."] }
```

## Kenapa hasilnya pasti bisa discan?

QR code dibuat lewat library `qrcode` (encoder Reed-Solomon standar ISO/IEC
18004), bukan digambar manual — jadi pola finder pattern, timing pattern,
dan error correction-nya valid sesuai spesifikasi resmi QR. Yang perlu
diperhatikan pengguna hanya dua hal supaya tetap optimal:

1. **Kontras warna** — modul gelap dan latar terang harus cukup kontras
   (aplikasi sudah memberi peringatan otomatis).
2. **Ukuran cetak/tampil** — semakin banyak isi teks, semakin padat modulnya;
   gunakan ukuran piksel lebih besar atau perpendek teks jika akan dicetak kecil.

## Deploy

Aplikasi ini adalah server Express biasa, sehingga bisa langsung di-deploy
ke Render, Railway, Fly.io, VPS, atau layanan Node.js hosting lain dengan
`npm start` sebagai start command.
