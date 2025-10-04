import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  People,
  PersonAdd,
  ConfirmationNumber,
  AttachMoney,
  TrendingUp,
  TrendingDown,
} from '@mui/icons-material';
import { DashboardStats as StatsType } from '../../services/dashboardService';

interface DashboardStatsProps {
  stats: StatsType | null;
  loading: boolean;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

function StatCard({ title, value, icon, color, subtitle, trend }: StatCardProps) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h4" component="div" color={`${color}.main`}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
            {trend && (
              <Box display="flex" alignItems="center" mt={1}>
                {trend.isPositive ? (
                  <TrendingUp color="success" fontSize="small" />
                ) : (
                  <TrendingDown color="error" fontSize="small" />
                )}
                <Typography
                  variant="caption"
                  color={trend.isPositive ? 'success.main' : 'error.main'}
                  sx={{ ml: 0.5 }}
                >
                  {Math.abs(trend.value)}%
                </Typography>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 60,
              height: 60,
              borderRadius: '50%',
              bgcolor: `${color}.light`,
              color: `${color}.main`,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

function DashboardStats({ stats, loading }: DashboardStatsProps) {
  if (loading) {
    return (
      <Grid container spacing={3}>
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={item}>
            <Card sx={{ height: 140 }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                  <CircularProgress />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent>
          <Typography variant="body1" color="text.secondary" align="center">
            Failed to load dashboard statistics
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const voucherUsageRate = stats.totalVouchers > 0 
    ? ((stats.totalVouchers - stats.unusedVouchers) / stats.totalVouchers * 100).toFixed(1)
    : '0';

  const userActivityRate = stats.totalUsers > 0
    ? (stats.activeUsers / stats.totalUsers * 100).toFixed(1)
    : '0';

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <StatCard
          title="Total Users"
          value={stats.totalUsers.toLocaleString()}
          icon={<People fontSize="large" />}
          color="primary"
          subtitle={`${userActivityRate}% active`}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={4} lg={2}>
        <StatCard
          title="Active Users"
          value={stats.activeUsers.toLocaleString()}
          icon={<People fontSize="large" />}
          color="success"
          subtitle="Currently online"
        />
      </Grid>

      <Grid item xs={12} sm={6} md={4} lg={2}>
        <StatCard
          title="New Users Today"
          value={stats.newUsersToday.toLocaleString()}
          icon={<PersonAdd fontSize="large" />}
          color="secondary"
          subtitle="Registered today"
        />
      </Grid>

      <Grid item xs={12} sm={6} md={4} lg={2}>
        <StatCard
          title="Total Vouchers"
          value={stats.totalVouchers.toLocaleString()}
          icon={<ConfirmationNumber fontSize="large" />}
          color="warning"
          subtitle={`${voucherUsageRate}% used`}
        />
      </Grid>

      <Grid item xs={12} sm={6} md={4} lg={2}>
        <StatCard
          title="Unused Vouchers"
          value={stats.unusedVouchers.toLocaleString()}
          icon={<ConfirmationNumber fontSize="large" />}
          color="error"
          subtitle="Available for use"
        />
      </Grid>

      <Grid item xs={12} sm={6} md={4} lg={2}>
        <StatCard
          title="Vouchers Used Today"
          value={stats.vouchersUsedToday.toLocaleString()}
          icon={<ConfirmationNumber fontSize="large" />}
          color="success"
          subtitle="Redeemed today"
        />
      </Grid>

      <Grid item xs={12} sm={6} md={6} lg={3}>
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon={<AttachMoney fontSize="large" />}
          color="success"
          subtitle="All time earnings"
        />
      </Grid>

      <Grid item xs={12} sm={6} md={6} lg={3}>
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(stats.monthlyRevenue)}
          icon={<AttachMoney fontSize="large" />}
          color="primary"
          subtitle="This month's earnings"
        />
      </Grid>

      {/* Summary Cards */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              User Activity Summary
            </Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2">Active Users</Typography>
                <Chip 
                  label={`${stats.activeUsers} / ${stats.totalUsers}`}
                  color="success"
                  size="small"
                />
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2">New Registrations Today</Typography>
                <Chip 
                  label={stats.newUsersToday}
                  color="primary"
                  size="small"
                />
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2">Activity Rate</Typography>
                <Chip 
                  label={`${userActivityRate}%`}
                  color={parseFloat(userActivityRate) > 50 ? 'success' : 'warning'}
                  size="small"
                />
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Voucher Summary
            </Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2">Total Vouchers</Typography>
                <Chip 
                  label={stats.totalVouchers}
                  color="primary"
                  size="small"
                />
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2">Unused Vouchers</Typography>
                <Chip 
                  label={stats.unusedVouchers}
                  color="warning"
                  size="small"
                />
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2">Usage Rate</Typography>
                <Chip 
                  label={`${voucherUsageRate}%`}
                  color={parseFloat(voucherUsageRate) > 70 ? 'success' : 'warning'}
                  size="small"
                />
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2">Used Today</Typography>
                <Chip 
                  label={stats.vouchersUsedToday}
                  color="success"
                  size="small"
                />
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

export default DashboardStats;