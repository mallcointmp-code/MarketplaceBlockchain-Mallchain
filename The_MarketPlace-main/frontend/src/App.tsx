import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import AppRouter from "./router/AppRouter";
import { Toaster } from "sonner";
import "./App.css";
import { useTheme } from "./hooks/useTheme";
import { useUserStore } from "./store/userStore";
import { Loader2 } from "lucide-react";
import { WalletProvider } from "./context/WalletContext";

export default function App() {
  useTheme();
  const { checkAuth, isLoading } = useUserStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className="text-slate-400 font-medium animate-pulse">Initializing Avas...</p>
      </div>
    );
  }

  return (
    <WalletProvider>
      <BrowserRouter>
        <AppRouter />
        <Toaster position="top-center" richColors closeButton />
      </BrowserRouter>
    </WalletProvider>
  );
}
