const PDFDocument = require('pdfkit');
const WalletTransaction = require('../models/WalletTransaction.js');
const fs = require('fs');
const path = require('path');
const Receipt = require('../models/Receipt.js');
const Order = require('../models/Order.js');
const { sendEmail } = require('../services/emailService.js');
const { randomTheme } = require('../utils/receiptUtils.js');

// Download receipt as PDF
const downloadReceipt = async (req, res) => {
  try {
    const { txId } = req.params;
    const tx = await WalletTransaction.findById(txId).lean();
    if (!tx) return res.status(404).json({ error: 'tx not found' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt_${txId}.pdf`);

    const doc = new PDFDocument();
    doc.pipe(res);
    doc.fontSize(20).text('The Market Place - Receipt', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Transaction: ${tx._id}`);
    doc.text(`Type: ${tx.type}`);
    doc.text(`Amount: ${tx.amount} ${tx.currency}`);
    doc.text(`Date: ${tx.createdAt}`);
    doc.text(`Meta: ${JSON.stringify(tx.meta || {})}`);
    doc.end();
  } catch (err) {
    console.error('downloadReceipt err', err);
    res.status(500).json({ error: 'failed to create pdf' });
  }
};

// Directory for saving PDFs
const RECEIPTS_DIR = path.join(process.cwd(), 'uploads', 'receipts');
if (!fs.existsSync(RECEIPTS_DIR)) fs.mkdirSync(RECEIPTS_DIR, { recursive: true });

// Build PDF file path
function buildPdfPath(receiptId) {
  return path.join(RECEIPTS_DIR, `receipt_${receiptId}.pdf`);
}

// Create receipt PDF
function createReceiptPdf(receiptData, outPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const stream = fs.createWriteStream(outPath);
    doc.pipe(stream);

    const color = receiptData.themeColor || '#10b981';

    // Header
    doc.rect(0, 0, 595.28, 80).fill(color);
    doc.fillColor('white').fontSize(20).text('THE MARKET PLACE — RECEIPT', 40, 30);

    // Order / Payment info
    doc.moveDown().fillColor('black');
    doc.fontSize(12).text(`Receipt ID: ${receiptData.receiptId}`, { continued: true }).text('', { align: 'right' });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Order ID: ${receiptData.orderId}`);
    doc.text(`Date: ${new Date(receiptData.createdAt).toLocaleString()}`);
    doc.text(`Customer: ${receiptData.customerName} • ${receiptData.customerPhone}`);
    doc.text(`Seller: ${receiptData.sellerName} • ${receiptData.sellerPhone}`);
    doc.moveDown(0.5);

    // Items table
    doc.fontSize(12).text('Items:', { underline: true });
    receiptData.items.forEach((it) => {
      doc.moveDown(0.2);
      doc.fontSize(11).text(`${it.title} — Ksh ${it.price} x ${it.qty} = Ksh ${it.price * it.qty}`);
    });

    doc.moveDown();
    doc.fontSize(13).text(`Total: Ksh ${receiptData.total}`, { align: 'right' });

    doc.moveDown(1);
    doc.fontSize(10).fillColor('gray').text('Thank you for using The Market Place.', { align: 'center' });

    doc.end();

    stream.on('finish', () => resolve());
    stream.on('error', (err) => reject(err));
  });
}

// Create receipt for an order
async function createReceiptForOrder(req, res) {
  try {
    const opts = req && req.orderId ? req : req.body || {};
    const { orderId, sendEmailToCustomer = true } = opts;

    const order = await Order.findById(orderId).lean();
    if (!order) {
      if (res && res.status) return res.status(404).json({ error: 'Order not found' });
      throw new Error('Order not found');
    }

    const items = Array.isArray(order.items)
      ? order.items.map(i => ({ title: i.title || i.name || 'Item', qty: i.qty || 1, price: i.price || 0 }))
      : [];
    const snapshot = {
      orderId: order._id,
      items,
      total: order.total || items.reduce((s, it) => s + (it.price || 0) * (it.qty || 1), 0),
      customerName: order.customerName || order.buyerName || '',
      customerPhone: order.customerPhone || order.buyerPhone || '',
      sellerId: items.length ? (items[0].sellerId || null) : null,
      createdAt: new Date(),
    };

    const theme = randomTheme();
    const receipt = new Receipt({
      orderId: order._id,
      sellerId: snapshot.sellerId,
      customerId: order.customerId || null,
      amount: snapshot.total || 0,
      currency: 'KSH',
      theme,
      data: snapshot,
    });

    await receipt.save();

    const pdfPath = buildPdfPath(receipt._id);
    const pdfData = {
      receiptId: receipt._id,
      orderId: order._id,
      createdAt: receipt.createdAt,
      items: Array.isArray(snapshot.items) ? snapshot.items : [],
      total: snapshot.total,
      customerName: snapshot.customerName || '',
      customerPhone: snapshot.customerPhone || '',
      sellerName: order.sellerName || order.seller || 'Seller',
      sellerPhone: order.sellerPhone || order.sellerContact || '',
      themeColor: (theme && (theme.colorHex || theme.color)) || '#10b981',
    };

    await createReceiptPdf(pdfData, pdfPath);

    receipt.pdfPath = pdfPath;
    await receipt.save();

    if (sendEmailToCustomer && order.customerEmail) {
      const subject = `Receipt for order ${order._id} — The Market Place`;
      const text = `Dear ${order.customerName},\n\nThank you. Please find your receipt attached.`;
      try {
        await sendEmail(order.customerEmail, subject, text, [{ filename: `receipt_${receipt._id}.pdf`, path: pdfPath }]);
      } catch (err) {
        console.warn('Email send failed', err);
      }
    }

    const pdfUrl = `/uploads/receipts/receipt_${receipt._id}.pdf`;
    if (res && res.json) return res.json({ receiptId: receipt._id, pdfUrl, receipt });
    return { receiptId: receipt._id, pdfUrl, receipt };
  } catch (err) {
    console.error(err);
    if (res && res.status) return res.status(500).json({ error: 'Failed to create receipt' });
    throw err;
  }
}

// List receipts
async function listReceipts(req, res) {
  try {
    const { customerId, sellerId } = req.query;
    const q = {};
    if (customerId) q.customerId = customerId;
    if (sellerId) q.sellerId = sellerId;
    const receipts = await Receipt.find(q).sort({ createdAt: -1 }).limit(200);
    res.json(receipts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list receipts' });
  }
}

// Get single receipt
async function getReceipt(req, res) {
  try {
    const r = await Receipt.findById(req.params.id);
    if (!r) return res.status(404).json({ error: 'Not found' });
    res.json(r);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get receipt' });
  }
}

// CommonJS exports
module.exports = {
  PDFDocument,
  WalletTransaction,
  fs,
  path,
  Receipt,
  Order,
  downloadReceipt,
  createReceiptForOrder,
  listReceipts,
  getReceipt,
  RECEIPTS_DIR,
  buildPdfPath,
  createReceiptPdf,
};
