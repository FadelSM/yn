const textInput = document.getElementById('text-input');
const generateBtn = document.getElementById('generate-btn');
const qrWrapper = document.getElementById('qrcode-wrapper');
const qrContainer = document.getElementById('qrcode');
const downloadBtn = document.getElementById('download-btn');
const copyBtn = document.getElementById('copy-btn');

generateBtn.addEventListener('click', () => {
  let textValue = textInput.value.trim();

  if (!textValue) {
    alert('Harap isi teks terlebih dahulu!');
    return;
  }

  // Hapus baris baru/enter berlebih agar tidak merusak format Google Lens
  textValue = textValue.replace(/\r?\n|\r/g, ' ');

  qrContainer.innerHTML = '';

  // Pakai canvas SVG renderer & Error Correction 'M'
  new QRCode(qrContainer, {
    text: textValue,
    width: 280,
    height: 280,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.M
  });

  qrWrapper.classList.remove('hidden');
});

// Fitur Download QR Code
downloadBtn.addEventListener('click', () => {
  const img = qrContainer.querySelector('img');
  const canvas = qrContainer.querySelector('canvas');

  let imageSrc = '';
  if (img && img.src) {
    imageSrc = img.src;
  } else if (canvas) {
    imageSrc = canvas.toDataURL('image/png');
  }

  if (imageSrc) {
    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = 'qrcode.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    alert('QR Code belum siap untuk diunduh!');
  }
});

// Fitur Salin/Copy Gambar QR Code
copyBtn.addEventListener('click', async () => {
  const canvas = qrContainer.querySelector('canvas');

  if (!canvas) {
    alert('QR Code belum dibuat!');
    return;
  }

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
