import jsPDF from 'jspdf';
import { BorrowRequest, User } from './storage';

export async function printBorangKEWPA9(req: BorrowRequest, currentUser: User, allUsers: User[]) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = 210;
  const margin = 15;
  const contentW = pageW - margin * 2;
  const requester = allUsers.find(u => u.uid === req.userId) || currentUser;
  console.log('PRINT USER DATA:', JSON.stringify(currentUser));
  console.log('PRINT REQ DATA:', JSON.stringify(req));

  // ─── FONTS & COLORS ───────────────────────────────────────────
  doc.setFont('helvetica');

  // ─── HEADER ───────────────────────────────────────────────────
  doc.setFontSize(7);
  doc.text('Pekeliling Perbendaharaan Malaysia', margin, 12);
  doc.text('AM 2.4 Lampiran A', pageW - margin, 12, { align: 'right' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('KEW.PA-9', pageW - margin, 18, { align: 'right' });

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`No. Permohonan : ${req.requestId}`, pageW - margin, 23, { align: 'right' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('BORANG PERMOHONAN PERGERAKAN/ PINJAMAN ASET ALIH', pageW / 2, 30, { align: 'center' });

  // ─── INFO TABLE ───────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  const infoY = 35;
  const col1X = margin;
  const col2X = margin + contentW / 2;

  // Row 1
  doc.rect(col1X, infoY, contentW / 2, 8);
  doc.rect(col2X, infoY, contentW / 2, 8);
  doc.text('Nama Pemohon :', col1X + 2, infoY + 5);
  doc.setFont('helvetica', 'bold');
  doc.text(req.userName || '', col1X + 35, infoY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text('Tujuan :', col2X + 2, infoY + 5);
  doc.text(req.purpose || '', col2X + 20, infoY + 5);

  // Row 2
  const row2Y = infoY + 8;
  doc.rect(col1X, row2Y, contentW / 2, 8);
  doc.rect(col2X, row2Y, contentW / 2, 8);
  doc.text('Jawatan :', col1X + 2, row2Y + 5);
  doc.text((requester as any).jawatan || '', col1X + 20, row2Y + 5);
  doc.text('Tempat Digunakan :', col2X + 2, row2Y + 5);
  doc.text(req.userDept || '', col2X + 38, row2Y + 5);

  // Row 3
  const row3Y = row2Y + 8;
  doc.rect(col1X, row3Y, contentW / 2, 8);
  doc.rect(col2X, row3Y, contentW / 2, 8);
  doc.text('Bahagian :', col1X + 2, row3Y + 5);
  doc.text(req.userDept || '', col1X + 22, row3Y + 5);
  doc.text('Nama Pengeluar :', col2X + 2, row3Y + 5);
  // Auto-fill kalau admin, kosong kalau user
  if (currentUser.role === 'admin') {
    doc.setFont('helvetica', 'bold');
    doc.text(currentUser.name || '', col2X + 35, row3Y + 5);
    doc.setFont('helvetica', 'normal');
  }

  // ─── ASSET TABLE ──────────────────────────────────────────────
  const tableY = row3Y + 12;
  const colWidths = [10, 30, 35, 22, 22, 18, 22, 18, 23];
  const headers1 = ['Bil.', 'No. Siri\nPendaftaran', 'Keterangan\nAset', 'Tarikh', '', 'Lulus/\nTidak\nLulus', 'Tarikh', '', 'Catatan'];
  const headers2 = ['', '', '', 'Dipinjam', 'Dijangka\nPulang', '', 'Dipulangkan', 'Diterima', ''];

  let xPos = margin;

  // Header row 1
  colWidths.forEach((w, i) => {
    doc.rect(xPos, tableY, w, 8);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    const lines = headers1[i].split('\n');
    lines.forEach((line, li) => {
      doc.text(line, xPos + w / 2, tableY + 3 + li * 3, { align: 'center' });
    });
    xPos += w;
  });

  // Header row 2
  xPos = margin;
  colWidths.forEach((w, i) => {
    doc.rect(xPos, tableY + 8, w, 8);
    doc.setFont('helvetica', 'bold');
    const lines = headers2[i].split('\n');
    lines.forEach((line, li) => {
      doc.text(line, xPos + w / 2, tableY + 11 + li * 3, { align: 'center' });
    });
    xPos += w;
  });

  // Data row
  const dataY = tableY + 16;
  const rowData = [
    '1',
    req.assignedSerialNumber || '',
    req.assetName || '',
    req.borrowDate || '',
    req.returnDate || '',
    '',
    '',
    '',
    ''
  ];

  xPos = margin;
  colWidths.forEach((w, i) => {
    doc.rect(xPos, dataY, w, 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(rowData[i], xPos + w / 2, dataY + 5, { align: 'center' });
    xPos += w;
  });

  // Empty rows
  for (let r = 1; r < 5; r++) {
    xPos = margin;
    colWidths.forEach((w) => {
      doc.rect(xPos, dataY + r * 8, w, 8);
      xPos += w;
    });
  }

  // ─── SIGNATURE SECTION ────────────────────────────────────────
  const sigY = dataY + 5 * 8 + 10;
  const sigW = contentW / 2;

  // Tandatangan Peminjam
  doc.rect(margin, sigY, sigW, 30);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('(Tandatangan Peminjam)', margin + 3, sigY + 5);
  doc.text('Nama :', margin + 3, sigY + 15);
  doc.setFont('helvetica', 'bold');
  doc.text(req.userName || '', margin + 18, sigY + 15);
  doc.setFont('helvetica', 'normal');
  doc.text('Jawatan :', margin + 3, sigY + 20);
  doc.text((requester as any).jawatan || '', margin + 20, sigY + 20);
  doc.text('Tarikh :', margin + 3, sigY + 25);

  // Tandatangan Pelulus
  doc.rect(margin + sigW, sigY, sigW, 30);
  doc.text('(Tandatangan Pelulus)', margin + sigW + 3, sigY + 5);
  doc.text('Nama :', margin + sigW + 3, sigY + 15);
  if (currentUser.role === 'admin') {
    doc.setFont('helvetica', 'bold');
    doc.text(currentUser.name || '', margin + sigW + 18, sigY + 15);
    doc.setFont('helvetica', 'normal');
    doc.text((currentUser as any).jawatan || '', margin + sigW + 20, sigY + 20);
  }
  doc.text('Jawatan :', margin + sigW + 3, sigY + 20);
  doc.text('Tarikh :', margin + sigW + 3, sigY + 25);

  // Tandatangan Pemulang
  const sig2Y = sigY + 30;
  doc.rect(margin, sig2Y, sigW, 30);
  doc.text('(Tandatangan Pemulang)', margin + 3, sig2Y + 5);
  doc.text('Nama :', margin + 3, sig2Y + 15);
  doc.text('Jawatan :', margin + 3, sig2Y + 20);
  doc.text('Tarikh :', margin + 3, sig2Y + 25);

  // Tandatangan Penerima
  doc.rect(margin + sigW, sig2Y, sigW, 30);
  doc.text('(Tandatangan Penerima)', margin + sigW + 3, sig2Y + 5);
  doc.text('Nama :', margin + sigW + 3, sig2Y + 15);
  doc.text('Jawatan :', margin + sigW + 3, sig2Y + 20);
  doc.text('Tarikh :', margin + sigW + 3, sig2Y + 25);

  // ─── SAVE PDF ─────────────────────────────────────────────────
  doc.save(`KEW-PA9-${req.requestId}.pdf`);
}