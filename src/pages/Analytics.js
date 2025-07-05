import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  useTheme,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Visibility,
  People,
  Timeline,
  Assessment,
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const analyticsData = [
  { month: 'Jan', users: 1200, sessions: 1800, pageViews: 3200, revenue: 2400 },
  { month: 'Feb', users: 1900, sessions: 2400, pageViews: 4100, revenue: 3200 },
  { month: 'Mar', users: 800, sessions: 1200, pageViews: 2100, revenue: 1800 },
  { month: 'Apr', users: 2780, sessions: 3200, pageViews: 5400, revenue: 4200 },
  { month: 'May', users: 1890, sessions: 2800, pageViews: 4200, revenue: 3400 },
  { month: 'Jun', users: 2390, sessions: 3400, pageViews: 5200, revenue: 4100 },
];

const pieData = [
  { name: 'Desktop', value: 45, color: '#673ab7' },
  { name: 'Mobile', value: 35, color: '#2196f3' },
  { name: 'Tablet', value: 20, color: '#4caf50' },
];

const topPages = [
  { page: '/dashboard', views: 15240, uniqueViews: 12340, bounceRate: '25%' },
  { page: '/analytics', views: 8950, uniqueViews: 7230, bounceRate: '32%' },
  { page: '/users', views: 6780, uniqueViews: 5640, bounceRate: '28%' },
  { page: '/settings', views: 4320, uniqueViews: 3890, bounceRate: '45%' },
  { page: '/reports', views: 3210, uniqueViews: 2980, bounceRate: '38%' },
];

export const Analytics = () => {
  const theme = useTheme();

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Analytics
      </Typography>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: theme.palette.primary.light,
                    color: 'white',
                  }}
                >
                  <People />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    24.5k
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Users
                  </Typography>
                  <Chip
                    label="+12.5%"
                    size="small"
                    color="success"
                    icon={<TrendingUp />}
                    sx={{ mt: 1 }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: theme.palette.info.light,
                    color: 'white',
                  }}
                >
                  <Visibility />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    156k
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Page Views
                  </Typography>
                  <Chip
                    label="+8.2%"
                    size="small"
                    color="success"
                    icon={<TrendingUp />}
                    sx={{ mt: 1 }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: theme.palette.success.light,
                    color: 'white',
                  }}
                >
                  <Timeline />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    2.4m
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Sessions
                  </Typography>
                  <Chip
                    label="-2.1%"
                    size="small"
                    color="error"
                    icon={<TrendingDown />}
                    sx={{ mt: 1 }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: theme.palette.warning.light,
                    color: 'white',
                  }}
                >
                  <Assessment />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    98.3%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Uptime
                  </Typography>
                  <Chip
                    label="+0.5%"
                    size="small"
                    color="success"
                    icon={<TrendingUp />}
                    sx={{ mt: 1 }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Traffic Overview */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Traffic Overview
                </Typography>
                <Button variant="outlined" size="small">
                  Last 6 Months
                </Button>
              </Box>
              <Box sx={{ height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analyticsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="users"
                      stackId="1"
                      stroke={theme.palette.primary.main}
                      fill={theme.palette.primary.main}
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="sessions"
                      stackId="1"
                      stroke={theme.palette.secondary.main}
                      fill={theme.palette.secondary.main}
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Device Breakdown */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Device Breakdown
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

        {/* Top Pages */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Top Pages
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Page</TableCell>
                      <TableCell align="right">Page Views</TableCell>
                      <TableCell align="right">Unique Views</TableCell>
                      <TableCell align="right">Bounce Rate</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topPages.map((page, index) => (
                      <TableRow key={index}>
                        <TableCell component="th" scope="row">
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {page.page}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {page.views.toLocaleString()}
                        </TableCell>
                        <TableCell align="right">
                          {page.uniqueViews.toLocaleString()}
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={page.bounceRate}
                            size="small"
                            color={parseFloat(page.bounceRate) > 40 ? 'error' : 'success'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};