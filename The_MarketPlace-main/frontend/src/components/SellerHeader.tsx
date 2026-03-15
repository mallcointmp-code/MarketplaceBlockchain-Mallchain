import { useUserStore } from "../store/userStore";
import { Link } from "react-router-dom";

export default function SellerHeader() {
  const { user, logout } = useUserStore();

  return (
    <header className="bg-white shadow-sm p-4 flex flex-col md:flex-row justify-between items-center gap-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          Hey {user?.fullName || 'Seller'} ☀️
        </h1>
        <p className="text-sm text-gray-500">Welcome back to your shop dashboard</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="bg-black text-white px-3 py-1 rounded-full text-sm font-bold border border-primary">
          {user?.mallCoins || 0} <span className="text-primary">MC</span>
        </div>
        <Link to="/buyer" className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition">
          Switch to Buying
        </Link>
        <button className="bg-black text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-gray-800 transition">
          Promote Shop
        </button>
        <button
          onClick={() => logout()}
          className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-100 transition"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
