import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
  fallbackPath?: string;
  showAccessDenied?: boolean;
}

function ProtectedRoute({ 
  children, 
  requiredRoles, 
  fallbackPath = '/login',
  showAccessDenied = true 
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, hasRole } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <Box
        display=\"flex\"
        flexDirection=\"column\"
        justifyContent=\"center\"
        alignItems=\"center\"
        minHeight=\"100vh\"
        gap={2}
      >
        <CircularProgress size={60} />
        <Typography variant=\"body1\" color=\"text.secondary\">
          Checking authentication...
        </Typography>
      </Box>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // Check role-based access
  if (requiredRoles && !hasRole(requiredRoles)) {
    if (!showAccessDenied) {
      return <Navigate to=\"/dashboard\" replace />;
    }

    return (
      <Box
        display=\"flex\"
        flexDirection=\"column\"
        justifyContent=\"center\"
        alignItems=\"center\"
        minHeight=\"100vh\"
        textAlign=\"center\"
        p={3}
        gap={3}
      >
        <Alert severity=\"error\" sx={{ maxWidth: 500 }}>
          <Typography variant=\"h6\" gutterBottom>
            Access Denied
          </Typography>
          <Typography variant=\"body1\" paragraph>
            You don't have permission to access this page.
          </Typography>
          <Typography variant=\"body2\" color=\"text.secondary\">
            Required roles: {requiredRoles.join(', ')}
          </Typography>
          <Typography variant=\"body2\" color=\"text.secondary\">
            Your role: {user.role}
          </Typography>
        </Alert>
        
        <Box>
          <Typography variant=\"body2\" color=\"text.secondary\" gutterBottom>
            Contact your administrator if you believe this is an error.
          </Typography>
        </Box>
      </Box>
    );
  }

  return <>{children}</>;
}

export default ProtectedRoute;