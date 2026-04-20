import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children, roles = [] }) => {
  const { estAuthentifie, chargement, aLeRole } = useAuth();
  const location = useLocation();

  if (chargement) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-fond-principal">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-zeze-vert border-t-transparent" />
      </div>
    );
  }

  if (!estAuthentifie) {
    return <Navigate to="/connexion" state={{ from: location }} replace />;
  }

  if (roles.length > 0 && !aLeRole(...roles)) {
    return <Navigate to="/non-autorise" replace />;
  }

  return children;
};

export default ProtectedRoute;
