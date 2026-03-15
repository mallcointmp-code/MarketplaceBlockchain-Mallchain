
interface BalanceCardProps {
  title: string;
  value?: string | number;
  amount?: string | number;
  subtitle?: string;
  onClick?: () => void;
  color?: "green" | "yellow" | "blue" | "gray"; // Kept for interface compatibility but ignored or mapped to premium
}

export default function BalanceCard({ title, value, amount, subtitle, onClick }: BalanceCardProps) {
  const displayValue = value ?? amount;

  return (
    <div className="bg-gradient-to-br from-gray-900 to-black text-white p-6 rounded-xl shadow-lg border border-gray-800 hover:border-primary/50 transition-all duration-300 group">
      <div className="flex justify-between items-start mb-4">
        <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">{title}</p>
        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
          <span className="text-primary font-bold text-lg">
            {title.includes("Coin") ? "ⓒ" : title.includes("Points") ? "★" : "$"}
          </span>
        </div>
      </div>

      <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight group-hover:text-primary transition-colors">{displayValue}</h2>

      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}

      {onClick && (
        <button onClick={onClick} className="mt-4 text-sm text-primary font-semibold hover:text-white transition-colors flex items-center gap-1">
          View Details
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      )}
    </div>
  );
}
