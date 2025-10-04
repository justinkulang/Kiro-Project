import React, { useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { Chart, registerables } from 'chart.js';
import { BandwidthData } from '../../services/dashboardService';

Chart.register(...registerables);

interface BandwidthChartProps {
  data: BandwidthData[];
  loading: boolean;
  period: 'hour' | 'day' | 'week' | 'month';
  onPeriodChange: (period: 'hour' | 'day' | 'week' | 'month') => void;
}

function BandwidthChart({ data, loading, period, onPeriodChange }: BandwidthChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTimestamp = (timestamp: string, period: string): string => {
    const date = new Date(timestamp);
    
    switch (period) {
      case 'hour':
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      case 'day':
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      case 'week':
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      case 'month':
        return date.toLocaleDateString([], { month: 'short', year: '2-digit' });
      default:
        return date.toLocaleDateString();
    }
  };

  useEffect(() => {
    if (!chartRef.current || loading || data.length === 0) {
      return;
    }

    // Destroy existing chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    const labels = data.map(item => formatTimestamp(item.timestamp, period));
    const uploadData = data.map(item => item.upload);
    const downloadData = data.map(item => item.download);

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Upload',
            data: uploadData,
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.1)',
            fill: false,
            tension: 0.4,
          },
          {
            label: 'Download',
            data: downloadData,
            borderColor: 'rgb(54, 162, 235)',
            backgroundColor: 'rgba(54, 162, 235, 0.1)',
            fill: false,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.dataset.label || '';
                const value = formatBytes(context.parsed.y);
                return `${label}: ${value}`;
              },
            },
          },
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Time',
            },
          },
          y: {
            display: true,
            title: {
              display: true,
              text: 'Bandwidth',
            },
            ticks: {
              callback: function(value) {
                return formatBytes(Number(value));
              },
            },
          },
        },
      },
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, loading, period]);

  const getTotalBandwidth = () => {
    if (data.length === 0) return { upload: 0, download: 0, total: 0 };
    
    return data.reduce(
      (acc, item) => ({
        upload: acc.upload + item.upload,
        download: acc.download + item.download,
        total: acc.total + item.total,
      }),
      { upload: 0, download: 0, total: 0 }
    );
  };

  const totalBandwidth = getTotalBandwidth();

  return (
    <Card>
      <CardHeader
        title={
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">
              Bandwidth Usage
            </Typography>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Period</InputLabel>
              <Select
                value={period}
                onChange={(e) => onPeriodChange(e.target.value as any)}
                label="Period"
              >
                <MenuItem value="hour">Last Hour</MenuItem>
                <MenuItem value="day">Last Day</MenuItem>
                <MenuItem value="week">Last Week</MenuItem>
                <MenuItem value="month">Last Month</MenuItem>
              </Select>
            </FormControl>
          </Box>
        }
        subheader={
          !loading && data.length > 0 && (
            <Box display="flex" gap={3} mt={1}>
              <Typography variant="body2" color="text.secondary">
                Total Upload: <strong>{formatBytes(totalBandwidth.upload)}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Download: <strong>{formatBytes(totalBandwidth.download)}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total: <strong>{formatBytes(totalBandwidth.total)}</strong>
              </Typography>
            </Box>
          )
        }
      />
      <CardContent>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height={300}>
            <CircularProgress />
          </Box>
        ) : data.length === 0 ? (
          <Box display="flex" justifyContent="center" alignItems="center" height={300}>
            <Typography variant="body2" color="text.secondary">
              No bandwidth data available
            </Typography>
          </Box>
        ) : (
          <Box height={300}>
            <canvas ref={chartRef} />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default BandwidthChart;