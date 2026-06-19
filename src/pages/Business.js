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
  Divider,
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  Store as StoreIcon,
  CloudUpload as CloudUploadIcon,
  Map as MapIcon,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { businessAPI, usersAPI } from "../utils/api";
import { formatDate } from "../utils/formatters";
import { confirmSwal, notificationSwal } from "../utils/swal-helpers";
import { MapComponent } from "../components/MapComponent";
import { compressImage } from "../utils/imageCompression";

export const Business = () => {
  const { hasPermission, user } = useAuth();
  const [businesses, setBusinesses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState(null);

  const [openMapDialog, setOpenMapDialog] = useState(false);
  const [tempLocation, setTempLocation] = useState(null);
  const [tempZoom, setTempZoom] = useState(13);
  const [locationMode, setLocationMode] = useState("manual");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    phone: "",
    email: "",
    tax_id: "",
    currency: "PEN",
    status: "active",
    user_id: "",
    image: null,
    latitude: "",
    longitude: "",
    zoom: 13,
  });

  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadBusinesses();
    loadUsers();
  }, []);

  const loadBusinesses = async () => {
    try {
      setLoading(true);
      const response = await businessAPI.getAll();
      setBusinesses(response.data.data);
    } catch (error) {
      console.error("Error loading businesses:", error);
      notificationSwal("Error", "Hubo un error al cargar los negocios.", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await usersAPI.getAll();
      setUsers(response.data.data || []);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const handleOpenDialog = (business) => {
    if (business) {
      setEditingBusiness(business);
      setFormData({
        name: business.name,
        description: business.description || "",
        address: business.address || "",
        phone: business.phone || "",
        email: business.email || "",
        tax_id: business.tax_id || "",
        currency: business.currency,
        status: business.status,
        user_id: business.user_id || "",
        image: null,
        latitude: business.latitude || "",
        longitude: business.longitude || "",
        zoom: business.zoom || 13,
      });
      setImagePreview(business.logo_url);
      if (business.latitude && business.longitude) {
        setTempLocation({ lat: parseFloat(business.latitude), lng: parseFloat(business.longitude) });
        setTempZoom(parseInt(business.zoom) || 13);
      } else {
        setTempLocation(null);
        setTempZoom(13);
      }
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
        user_id: "",
        image: null,
        latitude: "",
        longitude: "",
        zoom: 13,
      });
      setImagePreview(null);
      setTempLocation(null);
      setTempZoom(13);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingBusiness(null);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressedFile = await compressImage(file);
        setFormData((prev) => ({ ...prev, image: compressedFile }));
        setImagePreview(URL.createObjectURL(compressedFile));
      } catch (error) {
        console.error("Error al procesar la imagen:", error);
        setFormData((prev) => ({ ...prev, image: file }));
        setImagePreview(URL.createObjectURL(file));
      }
    }
  };

  const handleOpenMapPicker = () => {
    if (!tempLocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setTempLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
    setOpenMapDialog(true);
  };

  const handleConfirmLocation = () => {
    if (tempLocation) {
      setFormData(prev => ({
        ...prev,
        latitude: tempLocation.lat,
        longitude: tempLocation.lng,
        zoom: tempZoom
      }));
    }
    setOpenMapDialog(false);
  };

  const handleSaveBusiness = async () => {
    const data = new FormData();
    Object.keys(formData).forEach(key => {
      if (key === 'image') {
        if (formData.image) data.append('logo', formData.image);
      } else {
        data.append(key, formData[key] !== null ? formData[key] : '');
      }
    });

    try {
      setIsSubmitting(true);
      if (editingBusiness) {
        await businessAPI.update(editingBusiness.id, data);
        notificationSwal("Éxito", "Negocio actualizado correctamente", "success");
      } else {
        await businessAPI.create(data);
        notificationSwal("Éxito", "Negocio creado correctamente", "success");
      }
      setOpenDialog(false);
      loadBusinesses();
    } catch (error) {
      console.error("Error saving business:", error);
      notificationSwal("Error", "No se pudo guardar el negocio", "error");
    } finally {
      setIsSubmitting(false);
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
      setIsSubmitting(true);
      try {
        await businessAPI.delete(businessId);
        notificationSwal("Negocio Eliminado", "El negocio ha sido eliminado exitosamente.", "success");
        loadBusinesses();
      } catch (error) {
        console.error("Error deleting business:", error);
        notificationSwal("Error", "Error al eliminar el negocio.", "error");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const filteredBusinesses = businesses.filter((business) =>
    business.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    business.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    business.tax_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>Mi Negocio</Typography>
        {hasPermission("negocios.create") && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ background: "linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)" }}
          >
            Crear Negocio
          </Button>
        )}
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
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        {business.logo_url ? (
                          <Avatar src={business.logo_url} variant="rounded" sx={{ width: 40, height: 40 }} />
                        ) : (
                          <Avatar variant="rounded" sx={{ width: 40, height: 40, bgcolor: "primary.main" }}>
                            <StoreIcon />
                          </Avatar>
                        )}
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{business.name}</Typography>
                          <Typography variant="body2" color="text.secondary">{business.description}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{business.phone}</Typography>
                      <Typography variant="body2" color="text.secondary">{business.email}</Typography>
                    </TableCell>
                    <TableCell><Chip label={business.products_count} size="small" color="primary" /></TableCell>
                    <TableCell><Chip label={business.services_count} size="small" color="secondary" /></TableCell>
                    <TableCell><Chip label={business.sales_count} size="small" color="success" /></TableCell>
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
                      {hasPermission("negocios.edit") && (
                        <IconButton size="small" onClick={() => handleOpenDialog(business)}><EditIcon /></IconButton>
                      )}
                      {hasPermission("negocios.delete") && (
                        <IconButton size="small" onClick={() => handleDeleteBusiness(business.id)} color="error" disabled={isSubmitting}><DeleteIcon /></IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingBusiness ? "Editar Negocio" : "Crear Nuevo Negocio"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nombre del Negocio"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Moneda</InputLabel>
                <Select
                  value={formData.currency}
                  label="Moneda"
                  onChange={(e) => setFormData((prev) => ({ ...prev, currency: e.target.value }))}
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
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Dirección"
                value={formData.address}
                onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Teléfono"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="RUC/NIT/Tax ID"
                value={formData.tax_id}
                onChange={(e) => setFormData((prev) => ({ ...prev, tax_id: e.target.value }))}
              />
            </Grid>
            {hasPermission("negocios.create") && (
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Estado</InputLabel>
                  <Select
                    value={formData.status}
                    label="Estado"
                    onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
                  >
                    <MenuItem value="active">Activo</MenuItem>
                    <MenuItem value="inactive">Inactivo</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
            {hasPermission("negocios.create") && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Propietario</InputLabel>
                  <Select
                    value={formData.user_id}
                    label="Propietario"
                    onChange={(e) => setFormData((prev) => ({ ...prev, user_id: e.target.value }))}
                  >
                    <MenuItem value=""><em>Ninguno</em></MenuItem>
                    {users.map((user) => (
                      <MenuItem key={user.id} value={user.id}>{user.first_name} {user.last_name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }}>Identidad y Ubicación</Divider>
            </Grid>

            <Grid item xs={12} sm={8}>
              <Box sx={{ border: "1px dashed grey", borderRadius: 2, p: 1, textAlign: "center", position: "relative" }}>
                <Button component="label" startIcon={<CloudUploadIcon />} fullWidth>
                  {imagePreview ? "Cambiar Logo" : "Subir Logo del Negocio"}
                  <input type="file" hidden onChange={handleFileChange} accept="image/*" />
                </Button>
                {imagePreview && (
                  <Box sx={{ mt: 1, display: "flex", justifyContent: "center" }}>
                    <Avatar src={imagePreview} variant="rounded" sx={{ width: 80, height: 80 }} />
                  </Box>
                )}
              </Box>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<MapIcon />}
                onClick={handleOpenMapPicker}
                sx={{ height: "100%" }}
                color={formData.latitude ? "success" : "primary"}
              >
                {formData.latitude ? "Ubicación OK" : "Fijar Mapa"}
              </Button>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Latitud"
                value={formData.latitude}
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Longitud"
                value={formData.longitude}
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Zoom"
                type="number"
                value={formData.zoom}
                onChange={(e) => setFormData({ ...formData, zoom: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={isSubmitting}>Cancelar</Button>
          <Button
            onClick={handleSaveBusiness}
            variant="contained"
            disabled={!formData.name || isSubmitting}
            sx={{ background: "linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)" }}
            startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {editingBusiness ? "Actualizar" : "Crear"} Negocio
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openMapDialog} onClose={() => setOpenMapDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6" fontWeight="700">Fijar Ubicación y Zoom</Typography>
          <Typography variant="caption">Usa la rueda del ratón para ajustar el zoom</Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: 500 }}>
          <MapComponent 
            center={tempLocation}
            zoom={tempZoom}
            isPicker={true}
            locationMode={locationMode}
            onModeChange={setLocationMode}
            height="100%"
            onLocationSelect={(coords) => setTempLocation(coords)}
            onZoomSelect={(z) => setTempZoom(z)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMapDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleConfirmLocation}>Confirmar Ubicación</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
