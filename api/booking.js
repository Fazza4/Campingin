// /api/booking.js
import fetch from 'node-fetch';
import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { nama, telp, alamat, tanggalAmbil, tanggalKembali, jaminan, tipeTransaksi, statusBooking, totalHarga } = req.body;

    // === 1. Update Stok & Tambah Customer di Google Sheets ===
    const sheets = google.sheets({ version: 'v4', auth: process.env.GOOGLE_API_KEY });
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: 'Sheet1!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[new Date().toLocaleString(), nama, telp, alamat, tanggalAmbil, tanggalKembali, jaminan, tipeTransaksi, statusBooking, totalHarga]]
      }
    });

    // Tambah ke database customer
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: 'Sheet2!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[nama, telp, alamat]]
      }
    });

    // === 2. Tambah Event di Google Calendar ===
    const calendar = google.calendar({ version: 'v3', auth: process.env.GOOGLE_API_KEY });
    await calendar.events.insert({
      calendarId: process.env.CALENDAR_ID,
      requestBody: {
        summary: `${statusBooking} - ${nama}`,
        start: { date: tanggalAmbil },
        end: { date: tanggalKembali }
      }
    });

    // === 3. Kirim Notif Telegram ===
    const telegramMsg = `📢 *${statusBooking.toUpperCase()} Baru*\n👤 ${nama}\n📞 ${telp}\n📅 Ambil: ${tanggalAmbil}\n📅 Kembali: ${tanggalKembali}\n💰 Total: Rp${totalHarga.toLocaleString()}`;
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: telegramMsg,
        parse_mode: 'Markdown'
      })
    });

    res.status(200).json({ message: 'Booking sukses' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal memproses booking' });
  }
}
