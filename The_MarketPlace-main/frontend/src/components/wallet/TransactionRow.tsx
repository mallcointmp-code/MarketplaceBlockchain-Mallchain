interface TransactionRowProps {
  title: string;
  amount: string | number;
  date?: string;
  color?: string;
  type?: 'income' | 'expense' | 'conversion';
  meta?: string;
}

export default function TransactionRow({ title, amount, date, color = 'white', type, meta }: TransactionRowProps) {
  return (
    <div className="p-3 rounded mb-2 shadow-sm" style={{ backgroundColor: color }}>
      <div className="flex justify-between">
        <div>
          <div className="font-medium">{title}</div>
          {meta && <div className="text-xs text-gray-500">{meta}</div>}
          {date && <div className="text-xs text-gray-400">{new Date(date).toLocaleString()}</div>}
        </div>
        <div className="font-semibold text-right">
          <div>{amount}</div>
          {type && <div className="text-xs text-gray-400 capitalize">{type}</div>}
        </div>
      </div>
    </div>
  );
}
