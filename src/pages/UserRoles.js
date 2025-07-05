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
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  Divider,
  CircularProgress,
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Security as SecurityIcon,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { rolesAPI, permissionsAPI } from "../utils/api";
import { formatDate } from "../utils/formatters";
import Swal from "sweetalert2";
import { confirmSwal, notificationSwal } from "../utils/swal-helpers";

export const UserRoles = () => {
  const { hasPermission } = useAuth();
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permission_ids: [],
    status: "active",
  });

  useEffect(() => {
    loadRoles();
    loadPermissions();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const params = {
        search: searchTerm,
      };
      const response = await rolesAPI.getAll(params);
      setRoles(response.data.data || []);
    } catch (error) {
      console.error("Error loading roles:", error);
      notificationSwal("Error", "Error al cargar los roles.", "error");
    } finally {
      setLoading(false);
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
      loadRoles();
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

  const handleOpenDialog = async (role) => {
    if (role) {
      setEditingRole(role);
      try {
        // Cargar el rol completo con permisos
        const response = await rolesAPI.getById(role.id);
        const roleData = response.data;
        setFormData({
          name: roleData.name,
          description: roleData.description || "",
          permission_ids: roleData.permissions?.map((p) => p.id) || [],
          status: roleData.status || "active",
        });
      } catch (error) {
        console.error("Error loading role details:", error);
        setFormData({
          name: role.name,
          description: role.description || "",
          permission_ids: [],
          status: role.status || "active",
        });
      }
    } else {
      setEditingRole(null);
      setFormData({
        name: "",
        description: "",
        permission_ids: [],
        status: "active",
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingRole(null);
  };

  const handleSaveRole = async () => {
    try {
      if (editingRole) {
        await rolesAPI.update(editingRole.id, formData);
        notificationSwal(
          "Rol Actualizado",
          "El rol ha sido actualizado exitosamente",
          "success"
        );
      } else {
        await rolesAPI.create(formData);
        notificationSwal(
          "Rol Creado",
          "El rol ha sido creado exitosamente",
          "success"
        );
      }
      loadRoles();
    } catch (error) {
      console.error("Error saving role:", error);
      notificationSwal("Error", "Hubo un error al guardar el rol", "error");
    } finally {
      handleCloseDialog();
    }
  };

  const handleDeleteRole = async (roleId) => {
    const role = roles.find((r) => r.id === roleId);

    if (role.users_count > 0) {
      notificationSwal(
        "No se puede eliminar el rol",
        `Este rol está asignado a ${role.users_count} usuario(s). Por favor, reasigne los usuarios antes de eliminar.`,
        "warning"
      );
      return;
    }

    const confirmUser = await confirmSwal(
      "¿Estás seguro?",
      "Esta acción no se puede deshacer.",
      {
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar",
      }
    );

    if (confirmUser) {
      try {
        await rolesAPI.delete(roleId);
        notificationSwal(
          "Rol Eliminado",
          "El rol ha sido eliminado exitosamente",
          "success"
        );
        loadRoles();
      } catch (error) {
        console.error("Error deleting role:", error);
        notificationSwal("Error", "Hubo un error al eliminar el rol", "error");
      }
    }
  };

  const handlePermissionChange = (permissionId) => {
    setFormData((prev) => ({
      ...prev,
      permission_ids: prev.permission_ids.includes(permissionId)
        ? prev.permission_ids.filter((p) => p !== permissionId)
        : [...prev.permission_ids, permissionId],
    }));
  };

  const getStatusColor = (status) => {
    return status === "active" ? "success" : "default";
  };

  const groupedPermissions = permissions.reduce((acc, permission) => {
    const module = permission.module || "Other";
    if (!acc[module]) {
      acc[module] = [];
    }
    acc[module].push(permission);
    return acc;
  }, {});

  if (loading && roles.length === 0) {
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
          Roles
        </Typography>
        {hasPermission("users.roles") && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{
              background: "linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)",
            }}
          >
            Agregar Rol
          </Button>
        )}
      </Box>

      <Card>
        <CardContent>
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              placeholder="Buscar roles..."
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
                  <TableCell>Nombre del Rol</TableCell>
                  <TableCell>Descripcion</TableCell>
                  <TableCell>Permisos</TableCell>
                  <TableCell>Usuarios</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Creado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <SecurityIcon color="primary" />
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: 600 }}
                        >
                          {role.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {role.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {role.permissions_count || 0} permisos
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${role.users_count || 0} usuarios`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={role.status || "active"}
                        size="small"
                        color={getStatusColor(role.status)}
                        sx={{ textTransform: "capitalize" }}
                      />
                    </TableCell>
                    <TableCell>{formatDate(role.created_at)}</TableCell>
                    <TableCell align="right">
                      {hasPermission("users.roles") && (
                        <>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(role)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteRole(role.id)}
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

      {/* Add/Edit Role Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingRole ? "Editar Rol" : "Agregar Nuevo Rol"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nombre del Rol"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
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
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descripcion"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Permisos
              </Typography>
              {Object.entries(groupedPermissions).map(
                ([module, modulePermissions]) => (
                  <Box key={module} sx={{ mb: 2 }}>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 600, mb: 1 }}
                    >
                      {module}
                    </Typography>
                    <List dense>
                      {modulePermissions.map((permission) => (
                        <ListItem key={permission.id} sx={{ py: 0 }}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={formData.permission_ids.includes(
                                  permission.id
                                )}
                                onChange={() =>
                                  handlePermissionChange(permission.id)
                                }
                              />
                            }
                            label={permission.display_name || permission.name}
                          />
                        </ListItem>
                      ))}
                    </List>
                    <Divider />
                  </Box>
                )
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button
            onClick={handleSaveRole}
            variant="contained"
            disabled={!formData.name || !formData.description}
            sx={{
              background: "linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)",
            }}
          >
            {editingRole ? "Actualizar" : "Crear"} Rol
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
