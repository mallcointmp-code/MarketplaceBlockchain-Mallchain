import { useNavigate } from 'react-router-dom';
import { useCart } from '../../lib/cartContext';
import { ShoppingCart, Eye, Star, MapPin } from 'lucide-react';

export default function ProductCard({ product = {} }: { product?: any }) {
  const navigate = useNavigate();
  const { addItem } = useCart();

  const p = {
    id: product.id || product._id || 1,
    name: product.name || 'Premium Product',
    price: product.price || 0,
    shop: product.shop || product.shopName || "Elena's Shop",
    condition: product.condition || 'New',
    img: product.img || product.image || (product.images && product.images[0]) || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600',
    rating: 4.8,
    reviews: 24,
    location: 'Nairobi, KE'
  };

  return (
    <div className="group relative glass-card rounded-[2rem] overflow-hidden flex flex-col h-full animate-fade-in hover-glow">
      {/* Image Container */}
      <div className="relative h-56 overflow-hidden">
        <img
          src={p.img}
          alt={p.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Condition Badge */}
        <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[10px] font-black uppercase tracking-widest text-white">
          {p.condition}
        </div>

        {/* Quick Action Overlay */}
        <div className="absolute inset-0 flex items-center justify-center gap-3 translate-y-10 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <button
            onClick={() => navigate(`/buyer/product/${p.id}`)}
            className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl"
          >
            <Eye className="w-5 h-5" />
          </button>
          <button
            onClick={() => addItem({ id: p.id, title: p.name, price: p.price, qty: 1 })}
            className="w-12 h-12 rounded-full bg-indigo-500 text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl shadow-indigo-500/20"
          >
            <ShoppingCart className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{p.shop}</span>
          <div className="flex items-center gap-1 text-slate-400">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span className="text-[10px] font-bold">{p.rating} ({p.reviews})</span>
          </div>
        </div>

        <h3 className="text-lg font-black text-white leading-tight mb-2 group-hover:text-indigo-400 transition-colors">
          {p.name}
        </h3>

        <div className="flex items-center gap-1 text-slate-500 mb-4">
          <MapPin className="w-3 h-3" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">{p.location}</span>
        </div>

        <div className="mt-auto flex items-end justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-0.5">Price</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-black text-indigo-400 uppercase">KES</span>
              <span className="text-2xl font-black text-white tracking-tighter">
                {Number(p.price).toLocaleString()}
              </span>
            </div>
          </div>

          <button
            onClick={() => addItem({ id: p.id, title: p.name, price: p.price, qty: 1 })}
            className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/10 transition-all group-hover:bg-indigo-500 group-hover:text-white group-hover:border-indigo-400"
          >
            <ShoppingCart className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
