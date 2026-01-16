import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Pagination,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Slide,
  Tabs,
  Tab,
  Stack,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Visibility as ViewIcon,
  Print as PrintIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { formatCurrency, formatDate } from "../utils/formatters";
import { notificationSwal } from "../utils/swal-helpers";
import { cashRegisterAPI, usersAPI, salesAPI } from "../utils/api";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export const CashRegisters = () => {
  const [cashRegisters, setCashRegisters] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchFilters, setSearchFilters] = useState({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Modal Report States
  const [openReportsDialog, setOpenReportsDialog] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [reportType, setReportType] = useState("sales");
  const [isPrinting, setIsPrinting] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    loadCashRegisters();
    loadUsers();
  }, [page, searchFilters]);

  const loadCashRegisters = async () => {
    setIsLoading(true);
    try {
      const response = await cashRegisterAPI.getAll({ page, ...searchFilters });
      setCashRegisters(response.data.data);
      setTotalPages(response.data.last_page);
    } catch (error) {
      console.error("Error loading cash registers:", error);
      notificationSwal(
        "Error",
        "Hubo un error al cargar las cajas registradoras.",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await usersAPI.getAll({ per_page: -1 });
      setUsers(response.data.data);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const handleChangeFilter = (event) => {
    const { name, value } = event.target;
    setSearchFilters((prevFilters) => {
      const newFilters = { ...prevFilters };
      if (value === "") {
        delete newFilters[name];
      } else {
        newFilters[name] = value;
      }
      return newFilters;
    });
    setPage(1);
  };

  const handleOpenReports = async (cashRegisterId) => {
    try {
      const response = await cashRegisterAPI.getReport(cashRegisterId);
      const report = response.data;
      const sales = report.sales || [];
      const totalSales = sales.length;
      const cashSalesAmount = sales
        .filter((s) => s.payment_method === "cash")
        .reduce((sum, s) => sum + parseFloat(s.total_amount), 0);
      
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
        currency: report.currency || 'PEN' // Fallback if currency is missing in some endpoint
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

  const getStatusLabel = (status) => {
    return status === "open" ? "Abierta" : "Cerrada";
  };

  const getStatusColor = (status) => {
    return status === "open" ? "success" : "error";
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Cajas Registradoras
        </Typography>
      </Box>

      <Card>
        <CardContent>
          {/* Filters */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
             <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Estado</InputLabel>
                <Select
                  name="status"
                  value={searchFilters.status || ""}
                  label="Estado"
                  onChange={handleChangeFilter}
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="open">Abierta</MenuItem>
                  <MenuItem value="closed">Cerrada</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Responsable</InputLabel>
                <Select
                  name="opened_by"
                  value={searchFilters.opened_by || ""}
                  label="Responsable"
                  onChange={handleChangeFilter}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.full_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Fecha Apertura"
                type="date"
                name="opened_at"
                value={searchFilters.opened_at || ""}
                onChange={handleChangeFilter}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Fecha Cierre"
                type="date"
                name="closed_at"
                value={searchFilters.closed_at || ""}
                onChange={handleChangeFilter}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>

          {/* Table */}
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Apertura</TableCell>
                  <TableCell>Cierre</TableCell>
                  <TableCell>Monto Inicial</TableCell>
                  <TableCell>Monto Final</TableCell>
                  <TableCell>Responsable</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : (
                  cashRegisters.map((cr) => (
                    <TableRow key={cr.id}>
                      <TableCell>{cr.id}</TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(cr.status)}
                          color={getStatusColor(cr.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{formatDate(cr.opened_at)}</TableCell>
                      <TableCell>{cr.closed_at ? formatDate(cr.closed_at) : "-"}</TableCell>
                      <TableCell>{formatCurrency(cr.initial_amount, cr.currency)}</TableCell>
                      <TableCell>{cr.final_amount ? formatCurrency(cr.final_amount, cr.currency) : "-"}</TableCell>
                      <TableCell>{cr.opened_by?.full_name || "-"}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenReports(cr.id)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {!isLoading && cashRegisters.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={8} align="center">No hay registros encontrados.</TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(event, value) => setPage(value)}
              color="primary"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Reports Modal */}
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
              Reportes de Caja
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
                      {formatCurrency(reportData.initial_amount, reportData.currency)}
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
                      {formatCurrency(reportData.total_in_cash, reportData.currency)}
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
                      {formatCurrency(reportData.expected_amount, reportData.currency)}
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
                <Tab label="Ventas del Turno" value="sales" />
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
                              sale.status === "completed"
                                ? "Pagado"
                                : "Por cobrar"
                            }`}
                          />
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            {formatCurrency(sale.total_amount, reportData.currency)}
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
                      No hay ventas registradas en este turno
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
                      No se han vendido productos en este turno.
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
