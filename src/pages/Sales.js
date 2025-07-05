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
  CircularProgress,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Receipt as ReceiptIcon,
  GetApp as ExportIcon,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { formatCurrency, formatDate } from "../utils/formatters";
import { confirmSwal, notificationSwal } from "../utils/swal-helpers";

export const Sales = () => {
  const { hasPermission } = useAuth();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchFilters, setSearchFilters] = useState({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);

  useEffect(() => {
    loadSales();
  }, [page, searchFilters]);

  const loadSales = async () => {
    try {
      setLoading(true);
      // Simulación de datos
      const mockSales = [
        {
          id: 1,
          sale_number: "V-001",
          customer_name: "Cliente General",
          total_amount: 25.50,
          payment_method: "cash",
          payment_status: "paid",
          sale_date: "2024-01-15T14:30:00Z",
          items: [
            { name: "Coca Cola", quantity: 2, price: 2.50, total: 5.00 },
            { name: "Pan Integral", quantity: 1, price: 3.00, total: 3.00 },
            { name: "Corte de Cabello", quantity: 1, price: 15.00, total: 15.00 },
          ],
          created_by: "Juan Vendedor",
        },
        {
          id: 2,
          sale_number: "V-002",
          customer_name: "María García",
          total_amount: 45.75,
          payment_method: "card",
          payment_status: "paid",
          sale_date: "2024-01-15T15:45:00Z",
          items: [
            { name: "Detergente", quantity: 2, price: 8.50, total: 17.00 },
            { name: "Leche", quantity: 3, price: 4.20, total: 12.60 },
            { name: "Manicure", quantity: 1, price: 25.00, total: 25.00 },
          ],
          created_by: "Ana Vendedora",
        },
        {
          id: 3,
          sale_number: "V-003",
          customer_name: "Pedro López",
          total_amount: 12.80,
          payment_method: "credit",
          payment_status: "pending",
          sale_date: "2024-01-15T16:20:00Z",
          items: [
            { name: "Galletas", quantity: 4, price: 1.80, total: 7.20 },
            { name: "Agua", quantity: 5, price: 1.00, total: 5.00 },
          ],
          created_by: "Juan Vendedor",
        },
      ];
      setSales(mockSales);
      setTotalPages(1);
    } catch (error) {
      console.error("Error loading sales:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeFilter = (event) => {
    const { name, value } = event.target;
    setSearchFilters((prevFilters) => {
      if (value === "") {
        const { [name]: _, ...newFilters } = prevFilters;
        return newFilters;
      }
      return { ...prevFilters, [name]: value };
    });
  };

  const handleViewSale = (sale) => {
    setSelectedSale(sale);
    setOpenViewDialog(true);
  };

  const handleDeleteSale = async (saleId) => {
    const userConfirmed = await confirmSwal(
      "¿Estás seguro?",
      "Esta acción eliminará la venta permanentemente.",
      {
        confirmButtonText: "Sí, eliminar",
        icon: "warning",
      }
    );

    if (userConfirmed) {
      try {
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

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case "paid":
        return "success";
      case "pending":
        return "warning";
      case "overdue":
        return "error";
      default:
        return "default";
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

  const getPaymentStatusLabel = (status) => {
    const statuses = {
      paid: "Pagado",
      pending: "Pendiente",
      overdue: "Vencido",
    };
    return statuses[status] || status;
  };

  const exportToExcel = () => {
    notificationSwal(
      "Exportando...",
      "El reporte se está generando y se descargará automáticamente.",
      "info"
    );
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
          onClick={exportToExcel}
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
                InputLabelProps={{
                  shrink: true,
                }}
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
                    <TableCell>{formatDate(sale.sale_date)}</TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {sale.created_by}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleViewSale(sale)}
                      >
                        <ViewIcon />
                      </IconButton>
                      {hasPermission("sales.edit") && (
                        <IconButton size="small">
                          <EditIcon />
                        </IconButton>
                      )}
                      {hasPermission("sales.delete") && (
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteSale(sale.id)}
                          color="error"
                        >
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
      <Dialog
        open={openViewDialog}
        onClose={() => setOpenViewDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6">
              Detalles de Venta - {selectedSale?.sale_number}
            </Typography>
            <IconButton>
              <ReceiptIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedSale && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Cliente
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {selectedSale.customer_name}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Fecha
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(selectedSale.sale_date)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Método de Pago
                  </Typography>
                  <Chip
                    label={getPaymentMethodLabel(selectedSale.payment_method)}
                    size="small"
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Estado
                  </Typography>
                  <Chip
                    label={getPaymentStatusLabel(selectedSale.payment_status)}
                    size="small"
                    color={getPaymentStatusColor(selectedSale.payment_status)}
                  />
                </Grid>
              </Grid>

              <Typography variant="h6" sx={{ mb: 2 }}>
                Productos y Servicios
              </Typography>
              <List>
                {selectedSale.items.map((item, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemText
                      primary={item.name}
                      secondary={`${item.quantity} x ${formatCurrency(item.price)}`}
                    />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatCurrency(item.total)}
                    </Typography>
                  </ListItem>
                ))}
              </List>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mt: 2,
                  pt: 2,
                  borderTop: 1,
                  borderColor: "divider",
                }}
              >
                <Typography variant="h6">Total:</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: "primary.main" }}>
                  {formatCurrency(selectedSale.total_amount)}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewDialog(false)}>Cerrar</Button>
          <Button variant="contained" startIcon={<ReceiptIcon />}>
            Imprimir Recibo
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};