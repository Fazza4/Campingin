import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { rowIndex, statusBaru, tambahanHari } = req.body;

    const auth = new google.auth.JWT(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/calendar"]
    );
    const sheets = google.sheets({ version: "v4", auth });

    // Update status di Google Sheets
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: `Transaksi!I${rowIndex}`, // kolom I untuk status
      valueInputOption: "RAW",
      requestBody: { values: [[statusBaru]] }
    });

    // Kirim notif Telegram
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: `ℹ️ Status barang diubah menjadi: ${statusBaru}`
      })
    });

    res.status(200).json({ success: true, message: "Status diperbarui" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Gagal update status" });
  }
}
