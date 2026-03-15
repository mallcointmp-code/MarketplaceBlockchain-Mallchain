const links = [
  { id: "home", label: "Marketplace" },
  { id: "cart", label: "Cart" },
  { id: "orders", label: "My Orders" },
  { id: "wallet", label: "Wallet" },
  { id: "reviews", label: "My Reviews" },
  { id: "notifications", label: "Notifications" },
];

import { useUserStore } from "../store/userStore";
import { LogOut } from "lucide-react";

export default function BuyerSidebar({ active, setActive }: { active: any, setActive: any }) {
  const { logout } = useUserStore();

  return (
    <aside className="w-64 bg-black text-white p-4 flex flex-col h-screen">
      <h2 className="text-xl font-bold mb-6 px-2">Buyer</h2>
      <ul className="space-y-3 flex-1">
        {links.map(l => (
          <li
            key={l.id}
            onClick={() => setActive(l.id)}
            className={`cursor-pointer p-2 rounded transition-colors ${active === l.id ? "bg-white text-black font-bold" : "hover:bg-gray-800 text-gray-300"
              }`}
          >
            {l.label}
          </li>
        ))}
      </ul>

      <button
        onClick={() => logout()}
        className="mt-auto flex items-center gap-2 p-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors font-medium border border-transparent hover:border-red-500/20"
      >
        <LogOut className="w-5 h-5" />
        Log Out
      </button>
    </aside>
  );
}
