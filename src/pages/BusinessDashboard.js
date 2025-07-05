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
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  AttachMoney,
  People,
  Inventory,
  Warning,
  CheckCircle,
  Schedule,
  AccountBalance,
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { formatCurrency } from '../utils/formatters';

export const BusinessDashboard = () => {
  const theme = useTheme();
  const [stats, setStats] = useState(null);
  const [salesData, setSalesData] = useState([]);
  const [expensesData, setExpensesData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Simulación de estadísticas del negocio
      const mockStats = {
        daily_sales: 450.75,
        monthly_sales: 12500.00,
        daily_expenses: 125.50,
        monthly_expenses: 3200.00,
        products_low_stock: 5,
        pending_credits: 8,
        cash_in_register: 850.25,
        profit_margin: 35.5,
        sales_growth: 12.5,
        top_selling_products: [
          { name: "Coca Cola", quantity: 45, revenue: 112.50 },
          { name: "Pan Integral", quantity: 32, revenue: 96.00 },
          { name: "Detergente", quantity: 18, revenue: 153.00 },
        ],
        recent_activities: [
          { type: "sale", description: "Venta V-025 - María García", amount: 45.50, time: "hace 5 min" },
          { type: "expense", description: "Compra de inventario", amount: -150.00, time: "hace 1 hora" },
          { type: "payment", description: "Pago de crédito - Pedro López", amount: 75.00, time: "hace 2 horas" },
        ]
      };

      // Datos para gráficos
      const mockSalesData = [
        { name: 'Lun', ventas: 320, gastos: 80 },
        { name: 'Mar', ventas: 450, gastos: 120 },
        { name: 'Mié', ventas: 380, gastos: 95 },
        { name: 'Jue', ventas: 520, gastos: 140 },
        { name: 'Vie', ventas: 680, gastos: 160 },
        { name: 'Sáb', ventas: 750, gastos: 180 },
        { name: 'Dom', ventas: 420, gastos: 100 },
      ];

      const mockExpensesData = [
        { name: 'Inventario', value: 45, color: '#673ab7' },
        { name: 'Servicios', value: 25, color: '#2196f3' },
        { name: 'Nómina', value: 20, color: '#4caf50' },
        { name: 'Otros', value: 10, color: '#ff9800' },
      ];

      setStats(mockStats);
      setSalesData(mockSalesData);
      setExpensesData(mockExpensesData);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
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

  const statsCards = [
    {
      title: 'Ventas del Día',
      value: formatCurrency(stats?.daily_sales || 0),
      icon: <ShoppingCart />,
      trend: `+${stats?.sales_growth || 0}%`,
      color: 'primary',
      gradient: 'linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)',
    },
    {
      title: 'Ventas del Mes',
      value: formatCurrency(stats?.monthly_sales || 0),
      icon: <AttachMoney />,
      trend: '+8.2%',
      color: 'success',
      gradient: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
    },
    {
      title: 'Gastos del Día',
      value: formatCurrency(stats?.daily_expenses || 0),
      icon: <TrendingDown />,
      trend: '-5.1%',
      color: 'error',
      gradient: 'linear-gradient(135deg, #f44336 0%, #ef5350 100%)',
    },
    {
      title: 'Dinero en Caja',
      value: formatCurrency(stats?.cash_in_register || 0),
      icon: <AccountBalance />,
      trend: '+2.3%',
      color: 'info',
      gradient: 'linear-gradient(135deg, #2196f3 0%, #42a5f5 100%)',
    },
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Dashboard del Negocio
      </Typography>

      {/* Tarjetas de estadísticas principales */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statsCards.map((stat, index) => (
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
        {/* Gráfico de ventas vs gastos */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Ventas vs Gastos (Última Semana)
                </Typography>
                <Button variant="outlined" size="small" onClick={loadDashboardData}>
                  Actualizar
                </Button>
              </Box>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Bar dataKey="ventas" fill="#4caf50" name="Ventas" />
                    <Bar dataKey="gastos" fill="#f44336" name="Gastos" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Distribución de gastos */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Distribución de Gastos
              </Typography>
              <Box sx={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expensesData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {expensesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
                {expensesData.map((item, index) => (
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

        {/* Alertas y notificaciones */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Alertas del Negocio
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <Warning color="warning" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Stock Bajo"
                    secondary={`${stats?.products_low_stock} productos con stock bajo`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Schedule color="error" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Créditos Pendientes"
                    secondary={`${stats?.pending_credits} pagos pendientes`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Sistema Operativo"
                    secondary="Todos los sistemas funcionando correctamente"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Productos más vendidos */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Productos Más Vendidos
              </Typography>
              <List>
                {stats?.top_selling_products?.map((product, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <Inventory color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={product.name}
                      secondary={`${product.quantity} unidades vendidas`}
                    />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatCurrency(product.revenue)}
                    </Typography>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Actividad reciente */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Actividad Reciente
              </Typography>
              <List>
                {stats?.recent_activities?.map((activity, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={activity.description}
                      secondary={activity.time}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: activity.amount > 0 ? 'success.main' : 'error.main'
                      }}
                    >
                      {activity.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(activity.amount))}
                    </Typography>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};