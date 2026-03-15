export default function ProductRow({ product = {}, onDelete, onEdit }: { product: any, onDelete: any, onEdit: any }) {
  const p = { id: product._id || product.id, name: product.name || 'Sneakers', price: product.price || 2500, total: product.total || 30, remaining: product.remaining || 12 };
  return (
    <div className="flex items-center justify-between border p-3 rounded mb-2">
      <div>
        <div className="font-medium">{p.name}</div>
        <div className="text-sm text-gray-600">{p.remaining} / {p.total} left</div>
      </div>
      <div className="flex items-center gap-3">
        <div className="font-semibold">KES {p.price}</div>
        <button onClick={() => onEdit && onEdit(p)} className="px-3 py-1 border rounded">Edit</button>
        <button onClick={() => onDelete && onDelete(p.id)} className="px-3 py-1 border rounded text-red-600">Delete</button>
      </div>
    </div>
  );
}
