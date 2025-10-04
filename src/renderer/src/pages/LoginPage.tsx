import React, { useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
} from '@mui/material';
import { Wifi } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoginForm from '../components/auth/LoginForm';

function LoginPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleLoginSuccess = () => {
    navigate(from, { replace: true });
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={24}
          sx={{
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
              color: 'white',
              p: 4,
              textAlign: 'center',
            }}
          >
            <Wifi sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="h4" component="h1" gutterBottom>
              MikroTik Hotspot
            </Typography>
            <Typography variant="subtitle1">
              Management Platform
            </Typography>
          </Box>
          
          <Box sx={{ p: 4 }}>
            <LoginForm onSuccess={handleLoginSuccess} />
            
            <Box mt={3} textAlign="center">
              <Typography variant="body2" color="text.secondary">
                Welcome to MikroTik Hotspot Management Platform
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                Please contact your administrator if you need access
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

export default LoginPage;