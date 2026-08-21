const textInput = document.getElementById('text-input');
const generateBtn = document.getElementById('generate-btn');
const qrWrapper = document.getElementById('qrcode-wrapper');
const canvas = document.getElementById('qr-canvas');
const downloadBtn = document.getElementById('download-btn');
const copyBtn = document.getElementById('copy-btn');

let qr = null;

generateBtn.addEventListener('click', () => {
  const textValue = textInput.value.trim();

  if (!textValue) {
    alert('Harap isi teks terlebih dahulu!');
    return;
  }

  // Buat QR Code menggunakan QRious langsung pada canvas
  qr = new QRious({
    element: canvas,
    value: textValue,
    size: 300,
    level: 'L' // Error correction level rendah agar pola tidak terlalu rapat
  });

  qrWrapper.classList.remove('hidden');
});

// Fitur Download QR Code
downloadBtn.addEventListener('click', () => {
  const imageSrc = canvas.toDataURL('image/png');

  if (imageSrc) {
    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = 'qrcode.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    alert('QR Code belum siap!');
  }
});

// Fitur Salin/Copy Gambar QR Code
copyBtn.addEventListener('click', async () => {
  try {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        alert('Gagal mengambil gambar!');
        return;
      }
      const item = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([item]);
      alert('Gambar QR Code berhasil disalin ke clipboard!');
    });
  } catch (err) {
    console.error(err);
    alert('Browser tidak mendukung fitur salin gambar secara langsung.');
  }
});
