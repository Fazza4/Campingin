// /api/nota.js
import { google } from 'googleapis';
import { jsPDF } from 'jspdf';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { nama, telp, items, totalHarga } = req.body;

    // === 1. Buat PDF Nota ===
    const doc = new jsPDF({
      unit: 'mm',
      format: [80, 200] // Nota ukuran kecil
    });

    doc.setFontSize(12);
    doc.text('Campingin Rental', 10, 10);
    doc.text(`Nama: ${nama}`, 10, 20);
    doc.text(`Telp: ${telp}`, 10, 26);
    let y = 40;
    items.forEach(item => {
      doc.text(`${item.nama} x${item.qty} - Rp${item.harga}`, 10, y);
      y += 6;
    });
    doc.text(`Total: Rp${totalHarga}`, 10, y + 10);

    const pdfBuffer = doc.output('arraybuffer');

    // === 2. Upload ke Google Drive ===
    const drive = google.drive({ version: 'v3', auth: process.env.GOOGLE_API_KEY });
    const file = await drive.files.create({
      requestBody: {
        name: `Nota-${nama}-${Date.now()}.pdf`,
        parents: [process.env.DRIVE_FOLDER_ID]
      },
      media: {
        mimeType: 'application/pdf',
        body: Buffer.from(pdfBuffer)
      }
    });

    const fileId = file.data.id;
    const fileUrl = `https://drive.google.com/file/d/${fileId}/view`;

    res.status(200).json({ message: 'Nota dibuat', link: fileUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal membuat nota' });
  }
}
