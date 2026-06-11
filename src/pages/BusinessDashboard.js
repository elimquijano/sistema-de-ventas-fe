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
import { businessAPI, cashRegisterAPI, salesAPI } from "../utils/api";
import { notificationSwal, confirmSwal } from "../utils/swal-helpers";
import { useAuth } from "../contexts/AuthContext";
import { CashRegisterReport } from "../components/CashRegisterReport";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

// TOOLTIP INTELIGENTE: Se adapta al Tema Claro/Oscuro
const SmartTooltip = ({ active, payload, label, currency }) => {
  const theme = useTheme();
  if (active && payload && payload.length) {
    return (
      <Paper
        sx={{
          p: 2,
          bgcolor: theme.palette.background.paper,
          backgroundImage: "none",
          border: "1px solid",
          borderColor: theme.palette.divider,
          borderRadius: "16px",
          boxShadow: theme.shadows[10],
        }}
      >
        {label && <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>{label}</Typography>}
        {payload.map((item, index) => (
          <Stack key={index} direction="row" spacing={3} justifyContent="space-between" alignItems="center" sx={{ color: item.fill || item.color }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: item.fill || item.color }} />
              <Typography variant="caption" sx={{ fontWeight: 700 }}>{item.name}:</Typography>
            </Stack>
            <Typography variant="caption" sx={{ fontWeight: 800 }}>
              {typeof item.value === 'number' ? formatCurrency(item.value, currency) : item.value}
            </Typography>
          </Stack>
        ))}
      </Paper>
    );
  }
  return null;
};

// TARJETA DE KPI: Simetría y Limpieza
const KpiCard = ({ title, value, detail, icon, color, trend, trendValue }) => {
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
      }}
    >
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
        
        <Stack direction="row" alignItems="center" spacing={1}>
          {trendValue !== undefined && (
            <Stack direction="row" alignItems="center" sx={{ color: trend === 'up' ? theme.palette.success.main : theme.palette.error.main, bgcolor: alpha(trend === 'up' ? theme.palette.success.main : theme.palette.error.main, 0.1), px: 1, py: 0.2, borderRadius: "8px" }}>
              {trend === 'up' ? <TrendingUp fontSize="inherit" /> : <TrendingDown fontSize="inherit" />}
              <Typography variant="caption" sx={{ fontWeight: 800, ml: 0.3 }}>{trendValue}%</Typography>
            </Stack>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{detail}</Typography>
        </Stack>
      </CardContent>
    </Card>
  );
};

// CONTENEDOR DE GRÁFICO
const ChartCard = ({ title, icon, children, color, sx = {} }) => {
  const theme = useTheme();
  return (
    <Card sx={{ borderRadius: "24px", height: "100%", border: "1px solid", borderColor: theme.palette.divider, boxShadow: "0 4px 20px rgba(0,0,0,0.02)", ...sx }}>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
          <Avatar sx={{ bgcolor: alpha(color, 0.1), color: color, width: 36, height: 36 }}>{icon}</Avatar>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>{title}</Typography>
        </Stack>
        <Box sx={{ height: 300, width: "100%" }}>{children}</Box>
      </CardContent>
    </Card>
  );
};

export const BusinessDashboard = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const [business, setBusiness] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("week");
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
      const response = await businessAPI.getStats(user.business_id, selectedPeriod);
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
    loadDashboardData(period);
  }, [period]);

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
  
  const barProducts = top_products.slice(0, 5).map(p => ({ name: p.name, revenue: safeNum(p.revenue) }));
  const barClients = charts.top_clients.slice(0, 5).map(c => ({ name: c.name, value: safeNum(c.value) }));

  return (
    <Box sx={{ pb: 6 }}>
      {/* HEADER */}
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: -1.5 }}>Panel Ejecutivo</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>{business?.name} • Inteligencia Operativa</Typography>
        </Box>
        <Paper elevation={0} sx={{ p: 0.5, borderRadius: "16px", bgcolor: alpha(theme.palette.divider, 0.05), border: "1px solid", borderColor: theme.palette.divider }}>
          <ToggleButtonGroup value={period} exclusive onChange={(e, v) => v && setPeriod(v)} size="medium">
            <ToggleButton value="day" sx={{ borderRadius: "12px", px: 3, border: "none" }}>Hoy</ToggleButton>
            <ToggleButton value="week" sx={{ borderRadius: "12px", px: 3, border: "none" }}>Semana</ToggleButton>
            <ToggleButton value="month" sx={{ borderRadius: "12px", px: 3, border: "none" }}>Mes</ToggleButton>
            <ToggleButton value="year" sx={{ borderRadius: "12px", px: 3, border: "none" }}>Año</ToggleButton>
          </ToggleButtonGroup>
        </Paper>
      </Stack>

      {/* KPI GRID - REESTRUCTURADO Y SIMÉTRICO */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Ganancia Neta"
            value={formatCurrency(financials.net_profit, currency)}
            detail={`Prom: ${formatCurrency(financials.avg_profit_per_register, currency)}`}
            icon={<AccountBalanceWallet />}
            color={theme.palette.success.main}
            trend={financials.growth_comparison?.trend}
            trendValue={financials.growth_comparison?.growth_percentage}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Ventas Totales"
            value={formatCurrency(financials.total_sales, currency)}
            detail={`${stats.period_asset_loans} préstamos realizados`}
            icon={<ShoppingCart />}
            color={theme.palette.primary.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Gastos Totales"
            value={formatCurrency(financials.total_expenses, currency)}
            detail={`${charts.expenses_by_category.length} categorías registradas`}
            icon={<TrendingDown />}
            color={theme.palette.error.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Bienes Fuera"
            value={stats.active_asset_loans}
            detail={`${stats.period_asset_loans} nuevos en el periodo`}
            icon={<Store />}
            color={theme.palette.warning.main}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* GRÁFICO PRINCIPAL: RENDIMIENTO FINANCIERO */}
        <Grid item xs={12} lg={8}>
          <ChartCard title="Flujo de Caja: Ventas vs Gastos" icon={<Timeline />} color={theme.palette.primary.main}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={histogramData}>
                <defs>
                  <linearGradient id="gradSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrency(v, currency, true)} tick={{ fontSize: 12 }} />
                <Tooltip content={<SmartTooltip currency={currency} />} />
                <Area type="monotone" dataKey="Ventas" stroke={theme.palette.primary.main} strokeWidth={4} fill="url(#gradSales)" />
                <Area type="monotone" dataKey="Gastos" stroke={theme.palette.error.main} strokeWidth={2} strokeDasharray="5 5" fill="none" />
                <Legend verticalAlign="top" align="right" iconType="circle" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        {/* ALERTAS CRÍTICAS */}
        <Grid item xs={12} lg={4}>
          <ChartCard title="Alertas de Control" icon={<Warning />} color={theme.palette.error.main}>
            <Stack spacing={2}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: "16px", borderStyle: "dashed", borderColor: theme.palette.error.main, bgcolor: alpha(theme.palette.error.main, 0.02) }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ bgcolor: theme.palette.error.main }}><Inventory fontSize="small" /></Avatar>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 900 }}>{stats.products_low_stock}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>STOCK CRÍTICO</Typography>
                  </Box>
                </Stack>
              </Paper>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: "16px", borderStyle: "dashed", borderColor: theme.palette.warning.main, bgcolor: alpha(theme.palette.warning.main, 0.02) }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ bgcolor: theme.palette.warning.main }}><Schedule fontSize="small" /></Avatar>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 900 }}>{stats.pending_credits}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>CRÉDITOS PENDIENTES</Typography>
                  </Box>
                </Stack>
              </Paper>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: "16px", borderStyle: "dashed", borderColor: theme.palette.info.main, bgcolor: alpha(theme.palette.info.main, 0.02) }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ bgcolor: theme.palette.info.main }}><Store fontSize="small" /></Avatar>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 900 }}>{stats.active_asset_loans}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>BIENES PRESTADOS</Typography>
                  </Box>
                </Stack>
              </Paper>
            </Stack>
          </ChartCard>
        </Grid>

        {/* FILA DE GRÁFICOS CIRCULARES (PIE CHARTS) */}
        <Grid item xs={12} md={4}>
          <ChartCard title="Formas de Pago" icon={<PointOfSale />} color={theme.palette.secondary.main}>
            {piePayment.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={piePayment} dataKey="value" nameKey="name" innerRadius={60} outerRadius={85} paddingAngle={5} stroke="none">
                    {piePayment.map((_, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} />)}
                  </Pie>
                  <Tooltip content={<SmartTooltip currency={currency} />} />
                  <Legend verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            ) : <Stack justifyContent="center" alignItems="center" height="100%"><Typography variant="caption" color="text.secondary">Sin movimientos</Typography></Stack>}
          </ChartCard>
        </Grid>

        <Grid item xs={12} md={4}>
          <ChartCard title="Rendimiento Equipo" icon={<Person />} color={theme.palette.primary.light}>
            {pieUser.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieUser} dataKey="value" nameKey="name" outerRadius={85} paddingAngle={2} stroke={theme.palette.background.paper} strokeWidth={2}>
                    {pieUser.map((_, i) => <Cell key={i} fill={chartColors[(i+2) % chartColors.length]} />)}
                  </Pie>
                  <Tooltip content={<SmartTooltip currency={currency} />} />
                  <Legend verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            ) : <Stack justifyContent="center" alignItems="center" height="100%"><Typography variant="caption" color="text.secondary">Sin datos</Typography></Stack>}
          </ChartCard>
        </Grid>

        <Grid item xs={12} md={4}>
          <ChartCard title="Gastos por Categoría" icon={<Category />} color={theme.palette.error.main}>
            {pieCat.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieCat} dataKey="value" nameKey="name" innerRadius={60} outerRadius={85} paddingAngle={5} stroke="none">
                    {pieCat.map((_, i) => <Cell key={i} fill={chartColors[(i+4) % chartColors.length]} />)}
                  </Pie>
                  <Tooltip content={<SmartTooltip currency={currency} />} />
                  <Legend verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            ) : <Stack justifyContent="center" alignItems="center" height="100%"><Typography variant="caption" color="text.secondary">Sin gastos registrados</Typography></Stack>}
          </ChartCard>
        </Grid>

        {/* PRODUCTOS Y CLIENTES ESTRELLA */}
        <Grid item xs={12} md={6}>
          <ChartCard title="Productos Estrella" icon={<Inventory />} color={theme.palette.warning.main}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barProducts} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={120} tick={{ fontSize: 11 }} />
                <Tooltip content={<SmartTooltip currency={currency} />} cursor={{ fill: alpha(theme.palette.divider, 0.2) }} />
                <Bar dataKey="revenue" name="Ventas" radius={[0, 10, 10, 0]} barSize={20}>
                  {barProducts.map((_, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <ChartCard title="Mejores Clientes" icon={<Group />} color={theme.palette.info.main}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barClients} margin={{ top: 10, right: 10, bottom: 20 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis hide />
                <Tooltip content={<SmartTooltip currency={currency} />} />
                <Bar dataKey="value" name="Total Compras" radius={[10, 10, 0, 0]} barSize={40}>
                  {barClients.map((_, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        {/* CAJAS RECIENTES (24H) */}
        <Grid item xs={12}>
          <ChartCard title="Estado de Cajas (Últimas 24h)" icon={<Receipt />} color={theme.palette.primary.main}>
            <Grid container spacing={3}>
              {cash_registers_today.length > 0 ? cash_registers_today.slice(0, 6).map((reg) => (
                <Grid item xs={12} sm={6} md={4} key={reg.id}>
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 2.5, 
                      borderRadius: "20px", 
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      border: reg.status === 'open' ? `2px solid ${theme.palette.success.main}` : `1px solid ${theme.palette.divider}`,
                      bgcolor: reg.status === 'open' ? alpha(theme.palette.success.main, 0.02) : 'transparent',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: theme.shadows[4]
                      }
                    }}
                  >
                    <Box>
                      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                        <Avatar 
                          sx={{ 
                            bgcolor: reg.status === 'open' ? theme.palette.success.main : theme.palette.primary.main, 
                            width: 44, 
                            height: 44, 
                            fontSize: 16,
                            fontWeight: 800,
                            boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                          }}
                        >
                          {reg.opened_by.initials}
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                            {reg.opened_by.full_name}
                          </Typography>
                          <Chip 
                            label={reg.status === 'open' ? 'EN LÍNEA' : 'CERRADA'} 
                            size="small" 
                            color={reg.status === 'open' ? 'success' : 'default'} 
                            sx={{ height: 18, fontSize: 9, fontWeight: 900, mt: 0.5 }}
                          />
                        </Box>
                      </Stack>

                      <Grid container spacing={1} sx={{ mb: 2 }}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary" display="block">APERTURA</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatDate(reg.opened_at, "HH:mm")}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary" display="block">ESPERADO</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatCurrency(reg.expected_amount, currency)}</Typography>
                        </Grid>
                      </Grid>
                    </Box>

                    <Box>
                      <Divider sx={{ mb: 2, borderStyle: 'dashed' }} />
                      
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="caption" color="success.main" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>GANANCIA</Typography>
                          <Typography variant="h6" color="success.main" sx={{ fontWeight: 900 }}>
                            {formatCurrency(reg.profit, currency)}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1}>
                          <MuiTooltip title="Ver Reporte">
                            <IconButton 
                              size="small" 
                              onClick={() => handleOpenReports(reg.id)}
                              sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }}
                            >
                              <Assessment fontSize="small" />
                            </IconButton>
                          </MuiTooltip>
                          {reg.status === 'open' && (user.role === 'admin' || reg.opened_by.id === user.id) && (
                            <MuiTooltip title="Cerrar Caja">
                              <IconButton 
                                size="small" 
                                color="error" 
                                onClick={() => handleCloseCashRegister(reg)}
                                sx={{ bgcolor: alpha(theme.palette.error.main, 0.1) }}
                              >
                                <CloseIcon fontSize="small" />
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
                  <Box sx={{ py: 6, textAlign: 'center', opacity: 0.5 }}>
                    <Receipt sx={{ fontSize: 48, mb: 1 }} />
                    <Typography variant="body1" fontWeight="600">No hay actividad de cajas registrada.</Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </ChartCard>
        </Grid>
      </Grid>

      {/* DIALOG REPORTES */}
      <Dialog open={openReportsDialog} onClose={() => setOpenReportsDialog(false)} maxWidth="md" fullWidth TransitionComponent={Transition} PaperProps={{ sx: { borderRadius: "24px" } }}>
        <DialogTitle sx={{ px: 3, py: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Reporte Detallado</Typography>
          <IconButton onClick={() => setOpenReportsDialog(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <CashRegisterReport reportData={reportData} onPrintReceipt={handlePrintReceipt} isPrinting={isPrinting} />
        </DialogContent>
      </Dialog>
    </Box>
  );
};
