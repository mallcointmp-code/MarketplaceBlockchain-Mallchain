const links = [
  { id: "home", label: "Marketplace" },
  { id: "cart", label: "Cart" },
  { id: "orders", label: "My Orders" },
  { id: "wallet", label: "Wallet" },
  { id: "reviews", label: "My Reviews" },
  { id: "notifications", label: "Notifications" },
];

export default function BuyerSidebar({ active, setActive }: { active: any, setActive: any }) {
  return (
    <aside className="w-64 bg-black text-white p-4">
      <h2 className="text-xl font-bold mb-6">Buyer</h2>
      <ul className="space-y-3">
        {links.map(l => (
          <li
            key={l.id}
            onClick={() => setActive(l.id)}
            className={`cursor-pointer p-2 rounded ${active === l.id ? "bg-white text-black" : "hover:bg-gray-800"
              }`}
          >
            {l.label}
          </li>
        ))}
      </ul>
    </aside>
  );
}
