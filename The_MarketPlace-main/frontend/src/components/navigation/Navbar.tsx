import React from 'react';
import { Search, User, Coins, Plus, Heart, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUserStore } from '../../store/userStore';
import Notifications from '../common/Notifications';

import { getCart, getWishlist } from '../../utils/storage';

export default function Navbar() {
    const { user, refreshBalance } = useUserStore();
    const [cartCount, setCartCount] = React.useState(0);
    const [wishlistCount, setWishlistCount] = React.useState(0);

    const updateCounts = () => {
        // Use user-specific storage
        const cart = getCart(user?.id || user?._id);
        const wishlist = getWishlist(user?.id || user?._id);

        setCartCount(cart.reduce((acc: number, item: any) => acc + (item.quantity || 1), 0));
        setWishlistCount(wishlist.length);
    };

    React.useEffect(() => {
        updateCounts();
        refreshBalance(); // Initial refresh

        window.addEventListener('storage', updateCounts);
        window.addEventListener('cart-updated', updateCounts);
        window.addEventListener('wishlist-updated', updateCounts);

        // Poll every few seconds as fallback
        const interval = setInterval(() => {
            updateCounts();
            refreshBalance();
        }, 5000); // 5 seconds is reasonable for balance

        return () => {
            window.removeEventListener('storage', updateCounts);
            window.removeEventListener('cart-updated', updateCounts);
            window.removeEventListener('wishlist-updated', updateCounts);
            clearInterval(interval);
        };
    }, []);

    if (!user) return null;

    return (
        <header className="h-20 fixed top-0 right-0 left-72 z-40 px-8 flex items-center justify-between bg-slate-950/30 backdrop-blur-xl border-b border-white/5">
            {/* Search Bar */}
            <div className="flex-1 max-w-xl">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search products, tasks, or users..."
                        className="w-full pl-12 pr-4 py-2.5 bg-white/[0.03] border border-white/5 rounded-xl text-sm text-white placeholder-slate-600 focus:bg-white/[0.05] focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                    />
                </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-6">
                {/* Stats / Balances */}
                <div className="hidden lg:flex items-center gap-3">
                    <Link to="/wallet" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all">
                        <Coins className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs font-black text-indigo-100">{user.mallCoins || 0} <span className="text-[10px] text-slate-500 ml-1">MC</span></span>
                    </Link>
                    <Link to="/wallet" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all cursor-pointer">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-black text-amber-100">{user.mallPoints || 0} <span className="text-[10px] text-slate-500 ml-1">MP</span></span>
                        <div className="ml-1 w-5 h-5 rounded-lg bg-amber-500/20 flex items-center justify-center hover:bg-amber-500/30 transition-colors">
                            <Plus className="w-3 h-3 text-amber-500" />
                        </div>
                    </Link>
                </div>

                <div className="h-8 w-[1px] bg-white/5"></div>

                {/* Quick Access */}
                <div className="flex items-center gap-2">
                    <Link to="/buyer/wishlist" className="relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/5 transition-all text-slate-400 hover:text-pink-500 group">
                        <Heart className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <Badge count={wishlistCount} color="bg-pink-500" />
                    </Link>
                    <Link to="/buyer/cart" className="relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/5 transition-all text-slate-400 hover:text-indigo-400 group">
                        <ShoppingCart className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <Badge count={cartCount} color="bg-indigo-500" />
                    </Link>
                </div>

                <div className="h-8 w-[1px] bg-white/5"></div>

                {/* Notifications & Profile */}
                <div className="flex items-center gap-4">
                    <Notifications />

                    <div className="flex items-center gap-3 pl-2 group cursor-pointer">

                        <Link to="/settings" className="w-10 h-10 rounded-xl bg-gradient-premium p-[1px] block transition-transform group-hover:scale-105">
                            <div className="w-full h-full rounded-[11px] bg-slate-950 flex items-center justify-center overflow-hidden relative">
                                {user.avatar ? (
                                    <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-5 h-5 text-slate-400" />
                                )}
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </header>
    );
}

function Badge({ count, color }: { count: number; color: string }) {
    if (count === 0) return null;
    return (
        <div className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] ${color} rounded-full flex items-center justify-center text-[10px] font-black text-white px-1 border-2 border-[#0a0a0a]`}>
            {count > 99 ? '99+' : count}
        </div>
    );
}

// Sub-component for icons to avoid errors if not imported correctly
function Zap(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M4 14.71 12 21l8-6.29V8.29L12 2 4 8.29V14.71Z" />
            <path d="M12 2v19" />
            <path d="m20 15-8 6-8-6" />
            <path d="m4 9 8 6 8-6" />
        </svg>
    );
}
