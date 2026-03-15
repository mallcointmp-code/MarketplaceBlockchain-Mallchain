export default function TaskCard({ onOpen }: { onOpen: any }) {
  return (
    <div className="bg-white p-4 rounded shadow">
      <p className="font-semibold">Order #8891</p>
      <p className="text-sm">Pickup: Elena Fashion</p>
      <p className="text-sm">Drop-off: Kilimani</p>
      <p className="text-sm text-green-600">Pay: KES 450</p>

      <button
        onClick={onOpen}
        className="mt-3 bg-black text-white px-4 py-2 rounded"
      >
        View Task
      </button>
    </div>
  );
}
