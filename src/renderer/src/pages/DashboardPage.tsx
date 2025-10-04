import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Grid, 
  Button,
  Alert,
  AppBar,
  Toolbar,
} from '@mui/material';
import { Refresh, Download, Dashboard } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import LogoutButton from '../components/auth/LogoutButton';
import DashboardStats from '../components/dashboard/DashboardStats';
import ActiveUsersTable from '../components/dashboard/ActiveUsersTable';
import BandwidthChart from '../components/dashboard/BandwidthChart';
import SystemStatus from '../components/dashboard/SystemStatus';
import { 
  dashboardService, 
  DashboardStats as StatsType,
  ActiveUser,
  BandwidthData,
  SystemStatus as SystemStatusType
} from '../services/dashboardService';

function DashboardPage() {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  // State for dashboard data
  const [stats, setStats] = useState<StatsType | null>(null);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [bandwidthData, setBandwidthData] = useState<BandwidthData[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatusType | null>(null);
  
  // Loading states
  const [statsLoading, setStatsLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [bandwidthLoading, setBandwidthLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(true);
  
  // Chart period
  const [bandwidthPeriod, setBandwidthPeriod] = useState<'hour' | 'day' | 'week' | 'month'>('day');
  
  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch dashboard statistics
  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const data = await dashboardService.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      showError('Failed to load dashboard statistics');
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch active users
  const fetchActiveUsers = async () => {
    try {
      setUsersLoading(true);
      const data = await dashboardService.getActiveUsers();
      setActiveUsers(data);
    } catch (error) {
      console.error('Failed to fetch active users:', error);
      showError('Failed to load active users');
    } finally {
      setUsersLoading(false);
    }
  };

  // Fetch bandwidth data
  const fetchBandwidthData = async (period: 'hour' | 'day' | 'week' | 'month' = bandwidthPeriod) => {
    try {
      setBandwidthLoading(true);
      const data = await dashboardService.getBandwidthData(period);
      setBandwidthData(data);
    } catch (error) {
      console.error('Failed to fetch bandwidth data:', error);
      showError('Failed to load bandwidth data');
    } finally {
      setBandwidthLoading(false);
    }
  };

  // Fetch system status
  const fetchSystemStatus = async () => {
    try {
      setStatusLoading(true);
      const data = await dashboardService.getSystemStatus();
      setSystemStatus(data);
    } catch (error) {
      console.error('Failed to fetch system status:', error);
      showError('Failed to load system status');
    } finally {
      setStatusLoading(false);
    }
  };

  // Disconnect user
  const handleDisconnectUser = async (userId: number) => {
    await dashboardService.disconnectUser(userId);
  };

  // Handle bandwidth period change
  const handleBandwidthPeriodChange = (period: 'hour' | 'day' | 'week' | 'month') => {
    setBandwidthPeriod(period);
    fetchBandwidthData(period);
  };

  // Refresh all data
  const refreshAll = async () => {
    await Promise.all([
      fetchStats(),
      fetchActiveUsers(),
      fetchBandwidthData(),
      fetchSystemStatus(),
    ]);
    showSuccess('Dashboard refreshed');
  };

  // Export dashboard data
  const handleExport = async (format: 'pdf' | 'excel' = 'pdf') => {
    try {
      await dashboardService.exportDashboardData(format);
      showSuccess('Dashboard data exported successfully');
    } catch (error) {
      showError('Failed to export dashboard data');
    }
  };

  // Initial data load
  useEffect(() => {
    fetchStats();
    fetchActiveUsers();
    fetchBandwidthData();
    fetchSystemStatus();
  }, []);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchStats();
      fetchActiveUsers();
      fetchSystemStatus();
      // Don't auto-refresh bandwidth data as it's less critical and more expensive
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Dashboard sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            MikroTik Hotspot Platform
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            Welcome, {user?.username}
          </Typography>
          <LogoutButton 
            variant="icon" 
            showConfirmDialog={false}
            color="inherit"
          />
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Dashboard
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Real-time monitoring and system overview
            </Typography>
          </Box>
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={() => handleExport('pdf')}
            >
              Export PDF
            </Button>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={() => handleExport('excel')}
            >
              Export Excel
            </Button>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={refreshAll}
            >
              Refresh All
            </Button>
          </Box>
        </Box>

        {/* Auto-refresh indicator */}
        {autoRefresh && (
          <Alert 
            severity="info" 
            sx={{ mb: 3 }}
            action={
              <Button 
                color="inherit" 
                size="small" 
                onClick={() => setAutoRefresh(false)}
              >
                Disable
              </Button>
            }
          >
            Auto-refresh is enabled (every 30 seconds)
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Dashboard Statistics */}
          <Grid item xs={12}>
            <DashboardStats stats={stats} loading={statsLoading} />
          </Grid>

          {/* Active Users and System Status */}
          <Grid item xs={12} lg={8}>
            <ActiveUsersTable
              users={activeUsers}
              loading={usersLoading}
              onRefresh={fetchActiveUsers}
              onDisconnectUser={handleDisconnectUser}
            />
          </Grid>

          <Grid item xs={12} lg={4}>
            <SystemStatus
              status={systemStatus}
              loading={statusLoading}
              onRefresh={fetchSystemStatus}
            />
          </Grid>

          {/* Bandwidth Chart */}
          <Grid item xs={12}>
            <BandwidthChart
              data={bandwidthData}
              loading={bandwidthLoading}
              period={bandwidthPeriod}
              onPeriodChange={handleBandwidthPeriodChange}
            />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

export default DashboardPage;