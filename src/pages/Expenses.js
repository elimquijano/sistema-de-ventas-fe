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
  Receipt as ReceiptIcon,
  GetApp as ExportIcon,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { formatCurrency, formatDate } from "../utils/formatters";
import { confirmSwal, notificationSwal } from "../utils/swal-helpers";

export const Expenses = () => {
  const { hasPermission } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchFilters, setSearchFilters] = useState({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    category_id: "",
    expense_date: new Date().toISOString().split('T')[0],
    receipt_number: "",
    notes: "",
  });

  useEffect(() => {
    loadExpenses();
    loadCategories();
  }, [page, searchFilters]);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      // Simulación de datos
      const mockExpenses = [
        {
          id: 1,
          description: "Compra de inventario",
          amount: 150.00,
          category: "Inventario",
          category_id: 1,
          expense_date: "2024-01-15T10:00:00Z",
          receipt_number: "F-001",
          notes: "Compra de productos para reventa",
          created_by: "Admin",
        },
        {
          id: 2,
          description: "Pago de servicios básicos",
          amount: 85.50,
          category: "Servicios",
          category_id: 2,
          expense_date: "2024-01-14T10:00:00Z",
          receipt_number: "F-002",
          notes: "Electricidad y agua",
          created_by: "Admin",
        },
        {
          id: 3,
          description: "Salario empleado",
          amount: 800.00,
          category: "Nómina",
          category_id: 3,
          expense_date: "2024-01-13T10:00:00Z",
          receipt_number: "",
          notes: "Pago quincenal",
          created_by: "Admin",
        },
      ];
      setExpenses(mockExpenses);
      setTotalPages(1);
    } catch (error) {
      console.error("Error loading expenses:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const mockCategories = [
        { id: 1, name: "Inventario" },
        { id: 2, name: "Servicios" },
        { id: 3, name: "Nómina" },
        { id: 4, name: "Marketing" },
        { id: 5, name: "Mantenimiento" },
        { id: 6, name: "Otros" },
      ];
      setCategories(mockCategories);
    } catch (error) {
      console.error("Error loading categories:", error);
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

  const handleOpenDialog = (expense) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        description: expense.description,
        amount: expense.amount.toString(),
        category_id: expense.category_id,
        expense_date: expense.expense_date.split('T')[0],
        receipt_number: expense.receipt_number,
        notes: expense.notes,
      });
    } else {
      setEditingExpense(null);
      setFormData({
        description: "",
        amount: "",
        category_id: "",
        expense_date: new Date().toISOString().split('T')[0],
        receipt_number: "",
        notes: "",
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingExpense(null);
  };

  const handleSaveExpense = async () => {
    try {
      if (editingExpense) {
        notificationSwal(
          "Gasto Actualizado",
          "El gasto ha sido actualizado exitosamente.",
          "success"
        );
      } else {
        notificationSwal(
          "Gasto Registrado",
          "El nuevo gasto ha sido registrado exitosamente.",
          "success"
        );
      }
      handleCloseDialog();
      loadExpenses();
    } catch (error) {
      console.error("Error saving expense:", error);
      notificationSwal("Error", "Error al guardar el gasto.", "error");
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    const userConfirmed = await confirmSwal(
      "¿Estás seguro?",
      "Esta acción eliminará el gasto permanentemente.",
      {
        confirmButtonText: "Sí, eliminar",
        icon: "warning",
      }
    );

    if (userConfirmed) {
      try {
        notificationSwal(
          "Gasto Eliminado",
          "El gasto ha sido eliminado exitosamente.",
          "success"
        );
        loadExpenses();
      } catch (error) {
        console.error("Error deleting expense:", error);
        notificationSwal("Error", "Error al eliminar el gasto.", "error");
      }
    }
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
          Gastos
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={exportToExcel}
          >
            Exportar Excel
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{
              background: "linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)",
            }}
          >
            Registrar Gasto
          </Button>
        </Box>
      </Box>

      <Card>
        <CardContent>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Buscar gastos..."
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
                <InputLabel>Categoría</InputLabel>
                <Select
                  name="category_id"
                  value={searchFilters.category_id || ""}
                  label="Categoría"
                  onChange={handleChangeFilter}
                >
                  <MenuItem value="">Todas las Categorías</MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="Fecha Desde"
                type="date"
                name="date_from"
                value={searchFilters.date_from || ""}
                onChange={handleChangeFilter}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="Fecha Hasta"
                type="date"
                name="date_to"
                value={searchFilters.date_to || ""}
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
                  <TableCell>Descripción</TableCell>
                  <TableCell>Categoría</TableCell>
                  <TableCell>Monto</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Factura</TableCell>
                  <TableCell>Registrado por</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {expense.description}
                      </Typography>
                      {expense.notes && (
                        <Typography variant="caption" color="text.secondary">
                          {expense.notes}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={expense.category}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "error.main" }}>
                        -{formatCurrency(expense.amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>{formatDate(expense.expense_date)}</TableCell>
                    <TableCell>
                      {expense.receipt_number ? (
                        <Chip
                          label={expense.receipt_number}
                          size="small"
                          icon={<ReceiptIcon />}
                          variant="outlined"
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Sin factura
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {expense.created_by}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(expense)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteExpense(expense.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
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

      {/* Dialog para crear/editar gasto */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingExpense ? "Editar Gasto" : "Registrar Nuevo Gasto"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descripción"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
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
              <FormControl fullWidth required>
                <InputLabel>Categoría</InputLabel>
                <Select
                  value={formData.category_id}
                  label="Categoría"
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, category_id: e.target.value }))
                  }
                >
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Fecha del Gasto"
                type="date"
                value={formData.expense_date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, expense_date: e.target.value }))
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
                label="Número de Factura"
                value={formData.receipt_number}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, receipt_number: e.target.value }))
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notas"
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button
            onClick={handleSaveExpense}
            variant="contained"
            disabled={!formData.description || !formData.amount || !formData.category_id}
            sx={{
              background: "linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)",
            }}
          >
            {editingExpense ? "Actualizar" : "Registrar"} Gasto
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};