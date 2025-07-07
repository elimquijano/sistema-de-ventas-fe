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
  const [openDialog, setOpenDialog] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    loan_date: "",
    due_date: "",
    status: "pending",
  });

  useEffect(() => {
    loadLoans();
  }, [page, searchFilters]);

  const loadLoans = async () => {
    try {
      setLoading(true);
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
    setSearchFilters((prevFilters) => {
      if (value === "") {
        const { [name]: _, ...newFilters } = prevFilters;
        return newFilters;
      }
      return { ...prevFilters, [name]: value };
    });
  };

  const handleOpenDialog = (loan) => {
    if (loan) {
      setEditingLoan(loan);
      setFormData({
        description: loan.description,
        amount: loan.amount.toString(),
        loan_date: loan.loan_date,
        due_date: loan.due_date,
        status: loan.status,
      });
    } else {
      setEditingLoan(null);
      setFormData({
        description: "",
        amount: "",
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
    try {
      const dataToSave = {
        ...formData,
        amount: parseFloat(formData.amount),
      };

      if (editingLoan) {
        await loansAPI.update(editingLoan.id, dataToSave);
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
      notificationSwal("Error", "Error al guardar el préstamo.", "error");
    }
  };

  const handleDeleteLoan = async (loanId) => {
    const userConfirmed = await confirmSwal(
      "¿Estás seguro?",
      "Esta acción eliminará el préstamo permanentemente.",
      {
        confirmButtonText: "Sí, eliminar",
        icon: "warning",
      }
    );

    if (userConfirmed) {
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
      }
    }
  };

  const handleMarkAsReturned = async (loanId) => {
    const userConfirmed = await confirmSwal(
      "Marcar como Devuelto",
      "¿Confirma que el préstamo ha sido devuelto?",
      {
        confirmButtonText: "Sí, marcar como devuelto",
        icon: "question",
      }
    );

    if (userConfirmed) {
      try {
        await loansAPI.markAsReturned(loanId, { amount: 0 }); // Amount 0 for full return
        notificationSwal(
          "Préstamo Devuelto",
          "El préstamo ha sido marcado como devuelto.",
          "success"
        );
        loadLoans();
      } catch (error) {
        console.error("Error marking as returned:", error);
        notificationSwal("Error", "Error al marcar como devuelto.", "error");
      }
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
      returned: "Devuelto",
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
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Préstamos
        </Typography>
        {hasPermission("prestamos.create") && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{
              background: "linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)",
            }}
          >
            Agregar Préstamo
          </Button>
        )}
      </Box>

      <Card>
        <CardContent>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Buscar por descripción..."
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
                  <MenuItem value="returned">Devuelto</MenuItem>
                  <MenuItem value="overdue">Vencido</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Descripción</TableCell>
                  <TableCell>Monto</TableCell>
                  <TableCell>Pagado</TableCell>
                  <TableCell>Pendiente</TableCell>
                  <TableCell>Fecha Préstamo</TableCell>
                  <TableCell>Fecha Vencimiento</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {loan.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatCurrency(loan.amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="success.main">
                        {formatCurrency(loan.paid_amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        color="error.main"
                        sx={{ fontWeight: 600 }}
                      >
                        {formatCurrency(loan.pending_amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>{formatDate(loan.loan_date)}</TableCell>
                    <TableCell>{formatDate(loan.due_date)}</TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(loan.status)}
                        size="small"
                        color={getStatusColor(loan.status)}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {loan.status === "pending" &&
                        hasPermission("prestamos.view") && (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleMarkAsReturned(loan.id)}
                            sx={{ mr: 1 }}
                          >
                            Marcar Devuelto
                          </Button>
                        )}
                      {hasPermission("prestamos.edit") && (
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(loan)}
                        >
                          <EditIcon />
                        </IconButton>
                      )}
                      {hasPermission("prestamos.delete") && (
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteLoan(loan.id)}
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

      {/* Dialog para crear/editar préstamo */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingLoan ? "Editar Préstamo" : "Agregar Nuevo Préstamo"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descripción del Préstamo"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Monto"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, amount: e.target.value }))
                }
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Fecha de Préstamo"
                type="date"
                value={formData.loan_date}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    loan_date: e.target.value,
                  }))
                }
                InputLabelProps={{
                  shrink: true,
                }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Fecha de Vencimiento"
                type="date"
                value={formData.due_date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, due_date: e.target.value }))
                }
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Estado</InputLabel>
                <Select
                  value={formData.status}
                  label="Estado"
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, status: e.target.value }))
                  }
                >
                  <MenuItem value="pending">Pendiente</MenuItem>
                  <MenuItem value="paid">Pagado</MenuItem>
                  <MenuItem value="overdue">Vencido</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button
            onClick={handleSaveLoan}
            variant="contained"
            disabled={
              !formData.description || !formData.amount || !formData.loan_date
            }
            sx={{
              background: "linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)",
            }}
          >
            {editingLoan ? "Actualizar" : "Crear"} Préstamo
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
