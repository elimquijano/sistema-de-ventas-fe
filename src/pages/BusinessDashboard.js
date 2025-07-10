import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  useTheme,
  alpha,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ToggleButtonGroup,
  ToggleButton,
  Divider,
  Skeleton,
} from "@mui/material";
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  AttachMoney,
  Inventory,
  Warning,
  Schedule,
  AccountBalance,
  Receipt,
  PointOfSale,
  Person,
  AccessTime,
} from "@mui/icons-material";
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
  Legend,
} from "recharts";
import { formatCurrency, formatFullName } from "../utils/formatters";
import { businessAPI } from "../utils/api";
import { notificationSwal } from "../utils/swal-helpers";
import { useAuth } from "../contexts/AuthContext";

const PIE_CHART_COLORS = ["#4caf50", "#f44336"]; // Verde para ventas, Rojo para gastos

const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent === 0) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
  const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      style={{ fontSize: "1rem", fontWeight: "bold" }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export const BusinessDashboard = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const [business, setBusiness] = useState(null);
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [cashRegisters, setCashRegisters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [period, setPeriod] = useState("week");
  const isInitialMount = useRef(true);

  const currency = business?.currency || "PEN";

  const processChartData = (dashboardData) => {
    setPieData(dashboardData.pie_chart_data);
    const combinedData = dashboardData.chart_data.sales.map((saleItem) => {
      const expenseItem = dashboardData.chart_data.expenses.find(
        (exp) => exp.label === saleItem.label
      );
      return {
        label: saleItem.label,
        Ventas: saleItem.value,
        Gastos: expenseItem ? expenseItem.value : 0,
      };
    });
    setChartData(combinedData);
  };

  // Effect for the first, full-page load
  useEffect(() => {
    const loadInitialData = async () => {
      if (!user.business_id) return;
      setLoading(true);
      try {
        const [businessRes, dashboardRes] = await Promise.all([
          businessAPI.getById(user.business_id),
          businessAPI.getStats(user.business_id, `period=week`),
        ]);
        setBusiness(businessRes.data);
        setStats(dashboardRes.data.stats);
        setTopProducts(dashboardRes.data.top_products);
        setRecentActivities(dashboardRes.data.recent_activities);
        setCashRegisters(dashboardRes.data.cash_registers_today);
        processChartData(dashboardRes.data);
      } catch (error) {
        console.error("Error loading initial data:", error);
        notificationSwal("Error", "Hubo un error al cargar el dashboard.", "error");
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, [user.business_id]);

  // Effect for updating charts when period changes, with skeleton loader
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const updateChartData = async () => {
      setChartLoading(true);
      try {
        const dashboardRes = await businessAPI.getStats(user.business_id, `period=${period}`);
        processChartData(dashboardRes.data);
      } catch (error) {
        console.error("Error loading chart data:", error);
      } finally {
        setChartLoading(false);
      }
    };

    updateChartData();
  }, [period, user.business_id]);

  const handlePeriodChange = (event, newPeriod) => {
    if (newPeriod !== null && newPeriod !== period) {
      setPeriod(newPeriod);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  const getTrend = (current, previous) => {
    if (!previous || previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const statsCards = [
    { title: "Ventas del Día", value: formatCurrency(stats?.daily_sales || 0, currency), icon: <ShoppingCart />, trend: getTrend(stats?.daily_sales, stats?.monthly_sales / 30), gradient: "linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)" },
    { title: "Ventas del Mes", value: formatCurrency(stats?.monthly_sales || 0, currency), icon: <AttachMoney />, trend: getTrend(stats?.monthly_sales, stats?.previous_monthly_sales || 0), gradient: "linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)" },
    { title: "Gastos del Día", value: formatCurrency(stats?.daily_expenses || 0, currency), icon: <TrendingDown />, trend: getTrend(stats?.daily_expenses, stats?.monthly_expenses / 30), gradient: "linear-gradient(135deg, #f44336 0%, #ef5350 100%)" },
    { title: "Dinero en Caja", value: formatCurrency(stats?.cash_in_register || 0, currency), icon: <AccountBalance />, trend: null, gradient: "linear-gradient(135deg, #2196f3 0%, #42a5f5 100%)" },
  ];

  const renderActivityIcon = (type) => {
    return type === "sale" ? <PointOfSale color="success" /> : <Receipt color="error" />;
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>Dashboard de {business?.name}</Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statsCards.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ background: stat.gradient, color: "white", position: "relative", overflow: "hidden", "&::before": { content: '""', position: "absolute", top: 0, right: 0, width: 100, height: 100, background: alpha("#ffffff", 0.1), borderRadius: "50%", transform: "translate(30px, -30px)" } }}>
              <CardContent>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>{stat.value}</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>{stat.title}</Typography>
                  </Box>
                  <Box sx={{ opacity: 0.8 }}>{stat.icon}</Box>
                </Box>
                {stat.trend !== null && (
                  <Box sx={{ mt: 2, display: "flex", alignItems: "center" }}>
                    {stat.trend >= 0 ? <TrendingUp fontSize="small" /> : <TrendingDown fontSize="small" />}
                    <Typography variant="body2" sx={{ ml: 0.5 }}>{stat.trend.toFixed(1)}%</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Card sx={{ position: "relative" }}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Resumen del Período</Typography>
                <ToggleButtonGroup value={period} exclusive onChange={handlePeriodChange} size="small">
                  <ToggleButton value="day">Día</ToggleButton>
                  <ToggleButton value="week">Semana</ToggleButton>
                  <ToggleButton value="month">Mes</ToggleButton>
                  <ToggleButton value="year">Año</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              {chartLoading && (
                <Skeleton variant="rectangular" width="100%" height={300} sx={{ position: "absolute", top: 80, left: 0, zIndex: 10, backgroundColor: alpha(theme.palette.background.paper, 0.7) }} />
              )}
              <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis tickFormatter={(value) => formatCurrency(value, currency, true)} />
                        <Tooltip formatter={(value) => formatCurrency(value, currency)} />
                        <Legend />
                        <Bar dataKey="Ventas" fill={theme.palette.success.main} />
                        <Bar dataKey="Gastos" fill={theme.palette.error.main} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" labelLine={false} label={<CustomPieLabel />}>
                          {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index]} />)}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value, currency)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Alertas y Cajas</Typography>
              <List dense>
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 32 }}><Warning color="warning" /></ListItemIcon>
                  <ListItemText primary="Stock Bajo" secondary={`${stats?.products_low_stock} productos`} />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 32 }}><Schedule color="error" /></ListItemIcon>
                  <ListItemText primary="Créditos Pendientes" secondary={`${stats?.pending_credits} créditos`} />
                </ListItem>
              </List>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>Cajas Abiertas Hoy</Typography>
              {cashRegisters?.length > 0 ? (
                <List dense>
                  {cashRegisters.map(reg => (
                    <ListItem key={reg.id} disableGutters>
                      <ListItemIcon sx={{ minWidth: 32 }}><Person /></ListItemIcon>
                      <ListItemText primary={formatFullName(reg.opened_by.first_name, reg.opened_by.last_name)} secondary={<><AccessTime sx={{ fontSize: '0.9rem', verticalAlign: 'middle' }} /> {new Date(reg.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>} />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">No se han abierto cajas hoy.</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Top 5 Productos Vendidos</Typography>
              <List>
                {topProducts?.map((product, index) => (
                  <ListItem key={index} disableGutters>
                    <ListItemIcon><Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>{index + 1}</Typography></ListItemIcon>
                    <ListItemText primary={product.name} secondary={`${product.quantity} unidades`} />
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{formatCurrency(product.revenue, currency)}</Typography>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Actividad Reciente</Typography>
              <List>
                {recentActivities?.map((activity, index) => (
                  <ListItem key={index} disableGutters>
                    <ListItemIcon sx={{ minWidth: 40 }}>{renderActivityIcon(activity.type)}</ListItemIcon>
                    <ListItemText primary={activity.description} secondary={activity.time} />
                    <Typography variant="body2" sx={{ fontWeight: 600, color: activity.amount > 0 ? "success.main" : "error.main" }}>
                      {activity.amount > 0 ? "+" : ""}{formatCurrency(Math.abs(activity.amount), currency)}
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
