import ProductCard from "./ProductCard";
import { useEffect, useState } from 'react';
import { listProducts } from '../../api';
import type { Product } from '../../types';

export default function ProductGrid({ products = null, page = 1, limit = 24 }: { products?: Product[] | null, page?: number, limit?: number }) {
  const [items, setItems] = useState<Product[] | null>(products || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (products) return;
    let mounted = true;
    async function load() {
      setLoading(true); setError(null);
      try {
        const result = await listProducts({ page, limit });
        if (mounted) setItems(result.products || []);
      } catch (e: any) {
        if (mounted) setError(e.message || 'Failed to load products');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [products, page, limit]);

  if (loading) return <div className="text-center text-gray-500">Loading products…</div>;
  if (error) return <div className="text-center text-red-600">{error}</div>;
  const list = items || [];

  if (list.length === 0) return <div className="text-gray-500">No products found.</div>;

  return (
    <div className="grid md:grid-cols-3 gap-4">
      {list.map((p) => <ProductCard key={p._id || p.id} product={p} />)}
    </div>
  );
}
