import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  Divider,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { Save, Refresh, Download, Upload } from '@mui/icons-material';
import { useNotification } from '../../contexts/NotificationContext';
import { adminService, SystemConfig } from '../../services/adminService';

function SystemConfiguration() {
  const [config, setConfig] = useState<SystemConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const data = await adminService.getSystemConfig();
      setConfig(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch system configuration';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (key: string, value: string | boolean) => {
    setConfig(prev => ({
      ...prev,
      [key]: typeof value === 'boolean' ? value.toString() : value
    }));

    // Clear error when user starts typing
    if (errors[key]) {
      setErrors(prev => ({
        ...prev,
        [key]: ''
      }));
    }
  };

  const validateConfig = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    // Validate required fields
    if (!config.system_name?.trim()) {
      newErrors.system_name = 'System name is required';
    }

    if (config.mikrotik_host && !isValidIP(config.mikrotik_host) && !isValidHostname(config.mikrotik_host)) {
      newErrors.mikrotik_host = 'Invalid MikroTik host address';
    }

    if (config.mikrotik_port && !isValidPort(config.mikrotik_port)) {
      newErrors.mikrotik_port = 'Invalid port number';
    }

    if (config.email_from_address && !isValidEmail(config.email_from_address)) {
      newErrors.email_from_address = 'Invalid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidIP = (ip: string): boolean => {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  };

  const isValidHostname = (hostname: string): boolean => {
    const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\\.([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?))*$/;
    return hostnameRegex.test(hostname);
  };

  const isValidPort = (port: string): boolean => {
    const portNum = parseInt(port);
    return !isNaN(portNum) && portNum > 0 && portNum <= 65535;
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSave = async () => {
    if (!validateConfig()) {
      return;
    }

    try {
      setSaving(true);
      await adminService.updateSystemConfig(config);
      showSuccess('System configuration updated successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update system configuration';
      showError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(config, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `system-config-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedConfig = JSON.parse(e.target?.result as string);
        setConfig(importedConfig);
        showSuccess('Configuration imported successfully');
      } catch (err) {
        showError('Invalid configuration file');
      }
    };
    reader.readAsText(file);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={4}>
        Loading system configuration...
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          System Configuration
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExport}
          >
            Export
          </Button>
          <Button
            variant="outlined"
            component="label"
            startIcon={<Upload />}
          >
            Import
            <input
              type="file"
              accept=".json"
              hidden
              onChange={handleImport}
            />
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchConfig}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* System Settings */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="System Settings" />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="System Name"
                    value={config.system_name || ''}
                    onChange={(e) => handleConfigChange('system_name', e.target.value)}
                    error={!!errors.system_name}
                    helperText={errors.system_name}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="System Logo URL"
                    value={config.system_logo_url || ''}
                    onChange={(e) => handleConfigChange('system_logo_url', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.maintenance_mode === 'true'}
                        onChange={(e) => handleConfigChange('maintenance_mode', e.target.checked)}
                      />
                    }
                    label="Maintenance Mode"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.debug_mode === 'true'}
                        onChange={(e) => handleConfigChange('debug_mode', e.target.checked)}
                      />
                    }
                    label="Debug Mode"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* MikroTik Settings */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="MikroTik Connection" />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="MikroTik Host"
                    value={config.mikrotik_host || ''}
                    onChange={(e) => handleConfigChange('mikrotik_host', e.target.value)}
                    error={!!errors.mikrotik_host}
                    helperText={errors.mikrotik_host}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="MikroTik Port"
                    value={config.mikrotik_port || ''}
                    onChange={(e) => handleConfigChange('mikrotik_port', e.target.value)}
                    error={!!errors.mikrotik_port}
                    helperText={errors.mikrotik_port}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Username"
                    value={config.mikrotik_username || ''}
                    onChange={(e) => handleConfigChange('mikrotik_username', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="password"
                    label="Password"
                    value={config.mikrotik_password || ''}
                    onChange={(e) => handleConfigChange('mikrotik_password', e.target.value)}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Email Settings */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Email Configuration" />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="SMTP Host"
                    value={config.smtp_host || ''}
                    onChange={(e) => handleConfigChange('smtp_host', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="SMTP Port"
                    value={config.smtp_port || ''}
                    onChange={(e) => handleConfigChange('smtp_port', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="From Email"
                    value={config.email_from_address || ''}
                    onChange={(e) => handleConfigChange('email_from_address', e.target.value)}
                    error={!!errors.email_from_address}
                    helperText={errors.email_from_address}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="From Name"
                    value={config.email_from_name || ''}
                    onChange={(e) => handleConfigChange('email_from_name', e.target.value)}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default SystemConfiguration;