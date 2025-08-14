import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      nama, barang, qty, harga, tglAmbil, tglKembali, total, metode
    } = req.body;

    // === 1. Autentikasi Google API ===
    const auth = new google.auth.JWT(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/calendar"]
    );

    const sheets = google.sheets({ version: "v4", auth });

    // === 2. Simpan ke Google Sheets ===
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: "Transaksi!A:H",
      valueInputOption: "RAW",
      requestBody: {
        values: [[
          new Date().toLocaleString("id-ID"),
          nama, barang, qty, harga, qty * harga, total, metode
        ]]
      }
    });

    // === 3. Tambah ke Google Calendar ===
    const calendar = google.calendar({ version: "v3", auth });
    await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      requestBody: {
        summary: `Booking: ${nama} (${barang})`,
        start: { dateTime: new Date(tglAmbil).toISOString() },
        end: { dateTime: new Date(tglKembali).toISOString() }
      }
    });

    // === 4. Kirim Notif Telegram ===
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: `📢 Booking Baru\nNama: ${nama}\nBarang: ${barang}\nQty: ${qty}\nTotal: Rp${total}`
      })
    });

    res.status(200).json({ success: true, message: "Booking berhasil diproses" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Gagal memproses booking" });
  }
}
