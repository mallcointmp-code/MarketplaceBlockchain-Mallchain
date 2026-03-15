import { useState } from 'react';
import { rateDelivery } from '../../api';
import type { ApiError } from '../../types';

export default function RatingForm({ taskId, role = 'buyer', onDone }: { taskId: any, role?: string, onDone?: any }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setLoading(true); setErr(null);
    try {
      await rateDelivery({ taskId, role: role as 'customer' | 'agent', rating, comment });
      if (onDone) onDone({});
    } catch (e) {
      const error = e as ApiError;
      setErr(error.message || 'Failed to submit rating');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border p-4 rounded space-y-3">
      <h3 className="font-semibold">Rate Delivery</h3>
      {err && <div className="text-red-600">{err}</div>}
      <select value={rating} onChange={e => setRating(Number(e.target.value))} className="border p-2 w-full">
        <option value={5}>⭐⭐⭐⭐⭐ Excellent</option>
        <option value={4}>⭐⭐⭐⭐ Good</option>
        <option value={3}>⭐⭐⭐ Average</option>
        <option value={2}>⭐⭐ Poor</option>
        <option value={1}>⭐ Very poor</option>
      </select>
      <textarea className="border p-2 w-full" value={comment} onChange={e => setComment(e.target.value)} placeholder="Optional comment" />
      <button onClick={submit} disabled={loading} className="bg-green-600 text-white px-3 py-1 rounded">{loading ? 'Submitting…' : 'Submit Rating'}</button>
    </div>
  );
}
