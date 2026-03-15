import { useState } from 'react';

export default function TaskCard({ task, onAccept }: { task: any, onAccept: any }) {
  const [loading, setLoading] = useState(false);


  async function handleAccept() {
    if (!onAccept) return;
    setLoading(true);
    try {
      await onAccept();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border p-4 rounded mb-3 space-y-2">
      <p><strong>Shop:</strong> {task?.sellerName || 'Unknown Shop'}</p>
      <p><strong>Buyer:</strong> {task?.customerName || 'Unknown Buyer'}</p>
      <p><strong>Pay:</strong> KES {task?.fee || 0}</p>

      <div className="flex gap-2 mt-2">
        <button onClick={handleAccept} disabled={loading} className="bg-green-600 text-white px-3 py-1 rounded">
          {loading ? 'Accepting…' : 'Accept Task'}
        </button>
      </div>
    </div>
  );
}
