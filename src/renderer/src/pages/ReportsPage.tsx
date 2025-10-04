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
  Assessment,
  History,
  Schedule,
} from '@mui/icons-material';
import ReportGenerator from '../components/reports/ReportGenerator';
import ReportHistory from '../components/reports/ReportHistory';
import ScheduledReports from '../components/reports/ScheduledReports';

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
      id={`reports-tabpanel-${index}`}
      aria-labelledby={`reports-tab-${index}`}
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
    id: `reports-tab-${index}`,
    'aria-controls': `reports-tabpanel-${index}`,
  };
}

function ReportsPage() {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleReportGenerated = (reportType: string, filters: any) => {
    // Switch to history tab to show the newly generated report
    setTabValue(1);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box mb={3}>
          <Typography variant="h4" component="h1" gutterBottom>
            Reports & Analytics
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Generate, schedule, and manage comprehensive reports
          </Typography>
        </Box>

        {/* Tabs */}
        <Paper sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="reports tabs"
              variant="fullWidth"
            >
              <Tab
                icon={<Assessment />}
                label="Generate Reports"
                {...a11yProps(0)}
                sx={{ minHeight: 72 }}
              />
              <Tab
                icon={<History />}
                label="Report History"
                {...a11yProps(1)}
                sx={{ minHeight: 72 }}
              />
              <Tab
                icon={<Schedule />}
                label="Scheduled Reports"
                {...a11yProps(2)}
                sx={{ minHeight: 72 }}
              />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <ReportGenerator onReportGenerated={handleReportGenerated} />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <ReportHistory />
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <ScheduledReports />
          </TabPanel>
        </Paper>
      </Box>
    </Container>
  );
}

export default ReportsPage;