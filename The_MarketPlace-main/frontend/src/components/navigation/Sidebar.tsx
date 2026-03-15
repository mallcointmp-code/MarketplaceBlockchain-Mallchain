import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    ShoppingBag,
    Briefcase,
    Wallet,
    Package,
    Shield,
    Settings,
    Users,
    BarChart3,
    CheckSquare,
    Zap,
    PlusCircle,
    History,
    Star,
    MessageCircle,
    LifeBuoy,
    Calculator
} from 'lucide-react';
import { useUserStore } from '../../store/userStore';
import { UserRole } from '../../types';

interface NavItem {
    label: string;
    path: string;
    icon: any;
    roles: UserRole[];
}

const navItems: NavItem[] = [
    // Shared / Entry
    { label: 'Platform Command', path: '/dashboard-redirect', icon: Shield, roles: ['admin', 'superadmin'] },
    { label: 'Dashboard', path: '/dashboard-redirect', icon: LayoutDashboard, roles: ['buyer', 'seller', 'creator', 'delivery'] },
    { label: 'Job Portal', path: '/jobs', icon: Briefcase, roles: ['admin', 'superadmin', 'buyer', 'seller', 'creator', 'delivery'] },
    { label: 'Messages', path: '/chat', icon: MessageCircle, roles: ['admin', 'superadmin', 'buyer', 'seller', 'creator', 'delivery'] },
    { label: 'Help & Support', path: '/support', icon: LifeBuoy, roles: ['admin', 'superadmin', 'buyer', 'seller', 'creator', 'delivery'] },

    // Admin & Superadmin ONLY
    { label: 'User Management', path: '/admin/users', icon: Users, roles: ['admin', 'superadmin'] },
    { label: 'Content Control', path: '/admin/content', icon: CheckSquare, roles: ['admin', 'superadmin'] },
    { label: 'Financials', path: '/admin/financials', icon: BarChart3, roles: ['admin', 'superadmin'] },

    // Buyer
    { label: 'Browse Market', path: '/buyer/browse', icon: ShoppingBag, roles: ['buyer', 'admin', 'superadmin'] },
    { label: 'My Orders', path: '/buyer/orders', icon: Package, roles: ['buyer'] },
    { label: 'My Wallet', path: '/wallet', icon: Wallet, roles: ['admin', 'superadmin', 'buyer'] },

    // Seller
    { label: 'My Products', path: '/seller/products', icon: ShoppingBag, roles: ['seller', 'admin', 'superadmin'] },
    { label: 'Sales Orders', path: '/seller/orders', icon: Package, roles: ['seller'] },
    { label: 'Seller Wallet', path: '/seller/wallet', icon: Wallet, roles: ['seller'] },
    { label: 'Manage Jobs', path: '/jobs/manage', icon: Settings, roles: ['admin', 'superadmin', 'seller'] },

    // Creator
    { label: 'Active Tasks', path: '/creator/tasks', icon: CheckSquare, roles: ['creator'] },
    { label: 'Create Task', path: '/creator/tasks/new', icon: PlusCircle, roles: ['creator'] },
    { label: 'Earnings', path: '/earn', icon: Zap, roles: ['creator'] },

    // Delivery
    { label: 'Available Jobs', path: '/delivery/tasks', icon: Briefcase, roles: ['delivery'] },
    { label: 'Active Delivery', path: '/delivery', icon: Package, roles: ['delivery'] },
    { label: 'History', path: '/delivery/history', icon: History, roles: ['delivery'] },
    { label: 'Performance', path: '/delivery/performance', icon: BarChart3, roles: ['delivery'] },
    { label: 'Delivery Ratings', path: '/delivery/ratings', icon: Star, roles: ['delivery'] },
    { label: 'Delivery Wallet', path: '/delivery/wallet', icon: Wallet, roles: ['delivery'] },

    // Tools
    { label: 'Currency Calculator', path: '/tools/calculator', icon: Calculator, roles: ['admin', 'superadmin', 'buyer', 'seller', 'creator', 'delivery'] },
];

export default function Sidebar() {
    const { user } = useUserStore();
    const location = useLocation();

    if (!user) return null;

    const filteredItems = navItems.filter(item => item.roles.includes(user.role as UserRole));

    // Helper to group items if needed, but for now just flat list

    return (
        <aside className="w-72 h-screen fixed left-0 top-0 z-50 p-6 flex flex-col bg-slate-950/50 backdrop-blur-3xl border-r border-white/5">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-10 px-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-premium flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <Zap className="w-6 h-6 text-white fill-white" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-white tracking-tighter">THE MARKET</h1>
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Next-Gen Platform</span>
                </div>
            </div>

            {/* Navigation Section */}
            <div className="flex-1 space-y-8 overflow-y-auto scrollbar-hide">
                <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 ml-2">Main Navigation</p>
                    <nav className="space-y-1.5">
                        {filteredItems.map((item) => {
                            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.path}
                                    to={item.path === '/dashboard-redirect' ? `/${user.role}` : item.path}
                                    className={`
                                        group flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300
                                        ${isActive
                                            ? 'bg-white/10 text-white shadow-xl shadow-indigo-500/5'
                                            : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                                        }
                                    `}
                                >
                                    <Icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                                    <span className="text-sm font-bold tracking-tight">{item.label}</span>
                                    {isActive && (
                                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </div>

            {/* Footer / User Info */}
            <div className="mt-auto pt-6 border-t border-white/5 space-y-3">
                {/* Settings Link */}
                <Link
                    to="/settings"
                    className="flex items-center gap-3 px-3 py-3 group hover:bg-white/5 rounded-2xl transition-all"
                >
                    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden group-hover:border-indigo-500/50 transition-colors flex-shrink-0">
                        {user.avatar ? (
                            <img src={user.avatar} alt={user.fullName} className="w-full h-full object-cover" />
                        ) : (
                            <Users className="w-5 h-5 text-slate-500" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate group-hover:text-indigo-400 transition-colors">{user.fullName}</p>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{user.role}</p>
                    </div>
                    <Settings className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
                </Link>

                {/* Logout Button */}
                {/* <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-400 hover:bg-red-500/10 transition-all duration-300 font-bold text-sm"
                >
                    <LogOut className="w-5 h-5" />
                    <span>Sign Out</span>
                </button> */}
            </div>
        </aside>
    );
}
