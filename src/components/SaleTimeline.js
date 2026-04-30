import React from "react";
import {
  Box,
  Typography,
  alpha,
  useTheme,
  CircularProgress,
  Stack,
  Divider,
} from "@mui/material";
import {
  Person as PersonIcon,
  AccessTime as TimeIcon,
  Circle as CircleIcon,
} from "@mui/icons-material";
import { formatDate, formatCurrency } from "../utils/formatters";

const getEventStory = (log, currency) => {
  const user = log.user?.full_name || "Sistema";
  const { event, auditable_type, new_values, old_values, metadata } = log;

  // Traducción de modelos
  const typeMap = {
    "App\\Models\\Sale": "la venta",
    "App\\Models\\SaleItem": "un producto",
    "App\\Models\\SalePayment": "un pago",
    "App\\Models\\Loan": "el préstamo",
    "App\\Models\\LoanPayment": "un pago de préstamo",
    "App\\Models\\Credit": "el crédito",
    "App\\Models\\CreditPayment": "un pago de crédito",
  };

  const cleanType = auditable_type?.split('\\').pop() || "registro";
  const modelName = typeMap[auditable_type] || `el ${cleanType.toLowerCase()}`;

  // --- HISTORIA PARA CREACIÓN DE VENTA ---
  if (auditable_type.includes("Sale") && event === "created" && !auditable_type.includes("Item") && !auditable_type.includes("Payment")) {
    const client = metadata?.client_name || new_values?.customer_name || "un cliente";
    const rider = metadata?.rider_name || "un motorizado";
    const total = formatCurrency(new_values?.total_amount || 0, currency);
    return `${user} registró un nuevo pedido para ${client} por un total de ${total}, asignado al motorizado ${rider}.`;
  }

  // --- HISTORIA PARA ITEMS (PRODUCTOS/SERVICIOS) ---
  if (auditable_type.includes("SaleItem") && event === "created") {
    const item = metadata?.item_name || new_values?.item_name || "producto";
    const qty = metadata?.quantity || new_values?.quantity || 1;
    return `${user} agregó ${qty} unidad(es) de "${item}" al pedido.`;
  }

  // --- HISTORIA PARA PAGOS ---
  if (auditable_type.includes("SalePayment") && event === "created") {
    const method = (metadata?.method || new_values?.payment_method || "efectivo").toUpperCase();
    const amount = formatCurrency(metadata?.amount || new_values?.amount || 0, currency);
    return `${user} procesó un pago de ${amount} mediante ${method}.`;
  }

  // --- HISTORIA PARA CRÉDITOS Y PRÉSTAMOS (Si aparecen en la venta) ---
  if ((cleanType === "Credit" || cleanType === "Loan") && event === "created") {
      const amountVal = new_values?.total_amount || new_values?.amount || metadata?.amount || 0;
      const amount = formatCurrency(amountVal, currency);
      return `${user} generó ${modelName} por un monto de ${amount}.`;
  }

  // --- HISTORIA PARA CAMBIOS DE ESTADO ---
  if (event === "updated" && new_values?.status) {
    const statusMap = {
        cancelled: "ANULADO",
        pending: "PENDIENTE",
        completed: "COMPLETADO",
        paid: "PAGADO",
        overdue: "VENCIDO"
    };
    const newStatus = statusMap[new_values.status] || new_values.status;
    
    if (new_values.status === "cancelled") return `${user} canceló el pedido (estaba en ${old_values?.status || 'pendiente'}).`;
    if (new_values.status === "pending" && old_values?.status === "completed") return `${user} reabrió la venta (volvió a ponerla como pendiente para editar).`;
    if (new_values.status === "completed") return `${user} marcó la entrega como completada (confirmó el cobro).`;
    
    return `${user} cambió el estado de ${modelName} a ${newStatus}.`;
  }

  // --- HISTORIA PARA CAMBIO DE MOTORIZADO ---
  if (event === "updated" && new_values?.rider_id) {
      return `${user} cambió el motorizado asignado al pedido.`;
  }

  // --- ACTUALIZACIONES GENERALES (DESCRIPTIVAS) ---
  if (event === "updated" && new_values) {
      const fields = Object.keys(new_values).map(k => {
          const labels = { customer_name: "cliente", total_amount: "total", amount: "monto", description: "descripción", due_date: "vencimiento" };
          return labels[k] || k.replace(/_/g, ' ');
      }).join(", ");
      return `${user} actualizó ${fields} en ${modelName}.`;
  }

  if (event === "created") return `${user} creó ${modelName}.`;
  if (event === "deleted") return `${user} eliminó ${modelName}.`;

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
    reopened: theme.palette.warning.main,
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

export const SaleTimeline = ({ logs, loading, currency = "PEN" }) => {
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

  return (
    <Box sx={{ p: 1 }}>
      {[...logs].reverse().map((log, index) => (
        <TimelineItem 
          key={log.id || index} 
          log={log} 
          isLast={index === logs.length - 1} 
          currency={currency}
        />
      ))}
    </Box>
  );
};
