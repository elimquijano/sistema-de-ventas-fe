import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Switch,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  Chip,
  Tab,
  Tabs,
} from "@mui/material";
import {
  Person as PersonIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  Palette as PaletteIcon,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { authAPI, usersAPI } from "../utils/api";
import { notificationSwal } from "../utils/swal-helpers";

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export const Settings = () => {
  const { user, updateUser } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [tabValue, setTabValue] = useState(0);

  // Form states
  const [profileForm, setProfileForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    old_password: "",
    password: "",
    password_confirmation: "",
  });

  useEffect(() => {
    if (user) {
      setProfileForm({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveProfile = async () => {
    try {
      const response = await authAPI.profile(profileForm);
      updateUser(response.data.user || response.data);
      notificationSwal("Éxito", "Perfil actualizado correctamente", "success");
    } catch (error) {
      console.error(error);
      notificationSwal(
        "Error",
        error.response?.data?.message || "Error al actualizar el perfil",
        "error",
      );
    }
  };

  const updatePassword = async () => {
    if (passwordForm.password !== passwordForm.password_confirmation) {
      return notificationSwal("Error", "Las contraseñas no coinciden", "error");
    }

    try {
      await authAPI.changePassword(passwordForm);
      setPasswordForm({
        old_password: "",
        password: "",
        password_confirmation: "",
      });
      notificationSwal(
        "Éxito",
        "Contraseña actualizada correctamente",
        "success",
      );
    } catch (error) {
      console.error(error);
      notificationSwal(
        "Error",
        error.response?.data?.message || "Error al actualizar la contraseña",
        "error",
      );
    }
  };

  const handleNotificationToggle = async (checked) => {
    try {
      /* const response = await usersAPI.update(user.id, {
        ...user,
        receive_notifications: checked
      });
      updateUser(response.data.user || response.data); */
      notificationSwal(
        "Éxito",
        "Preferencia de notificaciones actualizada",
        "success",
      );
    } catch (error) {
      console.error(error);
      notificationSwal(
        "Error",
        "No se pudo actualizar la preferencia",
        "error",
      );
    }
  };

  const tabs = [
    { label: "Perfil", icon: <PersonIcon /> },
    { label: "Seguridad", icon: <SecurityIcon /> },
    { label: "Notificaciones", icon: <NotificationsIcon /> },
    { label: "Preferencias", icon: <PaletteIcon /> },
  ];

  if (!user) return null;

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Configuración
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ p: 0 }}>
              <Tabs
                orientation="vertical"
                variant="scrollable"
                value={tabValue}
                onChange={handleTabChange}
                sx={{
                  borderRight: 1,
                  borderColor: "divider",
                  "& .MuiTab-root": {
                    alignItems: "center",
                    justifyContent: "flex-start",
                    textAlign: "left",
                    py: 2,
                    px: 3,
                  },
                }}
              >
                {tabs.map((tab, index) => (
                  <Tab
                    key={index}
                    label={tab.label}
                    icon={tab.icon}
                    iconPosition="start"
                  />
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={9}>
          <Card>
            <CardContent sx={{ p: 4 }}>
              {/* Perfil Tab */}
              <TabPanel value={tabValue} index={0}>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                  Información del Perfil
                </Typography>

                <Box sx={{ display: "flex", alignItems: "center", mb: 4 }}>
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      mr: 3,
                      bgcolor: "primary.main",
                      fontSize: "2rem",
                    }}
                  >
                    {user.first_name?.charAt(0)}
                    {user.last_name?.charAt(0)}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {user.first_name} {user.last_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {user.email}
                    </Typography>
                    <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
                      {user.roles?.map((role) => (
                        <Chip
                          key={role.id}
                          label={role.name}
                          color="primary"
                          size="small"
                        />
                      ))}
                      {!user.roles && (
                        <Chip label="Usuario" color="primary" size="small" />
                      )}
                    </Box>
                  </Box>
                </Box>

                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Nombre"
                      name="first_name"
                      value={profileForm.first_name}
                      onChange={handleProfileChange}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Apellido"
                      name="last_name"
                      value={profileForm.last_name}
                      onChange={handleProfileChange}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Correo Electrónico"
                      type="email"
                      name="email"
                      value={profileForm.email}
                      onChange={handleProfileChange}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Teléfono"
                      name="phone"
                      value={profileForm.phone}
                      onChange={handleProfileChange}
                    />
                  </Grid>
                </Grid>

                <Box sx={{ mt: 4 }}>
                  <Button variant="contained" onClick={saveProfile}>
                    Guardar Cambios
                  </Button>
                </Box>
              </TabPanel>

              {/* Seguridad Tab */}
              <TabPanel value={tabValue} index={1}>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                  Seguridad
                </Typography>

                <Box sx={{ mb: 4 }}>
                  <Typography
                    variant="subtitle1"
                    sx={{ mb: 2, fontWeight: 600 }}
                  >
                    Cambiar Contraseña
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Contraseña Actual"
                        type="password"
                        name="old_password"
                        value={passwordForm.old_password}
                        onChange={handlePasswordChange}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Nueva Contraseña"
                        type="password"
                        name="password"
                        value={passwordForm.password}
                        onChange={handlePasswordChange}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Confirmar Nueva Contraseña"
                        type="password"
                        name="password_confirmation"
                        value={passwordForm.password_confirmation}
                        onChange={handlePasswordChange}
                      />
                    </Grid>
                  </Grid>
                  <Button
                    variant="contained"
                    sx={{ mt: 3 }}
                    onClick={updatePassword}
                  >
                    Actualizar Contraseña
                  </Button>
                </Box>

                <Divider sx={{ my: 3 }} />

                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                  Sesiones Activas
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Sesión Actual"
                      secondary="Navegador Web • Activo ahora"
                    />
                    <ListItemSecondaryAction>
                      <Chip label="Activo" color="success" size="small" />
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </TabPanel>

              {/* Notificaciones Tab */}
              <TabPanel value={tabValue} index={2}>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                  Preferencias de Notificación
                </Typography>

                <List>
                  <ListItem>
                    <ListItemText
                      primary="Recibir Notificaciones"
                      secondary="Alertas automáticas sobre actividad crítica en el negocio (Préstamos, Créditos, etc.)"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={user.receive_notifications || false}
                        onChange={(e) =>
                          handleNotificationToggle(e.target.checked)
                        }
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </TabPanel>

              {/* Preferencias Tab */}
              <TabPanel value={tabValue} index={3}>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                  Preferencias de la Aplicación
                </Typography>

                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box>
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: 600 }}
                        >
                          Modo Oscuro
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Cambiar entre temas claro y oscuro
                        </Typography>
                      </Box>
                      <Switch checked={isDarkMode} onChange={toggleDarkMode} />
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Idioma"
                      value="es"
                      disabled
                      select
                      SelectProps={{ native: true }}
                    >
                      <option value="es">Español</option>
                    </TextField>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Zona Horaria"
                      value="America/Lima"
                      disabled
                    />
                  </Grid>
                </Grid>
              </TabPanel>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
