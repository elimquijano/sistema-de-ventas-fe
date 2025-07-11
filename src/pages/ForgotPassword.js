import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Link,
  Alert,
  CircularProgress,
  useTheme,
} from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);

export const ForgotPassword = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Simular llamada a la API
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setSuccess(true);

      MySwal.fire({
        title: "¡Correo enviado!",
        text: "Las instrucciones para restablecer la contraseña han sido enviadas a tu dirección de correo electrónico.",
        icon: "success",
        confirmButtonText: "OK",
        confirmButtonColor: "#673ab7",
      }).then(() => {
        navigate("/login");
      });
    } catch (err) {
      setError(
        "Error al enviar el correo de restablecimiento. Por favor, inténtalo de nuevo."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        position: "relative",
      }}
    >
      {/* Elementos decorativos de fondo */}
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
          maxWidth: 400,
          width: "100%",
          borderRadius: 3,
          boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
          border: "none",
          position: "relative",
          zIndex: 1,
        }}
      >
        <CardContent sx={{ p: 4 }}>
          {/* Botón de retroceso */}
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate("/login")}
            sx={{ mb: 2, color: "#673ab7" }}
          >
            Volver al inicio de sesión
          </Button>
          {/* Logo */}
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 2,
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background:
                    "linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mr: 1,
                }}
              >
                <Typography
                  variant="h6"
                  sx={{ color: "white", fontWeight: 700 }}
                >
                  🍇
                </Typography>
              </Box>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  color: theme.palette.text.primary,
                }}
              >
                BERRY
              </Typography>
            </Box>
            <Typography
              variant="h4"
              sx={{ color: "#673ab7", mb: 1, fontWeight: 600 }}
            >
              ¿Olvidaste tu contraseña?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ingresa tu dirección de correo electrónico y te enviaremos
              instrucciones para restablecer tu contraseña.
            </Typography>
          </Box>
          {/* Formulario */}
          <form onSubmit={handleSubmit}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                ¡Instrucciones de restablecimiento enviadas a tu correo
                electrónico!
              </Alert>
            )}
            <TextField
              fullWidth
              label="Correo Electrónico"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              variant="outlined"
              sx={{
                mb: 3,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                },
              }}
              required
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                background: "linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)",
                py: 1.5,
                mb: 3,
                textTransform: "none",
                fontSize: "1rem",
                fontWeight: 600,
                borderRadius: 2,
                boxShadow: "0 4px 15px rgba(103, 58, 183, 0.3)",
                "&:hover": {
                  boxShadow: "0 6px 20px rgba(103, 58, 183, 0.4)",
                },
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Enviar instrucciones de restablecimiento"
              )}
            </Button>
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                ¿Recuerdas tu contraseña?{" "}
                <Link
                  component={RouterLink}
                  to="/login"
                  sx={{
                    color: "#673ab7",
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
