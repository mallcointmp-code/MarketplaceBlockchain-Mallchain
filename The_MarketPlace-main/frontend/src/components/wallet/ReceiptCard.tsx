import { downloadReceipt } from '../../api';

export default function ReceiptCard({ tx }: { tx: any }) {
  const colors = {
    incoming: "bg-green-100",
    outgoing: "bg-blue-100",
    conversion: "bg-yellow-100",
    withdrawal: "bg-orange-100"
  };

  async function download() {
    if (!tx || !tx.id) return alert('No transaction id');
    try {
      const blob = await downloadReceipt(tx.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // We'd ideally guess extension from blob.type but default to pdf/txt
      const ext = blob.type.includes('pdf') ? 'pdf' : blob.type.includes('json') ? 'json' : 'txt';
      a.download = `receipt-${tx.id}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Download failed');
    }
  }

  async function shareReceipt() {
    const content = `Receipt: ${tx.type} ${tx.amount} ${tx.currency} on ${tx.date}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Transaction Receipt', text: content }); }
      catch (e: any) { /* ignore */ }
    } else {
      try { await navigator.clipboard.writeText(content); alert('Receipt copied to clipboard'); } catch (e: any) { alert('Copy failed'); }
    }
  }

  return (
    <div className={`p-3 rounded ${(colors as any)[tx.type] || "bg-gray-100"}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="font-medium">{tx.currency}</p>
          <p className="text-sm">{tx.type} • {tx.amount}</p>
          <p className="text-xs text-gray-600">{tx.date}</p>
        </div>
        <div className="flex flex-col gap-2 ml-4">
          <button onClick={download} className="text-sm bg-white px-2 py-1 rounded border">Download</button>
          <button onClick={shareReceipt} className="text-sm bg-white px-2 py-1 rounded border">Share</button>
        </div>
      </div>
    </div>
  );
}
