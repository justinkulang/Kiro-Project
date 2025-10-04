import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
} from '@mui/material';
import {
  SupervisorAccount,
  History,
  Settings,
  Backup,
} from '@mui/icons-material';
import AdminUserList from '../components/admin/AdminUserList';
import AdminLogs from '../components/admin/AdminLogs';
import SystemConfiguration from '../components/admin/SystemConfiguration';
import BackupManagement from '../components/admin/BackupManagement';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `admin-tab-${index}`,
    'aria-controls': `admin-tabpanel-${index}`,
  };
}

function AdminPage() {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box mb={3}>
          <Typography variant="h4" component="h1" gutterBottom>
            Administration
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Manage system administrators, configuration, and maintenance
          </Typography>
        </Box>

        {/* Tabs */}
        <Paper sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="admin tabs"
              variant="fullWidth"
            >
              <Tab
                icon={<SupervisorAccount />}
                label="Admin Users"
                {...a11yProps(0)}
                sx={{ minHeight: 72 }}
              />
              <Tab
                icon={<History />}
                label="Activity Logs"
                {...a11yProps(1)}
                sx={{ minHeight: 72 }}
              />
              <Tab
                icon={<Settings />}
                label="System Config"
                {...a11yProps(2)}
                sx={{ minHeight: 72 }}
              />
              <Tab
                icon={<Backup />}
                label="Backup & Restore"
                {...a11yProps(3)}
                sx={{ minHeight: 72 }}
              />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <AdminUserList />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <AdminLogs />
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <SystemConfiguration />
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <BackupManagement />
          </TabPanel>
        </Paper>
      </Box>
    </Container>
  );
}

export default AdminPage;