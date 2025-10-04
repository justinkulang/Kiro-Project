import React, { useState } from 'react';
import {
  Button,
  IconButton,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  CircularProgress,
} from '@mui/material';
import { Logout, ExitToApp } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';

interface LogoutButtonProps {
  variant?: 'button' | 'icon' | 'menuItem';
  showConfirmDialog?: boolean;
  onLogoutStart?: () => void;
  onLogoutComplete?: () => void;
  size?: 'small' | 'medium' | 'large';
  color?: 'inherit' | 'primary' | 'secondary' | 'error';
}

function LogoutButton({
  variant = 'button',
  showConfirmDialog = true,
  onLogoutStart,
  onLogoutComplete,
  size = 'medium',
  color = 'inherit'
}: LogoutButtonProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  
  const { logout, user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const navigate = useNavigate();

  const handleLogoutClick = () => {
    if (showConfirmDialog) {
      setShowDialog(true);
    } else {
      performLogout();
    }
  };

  const handleConfirmLogout = () => {
    setShowDialog(false);
    performLogout();
  };

  const handleCancelLogout = () => {
    setShowDialog(false);
  };

  const performLogout = async () => {
    try {
      setIsLoggingOut(true);
      onLogoutStart?.();

      // Call logout service (this will handle API call and logging)
      await logout();

      showSuccess('Logged out successfully');
      navigate('/login');
      onLogoutComplete?.();
    } catch (error) {
      console.error('Logout error:', error);
      showError('Error during logout. You have been logged out locally.');
      
      // Force logout even if API call fails
      navigate('/login');
      onLogoutComplete?.();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const renderButton = () => {
    const buttonProps = {
      onClick: handleLogoutClick,
      disabled: isLoggingOut,
      size,
      color,
    };

    switch (variant) {
      case 'icon':
        return (
          <IconButton {...buttonProps} title=\"Logout\">
            {isLoggingOut ? (
              <CircularProgress size={20} color=\"inherit\" />
            ) : (
              <Logout />
            )}
          </IconButton>
        );

      case 'menuItem':
        return (
          <MenuItem {...buttonProps}>
            {isLoggingOut ? (
              <CircularProgress size={16} sx={{ mr: 1 }} />
            ) : (
              <ExitToApp fontSize=\"small\" sx={{ mr: 1 }} />
            )}
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </MenuItem>
        );

      default:
        return (
          <Button
            {...buttonProps}
            variant=\"outlined\"
            startIcon={
              isLoggingOut ? (
                <CircularProgress size={16} />
              ) : (
                <Logout />
              )
            }
          >
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </Button>
        );
    }
  };

  return (
    <>
      {renderButton()}
      
      {/* Confirmation Dialog */}
      <Dialog
        open={showDialog}
        onClose={handleCancelLogout}
        maxWidth=\"sm\"
        fullWidth
      >
        <DialogTitle>
          Confirm Logout
        </DialogTitle>
        <DialogContent>
          <Typography variant=\"body1\">
            Are you sure you want to log out?
          </Typography>
          {user && (
            <Typography variant=\"body2\" color=\"text.secondary\" sx={{ mt: 1 }}>
              You are currently logged in as: <strong>{user.username}</strong>
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCancelLogout} 
            color=\"primary\"
            disabled={isLoggingOut}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmLogout} 
            color=\"error\" 
            variant=\"contained\"
            disabled={isLoggingOut}
            startIcon={isLoggingOut ? <CircularProgress size={16} /> : <Logout />}
          >
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default LogoutButton;