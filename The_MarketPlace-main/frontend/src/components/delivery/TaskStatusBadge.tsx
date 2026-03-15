export default function TaskStatusBadge({ status }: { status: any }) {
  const colors = {
    unassigned: "bg-gray-100 text-gray-700",
    assigned: "bg-blue-100 text-blue-600",
    accepted: "bg-indigo-100 text-indigo-700",
    picked_up: "bg-yellow-100 text-yellow-700",
    delivered: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
    cancelled: "bg-red-50 text-red-700"
  };
  return (
    <span className={`px-2 py-1 rounded text-xs ${(colors as any)[status || ''] || 'bg-gray-100 text-gray-700'}`}>
      {status?.replace('_', ' ')}
    </span>
  );
}
