(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MottPermissionPDF = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  async function create(templateBytes, data, signaturePng, options) {
    const lib = options.PDFLib;
    if (!signaturePng) throw new Error('Please draw your signature before downloading.');
    const doc = await lib.PDFDocument.load(templateBytes);
    const form = doc.getForm();
    const font = await doc.embedFont(lib.StandardFonts.Helvetica);
    const time = form.getTextField('Time');
    time.setText('1:00 PM'); time.setFontSize(10); time.updateAppearances(font);
    const date = form.getTextField('Return Date');
    date.setFontSize(8); date.updateAppearances(font);
    // The downloaded, signed copy is static so its entries print consistently.
    form.flatten({ updateFieldAppearances: false });
    const page = doc.getPages()[0];
    // The source form has shared widget references. Flattening leaves some
    // removed widgets in Annots; discard only references that no longer exist.
    const annots = page.node.Annots();
    if (annots) {
      for (let i = annots.size() - 1; i >= 0; i -= 1) {
        if (!doc.context.lookup(annots.get(i))) annots.remove(i);
      }
    }
    async function text(value, x, y, width, size) {
      value = String(value || '').trim();
      if (!value) return;
      try { font.encodeText(value); }
      catch (e) {
        if (!options.rasterizeText) throw new Error('Unable to render this text. Please use the blank slip instead.');
        const img = await doc.embedPng(options.rasterizeText(value));
        const scale = Math.min(width / img.width, (size + 3) / img.height);
        page.drawImage(img, { x, y: y - 2, width: img.width * scale, height: img.height * scale });
        return;
      }
      let fitted = size;
      while (font.widthOfTextAtSize(value, fitted) > width && fitted > 7.5) fitted -= 0.25;
      if (font.widthOfTextAtSize(value, fitted) > width) throw new Error('An entry is too long to fit on the slip. Please shorten it and try again.');
      page.drawText(value, { x, y, size: fitted, font, color: lib.rgb(0, 0, 0) });
    }
    await text(data.studentName, 52, 591, 210, 11);
    await text(data.doctorName, 139, 220, 175, 10);
    await text(data.doctorPhone, 400, 220, 151, 10);
    await text(data.hospital, 174, 192, 378, 10);
    await text(data.homePhone, 307, 37, 244, 11);
    await text('Parent/guardian: ' + data.guardianName, 51, 124, 243, 9);
    const parts = data.signatureDate.split('-');
    await text('Signed: ' + parts[1] + '/' + parts[2] + '/' + parts[0], 51, 110, 243, 9);
    const signature = await doc.embedPng(signaturePng);
    const scale = Math.min(244 / signature.width, 31 / signature.height);
    page.drawImage(signature, { x: 307, y: 119, width: signature.width * scale, height: signature.height * scale });
    doc.setTitle('Mott IT Day - Parent Signed Permission Slip');
    return doc.save();
  }
  return { create };
}));
