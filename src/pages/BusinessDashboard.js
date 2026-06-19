import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  useTheme,
  alpha,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  useMediaQuery,
  Paper,
  Slide,
  IconButton,
  Avatar,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  Tooltip as MuiTooltip,
  Divider,
  Chip,
  TextField,
} from "@mui/material";
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Close as CloseIcon,
  Store,
  AccountBalanceWallet,
  Assessment,
  Group,
  Category,
  Timeline,
  Warning,
  Schedule,
  Person,
  Inventory,
  Receipt,
  PointOfSale,
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
  AreaChart,
  Area,
} from "recharts";
import { formatCurrency, formatDate } from "../utils/formatters";
import { businessAPI, cashRegisterAPI, salesAPI, default as api } from "../utils/api";
import { notificationSwal, confirmSwal } from "../utils/swal-helpers";
import { useAuth } from "../contexts/AuthContext";
import { CashRegisterReport } from "../components/CashRegisterReport";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

// TOOLTIP INTELIGENTE: Se adapta al Tema Claro/Oscuro
const SmartTooltip = ({ active, payload, label, currency }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (active && payload && payload.length) {
    return (
      <Paper
        sx={{
          p: isMobile ? 1 : 1.5,
          bgcolor: alpha(theme.palette.background.paper, 0.95),
          backdropFilter: "blur(4px)",
          border: "1px solid",
          borderColor: theme.palette.divider,
          borderRadius: "12px",
          boxShadow: theme.shadows[8],
          maxWidth: isMobile ? '200px' : '300px',
          pointerEvents: 'none',
        }}
      >
        {label && (
          <Typography 
            variant="subtitle2" 
            sx={{ 
              fontWeight: 800, 
              mb: 0.5, 
              fontSize: isMobile ? '0.7rem' : '0.875rem',
              whiteSpace: 'normal',
              lineHeight: 1.2
            }}
          >
            {label}
          </Typography>
        )}
        {payload.map((item, index) => (
          <Box key={index} sx={{ mb: index === payload.length - 1 ? 0 : 0.5 }}>
            <Stack direction="row" spacing={isMobile ? 1 : 2} justifyContent="space-between" alignItems="center" sx={{ color: item.fill || item.color }}>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: item.fill || item.color }} />
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: isMobile ? '0.65rem' : '0.75rem' }}>{item.name}:</Typography>
              </Stack>
              <Typography variant="caption" sx={{ fontWeight: 800, fontSize: isMobile ? '0.65rem' : '0.75rem' }}>
                {typeof item.value === 'number' ? formatCurrency(item.value, currency) : item.value}
              </Typography>
            </Stack>
            {item.payload?.quantity !== undefined && index === 0 && (
              <Typography variant="caption" display="block" sx={{ textAlign: 'right', fontWeight: 600, color: 'text.secondary', mt: -0.2, fontSize: isMobile ? '0.6rem' : '0.7rem' }}>
                Cant: {item.payload.quantity}
              </Typography>
            )}
          </Box>
        ))}
      </Paper>
    );
  }
  return null;
};

// TARJETA DE KPI: Simetría y Limpieza
const KpiCard = ({ title, value, detail, icon, color, trend, percentage, avgValue, currency }) => {
  const theme = useTheme();
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: "24px",
        height: "100%",
        border: "1px solid",
        borderColor: alpha(color, 0.2),
        bgcolor: alpha(color, 0.03),
        position: "relative",
        overflow: "hidden",
        transition: "transform 0.2s",
        "&:hover": { transform: "translateY(-4px)" }
      }}
    >
      {!!avgValue && (
        <Chip 
          label={`Prom: ${formatCurrency(avgValue, currency)}`}
          size="small"
          sx={{ 
            position: 'absolute', 
            top: 2, 
            right: 60, 
            bgcolor: alpha(color, 0.1), 
            color: color, 
            fontWeight: 800,
            fontSize: '0.65rem',
            border: `1px solid ${alpha(color, 0.2)}`
          }} 
        />
      )}
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ fontWeight: 800, color: alpha(theme.palette.text.primary, 0.6), textTransform: "uppercase", letterSpacing: 1 }}>
            {title}
          </Typography>
          <Avatar sx={{ bgcolor: color, color: "#fff", width: 40, height: 40, boxShadow: `0 4px 12px ${alpha(color, 0.4)}` }}>
            {icon}
          </Avatar>
        </Stack>
        
        <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>{value}</Typography>
        
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
          {percentage !== undefined && (
            <Stack direction="row" alignItems="center" sx={{ 
              color: trend === 'up' ? theme.palette.success.main : trend === 'down' ? theme.palette.error.main : theme.palette.info.main, 
              bgcolor: alpha(trend === 'up' ? theme.palette.success.main : trend === 'down' ? theme.palette.error.main : theme.palette.info.main, 0.1), 
              px: 1, py: 0.2, borderRadius: "8px" 
            }}>
              {trend === 'up' ? <TrendingUp fontSize="inherit" /> : trend === 'down' ? <TrendingDown fontSize="inherit" /> : <Timeline fontSize="inherit" />}
              <Typography variant="caption" sx={{ fontWeight: 800, ml: 0.3 }}>{percentage}%</Typography>
            </Stack>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{detail}</Typography>
        </Stack>
      </CardContent>
    </Card>
  );
};

// CONTENEDOR DE GRÁFICO
const ChartCard = ({ title, icon, children, color, sx = {}, noFixedHeight = false }) => {
  const theme = useTheme();
  return (
    <Card sx={{ 
      borderRadius: "28px", 
      height: "100%", 
      border: "1px solid", 
      borderColor: alpha(theme.palette.divider, 0.1), 
      boxShadow: `0 10px 30px ${alpha(color, 0.05)}`,
      transition: 'all 0.3s ease',
      '&:hover': { boxShadow: `0 15px 40px ${alpha(color, 0.1)}` },
      ...sx 
    }}>
      <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
          <Avatar sx={{ 
            bgcolor: alpha(color, 0.15), 
            color: color, 
            width: 42, 
            height: 42,
            boxShadow: `inset 0 0 10px ${alpha(color, 0.2)}`
          }}>
            {icon}
          </Avatar>
          <Typography variant="h6" sx={{ fontWeight: 800, color: theme.palette.text.primary }}>{title}</Typography>
        </Stack>
        <Box sx={{ flexGrow: 1, height: noFixedHeight ? "auto" : 320, width: "100%" }}>
          {children}
        </Box>
      </CardContent>
    </Card>
  );
};

export const BusinessDashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  const [business, setBusiness] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("day");
  const [customDates, setCustomDates] = useState({
    from: new Date().toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const isInitialMount = useRef(true);

  const [openReportsDialog, setOpenReportsDialog] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const currency = business?.currency || "PEN";

  const chartColors = useMemo(() => [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.info.main,
    theme.palette.error.main,
  ], [theme]);

  const loadDashboardData = async (selectedPeriod, isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      let response;
      if (selectedPeriod === 'custom') {
        response = await api.get(`/businesses/${user.business_id}/dashboard`, { 
          params: { 
            period: 'custom',
            from: customDates.from,
            to: customDates.to
          }, 
          loaderMessage: "Cargando estadísticas..." 
        });
      } else {
        response = await businessAPI.getStats(user.business_id, selectedPeriod);
      }
      
      setDashboardData(response.data);
      if (isInitial) {
        const businessRes = await businessAPI.getById(user.business_id);
        setBusiness(businessRes.data);
      }
    } catch (error) {
      console.error("Dashboard Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user.business_id) loadDashboardData(period, true);
  }, [user.business_id]);

  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return; }
    if (period !== 'custom') {
      loadDashboardData(period);
    }
  }, [period]);

  const handleCustomDateChange = () => {
    loadDashboardData('custom');
  };

  const handleOpenReports = async (cashRegisterId) => {
    try {
      const response = await cashRegisterAPI.getReport(cashRegisterId);
      setReportData(response.data);
      setOpenReportsDialog(true);
    } catch (error) {
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
      notificationSwal("Error", "No se pudo imprimir.", "error");
    } finally {
      setIsPrinting(false);
    }
  };

  const handleCloseCashRegister = async (cashRegister) => {
    const confirmed = await confirmSwal("Cerrar Caja", `¿Cerrar la caja de ${cashRegister.opened_by?.full_name}?`);
    if (confirmed) {
      try {
        await cashRegisterAPI.close(cashRegister.id, { final_amount: cashRegister.expected_amount });
        notificationSwal("Éxito", "Caja cerrada.", "success");
        loadDashboardData(period);
      } catch (error) {
        notificationSwal("Error", "Error al cerrar.", "error");
      }
    }
  };

  if (loading || !dashboardData) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
        <CircularProgress size={50} thickness={4} color="primary" />
      </Box>
    );
  }

  const { financials, stats, charts, top_products, cash_registers_today } = dashboardData;
  const safeNum = (val) => isNaN(parseFloat(val)) ? 0 : parseFloat(val);

  // Transformaciones de datos para gráficos
  const histogramData = charts.histogram.sales.map((s, i) => ({
    name: s.label,
    Ventas: safeNum(s.value),
    Gastos: safeNum(charts.histogram.expenses[i]?.value),
  }));

  const piePayment = charts.payment_methods.map(p => ({ name: p.name.toUpperCase(), value: safeNum(p.value) })).filter(v => v.value > 0);
  const pieUser = charts.profit_by_user.map(u => ({ name: u.name, value: safeNum(u.value) })).filter(v => v.value > 0);
  const pieCat = charts.expenses_by_category.map(c => ({ name: c.name, value: safeNum(c.value) })).filter(v => v.value > 0);
  
  const barProducts = top_products.slice(0, 5).map(p => ({ 
    name: p.name, 
    revenue: safeNum(p.revenue),
    cost: safeNum(p.cost),
    quantity: safeNum(p.quantity)
  }));
  const barClients = charts.top_clients.slice(0, 5).map(c => ({ name: c.name, value: safeNum(c.value) }));

  return (
    <Box sx={{ pb: 6 }}>
      {/* HEADER DINÁMICO Y COLORIDO */}
      <Stack 
        direction={{ xs: "column", lg: "row" }} 
        justifyContent="space-between" 
        alignItems={{ xs: "stretch", lg: "center" }} 
        spacing={3} 
        sx={{ mb: 5 }}
      >
        <Box>
          <Typography variant="h3" sx={{ 
            fontWeight: 900, 
            letterSpacing: -1.5, 
            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            mb: 0.5
          }}>
            Dashboard de {business?.name || "Cargando..."}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: theme.palette.success.main, animation: 'pulse 2s infinite' }} />
            <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>
              INTELIGENCIA OPERATIVA • EN VIVO
            </Typography>
          </Stack>
        </Box>
        
        <Paper elevation={0} sx={{ 
          p: 1, 
          borderRadius: "24px", 
          bgcolor: alpha(theme.palette.background.paper, 0.6), 
          backdropFilter: "blur(20px)",
          border: "2px solid", 
          borderColor: theme.palette.divider,
          boxShadow: `0 10px 40px ${alpha(theme.palette.common.black, 0.05)}`
        }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center">
            {period === 'custom' && (
              <Stack direction="row" spacing={1} sx={{ px: 1, mb: { xs: 1, sm: 0 } }}>
                <TextField
                  type="date"
                  size="small"
                  label="Desde"
                  value={customDates.from}
                  onChange={(e) => setCustomDates({ ...customDates, from: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  sx={{ width: 130, '& .MuiOutlinedInput-root': { borderRadius: '14px' } }}
                />
                <TextField
                  type="date"
                  size="small"
                  label="Hasta"
                  value={customDates.to}
                  onChange={(e) => setCustomDates({ ...customDates, to: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  sx={{ width: 130, '& .MuiOutlinedInput-root': { borderRadius: '14px' } }}
                />
                <IconButton color="primary" onClick={handleCustomDateChange} sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), borderRadius: '12px' }}>
                  <Timeline />
                </IconButton>
              </Stack>
            )}
            <ToggleButtonGroup 
              value={period} 
              exclusive 
              onChange={(e, v) => v && setPeriod(v)} 
              size="small"
              sx={{ 
                width: '100%',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.5,
                border: 'none',
                '& .MuiToggleButton-root': {
                  flex: 1,
                  minWidth: { xs: '70px', sm: 'auto' },
                  borderRadius: "16px !important",
                  border: "none !important",
                  mx: 0.2,
                  py: 1.2,
                  fontWeight: 800,
                  textTransform: 'none',
                  color: theme.palette.text.secondary,
                  transition: 'all 0.2s',
                  '&.Mui-selected': {
                    bgcolor: theme.palette.primary.main,
                    color: '#fff',
                    boxShadow: `0 4px 15px ${alpha(theme.palette.primary.main, 0.4)}`,
                    '&:hover': { bgcolor: theme.palette.primary.dark }
                  },
                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) }
                }
              }}
            >
              <ToggleButton value="day">Hoy</ToggleButton>
              <ToggleButton value="week">Semana</ToggleButton>
              <ToggleButton value="month">Mes</ToggleButton>
              <ToggleButton value="year">Año</ToggleButton>
              <ToggleButton value="custom">Rango</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Paper>
      </Stack>

      {/* KPIs - REFLEJANDO ESTRUCTURA REAL DE LA API */}
      <Grid container spacing={3} sx={{ mb: 5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Ganancia Real (Neta)"
            value={formatCurrency(financials.profit.value, currency)}
            detail={`Vs. periodo anterior: ${formatCurrency(financials.profit.previous, currency)}`}
            icon={<AccountBalanceWallet />}
            color={theme.palette.success.main}
            trend={financials.profit.trend}
            percentage={financials.profit.percentage}
            avgValue={financials.avg_profit}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Ventas (Ingresos)"
            value={formatCurrency(financials.sales.value, currency)}
            detail={`Vs. periodo anterior: ${formatCurrency(financials.sales.previous, currency)}`}
            icon={<ShoppingCart />}
            color={theme.palette.primary.main}
            trend={financials.sales.trend}
            percentage={financials.sales.percentage}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Gastos (Salidas)"
            value={formatCurrency(financials.expenses.value, currency)}
            detail={`Vs. periodo anterior: ${formatCurrency(financials.expenses.previous, currency)}`}
            icon={<TrendingDown />}
            color={theme.palette.error.main}
            trend={financials.expenses.trend}
            percentage={financials.expenses.percentage}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Inversión en Productos"
            value={formatCurrency(financials.cost_of_goods_sold.value, currency)}
            detail={`Vs. periodo anterior: ${formatCurrency(financials.cost_of_goods_sold.previous, currency)}`}
            icon={<Inventory />}
            color={theme.palette.warning.main}
            trend={financials.cost_of_goods_sold.trend}
            percentage={financials.cost_of_goods_sold.percentage}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* GRÁFICO MAESTRO */}
        <Grid item xs={12} lg={8}>
          <ChartCard title="Flujo de Caja: Ingresos vs Gastos" icon={<Timeline />} color={theme.palette.primary.main}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={histogramData}>
                <defs>
                  <linearGradient id="gradSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.4}/>
                    <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gradExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={theme.palette.error.main} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={theme.palette.error.main} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={alpha(theme.palette.divider, 0.5)} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrency(v, currency, true)} tick={{ fontSize: 12, fontWeight: 700 }} />
                <Tooltip 
                  content={<SmartTooltip currency={currency} />} 
                />
                <Area type="monotone" dataKey="Ventas" name="Ventas" stroke={theme.palette.primary.main} strokeWidth={4} fill="url(#gradSales)" />
                <Area type="monotone" dataKey="Gastos" name="Gastos" stroke={theme.palette.error.main} strokeWidth={3} strokeDasharray="5 5" fill="url(#gradExpenses)" />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: 25, fontWeight: 800, textTransform: 'uppercase', fontSize: '11px' }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        {/* ALERTAS CRÍTICAS - REDISEÑADAS Y SIN LÍMITE DE ALTURA */}
        <Grid item xs={12} lg={4}>
          <ChartCard title="Alertas de Acción Inmediata" icon={<Warning />} color={theme.palette.error.main} noFixedHeight>
            <Stack spacing={2.5}>
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: "20px", bgcolor: alpha(theme.palette.error.main, 0.08), border: "1px solid", borderColor: alpha(theme.palette.error.main, 0.2) }}>
                <Stack direction="row" spacing={2.5} alignItems="center">
                  <Avatar sx={{ bgcolor: theme.palette.error.main, width: 50, height: 50, boxShadow: `0 8px 20px ${alpha(theme.palette.error.main, 0.4)}` }}>
                    <Inventory />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 900, color: theme.palette.error.dark }}>{stats.products_low_stock}</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: theme.palette.error.main, textTransform: 'uppercase' }}>Sin Stock Suficiente</Typography>
                  </Box>
                </Stack>
              </Paper>
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: "20px", bgcolor: alpha(theme.palette.warning.main, 0.08), border: "1px solid", borderColor: alpha(theme.palette.warning.main, 0.2) }}>
                <Stack direction="row" spacing={2.5} alignItems="center">
                  <Avatar sx={{ bgcolor: theme.palette.warning.main, width: 50, height: 50, boxShadow: `0 8px 20px ${alpha(theme.palette.warning.main, 0.4)}` }}>
                    <Schedule />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 900, color: theme.palette.warning.dark }}>{stats.pending_credits}</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: theme.palette.warning.main, textTransform: 'uppercase' }}>Cobros Pendientes</Typography>
                  </Box>
                </Stack>
              </Paper>
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: "20px", bgcolor: alpha(theme.palette.info.main, 0.08), border: "1px solid", borderColor: alpha(theme.palette.info.main, 0.2) }}>
                <Stack direction="row" spacing={2.5} alignItems="center">
                  <Avatar sx={{ bgcolor: theme.palette.info.main, width: 50, height: 50, boxShadow: `0 8px 20px ${alpha(theme.palette.info.main, 0.4)}` }}>
                    <Store />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 900, color: theme.palette.info.dark }}>{stats.active_asset_loans}</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: theme.palette.info.main, textTransform: 'uppercase' }}>Bienes Prestados</Typography>
                  </Box>
                </Stack>
              </Paper>
              {/* Espaciado extra para asegurar que se vea bien en PC */}
              <Box sx={{ py: 0.5 }} />
            </Stack>
          </ChartCard>
        </Grid>

        {/* GRÁFICOS SECUNDARIOS */}
        <Grid item xs={12} md={4}>
          <ChartCard title="Métodos de Pago" icon={<PointOfSale />} color={theme.palette.secondary.main}>
            {piePayment.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={piePayment} dataKey="value" nameKey="name" innerRadius={70} outerRadius={95} paddingAngle={8} stroke="none">
                    {piePayment.map((_, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} />)}
                  </Pie>
                  <Tooltip 
                  content={<SmartTooltip currency={currency} />} 
                />
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontWeight: 700, fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography color="text.secondary">Sin movimientos</Typography></Box>}
          </ChartCard>
        </Grid>

        <Grid item xs={12} md={4}>
          <ChartCard title="Liderazgo en Ventas" icon={<Person />} color={theme.palette.primary.main}>
            {pieUser.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieUser} dataKey="value" nameKey="name" outerRadius={95} paddingAngle={4} stroke={theme.palette.background.paper} strokeWidth={4}>
                    {pieUser.map((_, i) => <Cell key={i} fill={chartColors[(i+1) % chartColors.length]} />)}
                  </Pie>
                  <Tooltip 
                  content={<SmartTooltip currency={currency} />} 
                />
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontWeight: 700, fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography color="text.secondary">Sin datos</Typography></Box>}
          </ChartCard>
        </Grid>

        <Grid item xs={12} md={4}>
          <ChartCard title="Distribución de Gastos" icon={<Category />} color={theme.palette.error.main}>
            {pieCat.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieCat} dataKey="value" nameKey="name" innerRadius={70} outerRadius={95} paddingAngle={8} stroke="none">
                    {pieCat.map((_, i) => <Cell key={i} fill={chartColors[(i+3) % chartColors.length]} />)}
                  </Pie>
                  <Tooltip 
                  content={<SmartTooltip currency={currency} />} 
                />
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontWeight: 700, fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography color="text.secondary">Sin gastos</Typography></Box>}
          </ChartCard>
        </Grid>

        {/* RANKINGS */}
          <ChartCard title="Productos Estrella: Ventas vs Costo" icon={<Inventory />} color={theme.palette.warning.main}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={barProducts} 
                layout="vertical" 
                margin={{ left: isMobile ? -10 : 20, right: isMobile ? 10 : 30, top: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={alpha(theme.palette.divider, 0.5)} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  width={isMobile ? 90 : 130} 
                  tick={{ fontSize: isMobile ? 9 : 11, fontWeight: 800 }} 
                />
                <Tooltip 
                  content={<SmartTooltip currency={currency} />} 
                  cursor={{ fill: alpha(theme.palette.divider, 0.1) }}
                  offset={isMobile ? 5 : 10}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: 15, fontWeight: 700, fontSize: isMobile ? '10px' : '12px' }} />
                <Bar dataKey="revenue" name="Precio Venta" radius={[0, 10, 10, 0]} barSize={18} fill={theme.palette.primary.main} />
                <Bar dataKey="cost" name="Costo Compra" radius={[0, 10, 10, 0]} barSize={18} fill={theme.palette.error.light} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

        <Grid item xs={12} md={6}>
          <ChartCard title="Top 5 Clientes de Oro" icon={<Group />} color={theme.palette.info.main}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barClients} margin={{ top: 10, right: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={alpha(theme.palette.divider, 0.5)} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 800 }} />
                <YAxis hide />
                <Tooltip 
                  content={<SmartTooltip currency={currency} />} 
                />
                <Bar dataKey="value" name="Consumo Total" radius={[15, 15, 0, 0]} barSize={50}>
                  {barClients.map((_, i) => <Cell key={i} fill={alpha(theme.palette.info.main, 1 - (i * 0.15))} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        {/* ESTADO DE CAJAS RESPONSIVO */}
        <Grid item xs={12}>
          <ChartCard title="Actividad de Cajas en Tiempo Real" icon={<Receipt />} color={theme.palette.primary.main} noFixedHeight>
            <Grid container spacing={3}>
              {cash_registers_today.length > 0 ? cash_registers_today.map((reg) => (
                <Grid item xs={12} sm={6} lg={4} key={reg.id}>
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 3.5, 
                      borderRadius: "30px", 
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      border: reg.status === 'open' ? `3px solid ${theme.palette.success.main}` : `1px solid ${theme.palette.divider}`,
                      bgcolor: reg.status === 'open' ? alpha(theme.palette.success.main, 0.04) : alpha(theme.palette.background.paper, 0.5),
                      boxShadow: reg.status === 'open' ? `0 15px 35px ${alpha(theme.palette.success.main, 0.15)}` : 'none',
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: theme.shadows[15],
                        borderColor: reg.status === 'open' ? theme.palette.success.main : theme.palette.primary.main,
                      }
                    }}
                  >
                    <Box>
                      <Stack direction="row" spacing={2.5} alignItems="center" sx={{ mb: 3.5 }}>
                        <Avatar 
                          sx={{ 
                            bgcolor: reg.status === 'open' ? theme.palette.success.main : theme.palette.primary.main, 
                            width: 60, 
                            height: 60, 
                            fontSize: 22,
                            fontWeight: 900,
                            boxShadow: `0 8px 20px ${alpha(reg.status === 'open' ? theme.palette.success.main : theme.palette.primary.main, 0.4)}`
                          }}
                        >
                          {reg.opened_by.initials}
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.1, mb: 0.5 }}>
                            {reg.opened_by.full_name}
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Box sx={{ 
                              width: 10, 
                              height: 10, 
                              borderRadius: '50%', 
                              bgcolor: reg.status === 'open' ? theme.palette.success.main : theme.palette.text.disabled,
                              animation: reg.status === 'open' ? 'pulse 2s infinite' : 'none'
                            }} />
                            <Typography variant="caption" sx={{ fontWeight: 900, color: reg.status === 'open' ? 'success.main' : 'text.disabled', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                              {reg.status === 'open' ? 'OPERANDO' : 'CERRADA'}
                            </Typography>
                          </Stack>
                        </Box>
                      </Stack>

                      <Grid container spacing={2} sx={{ mb: 3.5, bgcolor: alpha(theme.palette.divider, 0.05), p: 2.5, borderRadius: "20px" }}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, display: 'block', mb: 1, textTransform: 'uppercase' }}>Inicio</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Schedule fontSize="inherit" /> {formatDate(reg.opened_at, "HH:mm")}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, display: 'block', mb: 1, textTransform: 'uppercase' }}>En Caja</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 900, color: theme.palette.primary.main }}>
                            {formatCurrency(reg.expected_amount, currency)}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>

                    <Box>
                      <Divider sx={{ mb: 2.5, borderStyle: 'dashed', borderColor: alpha(theme.palette.divider, 0.8) }} />
                      
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="caption" color="success.main" sx={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 }}>Utilidad</Typography>
                          <Typography variant="h4" color="success.main" sx={{ fontWeight: 900 }}>
                            {formatCurrency(reg.profit, currency)}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1.5}>
                          <MuiTooltip title="Ver Reporte">
                            <IconButton 
                              onClick={() => handleOpenReports(reg.id)}
                              sx={{ 
                                bgcolor: alpha(theme.palette.primary.main, 0.1), 
                                color: theme.palette.primary.main,
                                width: 50, height: 50,
                                '&:hover': { bgcolor: theme.palette.primary.main, color: '#fff', transform: 'scale(1.1)' }
                              }}
                            >
                              <Assessment />
                            </IconButton>
                          </MuiTooltip>
                          {reg.status === 'open' && (user.role === 'admin' || reg.opened_by.id === user.id) && (
                            <MuiTooltip title="Cerrar Turno">
                              <IconButton 
                                color="error" 
                                onClick={() => handleCloseCashRegister(reg)}
                                sx={{ 
                                  bgcolor: alpha(theme.palette.error.main, 0.1),
                                  width: 50, height: 50,
                                  '&:hover': { bgcolor: theme.palette.error.main, color: '#fff', transform: 'scale(1.1)' }
                                }}
                              >
                                <CloseIcon />
                              </IconButton>
                            </MuiTooltip>
                          )}
                        </Stack>
                      </Stack>
                    </Box>
                  </Paper>
                </Grid>
              )) : (
                <Grid item xs={12}>
                  <Box sx={{ py: 10, textAlign: 'center', opacity: 0.6, border: '3px dashed', borderColor: theme.palette.divider, borderRadius: '30px' }}>
                    <Receipt sx={{ fontSize: 80, mb: 2, color: theme.palette.divider }} />
                    <Typography variant="h5" fontWeight="800" color="text.secondary">Sin actividad de cajas para este periodo.</Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </ChartCard>
        </Grid>
      </Grid>

      {/* DIALOG REPORTES */}
      <Dialog 
        open={openReportsDialog} 
        onClose={() => setOpenReportsDialog(false)} 
        maxWidth="md" 
        fullWidth 
        TransitionComponent={Transition} 
        PaperProps={{ sx: { borderRadius: "32px", overflow: 'hidden' } }}
      >
        <DialogTitle sx={{ px: 4, py: 3, display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>Reporte de Operación</Typography>
          <IconButton onClick={() => setOpenReportsDialog(false)} sx={{ bgcolor: alpha(theme.palette.error.main, 0.1), color: theme.palette.error.main }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <CashRegisterReport reportData={reportData} onPrintReceipt={handlePrintReceipt} isPrinting={isPrinting} />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

