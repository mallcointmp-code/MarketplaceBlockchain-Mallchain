const links = [
  { id: "tasks", label: "Active Tasks" },
  { id: "history", label: "Delivery History" },
  { id: "analytics", label: "Performance" },
  { id: "wallet", label: "Wallet" },
  { id: "ratings", label: "Ratings" },
];

export default function DeliverySidebar({ active, setActive }: { active: any, setActive: any }) {
  return (
    <aside className="w-64 bg-black text-white p-4">
      <h2 className="text-xl font-bold mb-6">Delivery</h2>
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
