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
  alpha,
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
  History as HistoryIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { formatCurrency, formatDate } from "../utils/formatters";
import { confirmSwal, notificationSwal } from "../utils/swal-helpers";
import { creditsAPI } from "../utils/api";
import { AuditTimeline } from "../components/AuditTimeline";
import { PaymentMethodSelector } from "../components/PaymentMethodSelector";

export const Credits = () => {
  const { hasPermission } = useAuth();

  const [salesCredits, setSalesCredits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchFilters, setSearchFilters] = useState({ 
    search: "", 
    status: "pending", 
    date: "" 
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState(null);
  const [payments, setPayments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Dialog State
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCredit, setEditingCredit] = useState(null);
  const [editFormData, setEditFormData] = useState({
    due_date: "",
    status: "",
    paid_amount: "",
  });

  // Timeline State
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [timelineLogs, setTimelineLogs] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

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
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChangeFilter = (event) => {
    const { name, value } = event.target;
    setPage(1);
    setSearchFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleOpenPaymentDialog = (credit) => {
    setSelectedCredit(credit);
    setPayments([]); // Empezar sin ningún método, el usuario debe elegir uno
    setOpenPaymentDialog(true);
  };

  const handleProcessPayment = async () => {
    try {
      const totalPaid = payments.reduce(
        (sum, p) => sum + parseFloat(p.amount || 0),
        0,
      );

      if (totalPaid <= 0) {
        notificationSwal("Error", "El monto total debe ser mayor a 0.", "error");
        return;
      }

      // Validar que todos los pagos tengan método seleccionado
      if (payments.some(p => !p.payment_method)) {
        notificationSwal("Error", "Debe seleccionar un método de pago para cada monto.", "error");
        return;
      }

      if (totalPaid > selectedCredit.pending_amount + 0.01) {
        notificationSwal(
          "Error",
          "El monto total excede el saldo pendiente.",
          "error",
        );
        return;
      }

      const formData = new FormData();
      payments.forEach((p, index) => {
        formData.append(`payments[${index}][payment_method]`, p.payment_method);
        formData.append(`payments[${index}][amount]`, p.amount);
        formData.append(`payments[${index}][reference]`, p.reference || "");
        if (p.payment_image) {
          formData.append(`payments[${index}][payment_image]`, p.payment_image);
        }
      });

      setIsSubmitting(true);
      await creditsAPI.processPayment(selectedCredit.id, formData);

      notificationSwal(
        "Pago Registrado",
        `Se ha registrado un pago de ${formatCurrency(totalPaid)}.`,
        "success",
      );

      setOpenPaymentDialog(false);
      setSelectedCredit(null);
      setPayments([]);
      loadCredits();
    } catch (error) {
      console.error("Error processing payment:", error);
      const msg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Error al procesar el pago.";
      notificationSwal("Error", msg, "error");
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
        paid_amount: parseFloat(editFormData.paid_amount),
      };
      await creditsAPI.update(editingCredit.id, dataToUpdate);
      notificationSwal(
        "Crédito Actualizado",
        "El crédito ha sido actualizado.",
        "success",
      );
      handleCloseEditDialog();
      loadCredits();
    } catch (error) {
      console.error("Error updating credit:", error);
      notificationSwal("Error", "No se pudo actualizar el crédito.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenTimeline = async (creditId) => {
    setTimelineOpen(true);
    setLoadingTimeline(true);
    try {
      const response = await creditsAPI.timeline(creditId);
      setTimelineLogs(response.data || []);
    } catch (error) {
      console.error("Error loading timeline:", error);
      notificationSwal("Error", "No se pudo cargar el historial.", "error");
    } finally {
      setLoadingTimeline(false);
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
        {/* <CircularProgress /> */}
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
                  <TableCell
                    sx={{
                      position: "sticky",
                      left: 0,
                      zIndex: 3,
                      minWidth: 150,
                      bgcolor: "background.paper",
                      boxShadow: "3px 0 6px -4px rgba(0,0,0,0.35)",
                    }}
                  >
                    Cliente
                  </TableCell>
                  <TableCell>Venta</TableCell>
                  <TableCell>Emisión</TableCell>
                  <TableCell>Pendiente</TableCell>
                  <TableCell>Pagado</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Registrado por</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {salesCredits.map((credit) => (
                  <TableRow key={credit.id}>
                    <TableCell
                      sx={{
                        position: "sticky",
                        left: 0,
                        zIndex: 2,
                        minWidth: 150,
                        bgcolor: "background.paper",
                        boxShadow: "3px 0 6px -4px rgba(0,0,0,0.35)",
                      }}
                    >
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
                      <Typography variant="body2">
                        {formatDate(credit.created_at)}
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
                    <TableCell>
                      <Typography variant="body2" color="success.main">
                        {formatCurrency(credit.paid_amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatCurrency(credit.total_amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(credit.status)}
                        size="small"
                        color={getStatusColor(credit.status)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {credit.creator?.full_name || "N/A"}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {hasPermission("creditos.pay") &&
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
                        <IconButton
                          size="small"
                          onClick={() => handleOpenEditDialog(credit)}
                        >
                          <EditIcon />
                        </IconButton>
                      )}
                      {hasPermission("creditos.audit") && (
                        <IconButton
                          size="small"
                          onClick={() => handleOpenTimeline(credit.id)}
                          title="Ver Historial"
                        >
                          <HistoryIcon />
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

      <Dialog
        open={openPaymentDialog}
        onClose={() => setOpenPaymentDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Registrar Pago
          <IconButton onClick={() => setOpenPaymentDialog(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedCredit && (
            <Box sx={{ mb: 3 }}>
              <Grid container spacing={1}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Cliente</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedCredit.customer_name}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Venta</Typography>
                  <Typography variant="body2">{selectedCredit.sale?.sale_number}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', bgcolor: alpha('#673ab7', 0.05) }}>
                    <Typography variant="caption" color="text.secondary">Monto Pendiente</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: '#673ab7' }}>
                      {formatCurrency(selectedCredit.pending_amount)}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}

          <PaymentMethodSelector
            totalAmount={selectedCredit?.pending_amount || 0}
            payments={payments}
            setPayments={setPayments}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setOpenPaymentDialog(false)}
            disabled={isSubmitting}
            variant="outlined"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleProcessPayment}
            variant="contained"
            fullWidth
            disabled={
              isSubmitting || 
              payments.length === 0 || 
              payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) <= 0
            }
            sx={{
              background: "linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)",
            }}
            startIcon={
              isSubmitting ? (
                <CircularProgress size={20} color="inherit" />
              ) : <PaymentIcon />
            }
          >
            {isSubmitting ? "Procesando..." : "Registrar Pago"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={handleCloseEditDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Editar Crédito</DialogTitle>
        <DialogContent>
          {editingCredit && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Monto Pagado"
                  type="number"
                  value={editFormData.paid_amount}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      paid_amount: e.target.value,
                    })
                  }
                  InputLabelProps={{ shrink: true }}
                  error={
                    parseFloat(editFormData.paid_amount) >
                    editingCredit?.total_amount
                  }
                  helperText={
                    parseFloat(editFormData.paid_amount) >
                    editingCredit?.total_amount
                      ? "No puede ser mayor al total."
                      : ""
                  }
                  disabled={isSubmitting}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth disabled={isSubmitting}>
                  <InputLabel>Estado</InputLabel>
                  <Select
                    value={editFormData.status}
                    label="Estado"
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        status: e.target.value,
                      })
                    }
                  >
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
          <Button onClick={handleCloseEditDialog} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleUpdateCredit}
            variant="contained"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "Guardar Cambios"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Timeline Dialog */}
      <Dialog
        open={timelineOpen}
        onClose={() => setTimelineOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <HistoryIcon color="primary" /> Historial del Crédito
        </DialogTitle>
        <DialogContent>
          <AuditTimeline logs={timelineLogs} loading={loadingTimeline} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTimelineOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
