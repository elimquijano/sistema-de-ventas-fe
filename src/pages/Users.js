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
  Avatar,
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
  Visibility as ViewIcon,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { usersAPI, rolesAPI, businessAPI } from "../utils/api";
import { formatDate } from "../utils/formatters";
import { confirmSwal, notificationSwal } from "../utils/swal-helpers";

export const Users = () => {
  const { hasPermission } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchFilters, setSearchFilters] = useState({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    status: "active",
    role_ids: [],
    business_id: "",
  });

  useEffect(() => {
    loadUsers();
    loadRoles();
    loadBusinesses();
  }, [page, searchFilters]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        ...searchFilters,
        per_page: 10,
      };
      const response = await usersAPI.getAll(params);
      setUsers(response.data.data || []);
      setTotalPages(response.data.last_page || 1);
    } catch (error) {
      console.error("Error loading users:", error);
      notificationSwal("Error", "No se pudo cargar los usuarios", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const response = await rolesAPI.getAll();
      setRoles(response.data.data || []);
    } catch (error) {
      console.error("Error loading roles:", error);
    }
  };

  const loadBusinesses = async () => {
    try {
      const response = await businessAPI.getAll();
      setBusinesses(response.data.data || []);
    } catch (error) {
      console.error("Error loading businesses:", error);
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

  const handleOpenDialog = (user) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        password: "",
        status: user.status,
        role_ids: user.roles?.map((role) => role.id) || [],
        business_id: user.business_id || "",
      });
    } else {
      setEditingUser(null);
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        status: "active",
        role_ids: [],
        business_id: "",
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
  };

  const handleSaveUser = async () => {
    setIsSubmitting(true);
    try {
      if (editingUser) {
        await usersAPI.update(editingUser.id, formData);
        notificationSwal(
          "¡Usuario Actualizado!",
          "El usuario ha sido actualizado exitosamente.",
          "success"
        );
      } else {
        await usersAPI.create(formData);
        notificationSwal(
          "¡Usuario Creado!",
          "El nuevo usuario ha sido creado exitosamente.",
          "success"
        );
      }
      loadUsers();
      handleCloseDialog();
    } catch (error) {
      console.error("Error al guardar el usuario:", error);
      notificationSwal(
        "¡Error!",
        error?.response?.data?.message || "Hubo un problema al guardar el usuario.",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    const userConfirmed = await confirmSwal(
      "¿Estás seguro?",
      "Esta acción no se puede deshacer.",
      {
        confirmButtonText: "Sí, eliminar",
        icon: "warning",
      }
    );

    if (userConfirmed) {
      setIsSubmitting(true);
      try {
        await usersAPI.delete(userId);
        notificationSwal(
          "¡Usuario Eliminado!",
          "El usuario ha sido eliminado exitosamente.",
          "success"
        );
        loadUsers();
      } catch (error) {
        console.error("Error deleting user:", error);
        notificationSwal(
          "¡Error!",
          error?.response?.data?.message || "Hubo un problema al eliminar el usuario.",
          "error"
        );
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "success";
      case "inactive":
        return "default";
      case "pending":
        return "warning";
      default:
        return "default";
    }
  };

  const getRoleColor = (roleName) => {
    switch (roleName) {
      case "Super Admin":
        return "error";
      case "Manager":
        return "warning";
      case "Content Editor":
        return "info";
      case "Data Analyst":
        return "secondary";
      default:
        return "primary";
    }
  };

  if (loading && users.length === 0) {
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
          Usuarios
        </Typography>
        {hasPermission("users.create") && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{
              background: "linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)",
            }}
          >
            Agregar Usuario
          </Button>
        )}
      </Box>

      <Card>
        <CardContent>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Buscar usuarios..."
                name="search"
                value={searchFilters?.search || ""}
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
                <InputLabel>Estado</InputLabel>
                <Select
                  name="status"
                  value={searchFilters?.status || ""}
                  label="Status"
                  onChange={handleChangeFilter}
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="active">Activo</MenuItem>
                  <MenuItem value="inactive">Inactivo</MenuItem>
                  <MenuItem value="pending">Pendiente</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Rol</InputLabel>
                <Select
                  name="role"
                  value={searchFilters?.role || ""}
                  label="Role"
                  onChange={handleChangeFilter}
                >
                  <MenuItem value="">Todos los roles</MenuItem>
                  {roles.map((role) => (
                    <MenuItem key={role.id} value={role.name}>
                      {role.name}
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
                  <TableCell>Usuario</TableCell>
                  <TableCell>Rol</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Último Inicio de Sesión</TableCell>
                  <TableCell>Creado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 2 }}
                      >
                        <Avatar sx={{ bgcolor: "primary.main" }}>
                          {user.first_name?.charAt(0)}
                          {user.last_name?.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 600 }}
                          >
                            {user.first_name} {user.last_name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {user.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {user.roles?.map((role) => (
                          <Chip
                            key={role.id}
                            label={role.name}
                            size="small"
                            color={getRoleColor(role.name)}
                            sx={{ textTransform: "capitalize" }}
                          />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.status}
                        size="small"
                        color={getStatusColor(user.status)}
                        sx={{ textTransform: "capitalize" }}
                      />
                    </TableCell>
                    <TableCell>
                      {user.last_login_at
                        ? formatDate(user.last_login_at)
                        : "Never"}
                    </TableCell>
                    <TableCell>{formatDate(user.created_at)}</TableCell>
                    <TableCell align="right">
                      {hasPermission("users.edit") && (
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(user)}
                        >
                          <EditIcon />
                        </IconButton>
                      )}
                      {hasPermission("users.delete") && (
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteUser(user.id)}
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

      {/* Add/Edit User Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingUser ? "Editar Usuario" : "Agregar Usuario"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nombres"
                value={formData.first_name}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    first_name: e.target.value,
                  }))
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Apellidos"
                value={formData.last_name}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    last_name: e.target.value,
                  }))
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Correo Electrónico"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={
                  editingUser
                    ? "Nueva Contraseña (dejar en blanco para mantener la actual)"
                    : "Contraseña"
                }
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, password: e.target.value }))
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
                  <MenuItem value="pending">Pendiente</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Roles</InputLabel>
                <Select
                  multiple
                  value={formData.role_ids}
                  label="Roles"
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      role_ids: e.target.value,
                    }))
                  }
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {selected.map((value) => {
                        const role = roles.find((r) => r.id === value);
                        return (
                          <Chip key={value} label={role?.name} size="small" />
                        );
                      })}
                    </Box>
                  )}
                >
                  {roles.map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      {role.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {hasPermission("users.create") && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Negocio</InputLabel>
                  <Select
                    value={formData.business_id}
                    label="Negocio"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        business_id: e.target.value,
                      }))
                    }
                  >
                    <MenuItem value="">
                      <em>Ninguno</em>
                    </MenuItem>
                    {businesses.map((business) => (
                      <MenuItem key={business.id} value={business.id}>
                        {business.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={isSubmitting}>Cancelar</Button>
          <Button
            onClick={handleSaveUser}
            variant="contained"
            disabled={
              !formData.first_name ||
              !formData.last_name ||
              !formData.email ||
              (!editingUser && !formData.password) ||
              isSubmitting
            }
            sx={{
              background: "linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)",
            }}
            startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {editingUser ? "Editar" : "Crear"} Usuario
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
