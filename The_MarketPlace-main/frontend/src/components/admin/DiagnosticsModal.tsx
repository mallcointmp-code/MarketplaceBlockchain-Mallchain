import React, { useState, useEffect } from 'react';
import {
    X, CheckCircle2, AlertCircle, RefreshCw,
    Database, Cpu, Globe, Mail, ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '../../api';

interface DiagnosticResult {
    name: string;
    status: 'optimal' | 'warning' | 'error';
    message: string;
    metric?: string;
}

interface DiagnosticsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({ isOpen, onClose }) => {
    const [running, setRunning] = useState(false);
    const [results, setResults] = useState<DiagnosticResult[]>([]);
    const [progress, setProgress] = useState(0);

    const runFullDiagnostics = async () => {
        setRunning(true);
        setResults([]);
        setProgress(0);

        try {
            const data = await adminApi.getDiagnostics();

            if (data.success) {
                // Simulate progressive loading for UX
                for (let i = 0; i < data.results.length; i++) {
                    await new Promise(r => setTimeout(r, 600));
                    setResults(prev => [...prev, data.results[i]]);
                    setProgress(((i + 1) / data.results.length) * 100);
                }
                toast.success("System scan complete");
            } else {
                toast.error("Diagnostics failed: " + data.error);
            }
        } catch (err) {
            toast.error("Connection error during diagnostics");
        } finally {
            setRunning(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            runFullDiagnostics();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const getIcon = (name: string) => {
        switch (name.toLowerCase()) {
            case 'database': return <Database className="w-5 h-5" />;
            case 'redis cache': return <Cpu className="w-5 h-5" />;
            case 'blockchain': return <Globe className="w-5 h-5" />;
            case 'm-pesa api': return <ShieldCheck className="w-5 h-5" />;
            case 'email service': return <Mail className="w-5 h-5" />;
            default: return <RefreshCw className="w-5 h-5" />;
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0A0A0B] border border-white/10 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">System Core Diagnostics</h2>
                        <p className="text-xs text-white/40 mt-1 uppercase tracking-widest font-medium">Real-time infrastructure auditing</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/60 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="h-1 w-full bg-white/5">
                    <div
                        className="h-full bg-blue-500 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Content */}
                <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
                    {results.length === 0 && running && (
                        <div className="py-12 flex flex-col items-center justify-center text-white/40 space-y-4">
                            <RefreshCw className="w-8 h-8 animate-spin" />
                            <p className="text-sm font-medium animate-pulse">Initializing probe sequence...</p>
                        </div>
                    )}

                    {results.map((res, i) => (
                        <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-4 transition-all animate-in fade-in slide-in-from-bottom-2">
                            <div className={`p-3 rounded-xl ${res.status === 'optimal' ? 'bg-green-500/10 text-green-500' :
                                res.status === 'warning' ? 'bg-yellow-500/10 text-yellow-500' :
                                    'bg-red-500/10 text-red-500'
                                }`}>
                                {getIcon(res.name)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-white text-sm uppercase tracking-wide">{res.name}</h3>
                                    {res.metric && (
                                        <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-md text-white/60 font-mono">
                                            {res.metric}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-white/60 truncate mt-0.5">{res.message}</p>
                            </div>
                            <div>
                                {res.status === 'optimal' ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                ) : (
                                    <AlertCircle className={`w-5 h-5 ${res.status === 'warning' ? 'text-yellow-500' : 'text-red-500'}`} />
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${running ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`} />
                        <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">
                            {running ? 'PROBE ACTIVE' : 'SYSTEMS READY'}
                        </span>
                    </div>
                    {!running && (
                        <button
                            onClick={runFullDiagnostics}
                            className="bg-white text-black px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white/90 transition-all flex items-center gap-2"
                        >
                            <RefreshCw className="w-3 h-3" />
                            Re-Run Checks
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DiagnosticsModal;
