import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  People,
  ShoppingCart,
  AttachMoney,
  Visibility,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

const statisticsData = [
  {
    title: 'Total Users',
    value: '24,532',
    change: '+12.5%',
    trend: 'up',
    icon: <People />,
    color: '#673ab7',
  },
  {
    title: 'Total Sales',
    value: '$45,678',
    change: '+8.2%',
    trend: 'up',
    icon: <ShoppingCart />,
    color: '#2196f3',
  },
  {
    title: 'Revenue',
    value: '$123,456',
    change: '+15.3%',
    trend: 'up',
    icon: <AttachMoney />,
    color: '#4caf50',
  },
  {
    title: 'Page Views',
    value: '1,234,567',
    change: '-2.1%',
    trend: 'down',
    icon: <Visibility />,
    color: '#ff9800',
  },
];

const chartData = [
  { name: 'Jan', users: 400, sales: 240, revenue: 2400 },
  { name: 'Feb', users: 300, sales: 139, revenue: 2210 },
  { name: 'Mar', users: 200, sales: 980, revenue: 2290 },
  { name: 'Apr', users: 278, sales: 390, revenue: 2000 },
  { name: 'May', users: 189, sales: 480, revenue: 2181 },
  { name: 'Jun', users: 239, sales: 380, revenue: 2500 },
];

const pieData = [
  { name: 'Desktop', value: 45, color: '#673ab7' },
  { name: 'Mobile', value: 35, color: '#2196f3' },
  { name: 'Tablet', value: 20, color: '#4caf50' },
];

const performanceMetrics = [
  { name: 'Server Response Time', value: 85, color: 'success' },
  { name: 'Database Performance', value: 92, color: 'success' },
  { name: 'API Response Rate', value: 78, color: 'warning' },
  { name: 'User Satisfaction', value: 95, color: 'success' },
  { name: 'System Uptime', value: 99, color: 'success' },
];

export const Statistics = () => {
  const theme = useTheme();

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Statistics
      </Typography>

      {/* Key Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statisticsData.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      backgroundColor: stat.color,
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {stat.icon}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {stat.title}
                    </Typography>
                    <Chip
                      label={stat.change}
                      size="small"
                      color={stat.trend === 'up' ? 'success' : 'error'}
                      icon={stat.trend === 'up' ? <TrendingUp /> : <TrendingDown />}
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Statistics Chart */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Monthly Statistics
              </Typography>
              <Box sx={{ height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="users" fill="#673ab7" />
                    <Bar dataKey="sales" fill="#2196f3" />
                    <Bar dataKey="revenue" fill="#4caf50" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Device Statistics */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Device Usage
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
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
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
                {pieData.map((item, index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: item.color,
                      }}
                    />
                    <Typography variant="body2">
                      {item.name}: {item.value}%
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Metrics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Performance Metrics
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {performanceMetrics.map((metric, index) => (
                  <Box key={index}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">{metric.name}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {metric.value}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={metric.value}
                      color={metric.color}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Trend Chart */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Growth Trend
              </Typography>
              <Box sx={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="users"
                      stroke="#673ab7"
                      strokeWidth={3}
                      dot={{ fill: '#673ab7', strokeWidth: 2, r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="sales"
                      stroke="#2196f3"
                      strokeWidth={3}
                      dot={{ fill: '#2196f3', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};