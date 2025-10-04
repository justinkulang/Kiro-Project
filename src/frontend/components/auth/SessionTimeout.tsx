import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  LinearProgress,
  Box,
} from '@mui/material';
import { Warning } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const SESSION_WARNING_TIME = 5 * 60 * 1000; // 5 minutes before expiry
const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes total session time
const WARNING_COUNTDOWN = 60; // 60 seconds countdown

interface SessionTimeoutProps {
  warningTime?: number;
  sessionTimeout?: number;
  onSessionExpired?: () => void;
}

function SessionTimeout({
  warningTime = SESSION_WARNING_TIME,
  sessionTimeout = SESSION_TIMEOUT,
  onSessionExpired,
}: SessionTimeoutProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(WARNING_COUNTDOWN);
  const [lastActivity, setLastActivity] = useState(Date.now());
  
  const { isAuthenticated, logout } = useAuth();

  const resetActivity = useCallback(() => {
    setLastActivity(Date.now());
    setShowWarning(false);
    setCountdown(WARNING_COUNTDOWN);
  }, []);

  const handleSessionExpired = useCallback(() => {
    setShowWarning(false);
    onSessionExpired?.();
    logout();
  }, [logout, onSessionExpired]);

  const handleExtendSession = () => {
    resetActivity();
  };

  const handleLogoutNow = () => {
    handleSessionExpired();
  };

  // Track user activity
  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const resetActivityHandler = () => {
      resetActivity();
    };

    events.forEach(event => {
      document.addEventListener(event, resetActivityHandler, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetActivityHandler, true);
      });
    };
  }, [isAuthenticated, resetActivity]);

  // Session timeout logic
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkSession = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;
      const timeUntilWarning = sessionTimeout - warningTime - timeSinceLastActivity;
      const timeUntilExpiry = sessionTimeout - timeSinceLastActivity;

      if (timeUntilExpiry <= 0) {
        // Session expired
        handleSessionExpired();
      } else if (timeUntilWarning <= 0 && !showWarning) {
        // Show warning
        setShowWarning(true);
        setCountdown(Math.ceil(timeUntilExpiry / 1000));
      }
    };

    const interval = setInterval(checkSession, 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated, lastActivity, sessionTimeout, warningTime, showWarning, handleSessionExpired]);

  // Countdown timer for warning dialog
  useEffect(() => {
    if (!showWarning) return;

    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          handleSessionExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [showWarning, handleSessionExpired]);

  if (!isAuthenticated || !showWarning) {
    return null;
  }

  const progress = ((WARNING_COUNTDOWN - countdown) / WARNING_COUNTDOWN) * 100;

  return (
    <Dialog
      open={showWarning}
      disableEscapeKeyDown
      maxWidth=\"sm\"
      fullWidth
      PaperProps={{
        sx: {
          borderTop: '4px solid',
          borderTopColor: 'warning.main',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Warning color=\"warning\" />
        Session Timeout Warning
      </DialogTitle>
      
      <DialogContent>
        <Typography variant=\"body1\" paragraph>
          Your session will expire in <strong>{countdown} seconds</strong> due to inactivity.
        </Typography>
        
        <Typography variant=\"body2\" color=\"text.secondary\" paragraph>
          Click \"Stay Logged In\" to extend your session, or you will be automatically logged out.
        </Typography>

        <Box sx={{ mt: 2 }}>
          <LinearProgress 
            variant=\"determinate\" 
            value={progress} 
            color=\"warning\"
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button 
          onClick={handleLogoutNow}
          color=\"error\"
          variant=\"outlined\"
        >
          Logout Now
        </Button>
        <Button 
          onClick={handleExtendSession}
          color=\"primary\"
          variant=\"contained\"
          autoFocus
        >
          Stay Logged In
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default SessionTimeout;