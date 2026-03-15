export default function RatingBadge({ rating }: { rating: any }) {
  return (
    <span className="bg-yellow-400 text-black px-2 py-1 rounded text-sm">⭐ {rating}</span>
  );
}
