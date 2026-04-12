import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#2b579a] border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3 }} />
          <span className="text-sm text-gray-500">Loading…</span>
        </div>
      </div>
    );
  }

  if (!user || !token) return <Navigate to="/login" replace />;
  return children;
}
