export default function InventoryRow({ item = {} }: { item?: any }) {
  return (
    <div className="flex justify-between border p-3 rounded mb-2">
      <div>
        <div className="font-medium">{item.name || 'Product'}</div>
        <div className="text-sm text-gray-500">SKU: {item.sku || '-'}</div>
      </div>
      <div className="text-sm text-gray-700">{(item.qty || 0)} / {item.total || 0} left</div>
    </div>
  );
}
