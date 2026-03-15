export default function ProductCard({ product }: { product: any }) {
  const image = (product.image || (product.images && product.images[0]) || null);
  return (
    <div className="bg-white p-4 rounded shadow">
      {image ? (
        <img src={image} alt={product.name || 'product'} className="rounded mb-2 w-full h-40 object-cover" />
      ) : (
        <div className="rounded mb-2 w-full h-40 bg-gray-100 flex items-center justify-center text-sm text-gray-500">No image</div>
      )}
      <p className="font-semibold">{product.name || 'Product'}</p>
      <p>Units: {typeof product.remaining !== 'undefined' ? `${product.remaining} / ${product.totalUnits || '-'}` : '-'}</p>
      <p>Price: {product.price ? `KES ${Number(product.price).toLocaleString()}` : '—'}</p>
    </div>
  );
}
