import { useState } from 'react';
import Deposit from '../../pages/Wallet/sections/Deposit';
import Withdraw from '../../pages/Wallet/sections/Withdraw';
import Transfer from '../../pages/Wallet/sections/Transfer';
import ConvertPoints from '../../pages/Wallet/sections/Convert';

export default function WalletTabs() {
  const [tab, setTab] = useState('history');

  const actions = [
    { key: 'deposit', label: 'Deposit' },
    { key: 'withdraw', label: 'Withdraw' },
    { key: 'transfer', label: 'Transfer' },
    { key: 'convert', label: 'Convert Points' },
    { key: 'history', label: 'Transaction History' }
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {actions.map(a => (
          <button
            key={a.key}
            onClick={() => setTab(a.key)}
            className={`border px-4 py-2 rounded ${tab === a.key ? 'bg-black text-white' : ''}`}>
            {a.label}
          </button>
        ))}
      </div>

      <div className="pt-4">
        {tab === 'deposit' && <Deposit />}
        {tab === 'withdraw' && <Withdraw />}
        {tab === 'transfer' && <Transfer />}
        {tab === 'convert' && <ConvertPoints />}
        {tab === 'history' && (
          <div>
            <p className="text-sm text-gray-500 mb-2">Recent transactions</p>
            <div className="space-y-2">
              <div className="text-gray-600">No transactions yet</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
