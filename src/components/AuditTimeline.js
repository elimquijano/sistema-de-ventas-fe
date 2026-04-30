import React from "react";
import {
  Box,
  Typography,
  alpha,
  useTheme,
  CircularProgress,
  Stack,
} from "@mui/material";
import {
  AccessTime as TimeIcon,
} from "@mui/icons-material";
import { formatDate, formatCurrency } from "../utils/formatters";

const getEventStory = (log, currency) => {
  const user = log.user?.full_name || "Sistema";

  // PRIORIDAD 1: Si el backend ya envía una descripción amigable (historia)
  if (log.description) {
      // Si la descripción ya empieza con el nombre del usuario, la devolvemos tal cual
      if (log.description.includes(user)) return log.description;
      // Si no, le anteponemos el usuario para que se lea como una historia
      return `${user}: ${log.description}`;
  }

  const { event, auditable_type, new_values, old_values, metadata } = log;

  // Traducción de modelos (asegurando coincidencia exacta con lo que envía el backend)
  const typeMap = {
    "App\\Models\\Sale": "la venta",
    "App\\Models\\SaleItem": "un producto",
    "App\\Models\\SalePayment": "un pago",
    "App\\Models\\Loan": "el préstamo",
    "App\\Models\\LoanPayment": "un pago de préstamo",
    "App\\Models\\Credit": "el crédito",
    "App\\Models\\CreditPayment": "un pago de crédito",
    "App\\Models\\Asset": "el activo",
    "App\\Models\\AssetLoan": "el préstamo de activo",
  };

  // Limpiar el nombre del modelo (quitar namespace si es necesario para el fallback)
  const cleanType = auditable_type?.split('\\').pop() || "registro";
  const modelName = typeMap[auditable_type] || `el ${cleanType.toLowerCase()}`;

  // --- HISTORIA PARA ACTIVOS ---
  if (cleanType === "Asset" && event === "created") {
    const qty = new_values?.total_quantity || metadata?.total_quantity || 0;
    return `${user} registró el ingreso de un nuevo activo al inventario: "${new_values?.name || metadata?.name}" con una cantidad inicial de ${qty} unidades.`;
  }

  // --- HISTORIA PARA PRÉSTAMOS DE ACTIVOS ---
  if (cleanType === "AssetLoan" && event === "created") {
    const qty = new_values?.quantity || metadata?.quantity || 0;
    const asset = metadata?.asset_name || "un activo";
    const borrower = new_values?.borrower_name || metadata?.borrower_name || "alguien";
    return `${user} registró la salida de ${qty} unidad(es) de "${asset}" prestado(s) a ${borrower}.`;
  }

  // --- HISTORIA PARA PRÉSTAMOS ---
  if (cleanType === "Loan" && event === "created") {
    const amountVal = new_values?.amount || new_values?.total_amount || metadata?.amount || 0;
    const amount = formatCurrency(amountVal, currency);
    const desc = new_values?.description || metadata?.description;
    return `${user} registró un nuevo préstamo${desc ? ` por "${desc}"` : ""} con un monto inicial de ${amount}.`;
  }

  // --- HISTORIA PARA CRÉDITOS ---
  if (cleanType === "Credit" && event === "created") {
    const amountVal = new_values?.total_amount || new_values?.amount || metadata?.amount || 0;
    const amount = formatCurrency(amountVal, currency);
    const client = metadata?.client_name || new_values?.customer_name || "un cliente";
    return `${user} registró un crédito para ${client} por un total de ${amount}.`;
  }

  // --- HISTORIA PARA PAGOS (PRÉSTAMOS/CRÉDITOS) ---
  if (cleanType.includes("Payment") && event === "created") {
    const amountVal = new_values?.amount || new_values?.total_amount || metadata?.amount || 0;
    const amount = formatCurrency(amountVal, currency);
    const parent = cleanType.includes("Loan") ? "al préstamo" : "al crédito";
    return `${user} registró un pago de ${amount} ${parent}.`;
  }

  // --- CAMBIOS DE ESTADO (Humanizado) ---
  if (event === "updated" && new_values?.status) {
    const statusMap = {
      paid: "PAGADO",
      pending: "PENDIENTE",
      overdue: "VENCIDO",
      cancelled: "ANULADO",
      loaned: "EN PRÉSTAMO",
      returned: "DEVUELTO",
      damaged: "DAÑADO",
      lost: "PERDIDO",
    };
    const newStatus = statusMap[new_values.status] || new_values.status;
    const oldStatus = statusMap[old_values?.status] || old_values?.status || "pendiente";

    if (cleanType === "AssetLoan") {
      const asset = metadata?.asset_name || "el activo";
      if (new_values.status === "returned") {
        return `${user} registró el retorno de ${asset}. El activo ha sido devuelto satisfactoriamente al inventario.`;
      }
      if (new_values.status === "damaged") {
        return `${user} marcó ${asset} como DAÑADO tras el préstamo. Se requiere revisión o mantenimiento.`;
      }
      if (new_values.status === "lost") {
        return `${user} marcó ${asset} como PERDIDO. No se pudo recuperar el bien tras el préstamo.`;
      }
    }

    if (new_values.status === "paid") return `${user} marcó ${modelName} como COMPLETADO (pago total recibido).`;
    if (new_values.status === "overdue") return `${user} marcó ${modelName} como VENCIDO.`;

    return `${user} cambió el estado de ${modelName} de ${oldStatus} a ${newStatus}.`;
  }

  // --- LÓGICA GENERAL FALLBACK ---
  if (event === "created") {
    return `${user} creó ${modelName}.`;
  }

  if (event === "deleted") {
    return `${user} eliminó ${modelName}.`;
  }

  // --- ACTUALIZACIONES GENERALES ---
  if (event === "updated") {
      return `${user} actualizó información en ${modelName}.`;
  }

  // --- DEFAULT ---
  return `${user} realizó una acción (${event}) en ${modelName}.`;
};

const TimelineItem = ({ log, isLast, currency }) => {
  const theme = useTheme();
  const story = getEventStory(log, currency);
  
  const colors = {
    created: theme.palette.success.main,
    updated: theme.palette.info.main,
    deleted: theme.palette.error.main,
  };

  const eventColor = colors[log.event] || theme.palette.primary.main;

  return (
    <Box sx={{ display: "flex", gap: 2 }}>
      {/* Columna de la línea */}
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Box 
          sx={{ 
            width: 12, 
            height: 12, 
            borderRadius: "50%", 
            bgcolor: eventColor, 
            mt: 0.8,
            boxShadow: `0 0 0 3px ${alpha(eventColor, 0.2)}`
          }} 
        />
        {!isLast && <Box sx={{ width: 2, flex: 1, bgcolor: "divider", my: 0.5 }} />}
      </Box>

      {/* Contenido de la Historia */}
      <Box sx={{ pb: 3, flex: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
          <TimeIcon sx={{ fontSize: 14, color: "text.disabled" }} />
          <Typography variant="caption" fontWeight="700" color="text.secondary">
            {formatDate(log.created_at, 'DD-MM-YY HH:mm:ss')}
          </Typography>
        </Stack>
        <Typography variant="body2" sx={{ color: "text.primary", lineHeight: 1.5 }}>
          {story}
        </Typography>
        {log.event === "updated" && log.old_values && log.new_values && !log.new_values.status && (
            <Box sx={{ mt: 1, p: 1, bgcolor: alpha(theme.palette.grey[500], 0.05), borderRadius: 1 }}>
                 {Object.keys(log.new_values).map(k => (
                     <Typography key={k} variant="caption" display="block" color="text.secondary">
                         • {k.toUpperCase()}: de "{log.old_values[k]}" a "{log.new_values[k]}"
                     </Typography>
                 ))}
            </Box>
        )}
      </Box>
    </Box>
  );
};

export const AuditTimeline = ({ logs, loading, currency = "PEN" }) => {
  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <CircularProgress size={30} />
        <Typography variant="body2" sx={{ mt: 2 }} color="text.secondary">Cargando historia...</Typography>
      </Box>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: "center", opacity: 0.5 }}>
        <Typography variant="body2">No hay historial para mostrar.</Typography>
      </Box>
    );
  }

  // Ordenamos de forma ascendente (el más antiguo primero) para que la historia se lea de arriba a abajo
  const sortedLogs = [...logs].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  return (
    <Box sx={{ p: 1 }}>
      {sortedLogs.map((log, index) => (
        <TimelineItem 
          key={log.id || index} 
          log={log} 
          isLast={index === sortedLogs.length - 1} 
          currency={currency}
        />
      ))}
    </Box>
  );
};
