export default function StatCard({ title, value }: { title: any, value: any }) {
  return (
    <div className="bg-white p-4 rounded shadow">
      <h4 className="text-sm opacity-60">{title}</h4>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
