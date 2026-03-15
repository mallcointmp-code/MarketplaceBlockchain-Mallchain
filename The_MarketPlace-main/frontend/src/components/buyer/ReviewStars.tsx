export default function ReviewStars({ rating = 4 }){
  return (
    <div className="flex items-center gap-1">
      {Array.from({length:5}).map((_,i)=> (
        <span key={i} className={`text-sm ${i<rating ? 'text-yellow-500':'text-gray-300'}`}>&#9733;</span>
      ))}
    </div>
  );
}
