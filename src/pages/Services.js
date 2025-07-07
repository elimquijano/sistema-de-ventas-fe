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
  Avatar,
  CircularProgress,
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Build as BuildIcon,
  AccessTime as AccessTimeIcon,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { formatCurrency } from "../utils/formatters";
import { confirmSwal, notificationSwal } from "../utils/swal-helpers";
import { categoriesAPI, servicesAPI } from "../utils/api";

export const Services = () => {
  const { hasPermission } = useAuth();
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category_id: "",
    price: "",
    duration: "",
    status: "active",
  });

  useEffect(() => {
    loadServices();
    loadCategories();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      const response = await servicesAPI.getAll();
      setServices(response.data.data);
    } catch (error) {
      console.error("Error loading services:", error);
      notificationSwal(
        "Error",
        "Hubo un error al cargar los servicios.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await categoriesAPI.getAll({ type: 'service' });
      setCategories(response.data);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const handleOpenDialog = (service) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        description: service.description,
        category_id: service.category_id,
        price: service.price.toString(),
        duration: service.duration.toString(),
        status: service.status,
      });
    } else {
      setEditingService(null);
      setFormData({
        name: "",
        description: "",
        category_id: "",
        price: "",
        duration: "",
        status: "active",
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingService(null);
  };

  const handleSaveService = async () => {
    try {
      if (editingService) {
        await servicesAPI.update(editingService.id, formData);
        notificationSwal(
          "Servicio Actualizado",
          "El servicio ha sido actualizado exitosamente.",
          "success"
        );
      } else {
        await servicesAPI.create(formData);
        notificationSwal(
          "Servicio Creado",
          "El nuevo servicio ha sido creado exitosamente.",
          "success"
        );
      }
      handleCloseDialog();
      loadServices();
    } catch (error) {
      console.error("Error saving service:", error);
      notificationSwal("Error", "Error al guardar el servicio.", "error");
    }
  };

  const handleDeleteService = async (serviceId) => {
    const userConfirmed = await confirmSwal(
      "¿Estás seguro?",
      "Esta acción eliminará el servicio permanentemente.",
      {
        confirmButtonText: "Sí, eliminar",
        icon: "warning",
      }
    );

    if (userConfirmed) {
      try {
        await servicesAPI.delete(serviceId);
        notificationSwal(
          "Servicio Eliminado",
          "El servicio ha sido eliminado exitosamente.",
          "success"
        );
        loadServices();
      } catch (error) {
        console.error("Error deleting service:", error);
        notificationSwal("Error", "Error al eliminar el servicio.", "error");
      }
    }
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
  };

  const filteredServices = services.filter((service) => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || service.category_id.toString() === categoryFilter;
    return matchesSearch && matchesCategory;
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
          Servicios
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{
            background: "linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)",
          }}
        >
          Agregar Servicio
        </Button>
      </Box>

      <Card>
        <CardContent>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Buscar servicios..."
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
                <InputLabel>Categoría</InputLabel>
                <Select
                  value={categoryFilter}
                  label="Categoría"
                  onChange={(e) => setCategoryFilter(e.target.value)}
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
          </Grid>

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Servicio</TableCell>
                  <TableCell>Categoría</TableCell>
                  <TableCell>Precio</TableCell>
                  <TableCell>Duración</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredServices.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 2 }}
                      >
                        <Avatar sx={{ bgcolor: "secondary.main" }}>
                          <BuildIcon />
                        </Avatar>
                        <Box>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 600 }}
                          >
                            {service.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {service.description}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={service.category}
                        size="small"
                        variant="outlined"
                        color="secondary"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatCurrency(service.price)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <AccessTimeIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {formatDuration(service.duration)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={service.status === "active" ? "Activo" : "Inactivo"}
                        size="small"
                        color={service.status === "active" ? "success" : "default"}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(service)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteService(service.id)}
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
        </CardContent>
      </Card>

      {/* Dialog para crear/editar servicio */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingService ? "Editar Servicio" : "Agregar Nuevo Servicio"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nombre del Servicio"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />
            </Grid>
            <Grid item xs={12}>
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
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descripción"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Precio"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, price: e.target.value }))
                }
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Duración (minutos)"
                type="number"
                value={formData.duration}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, duration: e.target.value }))
                }
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Estado</InputLabel>
                <Select
                  value={formData.status}
                  label="Estado"
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, status: e.target.value }))
                  }
                >
                  <MenuItem value="active">Activo</MenuItem>
                  <MenuItem value="inactive">Inactivo</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button
            onClick={handleSaveService}
            variant="contained"
            disabled={!formData.name || !formData.price || !formData.duration}
            sx={{
              background: "linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)",
            }}
          >
            {editingService ? "Actualizar" : "Crear"} Servicio
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};