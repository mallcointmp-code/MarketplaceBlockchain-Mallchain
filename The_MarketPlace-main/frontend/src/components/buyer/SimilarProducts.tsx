import ProductCard from './ProductCard';
export default function SimilarProducts(){
  const sims = [{id:11},{id:12},{id:13}];
  return (
    <div className="mt-4">
      <h3 className="font-semibold mb-2">Similar Products</h3>
      <div className="flex gap-3 overflow-x-auto">
        {sims.map(s=> <div key={s.id} className="w-40"><ProductCard product={{id:s.id}}/></div>)}
      </div>
    </div>
  );
}
