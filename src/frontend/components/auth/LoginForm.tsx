import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Person,
  Lock,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

interface LoginFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

function LoginForm({ onSuccess, onError }: LoginFormProps) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  
  const { login, isLoading, error, clearError } = useAuth();
  const { showSuccess, showError } = useNotification();

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 1) {
      newErrors.password = 'Password cannot be empty';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = field === 'rememberMe' ? event.target.checked : event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }

    // Clear global error
    if (error) {
      clearError();
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await login(formData.username.trim(), formData.password);
      
      // Store remember me preference
      if (formData.rememberMe) {
        localStorage.setItem('rememberMe', 'true');
        localStorage.setItem('lastUsername', formData.username.trim());
      } else {
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('lastUsername');
      }

      showSuccess('Login successful!');
      onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      showError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Load remembered username on component mount
  React.useEffect(() => {
    const rememberMe = localStorage.getItem('rememberMe') === 'true';
    const lastUsername = localStorage.getItem('lastUsername') || '';
    
    if (rememberMe && lastUsername) {
      setFormData(prev => ({
        ...prev,
        username: lastUsername,
        rememberMe: true
      }));
    }
  }, []);

  return (
    <Box component=\"form\" onSubmit={handleSubmit} noValidate>
      <Typography variant=\"h5\" component=\"h2\" gutterBottom textAlign=\"center\" mb={3}>
        Sign In
      </Typography>
      
      {error && (
        <Alert severity=\"error\" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <TextField
        margin=\"normal\"
        required
        fullWidth
        id=\"username\"
        label=\"Username\"
        name=\"username\"
        autoComplete=\"username\"
        autoFocus
        value={formData.username}
        onChange={handleInputChange('username')}
        error={!!errors.username}
        helperText={errors.username}
        disabled={isLoading}
        InputProps={{
          startAdornment: (
            <InputAdornment position=\"start\">
              <Person color=\"action\" />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
      />
      
      <TextField
        margin=\"normal\"
        required
        fullWidth
        name=\"password\"
        label=\"Password\"
        type={showPassword ? 'text' : 'password'}
        id=\"password\"
        autoComplete=\"current-password\"
        value={formData.password}
        onChange={handleInputChange('password')}
        error={!!errors.password}
        helperText={errors.password}
        disabled={isLoading}
        InputProps={{
          startAdornment: (
            <InputAdornment position=\"start\">
              <Lock color=\"action\" />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position=\"end\">
              <IconButton
                aria-label=\"toggle password visibility\"
                onClick={handleTogglePasswordVisibility}
                edge=\"end\"
                disabled={isLoading}
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
      />

      <FormControlLabel
        control={
          <Checkbox
            checked={formData.rememberMe}
            onChange={handleInputChange('rememberMe')}
            name=\"rememberMe\"
            color=\"primary\"
            disabled={isLoading}
          />
        }
        label=\"Remember me\"
        sx={{ mb: 2 }}
      />
      
      <Button
        type=\"submit\"
        fullWidth
        variant=\"contained\"
        size=\"large\"
        disabled={isLoading}
        sx={{
          mt: 2,
          mb: 2,
          py: 1.5,
          fontSize: '1.1rem',
          background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
          '&:hover': {
            background: 'linear-gradient(45deg, #1565c0 30%, #1976d2 90%)',
          },
          '&:disabled': {
            background: 'rgba(0, 0, 0, 0.12)',
          },
        }}
      >
        {isLoading ? (
          <>
            <CircularProgress size={20} color=\"inherit\" sx={{ mr: 1 }} />
            Signing In...
          </>
        ) : (
          'Sign In'
        )}
      </Button>
    </Box>
  );
}

export default LoginForm;