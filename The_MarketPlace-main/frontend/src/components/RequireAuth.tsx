import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useUserStore } from '../store/userStore';
import { useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface RequireAuthProps {
    allowedRoles?: UserRole[];
}

import { UserRole } from '../types';

export default function RequireAuth({ allowedRoles }: RequireAuthProps) {
    const { isAuthenticated, user, isLoading } = useUserStore();
    const location = useLocation();

    // checkAuth is handled by App.tsx at the top level
    // We only need to wait for it to finish here if it's already in progress

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950 flex items-center justify-center">
                <LoadingSpinner size="lg" text="Verifying session..." />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        // Redirect to their own dashboard or public home if they try to access a role restricted page
        return <Navigate to={`/${user.role}`} replace />;
    }

    return <Outlet />;
}
