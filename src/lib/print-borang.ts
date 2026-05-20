import jsPDF from 'jspdf';
import { BorrowRequest, User } from './storage';

export function printBorangKEWPA9(req: BorrowRequest, currentUser: User, allUsers: User[]) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = 210;
  const margin = 15;
  const contentW = pageW - margin * 2;
  const requester = allUsers.find(u => u.uid === req.userId) || currentUser;

  doc.setFont('times', 'normal');

  // ─── HEADER ───────────────────────────────────────────────────
  doc.setFontSize(9);
  doc.text('Pekeliling Perbendaharaan Malaysia', margin, 12);
  doc.text('AM 2.4 Lampiran A', pageW - margin, 12, { align: 'right' });

  doc.setFontSize(11);
  doc.setFont('times', 'bold');
  doc.text('KEW.PA-9', pageW - margin, 18, { align: 'right' });

  doc.setFontSize(9);
  doc.setFont('times', 'normal');
  doc.text(`No. Permohonan : ${req.requestId || '............'}`, pageW - margin, 23, { align: 'right' });

  doc.setFontSize(12);
  doc.setFont('times', 'bold');
  doc.text('BORANG PERMOHONAN PERGERAKAN/ PINJAMAN ASET ALIH', pageW / 2, 30, { align: 'center' });
  doc.setFont('times', 'normal');

  // ─── INFO TABLE ───────────────────────────────────────────────
  doc.setFontSize(10);
  const infoY = 35;
  const infoRowH = 7;
  const iw1 = 30; const iw2 = 62; const iw3 = 33; const iw4 = 55;
  const ix0 = margin;
  const ix1 = ix0 + iw1;
  const ix2 = ix1 + iw2;
  const ix3 = ix2 + iw3;

  // Row 1
  doc.rect(ix0, infoY, iw1, infoRowH); doc.text('Nama Pemohon :', ix0 + 2, infoY + 4.5);
  doc.rect(ix1, infoY, iw2, infoRowH); doc.text(req.userName || '', ix1 + 2, infoY + 4.5);
  doc.rect(ix2, infoY, iw3, infoRowH); doc.text('Tujuan :', ix2 + 2, infoY + 4.5);
  doc.rect(ix3, infoY, iw4, infoRowH); doc.text(req.purpose || '', ix3 + 2, infoY + 4.5);

  // Row 2
  const row2Y = infoY + infoRowH;
  doc.rect(ix0, row2Y, iw1, infoRowH); doc.text('Jawatan :', ix0 + 2, row2Y + 4.5);
  doc.rect(ix1, row2Y, iw2, infoRowH); doc.text((requester as any).jawatan || '', ix1 + 2, row2Y + 4.5);
  doc.rect(ix2, row2Y, iw3, infoRowH); doc.text('Tempat Digunakan :', ix2 + 2, row2Y + 4.5);
  // PERUBAHAN DI SINI: Guna req.location, jika tiada fallback kepada req.userDept (untuk rekod lama)
  doc.rect(ix3, row2Y, iw4, infoRowH); doc.text((req as any).location || req.userDept || '', ix3 + 2, row2Y + 4.5);

  // Row 3
  const row3Y = row2Y + infoRowH;
  doc.rect(ix0, row3Y, iw1, infoRowH); doc.text('Bahagian :', ix0 + 2, row3Y + 4.5);
  doc.rect(ix1, row3Y, iw2, infoRowH); doc.text(req.userDept || '', ix1 + 2, row3Y + 4.5);
  doc.rect(ix2, row3Y, iw3, infoRowH); doc.text('Nama Pengeluar :', ix2 + 2, row3Y + 4.5);
  doc.rect(ix3, row3Y, iw4, infoRowH);
  if (currentUser.role === 'admin') {
    doc.text(currentUser.name || '', ix3 + 2, row3Y + 4.5);
  }

  // ─── ASSET TABLE HEADER ───────────────────────────────────────
  const tableY = row3Y + 12;
  doc.setFontSize(8.5);

  const cW = [10, 26, 30, 23, 24, 15, 21, 16, 15];
  const headerH = 16;
  const subH = headerH / 2;

  const x0 = margin;
  const x1 = x0 + cW[0];
  const x2 = x1 + cW[1];
  const x3 = x2 + cW[2];
  const x4 = x3 + cW[3];
  const x5 = x4 + cW[4];
  const x6 = x5 + cW[5];
  const x7 = x6 + cW[6];
  const x8 = x7 + cW[7];

  doc.rect(x0, tableY, cW[0], headerH); doc.text('Bil.', x0 + cW[0]/2, tableY + 9, { align: 'center' });
  doc.rect(x1, tableY, cW[1], headerH);
  doc.text('No. Siri', x1 + cW[1]/2, tableY + 7, { align: 'center' });
  doc.text('Pendaftaran', x1 + cW[1]/2, tableY + 11, { align: 'center' });
  doc.rect(x2, tableY, cW[2], headerH);
  doc.text('Keterangan', x2 + cW[2]/2, tableY + 7, { align: 'center' });
  doc.text('Aset', x2 + cW[2]/2, tableY + 11, { align: 'center' });
  doc.rect(x5, tableY, cW[5], headerH);
  doc.text('Lulus/', x5 + cW[5]/2, tableY + 5.5, { align: 'center' });
  doc.text('Tidak', x5 + cW[5]/2, tableY + 9.5, { align: 'center' });
  doc.text('Lulus', x5 + cW[5]/2, tableY + 13.5, { align: 'center' });
  doc.rect(x8, tableY, cW[8], headerH); doc.text('Catatan', x8 + cW[8]/2, tableY + 9, { align: 'center' });
  doc.rect(x3, tableY, cW[3] + cW[4], subH); doc.text('Tarikh', x3 + (cW[3]+cW[4])/2, subH + tableY - 2.5, { align: 'center' });
  doc.rect(x6, tableY, cW[6] + cW[7], subH); doc.text('Tarikh', x6 + (cW[6]+cW[7])/2, subH + tableY - 2.5, { align: 'center' });
  doc.rect(x3, tableY + subH, cW[3], subH); doc.text('Dipinjam', x3 + cW[3]/2, tableY + 13, { align: 'center' });
  doc.rect(x4, tableY + subH, cW[4], subH);
  doc.text('Dijangka', x4 + cW[4]/2, tableY + 11, { align: 'center' });
  doc.text('Pulang', x4 + cW[4]/2, tableY + 14.5, { align: 'center' });
  doc.rect(x6, tableY + subH, cW[6], subH); doc.text('Dipulangkan', x6 + cW[6]/2, tableY + 13, { align: 'center' });
  doc.rect(x7, tableY + subH, cW[7], subH); doc.text('Diterima', x7 + cW[7]/2, tableY + 13, { align: 'center' });

  // ─── DATA ROWS — LOOP ITEMS ───────────────────────────────────
  const dataY = tableY + headerH;
  const rowH = 7;
  const totalRows = 17;

  for (let r = 0; r < totalRows; r++) {
    let currentX = margin;
    const item = req.items && req.items[r] ? req.items[r] : null;

    cW.forEach((w, i) => {
      doc.rect(currentX, dataY + r * rowH, w, rowH);
      doc.setFontSize(8);

      if (item) {
        const rowData = [
          (r + 1).toString(),
          item.assignedSerialNumber || '',
          item.assetName || '',
          req.borrowDate || '',
          req.returnDate || '',
          item.status === 'approved' ? '/' : item.status === 'rejected' ? 'X' : '',
          '',
          '',
          ''
        ];
        doc.text(rowData[i], currentX + w / 2, dataY + r * rowH + 4.5, { align: 'center' });
      } else if (i === 0) {
        doc.text((r + 1).toString(), currentX + w / 2, dataY + r * rowH + 4.5, { align: 'center' });
      }

      currentX += w;
    });
  }

  // ─── SIGNATURE SECTION ────────────────────────────────────────
  const sigY = dataY + totalRows * rowH + 5;
  const sigW = contentW / 2;
  const sigH = 34;

  doc.setFontSize(9);

  // Tandatangan Peminjam
  doc.rect(margin, sigY, sigW, sigH);
  doc.text('.........................................', margin + 6, sigY + 12);
  doc.text('(Tandatangan Peminjam)', margin + 6, sigY + 16);
  doc.text(`Nama       : ${req.userName || ''}`, margin + 6, sigY + 22);
  doc.text(`Jawatan   : ${(requester as any).jawatan || ''}`, margin + 6, sigY + 26);
  doc.text(`Tarikh     : ${req.borrowDate || ''}`, margin + 6, sigY + 30);

  // Tandatangan Pelulus
  doc.rect(margin + sigW, sigY, sigW, sigH);
  doc.text('.........................................', margin + sigW + 6, sigY + 12);
  doc.text('(Tandatangan Pelulus)', margin + sigW + 6, sigY + 16);
  if (currentUser.role === 'admin') {
    doc.text(`Nama       : ${currentUser.name || ''}`, margin + sigW + 6, sigY + 22);
    doc.text(`Jawatan   : ${(currentUser as any).jawatan || ''}`, margin + sigW + 6, sigY + 26);
  } else {
    doc.text('Nama       :', margin + sigW + 6, sigY + 22);
    doc.text('Jawatan   :', margin + sigW + 6, sigY + 26);
  }
  doc.text('Tarikh     :', margin + sigW + 6, sigY + 30);

  // Tandatangan Pemulang
  const sig2Y = sigY + sigH;
  doc.rect(margin, sig2Y, sigW, sigH);
  doc.text('.........................................', margin + 6, sig2Y + 12);
  doc.text('(Tandatangan Pemulang)', margin + 6, sig2Y + 16);
  doc.text('Nama       :', margin + 6, sig2Y + 22);
  doc.text('Jawatan   :', margin + 6, sig2Y + 26);
  doc.text('Tarikh     :', margin + 6, sig2Y + 30);

  // Tandatangan Penerima
  doc.rect(margin + sigW, sig2Y, sigW, sigH);
  doc.text('.........................................', margin + sigW + 6, sig2Y + 12);
  doc.text('(Tandatangan Penerima)', margin + sigW + 6, sig2Y + 16);
  doc.text('Nama       :', margin + sigW + 6, sig2Y + 22);
  doc.text('Jawatan   :', margin + sigW + 6, sig2Y + 26);
  doc.text('Tarikh     :', margin + sigW + 6, sig2Y + 30);

  doc.save(`KEW-PA9-${req.requestId}.pdf`);
}