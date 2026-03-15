import { useUserStore } from "../store/userStore";

export default function DeliveryHeader() {
  const { user, logout } = useUserStore();

  return (
    <header className="bg-white shadow p-4 flex justify-between items-center">
      <h1 className="font-semibold text-gray-800">
        Good day {user?.fullName || 'Agent'} 🚴‍♂️ Ready for your next delivery?
      </h1>
      <div className="flex items-center gap-4">
        <button
          onClick={() => logout()}
          className="text-sm font-semibold text-red-500 hover:text-red-700 transition-colors"
        >
          Logout
        </button>
        <img src="https://i.pravatar.cc/40" className="rounded-full w-10 h-10 border-2 border-primary/20" alt="Profile" />
      </div>
    </header>
  );
}
