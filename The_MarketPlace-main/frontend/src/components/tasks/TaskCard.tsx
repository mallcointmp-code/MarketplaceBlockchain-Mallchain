import PlatformBadge from './PlatformBadge';

export default function TaskCard({ platform, action, reward }: { platform: any, action: any, reward: any }) {
  return (
    <div className="border p-4 rounded flex justify-between items-center">
      <div>
        <PlatformBadge platform={platform} />
        <p className="font-semibold">{action}</p>
        <p className="text-sm text-gray-500">Earn {reward}</p>
      </div>

      <button className="bg-green-600 text-white px-3 py-1 rounded">Do Task</button>
    </div>
  );
}
