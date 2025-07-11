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
  Link,
  CircularProgress,
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Receipt as ReceiptIcon,
  GetApp as ExportIcon,
  CloudUpload as UploadIcon,
  Clear as ClearIcon,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { formatCurrency, formatDate } from "../utils/formatters";
import { confirmSwal, notificationSwal } from "../utils/swal-helpers";
import api, { API_STORAGE_URL, categoriesAPI, expensesAPI } from "../utils/api";
import { exportToExcel } from "../utils/excelExport";

export const Expenses = () => {
  const { hasPermission } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchFilters, setSearchFilters] = useState({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    category_id: "",
    expense_date: new Date().toISOString().split("T")[0],
    receipt_path: "",
    notes: "",
  });

  useEffect(() => {
    loadExpenses();
    loadCategories();
  }, [page, searchFilters]);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const response = await expensesAPI.getAll({ page, ...searchFilters });
      setExpenses(response.data.data);
      setTotalPages(response.data.last_page);
    } catch (error) {
      console.error("Error loading expenses:", error);
      notificationSwal("Error", "Hubo un error al cargar los gastos.", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await categoriesAPI.getAll({ type: "expense" });
      setCategories(response.data);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const handleChangeFilter = (event) => {
    const { name, value } = event.target;
    setPage(1); // Reset page when filters change
    setSearchFilters((prevFilters) => {
      if (value === "") {
        const { [name]: _, ...newFilters } = prevFilters;
        return newFilters;
      }
      return { ...prevFilters, [name]: value };
    });
  };

  const handleOpenDialog = (expense = null) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        description: expense.description,
        amount: expense.amount.toString(),
        category_id: expense.category_id,
        expense_date: expense.expense_date.split("T")[0],
        receipt_path: expense.receipt_path || "",
        notes: expense.notes || "",
      });
    } else {
      setEditingExpense(null);
      setFormData({
        description: "",
        amount: "",
        category_id: "",
        expense_date: new Date().toISOString().split("T")[0],
        receipt_path: "",
        notes: "",
      });
    }
    setReceiptFile(null);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingExpense(null);
    setReceiptFile(null);
  };

  const handleFileChange = (event) => {
    setReceiptFile(event.target.files[0]);
  };

  const handleSaveExpense = async () => {
    setIsSubmitting(true);
    try {
      let payload = { ...formData };

      if (receiptFile) {
        const uploadData = new FormData();
        uploadData.append("file", receiptFile);
        uploadData.append("path", "receipts");
        const response = await api.post("/files/upload", uploadData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        payload.receipt_path = response.data.path;
      }

      if (editingExpense) {
        await expensesAPI.update(editingExpense.id, payload);
        notificationSwal(
          "Gasto Actualizado",
          "El gasto ha sido actualizado exitosamente.",
          "success"
        );
      } else {
        await expensesAPI.create(payload);
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
      const errorMessage =
        error.response?.data?.message || "Error al guardar el gasto.";
      notificationSwal("Error", errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    const userConfirmed = await confirmSwal(
      "¿Estás seguro?",
      "Esta acción eliminará el gasto permanentemente.",
      { confirmButtonText: "Sí, eliminar", icon: "warning" }
    );

    if (userConfirmed) {
      setIsSubmitting(true);
      try {
        await expensesAPI.delete(expenseId);
        notificationSwal(
          "Gasto Eliminado",
          "El gasto ha sido eliminado exitosamente.",
          "success"
        );
        loadExpenses();
      } catch (error) {
        console.error("Error deleting expense:", error);
        notificationSwal("Error", "Error al eliminar el gasto.", "error");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleExportToExcel = () => {
    const dataToExport = expenses.map((expense) => ({
      Descripción: expense.description,
      Categoría: expense.category?.name || "N/A",
      Monto: expense.amount,
      Fecha: formatDate(expense.expense_date),
      Factura: expense.receipt_url ? "Sí" : "No",
      "Registrado por": expense.creator?.full_name || "N/A",
      Notas: expense.notes,
    }));
    exportToExcel(dataToExport, "gastos_reporte", "Gastos");
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
          Gestión de Gastos
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={handleExportToExcel}
            disabled={expenses.length === 0}
          >
            Exportar
          </Button>
          {hasPermission("merma.create") && (
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
          )}
        </Box>
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
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Categoría</InputLabel>
                <Select
                  name="category_id"
                  value={searchFilters.category_id || ""}
                  label="Categoría"
                  onChange={handleChangeFilter}
                >
                  <MenuItem value="">
                    <em>Todas</em>
                  </MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="Desde"
                type="date"
                name="date_from"
                value={searchFilters.date_from || ""}
                onChange={handleChangeFilter}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="Hasta"
                type="date"
                name="date_to"
                value={searchFilters.date_to || ""}
                onChange={handleChangeFilter}
                InputLabelProps={{ shrink: true }}
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
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((expense) => (
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
                          label={expense.category?.name || "N/A"}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, color: "error.main" }}
                        >
                          -{formatCurrency(expense.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>{formatDate(expense.expense_date)}</TableCell>
                      <TableCell>
                        {expense.receipt_path ? (
                          <Link
                            href={`${API_STORAGE_URL}/${expense.receipt_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Chip
                              label="Ver Factura"
                              size="small"
                              icon={<ReceiptIcon />}
                              variant="outlined"
                              clickable
                            />
                          </Link>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Sin factura
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {expense.creator?.full_name || "N/A"}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {hasPermission("merma.edit") && (
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(expense)}
                          >
                            <EditIcon />
                          </IconButton>
                        )}
                        {hasPermission("merma.delete") && (
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteExpense(expense.id)}
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
                  setFormData({ ...formData, description: e.target.value })
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
                  setFormData({ ...formData, amount: e.target.value })
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
                    setFormData({ ...formData, category_id: e.target.value })
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
                  setFormData({ ...formData, expense_date: e.target.value })
                }
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button
                variant="outlined"
                component="label"
                fullWidth
                startIcon={<UploadIcon />}
              >
                Subir Factura
                <input type="file" hidden onChange={handleFileChange} accept="image/*,application/pdf" />
              </Button>
              {receiptFile && (
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <Typography variant="body2" sx={{ mr: 1 }}>{receiptFile.name}</Typography>
                  <IconButton size="small" onClick={() => setReceiptFile(null)}>
                    <ClearIcon />
                  </IconButton>
                </Box>
              )}
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notas Adicionales"
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={isSubmitting}>Cancelar</Button>
          <Button
            onClick={handleSaveExpense}
            variant="contained"
            disabled={
              !formData.description || !formData.amount || !formData.category_id || isSubmitting
            }
            sx={{
              background: "linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)",
            }}
            startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {editingExpense ? "Actualizar" : "Registrar"} Gasto
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
