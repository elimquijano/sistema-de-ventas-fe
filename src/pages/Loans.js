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
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Payment as PaymentIcon,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { formatCurrency, formatDate } from "../utils/formatters";
import { confirmSwal, notificationSwal } from "../utils/swal-helpers";
import { loansAPI } from "../utils/api";

export const Loans = () => {
  const { hasPermission } = useAuth();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchFilters, setSearchFilters] = useState({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dialog for Create/Edit Loan
  const [openDialog, setOpenDialog] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    paid_amount: "",
    loan_date: "",
    due_date: "",
    status: "pending",
  });

  // Dialog for Add Payment
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [payingLoan, setPayingLoan] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  useEffect(() => {
    loadLoans();
  }, [page, searchFilters]);

  const loadLoans = async () => {
    setLoading(true);
    try {
      const response = await loansAPI.getAll({ page, ...searchFilters });
      setLoans(response.data.data);
      setTotalPages(response.data.last_page);
    } catch (error) {
      console.error("Error loading loans:", error);
      notificationSwal(
        "Error",
        "Hubo un error al cargar los préstamos.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChangeFilter = (event) => {
    const { name, value } = event.target;
    setPage(1); // Reset page on new filter
    setSearchFilters((prevFilters) => {
      if (value === "") {
        const { [name]: _, ...newFilters } = prevFilters;
        return newFilters;
      }
      return { ...prevFilters, [name]: value };
    });
  };

  const handleOpenDialog = (loan = null) => {
    if (loan) {
      setEditingLoan(loan);
      setFormData({
        description: loan.description,
        amount: loan.amount.toString(),
        paid_amount: loan.paid_amount.toString(),
        loan_date: loan.loan_date.split("T")[0],
        due_date: loan.due_date ? loan.due_date.split("T")[0] : "",
        status: loan.status,
      });
    } else {
      setEditingLoan(null);
      setFormData({
        description: "",
        amount: "",
        paid_amount: "",
        loan_date: new Date().toISOString().split("T")[0],
        due_date: "",
        status: "pending",
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingLoan(null);
  };

  const handleSaveLoan = async () => {
    setIsSubmitting(true);
    try {
      const dataToSave = {
        ...formData,
        amount: parseFloat(formData.amount) || 0,
        paid_amount: parseFloat(formData.paid_amount) || 0,
      };

      if (editingLoan) {
        // Only allow updating non-financial fields
        const { description, loan_date, due_date, status } = dataToSave;
        await loansAPI.update(editingLoan.id, { description, loan_date, due_date, status });
        notificationSwal(
          "Préstamo Actualizado",
          "El préstamo ha sido actualizado exitosamente.",
          "success"
        );
      } else {
        await loansAPI.create(dataToSave);
        notificationSwal(
          "Préstamo Creado",
          "El nuevo préstamo ha sido creado exitosamente.",
          "success"
        );
      }
      handleCloseDialog();
      loadLoans();
    } catch (error) {
      console.error("Error saving loan:", error);
      const errorMessage = error.response?.data?.errors
        ? Object.values(error.response.data.errors).join(", ")
        : "Error al guardar el préstamo.";
      notificationSwal("Error", errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLoan = async (loanId) => {
    const userConfirmed = await confirmSwal(
      "¿Estás seguro?",
      "Esta acción eliminará el préstamo permanentemente.",
      { confirmButtonText: "Sí, eliminar", icon: "warning" }
    );

    if (userConfirmed) {
      setIsSubmitting(true);
      try {
        await loansAPI.delete(loanId);
        notificationSwal(
          "Préstamo Eliminado",
          "El préstamo ha sido eliminado exitosamente.",
          "success"
        );
        loadLoans();
      } catch (error) {
        console.error("Error deleting loan:", error);
        notificationSwal("Error", "Error al eliminar el préstamo.", "error");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // --- Payment Dialog Functions ---
  const handleOpenPaymentDialog = (loan) => {
    setPayingLoan(loan);
    setPaymentAmount("");
    setPaymentDialogOpen(true);
  };

  const handleClosePaymentDialog = () => {
    setPaymentDialogOpen(false);
    setPayingLoan(null);
  };

  const handleProcessPayment = async () => {
    if (!payingLoan || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      notificationSwal("Error", "Por favor, ingrese un monto válido.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      await loansAPI.addPayment(payingLoan.id, { amount: parseFloat(paymentAmount) });
      notificationSwal("Pago Registrado", "El pago ha sido registrado exitosamente.", "success");
      handleClosePaymentDialog();
      loadLoans();
    } catch (error) {
      console.error("Error processing payment:", error);
      const errorMessage = error.response?.data?.message || "Error al procesar el pago.";
      notificationSwal("Error", errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusChip = (status) => {
    const style = {
      paid: { label: "Pagado", color: "success" },
      pending: { label: "Pendiente", color: "warning" },
      overdue: { label: "Vencido", color: "error" },
    };
    const { label, color } = style[status] || { label: status, color: "default" };
    return <Chip label={label} size="small" color={color} />;
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Gestión de Préstamos
        </Typography>
        {hasPermission("prestamos.create") && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ background: "linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)" }}
          >
            Agregar Préstamo
          </Button>
        )}
      </Box>

      <Card>
        <CardContent>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={5}>
              <TextField
                fullWidth
                placeholder="Buscar por descripción..."
                name="search"
                value={searchFilters.search || ""}
                onChange={handleChangeFilter}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Estado</InputLabel>
                <Select name="status" value={searchFilters.status || ""} label="Estado" onChange={handleChangeFilter}>
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="pending">Pendiente</MenuItem>
                  <MenuItem value="paid">Pagado</MenuItem>
                  <MenuItem value="overdue">Vencido</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress /></Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Descripción</TableCell>
                    <TableCell>Monto Total</TableCell>
                    <TableCell>Pagado</TableCell>
                    <TableCell>Pendiente</TableCell>
                    <TableCell>Fecha Préstamo</TableCell>
                    <TableCell>Registrado Por</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{loan.description}</Typography></TableCell>
                      <TableCell>{formatCurrency(loan.amount)}</TableCell>
                      <TableCell><Typography color="success.main">{formatCurrency(loan.paid_amount)}</Typography></TableCell>
                      <TableCell><Typography color="error.main" sx={{ fontWeight: 600 }}>{formatCurrency(loan.pending_amount)}</Typography></TableCell>
                      <TableCell>{formatDate(loan.loan_date)}</TableCell>
                      <TableCell>{loan.creator?.full_name || "N/A"}</TableCell>
                      <TableCell>{getStatusChip(loan.status)}</TableCell>
                      <TableCell align="right">
                        {loan.status === "pending" && hasPermission("prestamos.edit") && (
                          <Button size="small" variant="contained" onClick={() => handleOpenPaymentDialog(loan)} sx={{ mr: 1 }} startIcon={<PaymentIcon />}>
                            Registrar Pago
                          </Button>
                        )}
                        {hasPermission("prestamos.edit") && (
                          <IconButton size="small" onClick={() => handleOpenDialog(loan)}><EditIcon /></IconButton>
                        )}
                        {hasPermission("prestamos.delete") && (
                          <IconButton size="small" onClick={() => handleDeleteLoan(loan.id)} color="error" disabled={isSubmitting}><DeleteIcon /></IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
            <Pagination count={totalPages} page={page} onChange={(e, val) => setPage(val)} color="primary" />
          </Box>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingLoan ? "Editar Préstamo" : "Agregar Nuevo Préstamo"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="Descripción" name="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Monto Total del Préstamo" name="amount" type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required disabled={!!editingLoan} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Monto Pagado Inicialmente" name="paid_amount" type="number" value={formData.paid_amount} onChange={(e) => setFormData({ ...formData, paid_amount: e.target.value })} disabled={!!editingLoan} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Fecha de Préstamo" name="loan_date" type="date" value={formData.loan_date} onChange={(e) => setFormData({ ...formData, loan_date: e.target.value })} InputLabelProps={{ shrink: true }} required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Fecha de Vencimiento" name="due_date" type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>
            {editingLoan && (
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Estado</InputLabel>
                  <Select name="status" value={formData.status} label="Estado" onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                    <MenuItem value="pending">Pendiente</MenuItem>
                    <MenuItem value="paid">Pagado</MenuItem>
                    <MenuItem value="overdue">Vencido</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={isSubmitting}>Cancelar</Button>
          <Button onClick={handleSaveLoan} variant="contained" disabled={!formData.description || !formData.amount || !formData.loan_date || isSubmitting} sx={{ background: "linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)" }}>
            {editingLoan ? "Actualizar" : "Crear"} Préstamo
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Payment Dialog */}
      <Dialog open={paymentDialogOpen} onClose={handleClosePaymentDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Registrar Pago</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Préstamo: <strong>{payingLoan?.description}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monto Pendiente: {formatCurrency(payingLoan?.pending_amount)}
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Monto a Pagar"
            type="number"
            fullWidth
            variant="standard"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            error={parseFloat(paymentAmount) > payingLoan?.pending_amount}
            helperText={parseFloat(paymentAmount) > payingLoan?.pending_amount ? "El monto no puede ser mayor al pendiente." : ""}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePaymentDialog} disabled={isSubmitting}>Cancelar</Button>
          <Button onClick={handleProcessPayment} variant="contained" disabled={isSubmitting}>
            {isSubmitting ? <CircularProgress size={20} color="inherit" /> : "Registrar Pago"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
