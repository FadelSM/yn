const textInput = document.getElementById('text-input');
const generateBtn = document.getElementById('generate-btn');
const qrContainer = document.getElementById('qrcode');

let qrCodeInstance = null;

generateBtn.addEventListener('click', () => {
  const textValue = textInput.value.trim();

  if (!textValue) {
    alert('Harap isi teks terlebih dahulu!');
    return;
  }

  // Bersihkan QR Code sebelumnya jika ada
  qrContainer.innerHTML = '';

  // Buat QR Code baru dari teks input
  qrCodeInstance = new QRCode(qrContainer, {
    text: textValue,
    width: 200,
    height: 200,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.H
  });
});
