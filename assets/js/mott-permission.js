(function () {
  'use strict';
  const form = document.getElementById('mott-permission-form');
  if (!form) return;
  const controls = document.getElementById('permission-controls');
  const canvas = document.getElementById('parent-signature');
  const context = canvas.getContext('2d');
  const output = document.getElementById('permission-feedback');
  const signatureStatus = document.getElementById('signature-status');
  const button = document.getElementById('download-signed-slip');
  const clear = document.getElementById('clear-signature');
  const fallback = 'assets/forms/mott-it-day-permission-slip-2026.pdf';
  let strokes = [], active = null, pointer = null, libraryPromise, downloadUrl;
  function feedback(message, error) {
    output.textContent = message;
    output.classList.toggle('permission-error', Boolean(error));
    if (error) output.focus();
  }
  form.addEventListener('submit', function (event) { event.preventDefault(); });
  if (!context) { feedback('The drawing tool is unavailable. Please download the blank permission slip and sign it by hand.', true); return; }
  controls.disabled = false;
  const now = new Date();
  document.getElementById('permission-date').value = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  function point(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: Math.max(0, Math.min(canvas.width, (event.clientX - rect.left) * canvas.width / rect.width)), y: Math.max(0, Math.min(canvas.height, (event.clientY - rect.top) * canvas.height / rect.height)) };
  }
  function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.lineWidth = 4; context.strokeStyle = '#111'; context.lineCap = 'round'; context.lineJoin = 'round';
    strokes.forEach(function (stroke) {
      if (!stroke.length) return;
      context.beginPath(); context.moveTo(stroke[0].x, stroke[0].y);
      stroke.slice(1).forEach(function (p) { context.lineTo(p.x, p.y); }); context.stroke();
    });
  }
  canvas.addEventListener('pointerdown', function (event) {
    if (event.isPrimary === false || (event.pointerType === 'mouse' && event.button !== 0) || pointer !== null) return;
    event.preventDefault(); pointer = event.pointerId; active = [point(event)]; strokes.push(active);
    canvas.setPointerCapture(pointer); signatureStatus.textContent = 'Drawing signature.';
  });
  canvas.addEventListener('pointermove', function (event) {
    if (event.pointerId !== pointer || !active) return;
    event.preventDefault(); active.push(point(event)); draw();
  });
  function finish(event) {
    if (event.pointerId !== pointer) return;
    if (canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer);
    pointer = null; active = null; signatureStatus.textContent = 'Signature drawn. You can clear it and draw again.';
  }
  canvas.addEventListener('pointerup', finish); canvas.addEventListener('pointercancel', finish);
  canvas.addEventListener('lostpointercapture', function () { pointer = null; active = null; });
  clear.addEventListener('click', function () {
    strokes = []; pointer = null; active = null; draw();
    signatureStatus.textContent = 'Signature cleared. Draw your signature in the box.';
  });
  function signatureImage() {
    const points = strokes.flat();
    const length = strokes.reduce(function (sum, stroke) {
      return sum + stroke.slice(1).reduce(function (n, p, i) { return n + Math.hypot(p.x - stroke[i].x, p.y - stroke[i].y); }, 0);
    }, 0);
    if (points.length < 2 || length < 25) return null;
    const left = Math.max(0, Math.floor(Math.min.apply(null, points.map(p => p.x)) - 7));
    const top = Math.max(0, Math.floor(Math.min.apply(null, points.map(p => p.y)) - 7));
    const right = Math.min(canvas.width, Math.ceil(Math.max.apply(null, points.map(p => p.x)) + 7));
    const bottom = Math.min(canvas.height, Math.ceil(Math.max.apply(null, points.map(p => p.y)) + 7));
    // Match the visible pad's proportions, including its taller mobile layout.
    const rect = canvas.getBoundingClientRect();
    const ratio = (rect.height / canvas.height) / (rect.width / canvas.width);
    const crop = document.createElement('canvas'); crop.width = right - left; crop.height = Math.max(1, Math.ceil((bottom - top) * ratio));
    crop.getContext('2d').drawImage(canvas, left, top, right - left, bottom - top, 0, 0, crop.width, crop.height);
    return crop.toDataURL('image/png');
  }
  function loadLibrary() {
    if (window.PDFLib) return Promise.resolve(window.PDFLib);
    if (libraryPromise) return libraryPromise;
    libraryPromise = new Promise(function (resolve, reject) {
      const script = document.createElement('script'); script.src = 'assets/vendor/pdf-lib.min.js';
      script.onload = function () { window.PDFLib ? resolve(window.PDFLib) : reject(new Error('PDF library unavailable')); };
      script.onerror = function () { libraryPromise = null; script.remove(); reject(new Error('PDF library unavailable')); };
      document.head.appendChild(script);
    });
    return libraryPromise;
  }
  document.getElementById('complete-permission').addEventListener('toggle', function (event) {
    if (event.target.open) loadLibrary().catch(function () { feedback('The PDF tool could not load. Try downloading again, or use the blank permission slip.', true); });
  });
  function rasterizeText(text) {
    const c = document.createElement('canvas'); const ctx = c.getContext('2d'); ctx.font = '28px Arial, sans-serif';
    c.width = Math.ceil(ctx.measureText(text).width) + 8; c.height = 42;
    ctx.font = '28px Arial, sans-serif'; ctx.fillStyle = '#000'; ctx.fillText(text, 4, 31); return c.toDataURL('image/png');
  }
  button.addEventListener('click', async function () {
    if (!form.reportValidity()) return;
    const signature = signatureImage();
    if (!signature) { feedback('Please draw your signature in the box before downloading. A typed name does not replace your signature.', true); return; }
    const data = {};
    ['studentName', 'guardianName', 'homePhone', 'doctorName', 'doctorPhone', 'hospital', 'signatureDate'].forEach(function (key) { data[key] = form.elements.namedItem(key).value.trim(); });
    if (!data.studentName || !data.guardianName || !data.homePhone) { feedback('Please complete the student name, parent or guardian name, and home phone number.', true); return; }
    button.disabled = true; clear.disabled = true; button.textContent = 'Preparing PDF…';
    feedback('Preparing your signed permission slip.');
    try {
      const lib = await loadLibrary();
      const response = await fetch(fallback, { credentials: 'same-origin' });
      if (!response.ok) throw new Error('Permission slip could not load');
      const bytes = await window.MottPermissionPDF.create(await response.arrayBuffer(), data, signature, { PDFLib: lib, rasterizeText });
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      downloadUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      const link = document.createElement('a'); link.href = downloadUrl; link.download = 'Mott-IT-Day-Parent-Signed-Permission-Slip.pdf';
      link.textContent = 'Open or save your completed permission slip'; link.className = 'permission-result';
      const prior = document.getElementById('permission-result'); if (prior) prior.remove(); link.id = 'permission-result';
      output.after(link); link.click();
      feedback('Your PDF is ready. Save and print it, obtain the home school principal’s signature, and return it to your GCI instructor. Nothing has been submitted to GCI.');
    } catch (error) {
      const fit = error.message.startsWith('An entry is too long');
      feedback(fit ? error.message : 'We couldn’t prepare the PDF. Your entries are still here. Try again, or download the blank slip and sign it by hand.', true);
    } finally {
      button.disabled = false; clear.disabled = false; button.textContent = 'Download completed PDF';
    }
  });
  window.addEventListener('pagehide', function () { if (downloadUrl) URL.revokeObjectURL(downloadUrl); });
}());
