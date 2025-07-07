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
  CircularProgress,
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { confirmSwal, notificationSwal } from "../utils/swal-helpers";
import { categoriesAPI } from "../utils/api";

export const Categories = () => {
  const { hasPermission } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "product", // Default type
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await categoriesAPI.getAll();
      setCategories(response.data);
    } catch (error) {
      console.error("Error loading categories:", error);
      notificationSwal(
        "Error",
        "Hubo un error al cargar las categorías.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        type: category.type,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: "",
        type: "product",
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCategory(null);
  };

  const handleSaveCategory = async () => {
    try {
      if (editingCategory) {
        await categoriesAPI.update(editingCategory.id, formData);
        notificationSwal(
          "Categoría Actualizada",
          "La categoría ha sido actualizada exitosamente.",
          "success"
        );
      } else {
        await categoriesAPI.create(formData);
        notificationSwal(
          "Categoría Creada",
          "La nueva categoría ha sido creada exitosamente.",
          "success"
        );
      }
      handleCloseDialog();
      loadCategories();
    } catch (error) {
      console.error("Error saving category:", error);
      notificationSwal("Error", "Error al guardar la categoría.", "error");
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    const userConfirmed = await confirmSwal(
      "¿Estás seguro?",
      "Esta acción eliminará la categoría permanentemente.",
      {
        confirmButtonText: "Sí, eliminar",
        icon: "warning",
      }
    );

    if (userConfirmed) {
      try {
        await categoriesAPI.delete(categoryId);
        notificationSwal(
          "Categoría Eliminada",
          "La categoría ha sido eliminada exitosamente.",
          "success"
        );
        loadCategories();
      } catch (error) {
        console.error("Error deleting category:", error);
        notificationSwal("Error", "Error al eliminar la categoría.", "error");
      }
    }
  };

  const filteredCategories = categories.filter((category) => {
    const matchesSearch = category.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesType = !typeFilter || category.type === typeFilter;
    return matchesSearch && matchesType;
  });

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
          Categorías
        </Typography>
        {hasPermission("categorias.create") && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{
              background: "linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)",
            }}
          >
            Agregar Categoría
          </Button>
        )}
      </Box>

      <Card>
        <CardContent>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Buscar categorías..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={typeFilter}
                  label="Tipo"
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <MenuItem value="">Todos los Tipos</MenuItem>
                  <MenuItem value="product">Producto</MenuItem>
                  <MenuItem value="service">Servicio</MenuItem>
                  <MenuItem value="expense">Gasto</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {category.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={category.type}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {hasPermission("categorias.edit") && (
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(category)}
                        >
                          <EditIcon />
                        </IconButton>
                      )}
                      {hasPermission("categorias.delete") && (
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteCategory(category.id)}
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
        </CardContent>
      </Card>

      {/* Dialog para crear/editar categoría */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingCategory ? "Editar Categoría" : "Agregar Nueva Categoría"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nombre de la Categoría"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={formData.type}
                  label="Tipo"
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, type: e.target.value }))
                  }
                >
                  <MenuItem value="product">Producto</MenuItem>
                  <MenuItem value="service">Servicio</MenuItem>
                  <MenuItem value="expense">Gasto</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button
            onClick={handleSaveCategory}
            variant="contained"
            disabled={!formData.name}
            sx={{
              background: "linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)",
            }}
          >
            {editingCategory ? "Actualizar" : "Crear"} Categoría
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
