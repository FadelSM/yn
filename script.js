(() => {
  // API publik gratis, tanpa API key, mendukung CORS untuk gambar PNG/SVG.
  // Dokumentasi: https://goqr.me/api/doc/create-qr-code/
  const API_BASE = 'https://api.qrserver.com/v1/create-qr-code/';

  const textEl = document.getElementById('qr-text');
  const charCountEl = document.getElementById('char-count');
  const sizeEl = document.getElementById('qr-size');
  const sizeValueEl = document.getElementById('size-value');
  const marginEl = document.getElementById('qr-margin');
  const marginValueEl = document.getElementById('margin-value');
  const darkEl = document.getElementById('qr-dark');
  const darkHexEl = document.getElementById('qr-dark-hex');
  const lightEl = document.getElementById('qr-light');
  const lightHexEl = document.getElementById('qr-light-hex');
  const eccEl = document.getElementById('qr-ecc');
  const segBtns = document.querySelectorAll('.seg-btn');
  const generateBtn = document.getElementById('generate-btn');
  const formErrorEl = document.getElementById('form-error');
  const qrSlot = document.getElementById('qr-slot');
  const laser = document.getElementById('laser');
  const contrastWarning = document.getElementById('contrast-warning');
  const downloadBtn = document.getElementById('download-btn');
  const openBtn = document.getElementById('open-btn');
  const scanHint = document.getElementById('scan-hint');

  let currentFormat = 'png';
  let lastUrl = null;
  let debounceTimer = null;

  function setStatus(text, isError = false) {
    scanHint.innerHTML = `Status: <span>${text}</span>`;
    scanHint.classList.toggle('is-error', isError);
  }

  function showFormError(message) {
    if (!message) {
      formErrorEl.hidden = true;
      formErrorEl.textContent = '';
      return;
    }
    formErrorEl.hidden = false;
    formErrorEl.textContent = message;
  }

  function syncColorPair(colorInput, hexInput) {
    colorInput.addEventListener('input', () => {
      hexInput.value = colorInput.value.toUpperCase();
    });
    hexInput.addEventListener('change', () => {
      const v = hexInput.value.trim();
      if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(v)) {
        colorInput.value = v;
        hexInput.value = v.toUpperCase();
      } else {
        hexInput.value = colorInput.value.toUpperCase();
      }
    });
  }
  syncColorPair(darkEl, darkHexEl);
  syncColorPair(lightEl, lightHexEl);

  sizeEl.addEventListener('input', () => {
    sizeValueEl.textContent = `${sizeEl.value}px`;
  });
  marginEl.addEventListener('input', () => {
    marginValueEl.textContent = marginEl.value;
  });
  textEl.addEventListener('input', () => {
    charCountEl.textContent = `${textEl.value.length} / 900`;
  });

  segBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      segBtns.forEach((b) => {
        b.classList.remove('is-active');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('is-active');
      btn.setAttribute('aria-checked', 'true');
      currentFormat = btn.dataset.format;
    });
  });

  // --- Kontras warna (WCAG relative luminance) dihitung langsung di browser ---
  function relativeLuminance(hex) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map((ch) => ch + ch).join('');
    const r = parseInt(c.slice(0, 2), 16) / 255;
    const g = parseInt(c.slice(2, 4), 16) / 255;
    const b = parseInt(c.slice(4, 6), 16) / 255;
    const lin = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  }
  function contrastRatio(hex1, hex2) {
    const l1 = relativeLuminance(hex1);
    const l2 = relativeLuminance(hex2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function buildApiUrl() {
    const text = textEl.value.trim();
    const size = Number(sizeEl.value);
    const qzone = Number(marginEl.value);
    const dark = darkHexEl.value.replace('#', '');
    const light = lightHexEl.value.replace('#', '');
    const ecc = eccEl.value;

    const params = new URLSearchParams({
      data: text,
      size: `${size}x${size}`,
      qzone: String(qzone),
      color: dark,
      bgcolor: light,
      ecc,
      format: currentFormat,
      margin: '0', // pakai qzone (satuan modul) sebagai satu-satunya sumber padding
    });

    return `${API_BASE}?${params.toString()}`;
  }

  async function generate() {
    const text = textEl.value.trim();

    if (!text) {
      showFormError('Isi teks atau URL dulu, ya.');
      setStatus('menunggu input');
      return;
    }
    if (text.length > 900) {
      showFormError('Teks terlalu panjang untuk QR yang mudah dipindai (maks 900 karakter).');
      return;
    }
    showFormError(null);

    generateBtn.disabled = true;
    generateBtn.textContent = 'Membuat...';
    setStatus('memanggil API…');

    const apiUrl = buildApiUrl();
    const ratio = contrastRatio(darkHexEl.value, lightHexEl.value);
    const lowContrast = ratio < 3;

    try {
      // Validasi bahwa API benar-benar mengembalikan gambar (bukan pesan error teks)
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error('API QR sedang bermasalah, coba lagi.');
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('image') && !contentType.includes('svg')) {
        throw new Error('Gagal membuat QR — periksa kembali input kamu.');
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);

      if (lastUrl) URL.revokeObjectURL(lastUrl);
      lastUrl = objectUrl;

      renderResult(objectUrl, currentFormat);

      laser.classList.remove('is-scanning');
      void laser.offsetWidth;
      laser.classList.add('is-scanning');

      downloadBtn.disabled = false;
      openBtn.disabled = false;
      contrastWarning.hidden = !lowContrast;
      setStatus('siap dipindai ✓');
    } catch (err) {
      console.error(err);
      showFormError(err.message || 'Terjadi kesalahan saat memanggil API.');
      setStatus('gagal membuat', true);
    } finally {
      generateBtn.disabled = false;
      generateBtn.innerHTML = '<span class="btn-icon" aria-hidden="true">◎</span> Generate QR Code';
    }
  }

  function renderResult(objectUrl, format) {
    qrSlot.innerHTML = '';
    const img = document.createElement('img');
    img.src = objectUrl;
    img.alt = 'QR code hasil generate';
    qrSlot.appendChild(img);
  }

  downloadBtn.addEventListener('click', () => {
    if (!lastUrl) return;
    const ext = currentFormat === 'svg' ? 'svg' : 'png';
    const a = document.createElement('a');
    a.href = lastUrl;
    a.download = `qr-code-${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  openBtn.addEventListener('click', () => {
    if (!lastUrl) return;
    window.open(lastUrl, '_blank');
  });

  generateBtn.addEventListener('click', generate);

  // Auto-generate saat mengetik (debounced)
  [textEl, sizeEl, marginEl, darkHexEl, lightHexEl, eccEl].forEach((el) => {
    el.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      if (!textEl.value.trim()) return;
      debounceTimer = setTimeout(generate, 600);
    });
  });
})();
