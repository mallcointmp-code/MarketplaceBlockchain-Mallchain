import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, Shield, Globe, Zap, BarChart3 } from 'lucide-react';

export default function Hero() {
    const navigate = useNavigate();

    return (
        <div className="relative min-h-[100vh] flex items-center justify-center overflow-hidden bg-[#020617]">
            {/* Background elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
                <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-indigo-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '4s' }}></div>
            </div>

            {/* Grid Pattern with Fade */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>

            <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-32 pb-20">
                <div className="flex flex-col lg:flex-row items-center gap-16">
                    {/* Left: Content */}
                    <div className="flex-1 text-center lg:text-left space-y-8 animate-fade-in">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-white/10 backdrop-blur-xl mb-4 animate-slide-up">
                            <Zap className="w-4 h-4 text-blue-400 fill-blue-400" />
                            <span className="text-sm font-bold tracking-tight text-blue-100">
                                NEXT-GEN MARKETPLACE
                            </span>
                        </div>

                        <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white leading-[1.1] animate-slide-up" style={{ animationDelay: '0.1s' }}>
                            Experience the New
                            <span className="block bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent italic">
                                Digital Frontier
                            </span>
                        </h1>

                        <p className="text-xl text-slate-400 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium animate-slide-up" style={{ animationDelay: '0.2s' }}>
                            A high-performance ecosystem for modern commerce. Securely trade, deliver, and create value using revolutionary blockchain integration.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                            <button
                                onClick={() => navigate('/signup')}
                                className="group relative px-8 py-4 bg-white text-black font-black rounded-2xl text-lg shadow-2xl hover:scale-[1.02] transition-all duration-300 tap-highlight-none"
                            >
                                <span className="flex items-center justify-center gap-2">
                                    Start Trading
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </span>
                            </button>

                            <button
                                onClick={() => navigate('/login')}
                                className="group px-8 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-2xl text-lg hover:bg-white/10 transition-all duration-300 backdrop-blur-sm"
                            >
                                Sign In
                            </button>
                        </div>

                        {/* Integration badges */}
                        <div className="flex flex-wrap justify-center lg:justify-start items-center gap-8 pt-10 opacity-50 animate-fade-in">
                            <div className="flex items-center gap-2">
                                <Globe className="w-5 h-5" />
                                <span className="text-sm font-bold">Global Access</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Shield className="w-5 h-5" />
                                <span className="text-sm font-bold">Secure Protocol</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <BarChart3 className="w-5 h-5" />
                                <span className="text-sm font-bold">Live Rewards</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Premium Visual */}
                    <div className="flex-1 hidden lg:block relative group animate-fade-in" style={{ animationDelay: '0.4s' }}>
                        <div className="relative z-10 w-full aspect-square max-w-lg mx-auto">
                            {/* Abstract Premium Card */}
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-[3rem] border border-white/20 backdrop-blur-3xl shadow-2xl rotate-3 group-hover:rotate-0 transition-transform duration-700"></div>
                            <div className="absolute inset-4 bg-slate-900/80 rounded-[2.5rem] border border-white/10 overflow-hidden shadow-inner -rotate-3 group-hover:rotate-0 transition-transform duration-700">
                                <div className="p-8 h-full flex flex-col justify-between">
                                    <div className="flex justify-between items-start">
                                        <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                            <Sparkles className="w-6 h-6 text-blue-400" />
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Balance</p>
                                            <p className="text-2xl font-black text-white">$12,450.00</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="h-6 w-full bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full w-[70%] bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                                        </div>
                                        <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                            <span>MallCoin (MLCN)</span>
                                            <span>85% Growth</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                            <p className="text-[9px] font-bold text-slate-500 uppercase">Recent Profit</p>
                                            <p className="text-lg font-bold text-green-400">+$240.23</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                            <p className="text-[9px] font-bold text-slate-500 uppercase">Yield Velocity</p>
                                            <p className="text-lg font-bold text-blue-400">12.4x</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Decorative Orbs */}
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/30 rounded-full blur-3xl animate-pulse"></div>
                            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scroll Indicator */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50 animate-bounce">
                <div className="w-1 h-12 bg-gradient-to-b from-white to-transparent rounded-full px-[1px]"></div>
            </div>
        </div>
    );
}
