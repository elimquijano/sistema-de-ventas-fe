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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Alert,
  FormControlLabel,
  Switch,
} from "@mui/material";
import { TreeView, TreeItem } from "@mui/x-tree-view";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { modulesAPI, permissionsAPI } from "../utils/api";
import { formatDate } from "../utils/formatters";
import { confirmSwal, notificationSwal } from "../utils/swal-helpers";
import { getIcon, availableIcons } from "../config/moduleConfig";

const moduleTypes = [
  { value: "module", label: "Module" },
  { value: "group", label: "Group" },
  { value: "page", label: "Page" },
  { value: "button", label: "Button" },
];

const statusOptions = [
  { value: "active", label: "Active", color: "success" },
  { value: "inactive", label: "Inactive", color: "default" },
];

export const Modules = () => {
  const { hasPermission } = useAuth();
  const [modules, setModules] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchFilters, setSearchFilters] = useState({});
  const [openDialog, setOpenDialog] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [treeData, setTreeData] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    icon: "",
    route: "",
    component: "",
    permission: "",
    sort_order: 0,
    parent_id: null,
    type: "module",
    status: "active",
    show_in_menu: true,
    auto_create_permissions: true,
  });
  const [error, setError] = useState("");

  useEffect(() => {
    loadModules();
    loadModuleTree();
    loadPermissions();
  }, []);

  const loadModules = async () => {
    try {
      setLoading(true);
      const params = {
        ...searchFilters,
      };
      const response = await modulesAPI.getAll(params);
      // Fix: Extract the actual modules array from the nested response
      const modulesData = response.data?.data?.data || response.data?.data || [];
      setModules(modulesData);
    } catch (error) {
      console.error("Error loading modules:", error);
      setError("Error al cargar los módulos");
    } finally {
      setLoading(false);
    }
  };

  const loadModuleTree = async () => {
    try {
      const response = await modulesAPI.getTree();
      setTreeData(response.data.data || []);
    } catch (error) {
      console.error("Error loading module tree:", error);
    }
  };

  const loadPermissions = async () => {
    try {
      const response = await permissionsAPI.getAll();
      setPermissions(response.data.data || []);
    } catch (error) {
      console.error("Error loading permissions:", error);
    }
  };

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      loadModules();
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchFilters]);

  const handleOpenDialog = (module) => {
    if (module) {
      setEditingModule(module);
      setFormData({
        name: module.name,
        slug: module.slug,
        description: module.description || "",
        icon: module.icon || "",
        route: module.route || "",
        component: module.component || "",
        permission: module.permission || "",
        sort_order: module.sort_order || 0,
        parent_id: module.parent_id,
        type: module.type,
        status: module.status,
        show_in_menu: module.show_in_menu ?? true,
        auto_create_permissions: module.auto_create_permissions ?? true,
      });
    } else {
      setEditingModule(null);
      setFormData({
        name: "",
        slug: "",
        description: "",
        icon: "",
        route: "",
        component: "",
        permission: "",
        sort_order: 0,
        parent_id: null,
        type: "module",
        status: "active",
        show_in_menu: true,
        auto_create_permissions: true,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingModule(null);
    setError("");
  };

  const handleSaveModule = async () => {
    try {
      setError("");

      if (editingModule) {
        await modulesAPI.update(editingModule.id, formData);
        notificationSwal(
          "Módulo Actualizado",
          "El módulo ha sido actualizado exitosamente.",
          "success"
        );
      } else {
        await modulesAPI.create(formData);
        notificationSwal(
          "Módulo Creado",
          "El nuevo módulo ha sido creado exitosamente.",
          "success"
        );
      }

      handleCloseDialog();
      loadModules();
      loadModuleTree();
    } catch (error) {
      console.error("Error saving module:", error);
      setError(error.response?.data?.message || "Error al guardar el módulo");
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

  const handleDeleteModule = async (moduleId) => {
    const module = modules.find((m) => m.id === moduleId);

    const userConfirmed = await confirmSwal(
      "¿Estás seguro?",
      `Esta acción eliminará el módulo "${module?.name}" y todos sus submódulos. Esta acción no se puede deshacer.`,
      {
        confirmButtonText: "Sí, eliminar",
        icon: "warning",
      }
    );

    if (userConfirmed) {
      try {
        await modulesAPI.delete(moduleId);
        notificationSwal(
          "Módulo Eliminado",
          "El módulo ha sido eliminado exitosamente.",
          "success"
        );
        loadModules();
        loadModuleTree();
      } catch (error) {
        console.error("Error deleting module:", error);
        notificationSwal(
          "Error",
          error.response?.data?.message || "Error al eliminar el módulo.",
          "error"
        );
      }
    }
  };

  const getStatusColor = (status) => {
    const statusConfig = statusOptions.find((s) => s.value === status);
    return statusConfig ? statusConfig.color : "default";
  };

  const getTypeIcon = (type) => {
    const typeConfig = moduleTypes.find((t) => t.value === type);
    return typeConfig ? typeConfig.label : type;
  };

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleNameChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      name: value,
      slug: prev.slug || generateSlug(value),
    }));
  };

  const renderTreeItem = (node) => (
    <TreeItem
      key={node.id}
      nodeId={node.id.toString()}
      label={
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 1 }}>
          {getIcon(node.icon)}
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {node.name}
          </Typography>
          <Chip
            label={node.type}
            size="small"
            variant="outlined"
            sx={{ ml: 1 }}
          />
          <Chip
            label={node.status}
            size="small"
            color={getStatusColor(node.status)}
            sx={{ ml: 0.5 }}
          />
        </Box>
      }
    >
      {node.children && node.children.map((child) => renderTreeItem(child))}
    </TreeItem>
  );

  const parentModules = modules.filter((module) => !module.parent_id);

  if (loading && modules.length === 0) {
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
          Módulos del Sistema
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <IconButton
            onClick={() => {
              loadModules();
              loadModuleTree();
            }}
          >
            <RefreshIcon />
          </IconButton>
          {hasPermission("system.modules") && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              sx={{
                background: "linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)",
              }}
            >
              Agregar Módulo
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Module Tree */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Jerarquía de Módulos
              </Typography>
              {treeData.length > 0 ? (
                <TreeView
                  defaultCollapseIcon={<ExpandMoreIcon />}
                  defaultExpandIcon={<ChevronRightIcon />}
                  sx={{ flexGrow: 1, maxWidth: 400, overflowY: "auto" }}
                >
                  {treeData.map((node) => renderTreeItem(node))}
                </TreeView>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No se encontraron módulos
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Module List */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    placeholder="Buscar módulos..."
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
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Tipo</InputLabel>
                    <Select
                      label="Tipo"
                      name="type"
                      value={searchFilters.type || ""}
                      onChange={handleChangeFilter}
                    >
                      <MenuItem value="">Todos los Tipos</MenuItem>
                      {moduleTypes.map((type) => (
                        <MenuItem key={type.value} value={type.value}>
                          {type.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Estado</InputLabel>
                    <Select
                      label="Estado"
                      name="status"
                      value={searchFilters.status || ""}
                      onChange={handleChangeFilter}
                    >
                      <MenuItem value="">Todos los Estados</MenuItem>
                      {statusOptions.map((status) => (
                        <MenuItem key={status.value} value={status.value}>
                          {status.label}
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
                      <TableCell>Módulo</TableCell>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Ruta</TableCell>
                      <TableCell>Padre</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Creado</TableCell>
                      <TableCell align="right">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {modules.map((module) => (
                      <TableRow key={module.id}>
                        <TableCell>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            {getIcon(module.icon)}
                            <Box>
                              <Typography
                                variant="subtitle2"
                                sx={{ fontWeight: 600 }}
                              >
                                {module.name}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {module.slug}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getTypeIcon(module.type)}
                            size="small"
                            variant="outlined"
                            sx={{ textTransform: "capitalize" }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                            {module.route || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {module.parent ? (
                            <Typography variant="body2">
                              {module.parent.name}
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Raíz
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={module.status}
                            size="small"
                            color={getStatusColor(module.status)}
                            sx={{ textTransform: "capitalize" }}
                          />
                        </TableCell>
                        <TableCell>{formatDate(module.created_at)}</TableCell>
                        <TableCell align="right">
                          {hasPermission("system.modules") && (
                            <>
                              <IconButton
                                size="small"
                                onClick={() => handleOpenDialog(module)}
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteModule(module.id)}
                                color="error"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Add/Edit Module Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingModule ? "Editar Módulo" : "Agregar Nuevo Módulo"}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nombre del Módulo"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Slug"
                value={formData.slug}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, slug: e.target.value }))
                }
                helperText="Identificador amigable para URL"
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
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Icono</InputLabel>
                <Select
                  value={formData.icon}
                  label="Icono"
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, icon: e.target.value }))
                  }
                >
                  <MenuItem value="">Sin icono</MenuItem>
                  {availableIcons.map((icon) => (
                    <MenuItem key={icon.value} value={icon.value}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        {icon.icon}
                        {icon.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Orden"
                type="number"
                value={formData.sort_order}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    sort_order: parseInt(e.target.value) || 0,
                  }))
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Ruta"
                value={formData.route}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, route: e.target.value }))
                }
                helperText="Ej: /dashboard/inventory/products"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Componente"
                value={formData.component}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, component: e.target.value }))
                }
                helperText="Ej: ProductList"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Permiso Específico"
                value={formData.permission}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, permission: e.target.value }))
                }
                helperText="Ej: inventory.products.view"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Módulo Padre</InputLabel>
                <Select
                  value={formData.parent_id || ""}
                  label="Módulo Padre"
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      parent_id: e.target.value || null,
                    }))
                  }
                >
                  <MenuItem value="">Ninguno (Nivel Raíz)</MenuItem>
                  {parentModules.map((module) => (
                    <MenuItem key={module.id} value={module.id}>
                      {module.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={formData.type}
                  label="Tipo"
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, type: e.target.value }))
                  }
                  required
                >
                  {moduleTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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
                  required
                >
                  {statusOptions.map((status) => (
                    <MenuItem key={status.value} value={status.value}>
                      {status.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.show_in_menu}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, show_in_menu: e.target.checked }))
                      }
                    />
                  }
                  label="Mostrar en Menú"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.auto_create_permissions}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, auto_create_permissions: e.target.checked }))
                      }
                    />
                  }
                  label="Crear Permisos Automáticamente"
                />
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button
            onClick={handleSaveModule}
            variant="contained"
            disabled={!formData.name || !formData.slug}
            sx={{
              background: "linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)",
            }}
          >
            {editingModule ? "Actualizar" : "Crear"} Módulo
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};