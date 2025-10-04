import React, { ReactNode } from 'react';
import { Box, Typography, Alert } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

interface RoleGuardProps {
  children: ReactNode;
  requiredRoles: string[];
  fallback?: ReactNode;
  showError?: boolean;
}

function RoleGuard({ 
  children, 
  requiredRoles, 
  fallback = null, 
  showError = false 
}: RoleGuardProps) {
  const { user, hasRole } = useAuth();

  // If user doesn't have required role, show fallback or error
  if (!hasRole(requiredRoles)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showError) {
      return (
        <Alert severity="warning" sx={{ my: 2 }}>
          <Typography variant="body2">
            You don't have permission to view this content.
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Required roles: {requiredRoles.join(', ')} | Your role: {user?.role || 'none'}
          </Typography>
        </Alert>
      );
    }

    // Return null to hide content
    return null;
  }

  return <>{children}</>;
}

export default RoleGuard;