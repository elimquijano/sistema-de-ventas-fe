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
  Business as BusinessIcon,
  Store as StoreIcon,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { businessAPI } from "../utils/api";
import { formatDate } from "../utils/formatters";
import { confirmSwal, notificationSwal } from "../utils/swal-helpers";

export const Business = () => {
  const { hasPermission, user } = useAuth();
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    phone: "",
    email: "",
    tax_id: "",
    currency: "PEN",
    status: "active",
  });

  useEffect(() => {
    loadBusinesses();
  }, []);

  const loadBusinesses = async () => {
    try {
      setLoading(true);
      const response = await businessAPI.getAll();
      setBusinesses(response.data.data);
    } catch (error) {
      console.error("Error loading businesses:", error);
      notificationSwal(
        "Error",
        "Hubo un error al cargar los negocios.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (business) => {
    if (business) {
      setEditingBusiness(business);
      setFormData({
        name: business.name,
        description: business.description,
        address: business.address,
        phone: business.phone,
        email: business.email,
        tax_id: business.tax_id,
        currency: business.currency,
        status: business.status,
      });
    } else {
      setEditingBusiness(null);
      setFormData({
        name: "",
        description: "",
        address: "",
        phone: "",
        email: "",
        tax_id: "",
        currency: "PEN",
        status: "active",
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingBusiness(null);
  };

  const handleSaveBusiness = async () => {
    try {
      if (editingBusiness) {
        await businessAPI.update(editingBusiness.id, formData);
        notificationSwal(
          "Negocio Actualizado",
          "El negocio ha sido actualizado exitosamente.",
          "success"
        );
      } else {
        await businessAPI.create(formData);
        notificationSwal(
          "Negocio Creado",
          "El nuevo negocio ha sido creado exitosamente.",
          "success"
        );
      }
      handleCloseDialog();
      loadBusinesses();
    } catch (error) {
      console.error("Error saving business:", error);
      notificationSwal("Error", "Error al guardar el negocio.", "error");
    }
  };

  const handleDeleteBusiness = async (businessId) => {
    const userConfirmed = await confirmSwal(
      "¿Estás seguro?",
      "Esta acción eliminará el negocio y todos sus datos asociados.",
      {
        confirmButtonText: "Sí, eliminar",
        icon: "warning",
      }
    );

    if (userConfirmed) {
      try {
        await businessAPI.delete(businessId);
        notificationSwal(
          "Negocio Eliminado",
          "El negocio ha sido eliminado exitosamente.",
          "success"
        );
        loadBusinesses();
      } catch (error) {
        console.error("Error deleting business:", error);
        notificationSwal("Error", "Error al eliminar el negocio.", "error");
      }
    }
  };

  const filteredBusinesses = businesses.filter((business) =>
    business.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          Mi Negocio
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{
            background: "linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)",
          }}
        >
          Crear Negocio
        </Button>
      </Box>

      <Card>
        <CardContent>
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              placeholder="Buscar negocios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ maxWidth: 400 }}
            />
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Negocio</TableCell>
                  <TableCell>Contacto</TableCell>
                  <TableCell>Productos</TableCell>
                  <TableCell>Servicios</TableCell>
                  <TableCell>Ventas</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Creado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredBusinesses.map((business) => (
                  <TableRow key={business.id}>
                    <TableCell>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 2 }}
                      >
                        <Avatar sx={{ bgcolor: "primary.main" }}>
                          <StoreIcon />
                        </Avatar>
                        <Box>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 600 }}
                          >
                            {business.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {business.description}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{business.phone}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {business.email}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={business.products_count}
                        size="small"
                        color="primary"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={business.services_count}
                        size="small"
                        color="secondary"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={business.sales_count}
                        size="small"
                        color="success"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={business.status}
                        size="small"
                        color={business.status === "active" ? "success" : "default"}
                        sx={{ textTransform: "capitalize" }}
                      />
                    </TableCell>
                    <TableCell>{formatDate(business.created_at)}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(business)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteBusiness(business.id)}
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

      {/* Dialog para crear/editar negocio */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingBusiness ? "Editar Negocio" : "Crear Nuevo Negocio"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nombre del Negocio"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Moneda</InputLabel>
                <Select
                  value={formData.currency}
                  label="Moneda"
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, currency: e.target.value }))
                  }
                >
                  <MenuItem value="PEN">PEN - Soles</MenuItem>
                  <MenuItem value="USD">USD - Dólar</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descripción"
                multiline
                rows={2}
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Dirección"
                value={formData.address}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, address: e.target.value }))
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Teléfono"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="RUC/NIT/Tax ID"
                value={formData.tax_id}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, tax_id: e.target.value }))
                }
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
            onClick={handleSaveBusiness}
            variant="contained"
            disabled={!formData.name}
            sx={{
              background: "linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)",
            }}
          >
            {editingBusiness ? "Actualizar" : "Crear"} Negocio
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};