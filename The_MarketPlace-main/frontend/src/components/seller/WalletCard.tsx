export default function WalletCard({ balance = 0, label = 'MallMoney' }){
  return (
    <div className="border p-3 rounded">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-lg font-semibold">KES {balance.toLocaleString()}</div>
    </div>
  );
}
