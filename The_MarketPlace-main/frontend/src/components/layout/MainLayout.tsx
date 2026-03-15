import { Outlet } from 'react-router-dom';
import Sidebar from '../navigation/Sidebar';
import Navbar from '../navigation/Navbar';

export default function MainLayout() {
    return (
        <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-indigo-500/30">
            {/* Navigation Components */}
            <Sidebar />
            <Navbar />

            {/* Main Content Area */}
            <main className="pl-72 pt-20 min-h-screen">
                <div className="p-8 animate-fade-in">
                    <Outlet />
                </div>
            </main>

            {/* Global Overlay Elements */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/5 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/5 rounded-full blur-[120px]"></div>
            </div>
        </div>
    );
}
