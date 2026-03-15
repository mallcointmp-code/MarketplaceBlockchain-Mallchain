interface MetricCardProps {
  title: string;
  value: string | number;
}

export default function MetricCard({ title, value }: MetricCardProps) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-primary/50 transition-all duration-300 group">
      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2 group-hover:text-primary transition-colors">{title}</p>
      <h3 className="text-2xl font-bold text-gray-900 group-hover:scale-105 transition-transform origin-left">{value}</h3>
    </div>
  );
}
