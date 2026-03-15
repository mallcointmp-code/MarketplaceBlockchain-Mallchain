export default function OrderCard({ order = {}, onApprove }: { order: any, onApprove: any }) {
  const o = { id: order._id || order.id || '2341', status: order.status || 'Awaiting Delivery', items: order.items || [{ name: 'Sneakers' }] };
  return (
    <div className="border p-4 rounded space-y-2">
      <p className="font-semibold">Order #{o.id}</p>
      <p>Status: {o.status}</p>
      <div className="flex gap-2">
        <button onClick={() => onApprove && onApprove(o.id)} className="bg-blue-600 text-white px-3 py-1 rounded">Approve Delivery</button>
      </div>
    </div>
  );
}
