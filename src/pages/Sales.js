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
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Stack,
  Divider,
} from "@mui/material";
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  GetApp as ExportIcon,
  Print as PrintIcon,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { formatCurrency, formatDate } from "../utils/formatters";
import { confirmSwal, notificationSwal } from "../utils/swal-helpers";
import { salesAPI, usersAPI } from "../utils/api";
import { exportToExcel } from "../utils/excelExport";

const PAYMENT_METHOD_LABELS = {
  cash: "Efectivo",
  yape: "Yape",
  plin: "Plin",
  card: "Tarjeta",
  transfer: "Transferencia",
  credit: "Crédito",
  discount: "Descuento",
};

const getPaymentMethodLabel = (method) =>
  PAYMENT_METHOD_LABELS[method] || method;

const PAYMENT_METHOD_COLORS = {
  cash: "success",
  yape: "primary",
  plin: "secondary",
  card: "warning",
  transfer: "info",
  credit: "error",
  discount: "default",
};

const getPaymentMethodColor = (method) =>
  PAYMENT_METHOD_COLORS[method] || "default";

export const Sales = () => {
  const { hasPermission } = useAuth();
  const [sales, setSales] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchFilters, setSearchFilters] = useState({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSales();
    loadUsers();
  }, [page, searchFilters]);

  const loadSales = async () => {
    setIsLoading(true);
    try {
      const response = await salesAPI.getAll({ page, ...searchFilters });
      setSales(response.data.data);
      setTotalPages(response.data.last_page);
    } catch (error) {
      console.error("Error loading sales:", error);
      notificationSwal("Error", "Hubo un error al cargar las ventas.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const response = await usersAPI.getAll({ per_page: -1 });
      setUsers(response.data.data);
    } catch (error) {
      console.error("Error loading users:", error);
      notificationSwal(
        "Error",
        "Hubo un error al cargar los usuarios.",
        "error"
      );
    } finally {
      setIsLoading(false);
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

  const handleOpenEditDialog = (sale) => {
    setEditingSale(sale);
    setOpenEditDialog(true);
  };

  const handleEditFormChange = (event) => {
    const { name, value } = event.target;
    setEditingSale((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdateSale = async () => {
    if (!editingSale) return;
    setIsSubmitting(true);
    try {
      const { id, customer_name, status } = editingSale;
      await salesAPI.update(id, { customer_name, status });
      notificationSwal(
        "Venta Actualizada",
        "La venta se ha actualizado correctamente.",
        "success"
      );
      setOpenEditDialog(false);
      loadSales();
    } catch (error) {
      console.error("Error updating sale:", error);
      notificationSwal("Error", "No se pudo actualizar la venta.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewSale = (sale) => {
    setSelectedSale(sale);
    setOpenViewDialog(true);
  };

  const handleDeleteSale = async (saleId) => {
    const userConfirmed = await confirmSwal(
      "¿Estás seguro?",
      "Esta acción eliminará la venta permanentemente y revertirá el stock de los productos.",
      { confirmButtonText: "Sí, eliminar", icon: "warning" }
    );

    if (userConfirmed) {
      setIsSubmitting(true);
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
      } finally {
        setIsSubmitting(false);
      }
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

  const handleWhatsappResend = async (saleId) => {
    try {
      const response = await salesAPI.whatsappResend(saleId);
      notificationSwal(
        "WhatsApp Enviado",
        `Mensaje enviado correctamente al número: ${response.data.phone}`,
        "success"
      );
    } catch (error) {
      console.error("Error resending WhatsApp:", error);
      notificationSwal(
        "Error",
        error.response?.data?.message || "No se pudo reenviar el mensaje de WhatsApp.",
        "error"
      );
    }
  };

  const getPaymentStatusColor = (status) => {
    const colors = {
      completed: "success",
      pending: "warning",
      debt: "warning",
      cancelled: "error",
    };
    return colors[status] || "default";
  };

  const getPaymentStatusLabel = (status) => {
    const statuses = {
      completed: "Pagado",
      pending: "Por Entregar",
      debt: "Deuda",
      cancelled: "Anulado",
    };
    return statuses[status] || status;
  };

  const handleExportToExcel = () => {
    const dataToExport = sales.map((sale) => ({
      "Número de Venta": sale.sale_number,
      Cliente: sale.customer_name,
      Total: sale.total_amount,
      "Métodos de Pago":
        sale.payments
          ?.map((p) => getPaymentMethodLabel(p.payment_method))
          .join(", ") || "",
      "Estado de Pago": getPaymentStatusLabel(sale.status),
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
                placeholder="Buscar por número o cliente..."
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
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Método de Pago</InputLabel>
                <Select
                  name="payment_method"
                  value={searchFilters.payment_method || ""}
                  label="Método de Pago"
                  onChange={handleChangeFilter}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(
                    ([value, label]) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    )
                  )}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Estado de Pago</InputLabel>
                <Select
                  name="status"
                  value={searchFilters.status || ""}
                  label="Estado de Pago"
                  onChange={handleChangeFilter}
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="completed">Pagado</MenuItem>
                  <MenuItem value="pending">Por Entregar</MenuItem>
                  <MenuItem value="debt">Deuda</MenuItem>
                  <MenuItem value="cancelled">Anulado</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Responsable</InputLabel>
                <Select
                  name="created_by"
                  value={searchFilters.created_by || ""}
                  label="Responsable"
                  onChange={handleChangeFilter}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {users.map((user) => {
                    return (
                      <MenuItem value={user.id}>{user.full_name}</MenuItem>
                    );
                  })}
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
                  <TableCell>Métodos de Pago</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Vendedor</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      {/* <CircularProgress /> */}
                    </TableCell>
                  </TableRow>
                ) : (
                  sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>{sale.sale_number}</TableCell>
                      <TableCell>{sale.customer_name}</TableCell>
                      <TableCell>{formatCurrency(sale.total_amount)}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          {sale.payments?.map((payment) => (
                            <Chip
                              key={payment.id}
                              label={getPaymentMethodLabel(
                                payment.payment_method
                              )}
                              size="small"
                              color={getPaymentMethodColor(
                                payment.payment_method
                              )}
                            />
                          ))}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {sale.status && (
                          <Chip
                            label={getPaymentStatusLabel(sale.status)}
                            size="small"
                            color={getPaymentStatusColor(sale.status)}
                          />
                        )}
                      </TableCell>
                      <TableCell>{formatDate(sale.created_at)}</TableCell>
                      <TableCell>{sale.creator.full_name}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleViewSale(sale)}
                        >
                          <ViewIcon />
                        </IconButton>
                        {hasPermission("ventas.edit") && (
                          <IconButton
                            size="small"
                            onClick={() => handleOpenEditDialog(sale)}
                            color="secondary"
                          >
                            <EditIcon />
                          </IconButton>
                        )}
                        {hasPermission("ventas.delete") && (
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteSale(sale.id)}
                            color="error"
                            disabled={isSubmitting}
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
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

      <Dialog
        open={openViewDialog}
        onClose={() => setOpenViewDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h6">
              Detalles de Venta - {selectedSale?.sale_number}
            </Typography>
            <IconButton
              onClick={() => handlePrintReceipt(selectedSale.id)}
              disabled={isPrinting}
            >
              <PrintIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedSale && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Información General
                </Typography>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Grid container spacing={2}>
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
                        {formatDate(selectedSale.created_at)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Vendedor
                      </Typography>
                      <Typography variant="body1">
                        {selectedSale.creator.full_name}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Estado
                      </Typography>
                      {selectedSale.status && (
                        <Chip
                          label={getPaymentStatusLabel(selectedSale.status)}
                          size="small"
                          color={getPaymentStatusColor(selectedSale.status)}
                        />
                      )}
                    </Grid>
                  </Grid>
                </Paper>

                <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                  Pagos Realizados
                </Typography>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {selectedSale.payments?.map((payment) => (
                    <Chip
                      key={payment.id}
                      label={`${getPaymentMethodLabel(
                        payment.payment_method
                      )}: ${formatCurrency(payment.amount)}`}
                      color={getPaymentMethodColor(payment.payment_method)}
                    />
                  ))}
                </Stack>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Productos y Servicios
                </Typography>
                <List dense component={Paper} variant="outlined">
                  {selectedSale.items.map((item, index) => (
                    <React.Fragment key={index}>
                      <ListItem>
                        <ListItemText
                          primary={item.item_name}
                          secondary={`Cant: ${item.quantity} x ${formatCurrency(
                            item.unit_price
                          )}`}
                        />
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {formatCurrency(item.total_price)}
                        </Typography>
                      </ListItem>
                      {index < selectedSale.items.length - 1 && <Divider />}
                    </React.Fragment>
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
                  <Typography variant="h6">Total General:</Typography>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 700, color: "primary.main" }}
                  >
                    {formatCurrency(selectedSale.total_amount)}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewDialog(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Sale Dialog */}
      <Dialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Editar Venta - {editingSale?.sale_number}</DialogTitle>
        <DialogContent>
          {editingSale && (
            <Box component="form" sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Nombre del Cliente"
                    name="customer_name"
                    value={editingSale.customer_name}
                    onChange={handleEditFormChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Estado de Pago</InputLabel>
                    <Select
                      label="Estado de Pago"
                      name="status"
                      value={editingSale.status}
                      onChange={handleEditFormChange}
                    >
                      <MenuItem value="completed">Pagado</MenuItem>
                      <MenuItem value="pending">Por Entregar</MenuItem>
                      <MenuItem value="debt">Deuda</MenuItem>
                      <MenuItem value="cancelled">Anulado</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Cancelar</Button>
          <Button
            onClick={handleUpdateSale}
            variant="contained"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
