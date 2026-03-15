export default function PerformanceCard({ label, value }: { label: any, value: any }) {
  return (
    <div className="border p-4 rounded text-center">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
