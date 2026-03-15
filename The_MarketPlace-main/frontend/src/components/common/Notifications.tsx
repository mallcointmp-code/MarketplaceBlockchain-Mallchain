import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { getMyNotifications, markRead, markAllRead, deleteNotification, type Notification } from '../../api/notification.api';
import { toast } from 'sonner';
import { socket } from '../../services/socket';

export default function Notifications() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchNotifications();

        const handleNewNotification = () => {
            fetchNotifications();
        };

        socket.on('notification', handleNewNotification);

        return () => {
            socket.off('notification', handleNewNotification);
        };
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    async function fetchNotifications() {
        setLoading(true);
        try {
            const data = await getMyNotifications();
            // Backend returns { success: true, notifications: [] } or just [] depending on implementation
            // My API wrapper returns response.data. Based on notification.js: res.json({ success: true, notifications })
            setNotifications(data.notifications || []);
        } catch (error) {
            console.error('Failed to load notifications');
        } finally {
            setLoading(false);
        }
    }

    async function handleMarkRead(id: string) {
        try {
            await markRead(id);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
        } catch (e) {
            toast.error('Failed to mark as read');
        }
    }

    async function handleMarkAllRead() {
        try {
            await markAllRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            toast.success('All marked as read');
        } catch (e) {
            toast.error('Failed to mark all as read');
        }
    }

    async function handleDelete(id: string, e: React.MouseEvent) {
        e.stopPropagation();
        try {
            await deleteNotification(id);
            setNotifications(prev => prev.filter(n => n._id !== id));
        } catch (e) {
            toast.error('Failed to delete notification');
        }
    }

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all text-slate-400 hover:text-white group"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-indigo-500 border-2 border-slate-950 animate-pulse"></span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-14 w-80 md:w-96 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in origin-top-right">
                    <div className="p-4 border-b border-white/5 flex items-center justify-between">
                        <h3 className="font-bold text-white">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="p-8 text-center text-slate-500 text-sm">Loading...</div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <Bell className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                                <p className="text-slate-500 text-sm">No notifications yet</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification._id}
                                        className={`p-4 hover:bg-white/5 transition-colors group relative ${!notification.read ? 'bg-indigo-500/5' : ''}`}
                                    >
                                        <div className="flex gap-3">
                                            <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${!notification.read ? 'bg-indigo-500' : 'bg-slate-600'}`} />
                                            <div className="flex-1 min-w-0">
                                                <h4 className={`text-sm font-bold mb-0.5 ${!notification.read ? 'text-white' : 'text-slate-400'}`}>
                                                    {notification.title}
                                                </h4>
                                                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                                    {notification.message}
                                                </p>
                                                <p className="text-[10px] text-slate-600 mt-2 font-bold uppercase tracking-wider">
                                                    {new Date(notification.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="flex flex-col gap-1 items-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                {!notification.read && (
                                                    <button
                                                        onClick={() => handleMarkRead(notification._id)}
                                                        className="p-1 rounded-lg hover:bg-white/10 text-indigo-400"
                                                        title="Mark read"
                                                    >
                                                        <Check className="w-3 h-3" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => handleDelete(notification._id, e)}
                                                    className="p-1 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
