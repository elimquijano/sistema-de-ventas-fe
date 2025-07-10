import React, { useState, useEffect, useRef } from "react";
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
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Pagination,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  GetApp as ExportIcon,
  Print as PrintIcon, // Cambiado de ReceiptIcon a PrintIcon para claridad
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { formatCurrency, formatDate } from "../utils/formatters";
import { confirmSwal, notificationSwal } from "../utils/swal-helpers";
import { salesAPI } from "../utils/api";
import { exportToExcel } from "../utils/excelExport";

export const Sales = () => {
  const { hasPermission } = useAuth();
  const [sales, setSales] = useState([]);
  const [searchFilters, setSearchFilters] = useState({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    loadSales();
  }, [page, searchFilters]);

  const loadSales = async () => {
    try {
      const response = await salesAPI.getAll({ page, ...searchFilters });
      setSales(response.data.data);
      setTotalPages(response.data.last_page);
    } catch (error) {
      console.error("Error loading sales:", error);
      notificationSwal("Error", "Hubo un error al cargar las ventas.", "error");
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

  const handleViewSale = (sale) => {
    setSelectedSale(sale);
    setOpenViewDialog(true);
  };

  const handleDeleteSale = async (saleId) => {
    const userConfirmed = await confirmSwal(
      "¿Estás seguro?",
      "Esta acción eliminará la venta permanentemente.",
      { confirmButtonText: "Sí, eliminar", icon: "warning" }
    );

    if (userConfirmed) {
      try {
        await salesAPI.delete(saleId);
        notificationSwal(
          "Venta Eliminada",
          "La venta ha sido eliminada exitosamente.",
          "success"
        );
        loadSales();
      } catch (error) {
        console.error("Error deleting sale:", error);
        notificationSwal("Error", "Error al eliminar la venta.", "error");
      }
    }
  };

  const handlePrintReceipt = async (saleId) => {
    setIsPrinting(true);
    try {
      const response = await salesAPI.getSaleReceipt(saleId);
      const file = new Blob([response.data], { type: 'application/pdf' });
      const fileURL = URL.createObjectURL(file);
      window.open(fileURL, '_blank');
    } catch (error) {
      console.error("Error printing receipt:", error);
      notificationSwal("Error", "No se pudo generar el recibo.", "error");
    } finally {
      setIsPrinting(false);
    }
  };

  const getPaymentMethodLabel = (method) => {
    const methods = {
      cash: "Efectivo",
      card: "Tarjeta",
      transfer: "Transferencia",
      credit: "Crédito",
    };
    return methods[method] || method;
  };

  const getPaymentStatusColor = (status) => {
    const colors = { paid: "success", pending: "warning", overdue: "error" };
    return colors[status] || "default";
  };

  const getPaymentStatusLabel = (status) => {
    const statuses = { paid: "Pagado", pending: "Pendiente", overdue: "Vencido" };
    return statuses[status] || status;
  };

  const handleExportToExcel = () => {
    const dataToExport = sales.map((sale) => ({
      "Número de Venta": sale.sale_number,
      Cliente: sale.customer_name,
      Total: sale.total_amount,
      "Método de Pago": getPaymentMethodLabel(sale.payment_method),
      "Estado de Pago": getPaymentStatusLabel(sale.payment_status),
      Fecha: formatDate(sale.created_at),
      Vendedor: sale.creator.full_name,
    }));
    exportToExcel(dataToExport, "ventas_reporte", "Ventas");
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Ventas
        </Typography>
        <Button
          variant="contained"
          startIcon={<ExportIcon />}
          onClick={handleExportToExcel}
          sx={{
            background: "linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)",
          }}
        >
          Exportar Excel
        </Button>
      </Box>

      <Card>
        <CardContent>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Buscar por número de venta o cliente..."
                name="search"
                value={searchFilters.search || ""}
                onChange={handleChangeFilter}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Método de Pago</InputLabel>
                <Select
                  name="payment_method"
                  value={searchFilters.payment_method || ""}
                  label="Método de Pago"
                  onChange={handleChangeFilter}
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="cash">Efectivo</MenuItem>
                  <MenuItem value="card">Tarjeta</MenuItem>
                  <MenuItem value="transfer">Transferencia</MenuItem>
                  <MenuItem value="credit">Crédito</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Estado de Pago</InputLabel>
                <Select
                  name="payment_status"
                  value={searchFilters.payment_status || ""}
                  label="Estado de Pago"
                  onChange={handleChangeFilter}
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="paid">Pagado</MenuItem>
                  <MenuItem value="pending">Pendiente</MenuItem>
                  <MenuItem value="overdue">Vencido</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="Fecha"
                type="date"
                name="date"
                value={searchFilters.date || ""}
                onChange={handleChangeFilter}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Número</TableCell>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Método de Pago</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Vendedor</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {sale.sale_number}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {sale.customer_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatCurrency(sale.total_amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getPaymentMethodLabel(sale.payment_method)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getPaymentStatusLabel(sale.payment_status)}
                        size="small"
                        color={getPaymentStatusColor(sale.payment_status)}
                      />
                    </TableCell>
                    <TableCell>{formatDate(sale.created_at)}</TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {sale.creator.full_name}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleViewSale(sale)}><ViewIcon /></IconButton>
                      {hasPermission("ventas.edit") && (
                        <IconButton size="small">
                          <EditIcon />
                        </IconButton>
                      )}
                      {hasPermission("ventas.delete") && (
                        <IconButton size="small" onClick={() => handleDeleteSale(sale.id)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
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

      {/* Dialog para ver detalles de venta */}
      <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6">Detalles de Venta - {selectedSale?.sale_number}</Typography>
            <IconButton onClick={() => handlePrintReceipt(selectedSale.id)} disabled={isPrinting}>
              <PrintIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedSale && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Cliente</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedSale.customer_name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Fecha</Typography>
                  <Typography variant="body1">{formatDate(selectedSale.created_at)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Método de Pago</Typography>
                  <Chip label={getPaymentMethodLabel(selectedSale.payment_method)} size="small" variant="outlined" />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Estado</Typography>
                  <Chip label={getPaymentStatusLabel(selectedSale.payment_status)} size="small" color={getPaymentStatusColor(selectedSale.payment_status)} />
                </Grid>
              </Grid>

              <Typography variant="h6" sx={{ mb: 2 }}>Productos y Servicios</Typography>
              <List dense>
                {selectedSale.items.map((item, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemText primary={item.item_name} secondary={`${item.quantity} x ${formatCurrency(item.unit_price)}`} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatCurrency(item.total_price)}</Typography>
                  </ListItem>
                ))}
              </List>

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2, pt: 2, borderTop: 1, borderColor: "divider" }}>
                <Typography variant="h6">Total:</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: "primary.main" }}>{formatCurrency(selectedSale.total_amount)}</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewDialog(false)}>Cerrar</Button>
          <Button variant="contained" startIcon={<PrintIcon />} onClick={() => handlePrintReceipt(selectedSale.id)} disabled={isPrinting}>
            {isPrinting ? "Generando..." : "Imprimir Recibo"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};