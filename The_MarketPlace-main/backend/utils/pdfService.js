const PDFDocument = require('pdfkit');
const streamBuffers = require('stream-buffers');

export function generateTransactionReceiptPdf(tx, walletOwner) {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  const bufferStream = new streamBuffers.WritableStreamBuffer();

  doc.fontSize(20).text("The Market Place - Transaction Receipt", { align: "center" });
  doc.moveDown();
  doc.fontSize(12).text(`Receipt for: ${walletOwner?.name || walletOwner?.email || tx.ownerId}`);
  doc.text(`Transaction ID: ${tx._id}`);
  doc.text(`Type: ${tx.type}`);
  doc.text(`Amount: ${tx.amount} ${tx.currency}`);
  doc.text(`Balance before: ${tx.balanceBefore}`);
  doc.text(`Balance after: ${tx.balanceAfter}`);
  doc.text(`Reference: ${tx.reference || "-"}`);
  doc.text(`Date: ${new Date(tx.createdAt).toLocaleString()}`);
  doc.moveDown();
  doc.text("Meta:");
  doc.fontSize(10).text(JSON.stringify(tx.meta || {}, null, 2));
  doc.end();

  return new Promise((resolve, reject) => {
    doc.pipe(bufferStream);
    bufferStream.on("finish", () => {
      const buffer = bufferStream.getContents();
      resolve(buffer);
    });
    bufferStream.on("error", reject);
  });
}

module.exports = { generateTransactionReceiptPdf };

module.exports = { PDFDocument, streamBuffers, doc, bufferStream, buffer };