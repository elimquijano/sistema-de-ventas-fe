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
  };

  // Limpiar el nombre del modelo (quitar namespace si es necesario para el fallback)
  const cleanType = auditable_type?.split('\\').pop() || "registro";
  const modelName = typeMap[auditable_type] || `el ${cleanType.toLowerCase()}`;

  // --- LÓGICA GENERAL ---
  if (event === "created") {
    let details = "";
    if (cleanType === "Loan" || cleanType === "Credit") {
        const amount = new_values?.amount || metadata?.amount || 0;
        details = ` por un monto de ${formatCurrency(amount, currency)}`;
    }
    return `${user} creó ${modelName}${details}.`;
  }

  if (event === "deleted") {
    return `${user} eliminó ${modelName}.`;
  }

  // --- HISTORIA PARA PAGOS ---
  if (cleanType.includes("Payment") && event === "created") {
    const amount = formatCurrency(metadata?.amount || new_values?.amount || 0, currency);
    return `${user} registró ${modelName} por ${amount}.`;
  }

  // --- CAMBIOS DE ESTADO ---
  if (event === "updated" && new_values?.status) {
    return `${user} cambió el estado de ${modelName} de "${old_values?.status || 'desconocido'}" a "${new_values.status}".`;
  }

  // --- ACTUALIZACIONES GENERALES ---
  if (event === "updated") {
      return `${user} actualizó ${modelName}.`;
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

  // Clonamos y revertimos para que lo más reciente aparezca arriba (como en ventas)
  const sortedLogs = [...logs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

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
