import React, { useState, useMemo } from "react";
import {
  Box,
  Grid,
  Typography,
  Paper,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Chip,
  Stack,
  alpha,
  useTheme,
  useMediaQuery,
  Divider,
  Avatar,
  Button,
} from "@mui/material";
import {
  Print as PrintIcon,
  ShoppingCart as ShoppingCartIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as ProfitIcon,
  History as HistoryIcon,
  Inventory as InventoryIcon,
  Payments as PaymentsIcon,
  FileDownload as FileDownloadIcon,
} from "@mui/icons-material";
import { formatCurrency } from "../utils/formatters";

const ReportCard = ({ title, value, icon, color, currency = "PEN" }) => (
  <Paper
    elevation={0}
    sx={{
      p: 2,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      bgcolor: alpha(color, 0.1),
      border: '1px solid',
      borderColor: alpha(color, 0.2),
      borderRadius: 2,
      transition: 'transform 0.2s',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: `0 4px 20px 0 ${alpha(color, 0.15)}`,
      }
    }}
  >
    <Avatar sx={{ bgcolor: color, mb: 1, width: 40, height: 40 }}>
      {icon}
    </Avatar>
    <Typography variant="h5" sx={{ fontWeight: 800, color: color }}>
      {typeof value === 'number' ? formatCurrency(value, currency) : value}
    </Typography>
    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textAlign: 'center', textTransform: 'uppercase' }}>
      {title}
    </Typography>
  </Paper>
);

export const CashRegisterReport = ({ reportData, onPrintReceipt, onExport, isPrinting }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [reportTab, setReportTab] = useState("sales");

  const currency = reportData?.currency || "PEN";

  // Re-calculate or use from breakdown if available
  const metrics = useMemo(() => {
    if (!reportData) return [];
    
    // Usamos el breakdown si existe, sino valores directos
    const initial = parseFloat(reportData.breakdown?.initial_amount ?? reportData.initial_amount ?? 0);
    const manual = parseFloat(reportData.breakdown?.manual_inflow ?? reportData.manual_inflow ?? 0);
    const collections = parseFloat(reportData.breakdown?.credit_debt_collections ?? reportData.credit_collections ?? 0);
    const directCashSales = parseFloat(reportData.breakdown?.direct_cash_sales ?? reportData.cash_sales_amount ?? 0);
    const totalPhysical = parseFloat(reportData.breakdown?.total_physical_cash ?? reportData.report_cash_to_deliver ?? reportData.total_in_cash ?? 0);

    return [
      { title: "Cant. Ventas", value: reportData.sales?.length || 0, icon: <ShoppingCartIcon />, color: theme.palette.primary.main, isCurrency: false },
      { title: "Dinero Inicial", value: initial, icon: <MoneyIcon />, color: theme.palette.info.main, isCurrency: true },
      { title: "Ingresos Manuales", value: manual, icon: <MoneyIcon />, color: theme.palette.warning.main, isCurrency: true },
      { title: "Cobros Créditos", value: collections, icon: <HistoryIcon />, color: theme.palette.secondary.main, isCurrency: true },
      { title: "Ventas en Efectivo", value: directCashSales, icon: <PaymentsIcon />, color: "#4caf50", isCurrency: true },
      { title: "Total en Efectivo", value: totalPhysical, icon: <PaymentsIcon />, color: theme.palette.success.main, isCurrency: true },
      { title: "Total en Ventas", value: parseFloat(reportData.report_total_sales || 0), icon: <ShoppingCartIcon />, color: "#ff5722", isCurrency: true },
      { title: "Total General", value: parseFloat(reportData.expected_amount || 0), icon: <MoneyIcon />, color: theme.palette.error.main, isCurrency: true },
    ];
  }, [reportData, theme]);

  const productSummary = useMemo(() => {
    if (!reportData?.sales) return [];
    const summary = reportData.sales
      .flatMap((s) => s.items || [])
      .reduce((acc, item) => {
        const name = item.item_name;
        if (acc[name]) {
          acc[name].quantity += item.quantity;
          acc[name].total += parseFloat(item.total_price);
        } else {
          acc[name] = { 
            name, 
            quantity: item.quantity, 
            total: parseFloat(item.total_price),
            type: item.item_type?.includes("Product") ? "Producto" : "Servicio"
          };
        }
        return acc;
      }, {});
    return Object.values(summary).sort((a, b) => b.quantity - a.quantity);
  }, [reportData]);

  const getPaymentColor = (method) => {
    const colors = {
      cash: theme.palette.success.main,
      yape: "#804199",
      plin: "#00b4cc",
      card: theme.palette.info.main,
      transfer: theme.palette.primary.main,
      credit: theme.palette.error.main,
      discount: theme.palette.warning.main,
      vale: "#ff4081",
    };
    return colors[method] || theme.palette.grey[500];
  };

  const getPaymentLabel = (method) => {
    const labels = {
      cash: "EFECTIVO",
      yape: "YAPE",
      plin: "PLIN",
      card: "TARJETA",
      transfer: "TRANSF.",
      credit: "CRÉDITO",
      discount: "DCTO.",
      vale: "VALE",
    };
    return labels[method] || method.toUpperCase();
  };

  if (!reportData) return null;

  return (
    <Box>
      {onExport && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
          <Button
            variant="contained"
            color="success"
            startIcon={<FileDownloadIcon />}
            onClick={onExport}
            disabled={!reportData.sales?.length}
          >
            Exportar reporte Excel
          </Button>
        </Box>
      )}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {metrics.map((m, idx) => (
          <Grid item xs={6} sm={4} md={3} key={idx}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                bgcolor: alpha(m.color, 0.08),
                border: '1px solid',
                borderColor: alpha(m.color, 0.2),
                borderRadius: 3,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 8px 24px 0 ${alpha(m.color, 0.2)}`,
                  borderColor: m.color,
                }
              }}
            >
              <Avatar sx={{ bgcolor: m.color, mb: 1.5, width: 45, height: 45, boxShadow: `0 4px 12px 0 ${alpha(m.color, 0.4)}` }}>
                {m.icon}
              </Avatar>
              <Typography variant="h5" sx={{ fontWeight: 800, color: m.color, lineHeight: 1.2 }}>
                {m.isCurrency ? formatCurrency(m.value, currency) : m.value}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1, mt: 0.5 }}>
                {m.title}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper elevation={0} variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
        <Tabs
          value={reportTab}
          onChange={(e, v) => setReportTab(v)}
          variant="fullWidth"
          sx={{ 
            bgcolor: alpha(theme.palette.primary.main, 0.03),
            borderBottom: '1px solid',
            borderColor: 'divider',
            '& .MuiTab-root': { py: 2, fontSize: '0.9rem', transition: 'all 0.2s' },
            '& .Mui-selected': { color: theme.palette.primary.main, fontWeight: 800 },
          }}
        >
          <Tab 
            icon={<ShoppingCartIcon sx={{ fontSize: 22 }} />} 
            iconPosition="start" 
            label="Detalle de Ventas" 
            value="sales" 
          />
          <Tab 
            icon={<InventoryIcon sx={{ fontSize: 22 }} />} 
            iconPosition="start" 
            label="Movimiento de Productos" 
            value="products" 
          />
        </Tabs>

        <Box sx={{ p: isMobile ? 1.5 : 3 }}>
          {reportTab === "sales" && (
            <Stack spacing={2.5}>
              {reportData.sales?.length > 0 ? (
                reportData.sales.map((sale) => (
                  <Paper
                    key={sale.id}
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      transition: 'all 0.2s',
                      position: 'relative',
                      overflow: 'hidden',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 4,
                        bgcolor: theme.palette.primary.main,
                      },
                      '&:hover': { 
                        bgcolor: alpha(theme.palette.primary.main, 0.02),
                        borderColor: alpha(theme.palette.primary.main, 0.3),
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                      }
                    }}
                  >
                    <Grid container spacing={2} alignItems="flex-start">
                      <Grid item xs={12} sm={4}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 900, color: 'primary.dark' }}>
                            {sale.sale_number}
                          </Typography>
                          <Chip 
                            label={new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            size="small"
                            sx={{ fontWeight: 700, height: 20, fontSize: '0.65rem', bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}
                          />
                        </Stack>
                        <Typography variant="body1" sx={{ fontWeight: 700, mb: 0.5, textTransform: 'uppercase', color: 'text.primary' }}>
                          {sale.customer_name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <ShoppingCartIcon sx={{ fontSize: 14 }} /> {sale.items?.length || 0} ARTÍCULOS
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={12} sm={5}>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.disabled', display: 'block', mb: 1, letterSpacing: 1 }}>
                          MÉTODOS DE PAGO
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {sale.payments?.map((p, idx) => (
                            <Chip
                              key={idx}
                              label={`${getPaymentLabel(p.payment_method)}: ${formatCurrency(p.amount, currency)}`}
                              size="small"
                              sx={{ 
                                fontWeight: 800, 
                                fontSize: '0.7rem',
                                bgcolor: alpha(getPaymentColor(p.payment_method), 0.1),
                                color: getPaymentColor(p.payment_method),
                                border: '1px solid',
                                borderColor: alpha(getPaymentColor(p.payment_method), 0.3),
                                borderRadius: 1.5
                              }}
                            />
                          ))}
                        </Box>
                      </Grid>

                      <Grid item xs={8} sm={2} sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
                         <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.disabled', letterSpacing: 1, textAlign: isMobile ? 'left' : 'right' }}>
                          TOTAL
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, textAlign: isMobile ? 'left' : 'right', color: 'primary.main' }}>
                          {formatCurrency(sale.total_amount, currency)}
                        </Typography>
                      </Grid>

                      <Grid item xs={4} sm={1} sx={{ textAlign: 'right' }}>
                        <IconButton
                          size="medium"
                          color="primary"
                          onClick={() => onPrintReceipt(sale.id)}
                          disabled={isPrinting}
                          sx={{ 
                            bgcolor: alpha(theme.palette.primary.main, 0.05),
                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) }
                          }}
                        >
                          <PrintIcon />
                        </IconButton>
                      </Grid>
                    </Grid>
                    
                    {sale.items?.length > 0 && (
                      <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px dashed', borderColor: 'divider', display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {sale.items.map((item, idx) => (
                          <Chip
                            key={idx}
                            label={`${item.quantity}x ${item.item_name}`}
                            variant="outlined"
                            size="small"
                            sx={{ 
                              height: 22, 
                              fontSize: '0.7rem', 
                              fontWeight: 600,
                              borderColor: alpha(theme.palette.divider, 0.8),
                              bgcolor: 'transparent',
                              color: 'text.secondary'
                            }}
                          />
                        ))}
                      </Box>
                    )}
                  </Paper>
                ))
              ) : (
                <Box sx={{ textAlign: "center", py: 8 }}>
                  <Avatar sx={{ m: 'auto', mb: 2, bgcolor: alpha(theme.palette.primary.main, 0.1), width: 60, height: 60 }}>
                    <ShoppingCartIcon sx={{ fontSize: 30, color: theme.palette.primary.main }} />
                  </Avatar>
                  <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 700 }}>
                    No hay ventas registradas
                  </Typography>
                </Box>
              )}
            </Stack>
          )}

          {reportTab === "products" && (
            <List disablePadding>
              {productSummary.length > 0 ? (
                productSummary.map((item, idx) => (
                  <ListItem
                    key={idx}
                    divider={idx < productSummary.length - 1}
                    sx={{ 
                      px: isMobile ? 1 : 2, 
                      py: 2,
                      flexDirection: isMobile ? 'column' : 'row',
                      alignItems: isMobile ? 'flex-start' : 'center',
                      '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mb: isMobile ? 2 : 0 }}>
                      <Avatar sx={{ mr: 2.5, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', width: 48, height: 48 }}>
                        <InventoryIcon />
                      </Avatar>
                      <ListItemText
                        primary={<Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>{item.name}</Typography>}
                        secondary={
                          <Chip 
                            label={item.type} 
                            size="small" 
                            sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800, mt: 0.5 }} 
                          />
                        }
                      />
                    </Box>
                    <Stack 
                      direction="row" 
                      spacing={isMobile ? 0 : 4} 
                      alignItems="center" 
                      sx={{ 
                        width: isMobile ? '100%' : 'auto',
                        justifyContent: isMobile ? 'space-between' : 'flex-end',
                        pl: isMobile ? 0 : 2
                      }}
                    >
                      <Box sx={{ textAlign: isMobile ? 'left' : 'center' }}>
                        <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', fontWeight: 800, letterSpacing: 1 }}>CANT.</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 900 }}>{item.quantity}</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right', minWidth: isMobile ? 'auto' : 100 }}>
                        <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', fontWeight: 800, letterSpacing: 1 }}>TOTAL</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 900, color: 'primary.main' }}>
                          {formatCurrency(item.total, currency)}
                        </Typography>
                      </Box>
                    </Stack>
                  </ListItem>
                ))
              ) : (
                <Box sx={{ textAlign: "center", py: 8 }}>
                  <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 700 }}>
                    No hay movimiento de productos
                  </Typography>
                </Box>
              )}
            </List>
          )}
        </Box>
      </Paper>
    </Box>
  );
};
