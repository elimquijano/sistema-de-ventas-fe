import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  Chip,
  useTheme,
  alpha,
  CircularProgress,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  AttachMoney,
  People,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { dashboardAPI } from '../utils/api';

export const Dashboard = () => {
  const theme = useTheme();
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Cargar estadísticas del dashboard
      const statsResponse = await dashboardAPI.getStats();
      setStats(statsResponse.data);
      
      // Cargar datos de gráficos
      const chartResponse = await dashboardAPI.getChartData('monthly');
      setChartData(chartResponse.data.data || []);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      
      // Fallback a datos mock si la API falla
      setStats({
        total_users: 1234,
        total_sales: 45678,
        total_revenue: 123456,
        page_views: 987654,
        growth_percentage: 12.5,
      });
      
      setChartData([
        { name: 'Jan', Investment: 100, Loss: 80, Profit: 120, Maintenance: 60 },
        { name: 'Feb', Investment: 150, Loss: 60, Profit: 180, Maintenance: 80 },
        { name: 'Mar', Investment: 80, Loss: 40, Profit: 90, Maintenance: 50 },
        { name: 'Apr', Investment: 120, Loss: 50, Profit: 140, Maintenance: 70 },
        { name: 'May', Investment: 200, Loss: 90, Profit: 250, Maintenance: 100 },
        { name: 'Jun', Investment: 180, Loss: 70, Profit: 220, Maintenance: 90 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  const statsData = [
    {
      title: 'Total Earning',
      value: `$${stats?.total_revenue?.toLocaleString() || '0'}`,
      icon: <AttachMoney />,
      trend: `+${stats?.growth_percentage || 0}%`,
      color: 'primary',
      gradient: 'linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)',
    },
    {
      title: 'Total Order',
      value: `$${stats?.total_sales?.toLocaleString() || '0'}`,
      icon: <ShoppingCart />,
      trend: '+1.3%',
      color: 'info',
      gradient: 'linear-gradient(135deg, #2196f3 0%, #21cbf3 100%)',
    },
    {
      title: 'Total Income',
      value: `$${Math.floor((stats?.total_revenue || 0) * 0.7).toLocaleString()}`,
      icon: <TrendingUp />,
      trend: '+3.1%',
      color: 'success',
      gradient: 'linear-gradient(135deg, #4caf50 0%, #8bc34a 100%)',
    },
    {
      title: 'Total Users',
      value: stats?.total_users?.toLocaleString() || '0',
      icon: <People />,
      trend: '+5.2%',
      color: 'warning',
      gradient: 'linear-gradient(135deg, #ff9800 0%, #ffc107 100%)',
    },
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Dashboard
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statsData.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              sx={{
                background: stat.gradient,
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: 100,
                  height: 100,
                  background: alpha('#ffffff', 0.1),
                  borderRadius: '50%',
                  transform: 'translate(30px, -30px)',
                },
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      {stat.title}
                    </Typography>
                  </Box>
                  <Box sx={{ opacity: 0.8 }}>
                    {stat.icon}
                  </Box>
                </Box>
                <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
                  {stat.trend.startsWith('+') ? <TrendingUp fontSize="small" /> : <TrendingDown fontSize="small" />}
                  <Typography variant="body2" sx={{ ml: 0.5 }}>
                    {stat.trend}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Total Growth Chart */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Total Growth
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                    ${stats?.total_revenue?.toLocaleString() || '0'}
                  </Typography>
                </Box>
                <Button variant="outlined" size="small" onClick={loadDashboardData}>
                  Refresh
                </Button>
              </Box>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="Investment" stackId="a" fill="#2196f3" />
                    <Bar dataKey="Loss" stackId="a" fill="#4caf50" />
                    <Bar dataKey="Profit" stackId="a" fill="#673ab7" />
                    <Bar dataKey="Maintenance" stackId="a" fill="#ff9800" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Metrics */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Performance Metrics
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Conversion Rate</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>75%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={75} sx={{ height: 8, borderRadius: 4 }} />
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Customer Satisfaction</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>85%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={85} color="success" sx={{ height: 8, borderRadius: 4 }} />
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Revenue Growth</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>65%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={65} color="warning" sx={{ height: 8, borderRadius: 4 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Monthly Revenue */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Monthly Revenue
              </Typography>
              <Box sx={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData.slice(0, 6)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="Profit" stroke={theme.palette.primary.main} fill={alpha(theme.palette.primary.main, 0.3)} />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Recent Activity
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">New user registration</Typography>
                  <Chip label="2 min ago" size="small" color="primary" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">Order #1234 completed</Typography>
                  <Chip label="5 min ago" size="small" color="success" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">Payment received</Typography>
                  <Chip label="10 min ago" size="small" color="info" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">System backup completed</Typography>
                  <Chip label="1 hour ago" size="small" color="warning" />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};