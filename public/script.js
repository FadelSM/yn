(() => {
  "use strict";

  const API_BASE = ""; // same origin

  // ---------- element refs ----------
  const tabs = document.querySelectorAll(".tab");
  const fieldGroups = {
    url: document.getElementById("fieldsUrl"),
    text: document.getElementById("fieldsText"),
    wifi: document.getElementById("fieldsWifi"),
    email: document.getElementById("fieldsEmail"),
    phone: document.getElementById("fieldsPhone"),
  };

  const sizeRange = document.getElementById("sizeRange");
  const sizeValue = document.getElementById("sizeValue");
  const eclSelect = document.getElementById("eclSelect");
  const darkColor = document.getElementById("darkColor");
  const lightColor = document.getElementById("lightColor");
  const darkColorHex = document.getElementById("darkColorHex");
  const lightColorHex = document.getElementById("lightColorHex");
  const contrastHint = document.getElementById("contrastHint");

  const generateBtn = document.getElementById("generateBtn");
  const errorMsg = document.getElementById("errorMsg");

  const viewfinder = document.getElementById("viewfinder");
  const emptyState = document.getElementById("emptyState");
  const qrImage = document.getElementById("qrImage");
  const badgeEcl = document.getElementById("badgeEcl");
  const badgeSize = document.getElementById("badgeSize");
  const badgeReady = document.getElementById("badgeReady");

  const downloadPng = document.getElementById("downloadPng");
  const downloadSvg = document.getElementById("downloadSvg");
  const copyImg = document.getElementById("copyImg");

  const historyList = document.getElementById("historyList");
  const apiStatus = document.getElementById("apiStatus");

  let activeType = "url";
  let lastResult = null; // { dataUrl, svg, meta }
  const HISTORY_KEY = "qrforge_history";
  const MAX_HISTORY = 6;

  // ---------- tabs ----------
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      activeType = tab.dataset.type;
      Object.entries(fieldGroups).forEach(([key, el]) => {
        el.classList.toggle("hidden", key !== activeType);
      });
      clearError();
    });
  });

  // ---------- live controls ----------
  sizeRange.addEventListener("input", () => {
    sizeValue.textContent = sizeRange.value;
  });

  function syncColorLabel(input, label) {
    label.textContent = input.value.toUpperCase();
  }
  darkColor.addEventListener("input", () => {
    syncColorLabel(darkColor, darkColorHex);
    checkContrast();
  });
  lightColor.addEventListener("input", () => {
    syncColorLabel(lightColor, lightColorHex);
    checkContrast();
  });

  function hexToLuminance(hex) {
    const c = hex.replace("#", "");
    const r = parseInt(c.substring(0, 2), 16) / 255;
    const g = parseInt(c.substring(2, 4), 16) / 255;
    const b = parseInt(c.substring(4, 6), 16) / 255;
    const lin = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  }
  function contrastRatio(hex1, hex2) {
    const l1 = hexToLuminance(hex1);
    const l2 = hexToLuminance(hex2);
    const [a, b] = l1 > l2 ? [l1, l2] : [l2, l1];
    return (a + 0.05) / (b + 0.05);
  }
  function checkContrast() {
    const ratio = contrastRatio(darkColor.value, lightColor.value);
    if (ratio < 2.2) {
      contrastHint.textContent = "⚠ Kontras warna terlalu rendah — QR mungkin gagal dipindai.";
    } else if (ratio < 3.5) {
      contrastHint.textContent = "Kontras cukup rendah — gunakan ukuran ketahanan error tinggi.";
    } else {
      contrastHint.textContent = "";
    }
  }

  // ---------- payload builder per type ----------
  function buildPayloadText() {
    switch (activeType) {
      case "url": {
        let v = document.getElementById("inputUrl").value.trim();
        if (v && !/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(v)) v = "https://" + v;
        return v;
      }
      case "text":
        return document.getElementById("inputText").value.trim();
      case "wifi": {
        const ssid = document.getElementById("wifiSsid").value.trim();
        const pass = document.getElementById("wifiPass").value.trim();
        const enc = document.getElementById("wifiEnc").value;
        if (!ssid) return "";
        const esc = (s) => s.replace(/([\\;,:"])/g, "\\$1");
        if (enc === "nopass") return `WIFI:T:nopass;S:${esc(ssid)};;`;
        return `WIFI:T:${enc};S:${esc(ssid)};P:${esc(pass)};;`;
      }
      case "email": {
        const to = document.getElementById("emailTo").value.trim();
        const subject = document.getElementById("emailSubject").value.trim();
        const body = document.getElementById("emailBody").value.trim();
        if (!to) return "";
        const params = new URLSearchParams();
        if (subject) params.set("subject", subject);
        if (body) params.set("body", body);
        const qs = params.toString();
        return `mailto:${to}${qs ? "?" + qs : ""}`;
      }
      case "phone": {
        const v = document.getElementById("inputPhone").value.trim();
        return v ? `tel:${v.replace(/[^\d+]/g, "")}` : "";
      }
      default:
        return "";
    }
  }

  function validateBeforeSend(text) {
    if (!text) {
      switch (activeType) {
        case "url": return "Masukkan alamat tautan terlebih dahulu.";
        case "text": return "Isi teks tidak boleh kosong.";
        case "wifi": return "Nama jaringan (SSID) wajib diisi.";
        case "email": return "Alamat email tujuan wajib diisi.";
        case "phone": return "Nomor telepon wajib diisi.";
      }
    }
    return null;
  }

  // ---------- error helpers ----------
  function showError(msg) {
    errorMsg.textContent = msg;
  }
  function clearError() {
    errorMsg.textContent = "";
  }

  // ---------- generate ----------
  generateBtn.addEventListener("click", async () => {
    clearError();
    const text = buildPayloadText();
    const validationError = validateBeforeSend(text);
    if (validationError) {
      showError(validationError);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          size: Number(sizeRange.value),
          errorCorrectionLevel: eclSelect.value,
          darkColor: darkColor.value,
          lightColor: lightColor.value,
          margin: 2,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        showError((data.errors && data.errors[0]) || "Gagal membuat QR code.");
        setLoading(false);
        return;
      }

      renderResult(data);
      saveHistory(data, text);
      setApiStatus(true);
    } catch (err) {
      console.error(err);
      showError("Tidak bisa terhubung ke server. Pastikan backend sedang berjalan.");
      setApiStatus(false);
    } finally {
      setLoading(false);
    }
  });

  function setLoading(isLoading) {
    generateBtn.disabled = isLoading;
    generateBtn.querySelector("span").textContent = isLoading ? "Membuat…" : "Buat QR Code";
  }

  function renderResult(data) {
    lastResult = data;
    emptyState.style.display = "none";
    qrImage.src = data.dataUrl;
    qrImage.classList.remove("hidden");
    viewfinder.classList.add("has-result");

    badgeEcl.textContent = data.meta.errorCorrectionLevel;
    badgeSize.textContent = `${data.meta.size}×${data.meta.size}`;
    badgeReady.classList.remove("hidden");

    downloadPng.disabled = false;
    downloadSvg.disabled = false;
    copyImg.disabled = false;
  }

  // ---------- downloads ----------
  downloadPng.addEventListener("click", () => {
    if (!lastResult) return;
    const a = document.createElement("a");
    a.href = lastResult.dataUrl;
    a.download = "qrcode.png";
    a.click();
  });

  downloadSvg.addEventListener("click", () => {
    if (!lastResult) return;
    const blob = new Blob([lastResult.svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "qrcode.svg";
    a.click();
    URL.revokeObjectURL(url);
  });

  copyImg.addEventListener("click", async () => {
    if (!lastResult) return;
    try {
      const blob = await (await fetch(lastResult.dataUrl)).blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      copyImg.querySelector("svg").style.stroke = "var(--accent)";
      setTimeout(() => (copyImg.querySelector("svg").style.stroke = ""), 900);
    } catch (err) {
      showError("Browser ini tidak mendukung salin gambar otomatis.");
    }
  });

  // ---------- history (localStorage, session-friendly) ----------
  function loadHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    } catch {
      return [];
    }
  }
  function saveHistory(data, rawText) {
    const list = loadHistory();
    list.unshift({ dataUrl: data.dataUrl, svg: data.svg, meta: data.meta, label: rawText.slice(0, 40) });
    const trimmed = list.slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
    renderHistory();
  }
  function renderHistory() {
    const list = loadHistory();
    if (!list.length) {
      historyList.innerHTML = '<p class="history-empty">Belum ada riwayat pada sesi ini.</p>';
      return;
    }
    historyList.innerHTML = "";
    list.forEach((item) => {
      const row = document.createElement("div");
      row.className = "history-item";
      row.innerHTML = `<img src="${item.dataUrl}" alt="" /><span>${escapeHtml(item.label || "(tanpa judul)")}</span>`;
      row.addEventListener("click", () => renderResult(item));
      historyList.appendChild(row);
    });
  }
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------- API health ----------
  function setApiStatus(online) {
    apiStatus.classList.toggle("online", online);
    apiStatus.classList.toggle("offline", !online);
    apiStatus.querySelector(".status-text").textContent = online ? "API aktif" : "API tidak terhubung";
  }
  async function checkHealth() {
    try {
      const res = await fetch(`${API_BASE}/api/health`);
      setApiStatus(res.ok);
    } catch {
      setApiStatus(false);
    }
  }

  // ---------- init ----------
  checkHealth();
  renderHistory();
  checkContrast();
})();
