import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Link,
  Checkbox,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Alert,
  CircularProgress,
  LinearProgress,
  Grid,
  useTheme,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Logo from "../components/Logo";

const getPasswordStrength = (password) => {
  let strength = 0;
  if (password.length >= 8) strength += 25;
  if (/[a-z]/.test(password)) strength += 25;
  if (/[A-Z]/.test(password)) strength += 25;
  if (/[0-9]/.test(password)) strength += 25;

  if (strength <= 25)
    return { value: strength, label: "Débil", color: "error" };
  if (strength <= 50)
    return { value: strength, label: "Aceptable", color: "warning" };
  if (strength <= 75) return { value: strength, label: "Buena", color: "info" };
  return { value: strength, label: "Fuerte", color: "success" };
};

export const Signup = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    agreeToTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const passwordStrength = getPasswordStrength(formData.password);

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "agreeToTerms" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (!formData.agreeToTerms) {
      setError("Por favor, acepta los términos y condiciones");
      setLoading(false);
      return;
    }
    try {
      const success = await signup({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        role: "user",
      });
      if (success) {
        navigate("/dashboard");
      } else {
        setError("Error al crear la cuenta");
      }
    } catch (err) {
      setError("Ocurrió un error durante el registro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: theme.palette.mode === 'dark' ? theme.palette.background.default : "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        position: "relative",
      }}
    >
      {/* Background decorative elements */}
      <Box
        sx={{
          position: "absolute",
          top: "10%",
          right: "10%",
          width: 200,
          height: 150,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          borderRadius: 3,
          opacity: 0.1,
          transform: "rotate(15deg)",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          bottom: "15%",
          left: "15%",
          width: 150,
          height: 100,
          background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
          borderRadius: 3,
          opacity: 0.1,
          transform: "rotate(-15deg)",
        }}
      />
      <Card
        sx={{
          maxWidth: 475,
          width: "100%",
          boxShadow: "none",
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <CardContent sx={{ p: 4 }}>
          {/* Logo */}
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 3,
              }}
            >
              <Box
                sx={{
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mr: 1,
                }}
              >
                <Logo height={150} />
              </Box>
            </Box>
            <Typography
              variant="h4"
              sx={{ color: theme.palette.primary.main, mb: 1, fontWeight: 600 }}
            >
              Regístrate
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Ingresa tus datos para continuar
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Regístrate con tu correo electrónico
            </Typography>
          </Box>
          {/* Formulario */}
          <form onSubmit={handleSubmit}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <Typography
                  variant="body2"
                  sx={{ mb: 1, color: theme.palette.text.secondary }}
                >
                  Nombre
                </Typography>
                <TextField
                  fullWidth
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  variant="outlined"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 1,
                    },
                  }}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <Typography
                  variant="body2"
                  sx={{ mb: 1, color: theme.palette.text.secondary }}
                >
                  Apellido
                </Typography>
                <TextField
                  fullWidth
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  variant="outlined"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 1,
                    },
                  }}
                  required
                />
              </Grid>
            </Grid>
            <Box sx={{ mb: 2 }}>
              <Typography
                variant="body2"
                sx={{ mb: 1, color: theme.palette.text.secondary }}
              >
                Correo Electrónico / Nombre de Usuario
              </Typography>
              <TextField
                fullWidth
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                variant="outlined"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 1,
                  },
                }}
                required
              />
            </Box>
            <Box sx={{ mb: 1 }}>
              <Typography
                variant="body2"
                sx={{ mb: 1, color: theme.palette.text.secondary }}
              >
                Contraseña
              </Typography>
              <TextField
                fullWidth
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                variant="outlined"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 1,
                  },
                }}
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            {/* Indicador de Fuerza de Contraseña */}
            {formData.password && (
              <Box sx={{ mb: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={passwordStrength.value}
                  color={passwordStrength.color}
                  sx={{ height: 6, borderRadius: 3, mb: 1 }}
                />
                <Typography
                  variant="caption"
                  color={`${passwordStrength.color}.main`}
                >
                  {passwordStrength.label}
                </Typography>
              </Box>
            )}
            <FormControlLabel
              control={
                <Checkbox
                  name="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onChange={handleChange}
                  color="primary"
                  size="small"
                />
              }
              label={
                <Typography variant="body2">
                  Acepto los{" "}
                  <Link
                    href="#"
                    sx={{
                      color: theme.palette.primary.main,
                      textDecoration: "underline",
                    }}
                  >
                    Términos y Condiciones
                  </Link>
                </Typography>
              }
              sx={{ mb: 3 }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                py: 1.5,
                mb: 3,
                textTransform: "none",
                fontSize: "1rem",
                fontWeight: 600,
                borderRadius: 1,
                boxShadow: "none",
                "&:hover": {
                  boxShadow: "none",
                },
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Regístrate"
              )}
            </Button>
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                ¿Ya tienes una cuenta?{" "}
                <Link
                  component={RouterLink}
                  to="/login"
                  sx={{
                    color: theme.palette.primary.main,
                    textDecoration: "none",
                    fontWeight: 600,
                    "&:hover": {
                      textDecoration: "underline",
                    },
                  }}
                >
                  Inicia sesión
                </Link>
              </Typography>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};
