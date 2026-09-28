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
  LinearProgress,
  CircularProgress,
  alpha,
  useTheme,
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
import { compressPaymentImage } from "../utils/imageCompression";

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

const PAYMENT_METHODS_WITH_RECEIPT = ["yape", "plin", "transfer", "vale", "card"];

const formatFileSize = (bytes) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export const PaymentMethodSelector = ({
  totalAmount,
  payments,
  setPayments,
  currency = "PEN",
  allowedMethods,
}) => {
  const theme = useTheme();

  const totalPaid = useMemo(
    () => payments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0),
    [payments],
  );

  const remainingAmount = useMemo(
    () => totalAmount - totalPaid,
    [totalAmount, totalPaid],
  );

  const availableMethods = useMemo(
    () =>
      allowedMethods?.length
        ? PAYMENT_METHODS.filter((method) => allowedMethods.includes(method.value))
        : PAYMENT_METHODS,
    [allowedMethods],
  );

  const updatePayment = (id, changes) => {
    setPayments((currentPayments) =>
      currentPayments.map((payment) =>
        payment.id === id ? { ...payment, ...changes } : payment,
      ),
    );
  };

  const handleAddPayment = (method) => {
    if (remainingAmount <= 0.001) return;

    setPayments((currentPayments) => [
      ...currentPayments,
      {
        id: `${Date.now()}-${Math.random()}`,
        payment_method: method,
        amount: remainingAmount > 0 ? remainingAmount.toFixed(2) : "0.00",
        reference: "",
        payment_image: null,
      },
    ]);
  };

  const handleRemovePayment = (id) => {
    setPayments((currentPayments) =>
      currentPayments.filter((payment) => payment.id !== id),
    );
  };

  const handleImageSelection = async (paymentId, event) => {
    const file = event.target.files?.[0];
    // Hace posible volver a seleccionar el mismo archivo tras eliminarlo o fallar.
    event.target.value = "";
    if (!file) return;

    updatePayment(paymentId, {
      payment_image: null,
      payment_image_status: "processing",
      payment_image_progress: 0,
      payment_image_error: "",
    });

    let lastReportedProgress = -10;
    try {
      const compressedFile = await compressPaymentImage(file, (progress) => {
        const roundedProgress = Math.min(100, Math.round(Number(progress) || 0));
        // Reducir renders ayuda a mantener fluida la interfaz en equipos modestos.
        if (roundedProgress < 100 && roundedProgress - lastReportedProgress < 10) return;
        lastReportedProgress = roundedProgress;
        updatePayment(paymentId, { payment_image_progress: roundedProgress });
      });

      updatePayment(paymentId, {
        payment_image: compressedFile,
        payment_image_status: "ready",
        payment_image_progress: 100,
        payment_image_error: "",
      });
    } catch (error) {
      updatePayment(paymentId, {
        payment_image: null,
        payment_image_status: "error",
        payment_image_progress: 0,
        payment_image_error:
          error?.message || "No se pudo procesar la imagen. Intenta nuevamente.",
      });
    }
  };

  const clearPaymentImage = (paymentId) => {
    updatePayment(paymentId, {
      payment_image: null,
      payment_image_status: null,
      payment_image_progress: 0,
      payment_image_error: "",
    });
  };

  return (
    <Stack spacing={2}>
      {payments.map((payment) => {
        const isProcessingImage = payment.payment_image_status === "processing";
        const hasImageError = payment.payment_image_status === "error";

        return (
          <Paper
            key={payment.id}
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
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}
              >
                {PAYMENT_METHODS.find(
                  (method) => method.value === payment.payment_method,
                )?.label}
              </Typography>
              <IconButton
                size="small"
                onClick={() => handleRemovePayment(payment.id)}
                color="error"
                aria-label="Eliminar forma de pago"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>

            <TextField
              fullWidth
              label="Monto"
              type="number"
              size="small"
              value={payment.amount}
              onChange={(event) => updatePayment(payment.id, { amount: event.target.value })}
              InputProps={{
                startAdornment: (
                  <Typography variant="body2" sx={{ mr: 1, fontWeight: 700 }}>
                    {currency === "PEN" ? "S/" : "$"}
                  </Typography>
                ),
              }}
            />

            {PAYMENT_METHODS_WITH_RECEIPT.includes(payment.payment_method) && (
              <Box sx={{ mt: 1.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    component="label"
                    startIcon={
                      isProcessingImage ? <CircularProgress size={16} /> : <AddIcon />
                    }
                    color={payment.payment_image ? "success" : "primary"}
                    disabled={isProcessingImage}
                    sx={{ flex: 1, textTransform: "none", fontSize: 11 }}
                  >
                    {isProcessingImage
                      ? `Optimizando ${payment.payment_image_progress || 0}%`
                      : payment.payment_image
                        ? "Comprobante listo"
                        : hasImageError
                          ? "Volver a intentar"
                          : "Subir comprobante"}
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      disabled={isProcessingImage}
                      onChange={(event) => handleImageSelection(payment.id, event)}
                    />
                  </Button>

                  {payment.payment_image && (
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => clearPaymentImage(payment.id)}
                      aria-label="Quitar comprobante"
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>

                {isProcessingImage && (
                  <Box sx={{ mt: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={payment.payment_image_progress || 0}
                      sx={{ height: 7, borderRadius: 1 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      Preparando la imagen para enviarla rápido. No vuelvas a tocar.
                    </Typography>
                  </Box>
                )}

                {payment.payment_image && !isProcessingImage && (
                  <Typography
                    variant="caption"
                    color="success.main"
                    sx={{ display: "block", mt: 0.75, fontWeight: 700 }}
                  >
                    Lista para enviar - {formatFileSize(payment.payment_image.size)}
                  </Typography>
                )}

                {hasImageError && (
                  <Typography
                    variant="caption"
                    color="error.main"
                    sx={{ display: "block", mt: 0.75, fontWeight: 700 }}
                  >
                    {payment.payment_image_error}
                  </Typography>
                )}
              </Box>
            )}
          </Paper>
        );
      })}

      {remainingAmount > 0.001 && (
        <Box>
          <Typography
            variant="caption"
            sx={{ mb: 1, display: "block", fontWeight: 700, color: "text.secondary" }}
          >
            AÑADIR FORMA DE PAGO:
          </Typography>
          <Grid container spacing={1}>
            {availableMethods.map((method) => (
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
