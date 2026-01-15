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
  Chip,
  useMediaQuery,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Paper,
  Slide,
  Tabs,
  Tab,
  IconButton,
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
  Assessment,
  Close as CloseIcon,
  Print as PrintIcon,
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
import {
  formatCurrency,
  formatDate,
  formatFullName,
} from "../utils/formatters";
import { businessAPI, cashRegisterAPI, salesAPI } from "../utils/api";
import { notificationSwal } from "../utils/swal-helpers";
import { useAuth } from "../contexts/AuthContext";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const PIE_CHART_COLORS = ["#4caf50", "#f44336"]; // Verde para ventas, Rojo para gastos

const CustomPieLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}) => {
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
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isInitialMount = useRef(true);

  // Report Dialog States
  const [openReportsDialog, setOpenReportsDialog] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [reportType, setReportType] = useState("sales");
  const [isPrinting, setIsPrinting] = useState(false);

  const currency = business?.currency || "PEN";

  const handleOpenReports = async (cashRegisterId) => {
    if (!cashRegisterId) return;
    try {
      const response = await cashRegisterAPI.getReport(cashRegisterId);
      const report = response.data;
      const sales = report.sales || [];
      const totalSales = sales.length;
      const cashSalesAmount = sales
        .filter((s) => s.payment_method === "cash")
        .reduce((sum, s) => sum + parseFloat(s.total_amount), 0);
      const expectedCash = parseFloat(report.expected_amount);
      const productSummary = sales
        .flatMap((s) => s.items)
        .filter((i) => i.item_type.includes("Product"))
        .reduce((summary, item) => {
          if (summary[item.item_name]) {
            summary[item.item_name].quantity += item.quantity;
          } else {
            summary[item.item_name] = { ...item };
          }
          return summary;
        }, {});
      setReportData({
        ...report,
        sales,
        totalSales,
        cashSalesAmount,
        expectedCash: report.expected_amount,
        total_in_cash: report.report_current_cash,
        reportDifference: report.report_difference,
        productSummary: Object.values(productSummary),
      });
      setOpenReportsDialog(true);
    } catch (error) {
      console.error("Error loading report:", error);
      notificationSwal("Error", "No se pudo cargar el reporte.", "error");
    }
  };

  const handlePrintReceipt = async (saleId) => {
    setIsPrinting(true);
    try {
      const response = await salesAPI.getSaleReceipt(saleId);
      const file = new Blob([response.data], { type: "application/pdf" });
      const fileURL = URL.createObjectURL(file);
      window.open(fileURL, "_blank");
    } catch (error) {
      console.error("Error printing receipt:", error);
      notificationSwal("Error", "No se pudo generar el recibo.", "error");
    } finally {
      setIsPrinting(false);
    }
  };

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
          businessAPI.getStats(user.business_id, `week`),
        ]);
        setBusiness(businessRes.data);
        setStats(dashboardRes.data.stats);
        setTopProducts(dashboardRes.data.top_products);
        setRecentActivities(dashboardRes.data.recent_activities);
        setCashRegisters(dashboardRes.data.cash_registers_today);
        processChartData(dashboardRes.data);
      } catch (error) {
        console.error("Error loading initial data:", error);
        notificationSwal(
          "Error",
          "Hubo un error al cargar el dashboard.",
          "error"
        );
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
        const dashboardRes = await businessAPI.getStats(
          user.business_id,
          period
        );
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
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 400,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  const getTrend = (current, previous) => {
    if (!previous || previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const statsCards = [
    {
      title: "Ventas de Hoy",
      value: formatCurrency(stats?.daily_sales || 0, currency),
      icon: <ShoppingCart />,
      trend: getTrend(stats?.daily_sales, stats?.monthly_sales / 30),
      gradient: "linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)",
    },
    {
      title: "Ventas de este Mes",
      value: formatCurrency(stats?.monthly_sales || 0, currency),
      icon: <AttachMoney />,
      trend: getTrend(stats?.monthly_sales, stats?.previous_monthly_sales || 0),
      gradient: "linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)",
    },
    {
      title: "Gastos de Hoy",
      value: formatCurrency(stats?.daily_expenses || 0, currency),
      icon: <TrendingDown />,
      trend: getTrend(stats?.daily_expenses, stats?.monthly_expenses / 30),
      gradient: "linear-gradient(135deg, #f44336 0%, #ef5350 100%)",
    },
    {
      title: "Dinero en Caja",
      value: formatCurrency(stats?.cash_in_register || 0, currency),
      icon: <AccountBalance />,
      trend: getTrend(100, 100),
      gradient: "linear-gradient(135deg, #2196f3 0%, #42a5f5 100%)",
    },
  ];

  const renderActivityIcon = (type) => {
    return type === "sale" ? (
      <PointOfSale color="success" />
    ) : (
      <Receipt color="error" />
    );
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: { xs: 1, md: 3 }, fontWeight: 600 }}>
        Dashboard de {business?.name}
      </Typography>

      <Grid container spacing={isMobile ? 1 : 3} sx={{ mb: { xs: 1, md: 4 } }}>
        {statsCards.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              sx={{
                background: stat.gradient,
                color: "white",
                position: "relative",
                overflow: "hidden",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: 100,
                  height: 100,
                  background: alpha("#ffffff", 0.1),
                  borderRadius: "50%",
                  transform: "translate(30px, -30px)",
                },
              }}
            >
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      {stat.title}
                    </Typography>
                  </Box>
                  <Box sx={{ opacity: 0.8 }}>{stat.icon}</Box>
                </Box>
                {stat.trend !== null && (
                  <Box sx={{ mt: 2, display: "flex", alignItems: "center" }}>
                    {stat.trend >= 0 ? (
                      <TrendingUp fontSize="small" />
                    ) : (
                      <TrendingDown fontSize="small" />
                    )}
                    <Typography variant="body2" sx={{ ml: 0.5 }}>
                      {stat.trend.toFixed(1)}%
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={isMobile ? 1 : 3}>
        <Grid item xs={12} lg={8}>
          <Card sx={{ position: "relative" }}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 3,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Resumen del Período
                </Typography>
                <ToggleButtonGroup
                  value={period}
                  exclusive
                  onChange={handlePeriodChange}
                  size="small"
                >
                  <ToggleButton value="day">Día</ToggleButton>
                  <ToggleButton value="week">Semana</ToggleButton>
                  <ToggleButton value="month">Mes</ToggleButton>
                  <ToggleButton value="year">Año</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              {chartLoading ? (
                <Skeleton variant="rectangular" width="100%" height={300} />
              ) : (
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis
                        tickFormatter={(value) =>
                          formatCurrency(value, currency, true)
                        }
                      />
                      <Tooltip
                        formatter={(value) => formatCurrency(value, currency)}
                      />
                      <Legend />
                      <Bar dataKey="Ventas" fill={theme.palette.success.main} />
                      <Bar dataKey="Gastos" fill={theme.palette.error.main} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Resumen del Período
              </Typography>
              {chartLoading ? (
                <Skeleton variant="rectangular" width="100%" height={300} />
              ) : (
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        nameKey="name"
                        labelLine={false}
                        label={<CustomPieLabel />}
                      >
                        {pieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PIE_CHART_COLORS[index]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatCurrency(value, currency)}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              )}
              <Typography variant="h6" sx={{ fontWeight: 500, marginTop: 2 }}>
                Ingresos vs Gastos
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Alertas y Notificaciones
              </Typography>
              <List dense>
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Warning color="warning" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Stock Bajo"
                    secondary={`${stats?.products_low_stock} productos`}
                  />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Schedule color="error" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Créditos Pendientes"
                    secondary={`${stats?.pending_credits} créditos`}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                Cajas De Hoy
              </Typography>
              {cashRegisters?.length > 0 ? (
                isMobile ? (
                  <Box
                    sx={{
                      display: "flex",
                      overflowX: "auto",
                      pb: 2,
                      gap: 2,
                      "::-webkit-scrollbar": { height: 8 },
                      "::-webkit-scrollbar-track": {
                        backgroundColor: "#f1f1f1",
                        borderRadius: 4,
                      },
                      "::-webkit-scrollbar-thumb": {
                        backgroundColor: "#888",
                        borderRadius: 4,
                      },
                      "::-webkit-scrollbar-thumb:hover": {
                        backgroundColor: "#555",
                      },
                    }}
                  >
                    {cashRegisters.map((reg) => (
                      <Card
                        key={reg.id}
                        variant="outlined"
                        sx={{
                          minWidth: 280,
                          flexShrink: 0,
                          backgroundColor:
                            reg.status === "open"
                              ? theme.palette.success.light
                              : theme.palette.grey[500],
                        }}
                      >
                        <CardContent>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              mb: 1,
                            }}
                          >
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                              <Person sx={{ mr: 1 }} />
                              <Typography variant="subtitle1" fontWeight="bold">
                                {reg.opened_by.full_name}
                              </Typography>
                            </Box>
                            <Chip
                              size="small"
                              label={formatDate(
                                reg.status === "open"
                                  ? reg.created_at
                                  : reg.closed_at,
                                "HH:mm"
                              )}
                              color={
                                reg.status === "open" ? "success" : "default"
                              }
                            />
                          </Box>
                          <Divider sx={{ my: 1 }} />
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              mb: 0.5,
                            }}
                          >
                            <Typography variant="body2">Inicial:</Typography>
                            <Typography variant="body2" fontWeight="medium">
                              {formatCurrency(reg.initial_amount, currency)}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              mb: 0.5,
                            }}
                          >
                            <Typography variant="body2">Cierre:</Typography>
                            <Typography
                              variant="body2"
                              fontWeight="bold"
                              color="success.main"
                            >
                              {formatCurrency(reg.final_amount, currency)}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              mb: 2,
                            }}
                          >
                            <Typography variant="body2">Diferencia:</Typography>
                            <Typography
                              variant="body2"
                              fontWeight="bold"
                              color="error.main"
                            >
                              {formatCurrency(reg.difference, currency)}
                            </Typography>
                          </Box>
                          <Button
                            variant="contained"
                            size="small"
                            fullWidth
                            startIcon={<Assessment />}
                            onClick={() => handleOpenReports(reg.id)}
                          >
                            Ver Reporte
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                ) : (
                  <List dense>
                    {cashRegisters.map((reg) => (
                      <ListItem
                        key={reg.id}
                        disableGutters
                        secondaryAction={
                          <IconButton
                            edge="end"
                            aria-label="report"
                            onClick={() => handleOpenReports(reg.id)}
                            title="Ver Reporte"
                          >
                            <Assessment color="primary" />
                          </IconButton>
                        }
                      >
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <Person />
                        </ListItemIcon>
                        <ListItemText
                          primary={reg.opened_by.full_name}
                          secondary={
                            <Chip
                              size="small"
                              label={
                                <>
                                  <AccessTime
                                    sx={{
                                      fontSize: "0.9rem",
                                      verticalAlign: "middle",
                                    }}
                                  />{" "}
                                  {formatDate(
                                    reg.status === "open"
                                      ? reg.created_at
                                      : reg.closed_at,
                                    "HH:mm"
                                  )}
                                </>
                              }
                              color={
                                reg.status === "open" ? "success" : "default"
                              }
                            />
                          }
                        />
                        <ListItemText
                          primary={"Inicial: "}
                          secondary={formatCurrency(
                            reg.initial_amount,
                            currency
                          )}
                        />
                        <ListItemText
                          primary={"Cierre: "}
                          secondary={
                            <Typography
                              variant="body2"
                              color={theme.palette.success.main}
                            >
                              {formatCurrency(reg.final_amount, currency)}
                            </Typography>
                          }
                        />
                        <ListItemText
                          primary={"Diferencia: "}
                          secondary={
                            <Typography variant="body2" color="error">
                              {formatCurrency(reg.difference, currency)}
                            </Typography>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                )
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No se han abierto cajas hoy.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Top 5 Productos Vendidos
              </Typography>
              <List>
                {topProducts?.map((product, index) => (
                  <ListItem key={index} disableGutters>
                    <ListItemIcon>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 700,
                          color: theme.palette.primary.main,
                        }}
                      >
                        {index + 1}
                      </Typography>
                    </ListItemIcon>
                    <ListItemText
                      primary={product.name}
                      secondary={`${product.quantity} unidades`}
                    />
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {formatCurrency(product.revenue, currency)}
                    </Typography>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Actividad Reciente
              </Typography>
              <List>
                {recentActivities?.map((activity, index) => (
                  <ListItem key={index} disableGutters>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      {renderActivityIcon(activity.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={activity.description}
                      secondary={activity.time}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color:
                          activity.amount > 0 ? "success.main" : "error.main",
                      }}
                    >
                      {activity.amount > 0 ? "+" : ""}
                      {formatCurrency(Math.abs(activity.amount), currency)}
                    </Typography>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog
        open={openReportsDialog}
        onClose={() => setOpenReportsDialog(false)}
        maxWidth="md"
        fullWidth
        TransitionComponent={Transition}
      >
        <DialogTitle sx={{ p: { xs: 1, md: 3 } }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Reportes del Día
            </Typography>
            <IconButton onClick={() => setOpenReportsDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 1, md: 3 } }}>
          {reportData && (
            <>
              <Grid
                container
                spacing={isMobile ? 1 : 3}
                sx={{ mb: { xs: 1, md: 3 } }}
              >
                <Grid item xs={6} md={3}>
                  <Paper
                    sx={{
                      p: 2,
                      textAlign: "center",
                      bgcolor: "primary.light",
                      color: "white",
                    }}
                  >
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {reportData.sales.length}
                    </Typography>
                    <Typography variant="body2">Ventas Totales</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Paper
                    sx={{
                      p: 2,
                      textAlign: "center",
                      bgcolor: "success.light",
                      color: "white",
                    }}
                  >
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {formatCurrency(reportData.initial_amount, currency)}
                    </Typography>
                    <Typography variant="body2">Dinero Inicial</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Paper
                    sx={{
                      p: 2,
                      textAlign: "center",
                      bgcolor: "info.light",
                      color: "white",
                    }}
                  >
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {formatCurrency(reportData.total_in_cash, currency)}
                    </Typography>
                    <Typography variant="body2">Dinero Actual</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Paper
                    sx={{
                      p: 2,
                      textAlign: "center",
                      bgcolor: "warning.light",
                      color: "white",
                    }}
                  >
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {formatCurrency(reportData.expected_amount, currency)}
                    </Typography>
                    <Typography variant="body2">Dinero Esperado</Typography>
                  </Paper>
                </Grid>
              </Grid>

              <Tabs
                value={reportType}
                onChange={(e, newValue) => setReportType(newValue)}
                sx={{
                  borderBottom: 1,
                  borderColor: "divider",
                  mb: { xs: 1, md: 3 },
                }}
              >
                <Tab label="Ventas del Día" value="sales" />
                <Tab label="Resumen de Productos" value="products" />
              </Tabs>

              {reportType === "sales" && (
                <Box>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Ventas Realizadas ({reportData.sales.length})
                  </Typography>
                  {reportData.sales.length > 0 ? (
                    <List>
                      {reportData.sales.map((sale) => (
                        <ListItem
                          key={sale.id}
                          sx={{
                            border: 1,
                            borderColor: "divider",
                            borderRadius: 1,
                            mb: 1,
                          }}
                        >
                          <ListItemText
                            primary={`${sale.sale_number} - ${sale.customer_name}`}
                            secondary={`${sale.items.length} productos - ${
                              sale.payment_method === "cash"
                                ? "Pagado"
                                : "Por cobrar"
                            }`}
                          />
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            {formatCurrency(sale.total_amount, currency)}
                          </Typography>
                          <IconButton
                            size="small"
                            color="primary"
                            sx={{ ml: 2 }}
                            onClick={() => handlePrintReceipt(sale.id)}
                            disabled={isPrinting}
                          >
                            <PrintIcon />
                          </IconButton>
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ textAlign: "center", py: 4 }}
                    >
                      No hay ventas registradas hoy
                    </Typography>
                  )}
                </Box>
              )}

              {reportType === "products" && (
                <Box>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Productos Más Vendidos
                  </Typography>
                  {reportData.productSummary.length > 0 ? (
                    <List>
                      {reportData.productSummary.map((product) => (
                        <ListItem key={product.item_name}>
                          <ListItemText
                            primary={product.item_name}
                            secondary={`Cantidad vendida: ${product.quantity}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ textAlign: "center", py: 4 }}
                    >
                      No se han vendido productos hoy.
                    </Typography>
                  )}
                </Box>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};
