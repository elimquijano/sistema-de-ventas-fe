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
  Tooltip,
  Avatar,
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Inventory as InventoryIcon,
  History as HistoryIcon,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { formatCurrency } from "../utils/formatters";
import { confirmSwal, notificationSwal } from "../utils/swal-helpers";
import { assetsAPI } from "../utils/api";
import { AuditTimeline } from "../components/AuditTimeline";

export const Assets = () => {
  const { hasPermission } = useAuth();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Timeline State
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [timelineLogs, setTimelineLogs] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [selectedAssetName, setSelectedAssetName] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "",
    total_quantity: "",
    available_quantity: "",
    unit_price: "",
    status: "active",
  });

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    try {
      setLoading(true);
      const response = await assetsAPI.getAll();
      setAssets(response.data.data);
    } catch (error) {
      console.error("Error loading assets:", error);
      notificationSwal(
        "Error",
        "Hubo un error al cargar los activos.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (asset = null) => {
    if (asset) {
      setEditingAsset(asset);
      setFormData({
        name: asset.name,
        description: asset.description || "",
        type: asset.type || "",
        total_quantity: asset.total_quantity.toString(),
        available_quantity: asset.available_quantity.toString(),
        unit_price: asset.unit_price ? asset.unit_price.toString() : "",
        status: asset.status,
      });
    } else {
      setEditingAsset(null);
      setFormData({
        name: "",
        description: "",
        type: "",
        total_quantity: "",
        available_quantity: "",
        unit_price: "",
        status: "active",
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingAsset(null);
  };

  const handleSaveAsset = async () => {
    setIsSubmitting(true);
    try {
      const data = {
        ...formData,
        total_quantity: parseInt(formData.total_quantity),
        available_quantity: parseInt(formData.available_quantity),
        unit_price: formData.unit_price ? parseFloat(formData.unit_price) : null,
      };

      if (editingAsset) {
        await assetsAPI.update(editingAsset.id, data);
        notificationSwal(
          "Activo Actualizado",
          "El activo ha sido actualizado exitosamente.",
          "success"
        );
      } else {
        await assetsAPI.create(data);
        notificationSwal(
          "Activo Creado",
          "El nuevo activo ha sido creado exitosamente.",
          "success"
        );
      }
      handleCloseDialog();
      loadAssets();
    } catch (error) {
      console.error("Error saving asset:", error);
      notificationSwal("Error", "Error al guardar el activo.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAsset = async (assetId) => {
    const userConfirmed = await confirmSwal(
      "¿Estás seguro?",
      "Esta acción eliminará el activo permanentemente.",
      {
        confirmButtonText: "Sí, eliminar",
        icon: "warning",
      }
    );

    if (userConfirmed) {
      setIsSubmitting(true);
      try {
        await assetsAPI.delete(assetId);
        notificationSwal(
          "Activo Eliminado",
          "El activo ha sido eliminado exitosamente.",
          "success"
        );
        loadAssets();
      } catch (error) {
        console.error("Error deleting asset:", error);
        notificationSwal("Error", "Error al eliminar el activo.", "error");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleOpenTimeline = async (asset) => {
    setSelectedAssetName(asset.name);
    setTimelineOpen(true);
    setLoadingTimeline(true);
    try {
      const response = await assetsAPI.getTimeline(asset.id);
      setTimelineLogs(response.data || []);
    } catch (error) {
      console.error("Error loading timeline:", error);
      notificationSwal("Error", "No se pudo cargar el historial.", "error");
    } finally {
      setLoadingTimeline(false);
    }
  };

  const getStatusChip = (status) => {
    const styles = {
      active: { label: "Activo", color: "success" },
      inactive: { label: "Inactivo", color: "default" },
      maintenance: { label: "Mantenimiento", color: "warning" },
      lost: { label: "Perdido", color: "error" },
    };
    const style = styles[status] || styles.active;
    return <Chip label={style.label} size="small" color={style.color} />;
  };

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (asset.description && asset.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = !typeFilter || asset.type === typeFilter;
    const matchesStatus = !statusFilter || asset.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Gestión de Activos
        </Typography>
        {hasPermission("assets.create") && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ background: "linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)" }}
          >
            Agregar Activo
          </Button>
        )}
      </Box>

      <Card>
        <CardContent>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Buscar activos..."
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
                <InputLabel>Estado</InputLabel>
                <Select
                  value={statusFilter}
                  label="Estado"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="active">Activo</MenuItem>
                  <MenuItem value="maintenance">Mantenimiento</MenuItem>
                  <MenuItem value="lost">Perdido</MenuItem>
                  <MenuItem value="inactive">Inactivo</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Activo</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Cantidad Total</TableCell>
                    <TableCell>Disponible</TableCell>
                    <TableCell>Precio Unit.</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAssets.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <Avatar sx={{ bgcolor: 'primary.light' }}>
                            <InventoryIcon />
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {asset.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {asset.description}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={asset.type || "N/A"} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{asset.total_quantity}</TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            color: asset.available_quantity > 0 ? "success.main" : "error.main",
                          }}
                        >
                          {asset.available_quantity}
                        </Typography>
                      </TableCell>
                      <TableCell>{asset.unit_price ? formatCurrency(asset.unit_price) : "N/A"}</TableCell>
                      <TableCell>{getStatusChip(asset.status)}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Ver Historial">
                          <IconButton size="small" onClick={() => handleOpenTimeline(asset)}>
                            <HistoryIcon />
                          </IconButton>
                        </Tooltip>
                        {hasPermission("assets.edit") && (
                          <IconButton size="small" onClick={() => handleOpenDialog(asset)}>
                            <EditIcon />
                          </IconButton>
                        )}
                        {hasPermission("assets.delete") && (
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteAsset(asset.id)}
                            color="error"
                            disabled={isSubmitting}
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
          )}
        </CardContent>
      </Card>

      {/* Dialog para crear/editar activo */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingAsset ? "Editar Activo" : "Agregar Nuevo Activo"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nombre del Activo"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descripción"
                multiline
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Tipo"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                placeholder="ej: envase, herramienta"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Precio Unitario (Opcional)"
                type="number"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Cantidad Total"
                type="number"
                value={formData.total_quantity}
                onChange={(e) => setFormData({ ...formData, total_quantity: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Cantidad Disponible"
                type="number"
                value={formData.available_quantity}
                onChange={(e) => setFormData({ ...formData, available_quantity: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Estado</InputLabel>
                <Select
                  value={formData.status}
                  label="Estado"
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <MenuItem value="active">Activo</MenuItem>
                  <MenuItem value="maintenance">Mantenimiento</MenuItem>
                  <MenuItem value="lost">Perdido</MenuItem>
                  <MenuItem value="inactive">Inactivo</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={isSubmitting}>Cancelar</Button>
          <Button
            onClick={handleSaveAsset}
            variant="contained"
            disabled={!formData.name || !formData.total_quantity || isSubmitting}
            sx={{ background: "linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)" }}
          >
            {isSubmitting ? <CircularProgress size={24} /> : (editingAsset ? "Actualizar" : "Crear")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Timeline Dialog */}
      <Dialog open={timelineOpen} onClose={() => setTimelineOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryIcon color="primary" /> Historial: {selectedAssetName}
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
