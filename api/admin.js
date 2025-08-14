// /api/admin.js
import { google } from 'googleapis';
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { action, itemId, tanggalBaru, nama, telp } = req.body;
    const sheets = google.sheets({ version: 'v4', auth: process.env.GOOGLE_API_KEY });

    if (action === 'updateStatus') {
      // Update status barang di Sheets
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.SHEET_ID,
        range: `Sheet1!J${itemId}`, // misal kolom status ada di kolom J
        valueInputOption: 'RAW',
        requestBody: { values: [[tanggalBaru]] }
      });
    }

    if (action === 'perpanjang') {
      // Update tanggal kembali di Sheets
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.SHEET_ID,
        range: `Sheet1!F${itemId}`, // kolom tanggal kembali
        valueInputOption: 'RAW',
        requestBody: { values: [[tanggalBaru]] }
      });

      // Kirim notif Telegram
      const telegramMsg = `📢 *Perpanjangan Sewa*\n👤 ${nama}\n📞 ${telp}\n📅 Tanggal kembali baru: ${tanggalBaru}`;
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: telegramMsg,
          parse_mode: 'Markdown'
        })
      });
    }

    res.status(200).json({ message: 'Aksi admin berhasil' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal memproses admin action' });
  }
}
