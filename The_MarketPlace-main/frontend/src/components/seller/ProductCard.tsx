export default function ProductCard({ product = {} }: { product?: any }) {
  const p = product || {};
  return (
    <div className="border rounded p-3 hover:shadow">
      <img src={p.image || p.img || 'https://via.placeholder.com/150'} className="rounded mb-2 w-full h-32 object-cover" />
      <h3 className="font-semibold">{p.name || p.title || 'Product'}</h3>
      <p className="text-sm text-gray-500">KES {p.price || p.amount || '0'}</p>

      <div className="flex justify-between mt-2">
        <button className="text-blue-600">Edit</button>
        <button className="text-red-600">Delete</button>
      </div>
    </div>
  );
}
