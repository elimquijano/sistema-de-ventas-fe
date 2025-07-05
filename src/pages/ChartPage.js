import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  alpha,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { dashboardAPI } from '../utils/api';

const chartData = [
  { name: 'Jan', sales: 4000, revenue: 2400, users: 240 },
  { name: 'Feb', sales: 3000, revenue: 1398, users: 221 },
  { name: 'Mar', sales: 2000, revenue: 9800, users: 229 },
  { name: 'Apr', sales: 2780, revenue: 3908, users: 200 },
  { name: 'May', sales: 1890, revenue: 4800, users: 218 },
  { name: 'Jun', sales: 2390, revenue: 3800, users: 250 },
];

const pieData = [
  { name: 'Desktop', value: 400, color: '#673ab7' },
  { name: 'Mobile', value: 300, color: '#2196f3' },
  { name: 'Tablet', value: 300, color: '#4caf50' },
  { name: 'Other', value: 200, color: '#ff9800' },
];

const radarData = [
  { subject: 'Performance', A: 120, B: 110, fullMark: 150 },
  { subject: 'Security', A: 98, B: 130, fullMark: 150 },
  { subject: 'Usability', A: 86, B: 130, fullMark: 150 },
  { subject: 'Features', A: 99, B: 100, fullMark: 150 },
  { subject: 'Support', A: 85, B: 90, fullMark: 150 },
  { subject: 'Quality', A: 65, B: 85, fullMark: 150 },
];

export const ChartPage = () => {
  const theme = useTheme();
  const [chartType, setChartType] = useState('bar');
  const [data, setData] = useState(chartData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadChartData();
  }, [chartType]);

  const loadChartData = async () => {
    try {
      setLoading(true);
      const response = await dashboardAPI.getChartData(chartType);
      setData(response.data || chartData);
    } catch (error) {
      console.error('Error loading chart data:', error);
      setData(chartData); // Fallback to mock data
    } finally {
      setLoading(false);
    }
  };

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="sales" fill={theme.palette.primary.main} />
              <Bar dataKey="revenue" fill={theme.palette.secondary.main} />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="sales" stroke={theme.palette.primary.main} strokeWidth={3} />
              <Line type="monotone" dataKey="revenue" stroke={theme.palette.secondary.main} strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="sales" stackId="1" stroke={theme.palette.primary.main} fill={alpha(theme.palette.primary.main, 0.6)} />
              <Area type="monotone" dataKey="revenue" stackId="1" stroke={theme.palette.secondary.main} fill={alpha(theme.palette.secondary.main, 0.6)} />
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" />
              <PolarRadiusAxis />
              <Radar name="Current" dataKey="A" stroke={theme.palette.primary.main} fill={alpha(theme.palette.primary.main, 0.3)} fillOpacity={0.6} />
              <Radar name="Target" dataKey="B" stroke={theme.palette.secondary.main} fill={alpha(theme.palette.secondary.main, 0.3)} fillOpacity={0.6} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Chart Visualization
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Interactive Charts
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Chart Type</InputLabel>
                    <Select
                      value={chartType}
                      label="Chart Type"
                      onChange={(e) => setChartType(e.target.value)}
                    >
                      <MenuItem value="bar">Bar Chart</MenuItem>
                      <MenuItem value="line">Line Chart</MenuItem>
                      <MenuItem value="area">Area Chart</MenuItem>
                      <MenuItem value="pie">Pie Chart</MenuItem>
                      <MenuItem value="radar">Radar Chart</MenuItem>
                    </Select>
                  </FormControl>
                  <Button
                    variant="outlined"
                    onClick={loadChartData}
                    disabled={loading}
                  >
                    Refresh Data
                  </Button>
                </Box>
              </Box>
              {renderChart()}
            </CardContent>
          </Card>
        </Grid>

        {/* Additional Chart Examples */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Sales Trend
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="sales" stroke={theme.palette.success.main} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                User Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};