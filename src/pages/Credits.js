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
  Tab,
  Tabs,
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Payment as PaymentIcon,
  AccountBalance as AccountBalanceIcon,
  ShoppingCart as ShoppingCartIcon,
  Build as BuildIcon,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { formatCurrency, formatDate } from "../utils/formatters";
import { confirmSwal, notificationSwal } from "../utils/swal-helpers";
import { creditsAPI } from "../utils/api";

export const Credits = () => {
  const { hasPermission } = useAuth();

  const [salesCredits, setSalesCredits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchFilters, setSearchFilters] = useState({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Dialog State
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCredit, setEditingCredit] = useState(null);
  const [editFormData, setEditFormData] = useState({ due_date: "", status: "", paid_amount: "" });

  useEffect(() => {
    loadCredits();
  }, [page, searchFilters]);

  const loadCredits = async () => {
    try {
      setLoading(true);
      const response = await creditsAPI.getAll({ page, ...searchFilters });
      setSalesCredits(response.data.data);
      setTotalPages(response.data.last_page);
    } catch (error) {
      console.error("Error loading credits:", error);
      notificationSwal(
        "Error",
        "Hubo un error al cargar los créditos.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChangeFilter = (event) => {
    const { name, value } = event.target;
    setPage(1);
    setSearchFilters((prevFilters) => {
      if (value === "") {
        const { [name]: _, ...newFilters } = prevFilters;
        return newFilters;
      }
      return { ...prevFilters, [name]: value };
    });
  };

  const handleOpenPaymentDialog = (credit) => {
    setSelectedCredit(credit);
    setPaymentAmount(credit.pending_amount.toString());
    setOpenPaymentDialog(true);
  };

  const handleProcessPayment = async () => {
    try {
      const amount = parseFloat(paymentAmount);
      if (amount <= 0 || amount > selectedCredit.pending_amount) {
        notificationSwal("Error", "Monto de pago inválido.", "error");
        return;
      }

      setIsSubmitting(true);
      await creditsAPI.processPayment(selectedCredit.id, { amount });

      notificationSwal(
        "Pago Registrado",
        `Se ha registrado un pago de ${formatCurrency(amount)}.`,
        "success"
      );

      setOpenPaymentDialog(false);
      setSelectedCredit(null);
      setPaymentAmount("");
      loadCredits();
    } catch (error) {
      console.error("Error processing payment:", error);
      notificationSwal("Error", "Error al procesar el pago.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Edit Functions ---
  const handleOpenEditDialog = (credit) => {
    setEditingCredit(credit);
    setEditFormData({
      due_date: credit.due_date ? credit.due_date.split("T")[0] : "",
      status: credit.status,
      paid_amount: credit.paid_amount.toString(),
    });
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingCredit(null);
  };

  const handleUpdateCredit = async () => {
    if (!editingCredit) return;
    setIsSubmitting(true);
    try {
      const dataToUpdate = {
        ...editFormData,
        paid_amount: parseFloat(editFormData.paid_amount)
      };
      await creditsAPI.update(editingCredit.id, dataToUpdate);
      notificationSwal("Crédito Actualizado", "El crédito ha sido actualizado.", "success");
      handleCloseEditDialog();
      loadCredits();
    } catch (error) {
      console.error("Error updating credit:", error);
      notificationSwal("Error", "No se pudo actualizar el crédito.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "paid":
      case "returned":
        return "success";
      case "pending":
        return "warning";
      case "overdue":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      paid: "Pagado",
      pending: "Pendiente",
      overdue: "Vencido",
    };
    return labels[status] || status;
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
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Créditos de Ventas
      </Typography>

      <Card>
        <CardContent>
          {/* Filtros */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Buscar por cliente o venta..."
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
                <InputLabel>Estado</InputLabel>
                <Select
                  name="status"
                  value={searchFilters.status || ""}
                  label="Estado"
                  onChange={handleChangeFilter}
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="pending">Pendiente</MenuItem>
                  <MenuItem value="paid">Pagado</MenuItem>
                  <MenuItem value="overdue">Vencido</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Venta</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Pagado</TableCell>
                  <TableCell>Pendiente</TableCell>
                  <TableCell>Vencimiento</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {salesCredits.map((credit) => (
                  <TableRow key={credit.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {credit.customer_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {credit.sale.sale_number}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatCurrency(credit.total_amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="success.main">
                        {formatCurrency(credit.paid_amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        color="error.main"
                        sx={{ fontWeight: 600 }}
                      >
                        {formatCurrency(credit.pending_amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>{formatDate(credit.due_date)}</TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(credit.status)}
                        size="small"
                        color={getStatusColor(credit.status)}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {hasPermission("creditos.view") &&
                        credit.status === "pending" && (
                          <IconButton
                            size="small"
                            onClick={() => handleOpenPaymentDialog(credit)}
                            color="primary"
                          >
                            <PaymentIcon />
                          </IconButton>
                        )}
                      {hasPermission("creditos.edit") && (
                        <IconButton size="small" onClick={() => handleOpenEditDialog(credit)}>
                          <EditIcon />
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

      {/* Dialog para procesar pago */}
      <Dialog
        open={openPaymentDialog}
        onClose={() => setOpenPaymentDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Registrar Pago</DialogTitle>
        <DialogContent>
          {selectedCredit && (
            <Box sx={{ py: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Cliente: {selectedCredit.customer_name}
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Venta: {selectedCredit.sale_number}
              </Typography>
              <Typography variant="body1" sx={{ mb: 3 }}>
                Monto Pendiente: {formatCurrency(selectedCredit.pending_amount)}
              </Typography>

              <TextField
                fullWidth
                label="Monto a Pagar"
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                inputProps={{
                  max: selectedCredit.pending_amount,
                  min: 0.01,
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPaymentDialog(false)} disabled={isSubmitting}>Cancelar</Button>
          <Button
            onClick={handleProcessPayment}
            variant="contained"
            disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || isSubmitting}
            sx={{
              background: "linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)",
            }}
            startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
          >
            Registrar Pago
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={handleCloseEditDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Editar Crédito</DialogTitle>
        <DialogContent>
          {editingCredit && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Fecha de Vencimiento"
                  type="date"
                  value={editFormData.due_date}
                  onChange={(e) => setEditFormData({ ...editFormData, due_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  disabled={isSubmitting}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Monto Pagado"
                  type="number"
                  value={editFormData.paid_amount}
                  onChange={(e) => setEditFormData({ ...editFormData, paid_amount: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  error={parseFloat(editFormData.paid_amount) > editingCredit?.total_amount}
                  helperText={parseFloat(editFormData.paid_amount) > editingCredit?.total_amount ? "No puede ser mayor al total." : ""}
                  disabled={isSubmitting}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth disabled={isSubmitting}>
                  <InputLabel>Estado</InputLabel>
                  <Select value={editFormData.status} label="Estado" onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}>
                    <MenuItem value="pending">Pendiente</MenuItem>
                    <MenuItem value="paid">Pagado</MenuItem>
                    <MenuItem value="overdue">Vencido</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog} disabled={isSubmitting}>Cancelar</Button>
          <Button onClick={handleUpdateCredit} variant="contained" disabled={isSubmitting}>
            {isSubmitting ? <CircularProgress size={20} color="inherit" /> : "Guardar Cambios"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
