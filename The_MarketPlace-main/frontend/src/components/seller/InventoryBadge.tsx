export default function InventoryBadge({ remaining = 0, threshold = 5 }){
  const low = remaining <= threshold;
  return (
    <span className={`px-2 py-1 text-xs rounded ${low ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{remaining} left</span>
  );
}
