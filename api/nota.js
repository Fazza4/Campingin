import { google } from "googleapis";
import PDFDocument from "pdfkit";
import stream from "stream";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { nama, barang, qty, harga, total } = req.body;

    // === 1. Buat PDF ===
    const doc = new PDFDocument({ size: [226.77, 600] }); // 8 cm lebar
    let buffers = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", async () => {
      const pdfBuffer = Buffer.concat(buffers);

      // === 2. Upload ke Google Drive ===
      const auth = new google.auth.JWT(
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        null,
        process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        ["https://www.googleapis.com/auth/drive.file"]
      );
      const drive = google.drive({ version: "v3", auth });

      const bufferStream = new stream.PassThrough();
      bufferStream.end(pdfBuffer);

      const file = await drive.files.create({
        requestBody: {
          name: `Nota-${nama}-${Date.now()}.pdf`,
          parents: [process.env.GOOGLE_DRIVE_FOLDER_ID]
        },
        media: {
          mimeType: "application/pdf",
          body: bufferStream
        },
        fields: "id, webViewLink"
      });

      res.status(200).json({ success: true, link: file.data.webViewLink });
    });

    // Isi PDF
    doc.fontSize(14).text("NOTA SEWA CAMPINGIN", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Nama: ${nama}`);
    doc.text(`Barang: ${barang}`);
    doc.text(`Qty: ${qty}`);
    doc.text(`Harga: Rp${harga}`);
    doc.text(`Total: Rp${total}`);
    doc.end();

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Gagal membuat nota" });
  }
}
