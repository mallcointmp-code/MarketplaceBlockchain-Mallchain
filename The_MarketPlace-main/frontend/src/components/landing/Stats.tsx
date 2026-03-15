import { useEffect, useState } from "react";
import { Users, TrendingUp, Coins } from "lucide-react";
import { api } from "../../services/api";

export default function Stats() {
    const [stats, setStats] = useState([
        { label: "Active Users", value: "---", color: "from-green-400 to-emerald-400", icon: Users },
        { label: "MallCoin Volume", value: "---", color: "from-primary to-yellow-400", icon: Coins },
        { label: "MallPoints Earned", value: "---", color: "from-secondary to-blue-400", icon: TrendingUp },
    ]);

    useEffect(() => {
        async function fetchStats() {
            try {
                const { data } = await api.get('/stats/public');

                setStats([
                    {
                        label: "Active Users",
                        value: data.activeUsers?.toLocaleString() + "+" || "12,450+",
                        color: "from-green-400 to-emerald-400",
                        icon: Users
                    },
                    {
                        label: "MallCoin Volume",
                        value: data.mallcoinVolume ? `$${(data.mallcoinVolume / 1000000).toFixed(1)}M` : "$4.8M",
                        color: "from-primary to-yellow-400",
                        icon: Coins
                    },
                    {
                        label: "MallPoints Earned",
                        value: data.mallpointsEarned ? `${(data.mallpointsEarned / 1000000).toFixed(0)}M` : "92M",
                        color: "from-secondary to-blue-400",
                        icon: TrendingUp
                    },
                ]);
            } catch (error) {
                console.error("Failed to fetch landing stats", error);
                // Keep default values on error
            }
        }
        fetchStats();
    }, []);


    return (
        <div className="relative py-20 bg-gray-950 border-y border-white/5">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent"></div>

            <div className="relative z-10 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                    {stats.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                            <div
                                key={stat.label}
                                className="group relative p-8 rounded-2xl glass-dark border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105 animate-fade-in"
                                style={{ animationDelay: `${index * 0.1}s` }}
                            >
                                {/* Gradient Background */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300`}></div>

                                <div className="relative">
                                    {/* Icon */}
                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} p-2.5 mb-4 group-hover:scale-110 transition-transform`}>
                                        <Icon className="w-full h-full text-white" />
                                    </div>

                                    {/* Value */}
                                    <h3 className={`text-4xl md:text-5xl font-black mb-2 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                                        {stat.value}
                                    </h3>

                                    {/* Label */}
                                    <p className="text-gray-400 font-medium uppercase tracking-wider text-sm">
                                        {stat.label}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
