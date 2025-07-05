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
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Article as ArticleIcon,
  Settings as SettingsIcon,
  Apps as AppsIcon,
  Widgets as WidgetsIcon,
  Group as GroupIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { permissionsAPI, modulesAPI } from "../utils/api";
import { formatDate } from "../utils/formatters";
import { confirmSwal, notificationSwal } from "../utils/swal-helpers";

const permissionTypes = [
  { value: "view", label: "View", color: "info" },
  { value: "create", label: "Create", color: "success" },
  { value: "edit", label: "Edit", color: "warning" },
  { value: "delete", label: "Delete", color: "error" },
  { value: "manage", label: "Manage", color: "primary" },
];

const moduleIcons = {
  Dashboard: <DashboardIcon />,
  Widget: <WidgetsIcon />,
  Users: <PeopleIcon />,
  Customer: <GroupIcon />,
  Application: <AppsIcon />,
  System: <SettingsIcon />,
  Other: <SecurityIcon />,
};

export const UserPermissions = () => {
  const { hasPermission } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchFilters, setSearchFilters] = useState({});
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPermission, setEditingPermission] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    display_name: "",
    module: "",
    module_id: null,
    type: "view",
    description: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    loadPermissions();
    loadModules();
  }, []);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const params = {
        ...searchFilters,
      };
      const response = await permissionsAPI.getAll(params);
      setPermissions(response.data.data || []);
    } catch (error) {
      console.error("Error loading permissions:", error);
      setError("Error al cargar los permisos");
    } finally {
      setLoading(false);
    }
  };

  const loadModules = async () => {
    try {
      const response = await modulesAPI.getAll();
      const modulesData =
        response.data?.data?.data || response.data?.data || [];
      setModules(modulesData);
    } catch (error) {
      console.error("Error loading modules:", error);
    }
  };

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      loadPermissions();
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchFilters]);

  const filteredPermissions = permissions.filter((permission) => {
    const matchesSearch =
      permission.display_name
        ?.toLowerCase()
        .includes((searchFilters.search || "").toLowerCase()) ||
      permission.name
        ?.toLowerCase()
        .includes((searchFilters.search || "").toLowerCase()) ||
      permission.description
        ?.toLowerCase()
        .includes((searchFilters.search || "").toLowerCase());
    const matchesModule =
      !searchFilters?.module || permission.module === searchFilters?.module;
    const matchesType =
      !searchFilters?.type || permission.type === searchFilters?.type;

    return matchesSearch && matchesModule && matchesType;
  });

  const groupedPermissions = filteredPermissions.reduce((acc, permission) => {
    const module = permission.module || "Other";
    if (!acc[module]) {
      acc[module] = [];
    }
    acc[module].push(permission);
    return acc;
  }, {});

  const handleChangeFilter = (event) => {
    const { name, value } = event.target;

    setSearchFilters((prevFilters) => {
      if (value === "") {
        const { [name]: _, ...newFilters } = prevFilters;
        return newFilters;
      }

      // Si no es vacío, devuelve el estado actualizado
      return { ...prevFilters, [name]: value };
    });
  };

  const handleOpenDialog = (permission) => {
    if (permission) {
      setEditingPermission(permission);
      setFormData({
        name: permission.name,
        display_name: permission.display_name || "",
        module: permission.module || "",
        module_id: permission.module_id || null,
        type: permission.type || "view",
        description: permission.description || "",
      });
    } else {
      setEditingPermission(null);
      setFormData({
        name: "",
        display_name: "",
        module: "",
        module_id: null,
        type: "view",
        description: "",
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingPermission(null);
    setError("");
  };

  const handleSavePermission = async () => {
    try {
      setError("");

      // Buscar el módulo por nombre si no se ha seleccionado module_id
      if (formData.module && !formData.module_id) {
        const module = modules.find((m) => m.name === formData.module);
        if (module) {
          formData.module_id = module.id;
        }
      }

      if (editingPermission) {
        await permissionsAPI.update(editingPermission.id, formData);
        notificationSwal(
          "Permiso Actualizado",
          "El permiso ha sido actualizado exitosamente.",
          "success"
        );
      } else {
        await permissionsAPI.create(formData);
        notificationSwal(
          "Permiso Creado",
          "El nuevo permiso ha sido creado exitosamente.",
          "success"
        );
      }

      handleCloseDialog();
      loadPermissions();
    } catch (error) {
      console.error("Error saving permission:", error);
      setError(error.response?.data?.message || "Error al guardar el permiso");
    }
  };

  const handleDeletePermission = async (permissionId) => {
    const permission = permissions.find((p) => p.id === permissionId);

    const userConfirmed = await confirmSwal(
      "¿Estás seguro?",
      `Esta acción eliminará el permiso "${
        permission?.display_name || permission?.name
      }". Esta acción no se puede deshacer.`,
      {
        confirmButtonText: "Sí, eliminar",
        icon: "warning",
      }
    );

    if (userConfirmed) {
      try {
        await permissionsAPI.delete(permissionId);
        notificationSwal(
          "Permiso Eliminado",
          "El permiso ha sido eliminado exitosamente.",
          "success"
        );
        loadPermissions();
      } catch (error) {
        console.error("Error deleting permission:", error);
        notificationSwal(
          "Error",
          error.response?.data?.message || "Error al eliminar el permiso.",
          "error"
        );
      }
    }
  };

  const getTypeColor = (type) => {
    const typeConfig = permissionTypes.find((t) => t.value === type);
    return typeConfig ? typeConfig.color : "default";
  };

  const getModuleIcon = (moduleName) => {
    return moduleIcons[moduleName] || <SecurityIcon />;
  };

  const generatePermissionName = (module, type, displayName) => {
    if (!module || !type) return "";

    const moduleSlug = module.toLowerCase().replace(/\s+/g, "");
    const action = type === "manage" ? "manage" : type;

    return `${moduleSlug}.${action}`;
  };

  const handleModuleChange = (module) => {
    setFormData((prev) => {
      const selectedModule = modules.find((m) => m.name === module);
      const newName = generatePermissionName(
        module,
        prev.type,
        prev.display_name
      );

      return {
        ...prev,
        module,
        module_id: selectedModule?.id || null,
        name: newName || prev.name,
      };
    });
  };

  const handleTypeChange = (type) => {
    setFormData((prev) => {
      const newName = generatePermissionName(
        prev.module,
        type,
        prev.display_name
      );

      return {
        ...prev,
        type,
        name: newName || prev.name,
      };
    });
  };

  const uniqueModules = [...new Set(modules.map((m) => m.name))];

  if (loading && permissions.length === 0) {
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
          Permisos de Usuario
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <IconButton
            onClick={() => {
              loadPermissions();
              loadModules();
            }}
          >
            <RefreshIcon />
          </IconButton>
          {hasPermission("users.permissions") && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              sx={{
                background: "linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)",
              }}
            >
              Agregar Permiso
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Buscar permisos..."
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
                <InputLabel>Módulo</InputLabel>
                <Select
                  label="Módulo"
                  name="module"
                  value={searchFilters.module || ""}
                  onChange={handleChangeFilter}
                >
                  <MenuItem value="">Todos los Módulos</MenuItem>
                  {uniqueModules.map((module) => (
                    <MenuItem key={module} value={module}>
                      {module}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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
                  {permissionTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Grouped Permissions */}
      {Object.entries(groupedPermissions).map(
        ([moduleName, modulePermissions]) => (
          <Accordion key={moduleName} defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {getModuleIcon(moduleName)}
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {moduleName} ({modulePermissions.length})
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Permiso</TableCell>
                      <TableCell>Nombre para Mostrar</TableCell>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Descripción</TableCell>
                      <TableCell>Creado</TableCell>
                      <TableCell align="right">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {modulePermissions.map((permission) => (
                      <TableRow key={permission.id}>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              fontFamily: "monospace",
                              fontSize: "0.75rem",
                            }}
                          >
                            {permission.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 600 }}
                          >
                            {permission.display_name || permission.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={permission.type || "view"}
                            size="small"
                            color={getTypeColor(permission.type)}
                            sx={{ textTransform: "capitalize" }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {permission.description}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {formatDate(permission.created_at)}
                        </TableCell>
                        <TableCell align="right">
                          {hasPermission("users.permissions") && (
                            <>
                              <IconButton
                                size="small"
                                onClick={() => handleOpenDialog(permission)}
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() =>
                                  handleDeletePermission(permission.id)
                                }
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
            </AccordionDetails>
          </Accordion>
        )
      )}

      {/* Add/Edit Permission Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingPermission ? "Editar Permiso" : "Agregar Nuevo Permiso"}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nombre del Permiso"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="ej. users.view"
                helperText="Usar notación de punto (modulo.accion)"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nombre para Mostrar"
                value={formData.display_name}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    display_name: e.target.value,
                  }))
                }
                placeholder="ej. Ver Usuarios"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Módulo</InputLabel>
                <Select
                  value={formData.module}
                  label="Módulo"
                  onChange={(e) => handleModuleChange(e.target.value)}
                  required
                >
                  {uniqueModules.map((module) => (
                    <MenuItem key={module} value={module}>
                      {module}
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
                  onChange={(e) => handleTypeChange(e.target.value)}
                  required
                >
                  {permissionTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
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
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Describe qué permite este permiso"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button
            onClick={handleSavePermission}
            variant="contained"
            disabled={
              !formData.name || !formData.display_name || !formData.module
            }
            sx={{
              background: "linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)",
            }}
          >
            {editingPermission ? "Actualizar" : "Crear"} Permiso
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
