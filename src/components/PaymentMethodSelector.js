import React, { useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  Paper,
  Stack,
  Grid,
  Divider,
  alpha,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  AttachMoney as MoneyIcon,
  PriceCheck as PriceCheckIcon,
  CreditCard as CreditCardIcon,
  Schedule as ScheduleIcon,
  AddCard as AddCardIcon,
  Add as AddIcon,
  Clear as ClearIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { formatCurrency } from "../utils/formatters";
import { compressImage } from "../utils/imageCompression";

export const PAYMENT_METHODS = [
  { value: "cash", label: "Efectivo", icon: <MoneyIcon /> },
  { value: "yape", label: "Yape", icon: <PriceCheckIcon /> },
  { value: "plin", label: "Plin", icon: <PriceCheckIcon /> },
  { value: "card", label: "Tarjeta", icon: <CreditCardIcon /> },
  { value: "transfer", label: "Transferencia", icon: <CreditCardIcon /> },
  { value: "credit", label: "Crédito", icon: <ScheduleIcon /> },
  { value: "discount", label: "Descuento", icon: <PriceCheckIcon /> },
  { value: "vale", label: "Vale", icon: <AddCardIcon /> },
];

export const PaymentMethodSelector = ({
  totalAmount,
  payments,
  setPayments,
  currency = "PEN",
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const totalPaid = useMemo(
    () => payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
    [payments]
  );

  const remainingAmount = useMemo(
    () => totalAmount - totalPaid,
    [totalAmount, totalPaid]
  );

  const handleAddPayment = (method) => {
    // Restricción: Si el monto ya está completo, no permitir agregar más
    if (remainingAmount <= 0.001) {
      return;
    }

    const newPayment = {
      id: Date.now(),
      payment_method: method,
      amount: remainingAmount > 0 ? remainingAmount.toFixed(2) : "0.00",
      reference: "",
      payment_image: null,
    };
    setPayments([...payments, newPayment]);
  };

  const handleRemovePayment = (id) => {
    setPayments(payments.filter((p) => p.id !== id));
  };

  const handlePaymentChange = (id, field, value) => {
    setPayments(
      payments.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  return (
    <Stack spacing={2}>
      {payments.map((p) => (
        <Paper
          key={p.id}
          variant="outlined"
          sx={{
            p: 2,
            position: "relative",
            bgcolor: alpha(theme.palette.background.paper, 0.5),
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 1,
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
              {PAYMENT_METHODS.find((m) => m.value === p.payment_method)?.label}
            </Typography>
            <IconButton
              size="small"
              onClick={() => handleRemovePayment(p.id)}
              color="error"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
          <TextField
            fullWidth
            label="Monto"
            type="number"
            size="small"
            value={p.amount}
            onChange={(e) =>
              handlePaymentChange(p.id, "amount", e.target.value)
            }
            InputProps={{
              startAdornment: (
                <Typography variant="body2" sx={{ mr: 1, fontWeight: 700 }}>
                  {currency === "PEN" ? "S/" : "$"}
                </Typography>
              ),
            }}
          />
          {["yape", "plin", "transfer", "vale", "card"].includes(
            p.payment_method
          ) && (
            <Box sx={{ mt: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                component="label"
                startIcon={<AddIcon />}
                color={p.payment_image ? "success" : "primary"}
                sx={{ flex: 1, textTransform: "none", fontSize: 11 }}
              >
                {p.payment_image ? "Imagen Cargada" : "Subir Comprobante"}
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                      try {
                        const compressedFile = await compressImage(file);
                        handlePaymentChange(p.id, "payment_image", compressedFile);
                      } catch (error) {
                        console.error("Error al procesar la imagen de pago:", error);
                        handlePaymentChange(p.id, "payment_image", file);
                      }
                    }
                  }}
                />
              </Button>
              {p.payment_image && (
                <IconButton
                  size="small"
                  color="error"
                  onClick={() =>
                    handlePaymentChange(p.id, "payment_image", null)
                  }
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          )}
        </Paper>
      ))}

      {remainingAmount > 0.001 && (
        <Box>
          <Typography variant="caption" sx={{ mb: 1, display: "block", fontWeight: 700, color: 'text.secondary' }}>
            AÑADIR FORMA DE PAGO:
          </Typography>
          <Grid container spacing={1}>
            {PAYMENT_METHODS.map((method) => (
              <Grid item xs={4} sm={3} key={method.value}>
                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  onClick={() => handleAddPayment(method.value)}
                  sx={{
                    fontSize: 10,
                    height: 36,
                    borderRadius: 1,
                    textTransform: "none",
                  }}
                >
                  {method.label}
                </Button>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      <Divider />

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Restante:
        </Typography>
        <Typography
          variant="h6"
          color={remainingAmount > 0.001 ? "error.main" : "success.main"}
          sx={{ fontWeight: 800 }}
        >
          {formatCurrency(remainingAmount, currency)}
        </Typography>
      </Box>
    </Stack>
  );
};
