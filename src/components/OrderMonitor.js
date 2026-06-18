import React, { useState, useMemo, useEffect } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  IconButton,
  Chip,
  Divider,
  Stack,
  alpha,
  useTheme,
  ToggleButton,
  ToggleButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Paper,
  Slide,
  CircularProgress,
} from "@mui/material";
import {
  Payment as PaymentIcon,
  LocalShipping as LocalShippingIcon,
  Schedule as ScheduleIcon,
  Cancel as CancelIcon,
  PhoneIphone as PhoneIcon,
  Map as MapIcon,
  WhatsApp as WhatsAppIcon,
  GridView as GridViewIcon,
  LocationOn as LocationOnIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AttachMoney as MoneyIcon,
  PriceCheck as PriceCheckIcon,
  CreditCard as CreditCardIcon,
  AddCard as AddCardIcon,
  Add as AddIcon,
  Clear as ClearIcon,
  Directions as DirectionsIcon,
  Notes as NotesIcon,
  } from "@mui/icons-material";
import { MapContainer, TileLayer, Marker, Popup, LayersControl, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { formatCurrency, formatDate } from "../utils/formatters";
import { salesAPI } from "../utils/api";
import { notificationSwal, confirmSwal } from "../utils/swal-helpers";
import { compressImage } from "../utils/imageCompression";
import { PaymentMethodSelector } from "./PaymentMethodSelector";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const PAYMENT_METHODS = [
  { value: "cash", label: "Efectivo", icon: <MoneyIcon /> },
  { value: "yape", label: "Yape", icon: <PriceCheckIcon /> },
  { value: "plin", label: "Plin", icon: <PriceCheckIcon /> },
  { value: "card", label: "Tarjeta", icon: <CreditCardIcon /> },
  { value: "transfer", label: "Transferencia", icon: <CreditCardIcon /> },
  { value: "credit", label: "Crédito", icon: <ScheduleIcon /> },
  { value: "vale", label: "Vale", icon: <AddCardIcon /> },
];

const MapFitBounds = ({ orders }) => {
  const map = useMap();
  useEffect(() => {
    if (orders && orders.length > 0) {
      const validOrders = orders.filter(
        (o) =>
          (o.latitude || o.client?.latitude) &&
          (o.longitude || o.client?.longitude),
      );
      if (validOrders.length > 0) {
        const bounds = L.latLngBounds(
          validOrders.map((o) => [
            parseFloat(o.latitude || o.client.latitude),
            parseFloat(o.longitude || o.client.longitude),
          ]),
        );
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [30, 30] });
        }
      }
    }
  }, [orders, map]);
  return null;
};

const OrderCard = ({ order, riders, onPay, onCancel, onWhatsapp, onOpenMap, onChangeRider, onEdit, isRiderView, currency, markerColor }) => {
  const theme = useTheme();
  const cardColor = markerColor || (order.scheduled_at ? theme.palette.error.main : theme.palette.primary.main);

  const handleOpenGoogleMaps = () => {
    const lat = order.latitude || order.client?.latitude;
    const lng = order.longitude || order.client?.longitude;
    const address = order.delivery_address || order.address;
    
    let url = "";
    if (lat && lng) {
      url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    } else if (address) {
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    }
    
    if (url) window.open(url, "_blank");
    else notificationSwal("Error", "No hay ubicación ni dirección disponible.", "error");
  };

  const phoneNumber = order.delivery_phone || order.phone || order.client?.phone;

  return (
    <Card
      elevation={1}
      sx={{
        borderRadius: 1.5,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        border: "1px solid",
        borderColor: markerColor ? alpha(markerColor, 0.5) : (order.scheduled_at ? "error.light" : "divider"),
        transition: "all 0.2s",
        "&:hover": { boxShadow: theme.shadows[3] },
      }}
    >
      <Box
        sx={{
          p: 1,
          px: 1.5,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          bgcolor: alpha(cardColor, 0.04),
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Chip
            label={`#${order.sale_number}`}
            size="small"
            sx={{ 
              fontWeight: 800, 
              height: 20, 
              fontSize: 10, 
              borderRadius: 1,
              bgcolor: cardColor,
              color: "white"
            }}
          />
          {!isRiderView && (
            <IconButton size="small" onClick={() => onEdit(order)} sx={{ p: 0.2 }} title="Editar Pedido">
              <EditIcon sx={{ fontSize: 16, color: "text.secondary" }} />
            </IconButton>
          )}
        </Box>
        <Typography
          variant="caption"
          fontWeight="600"
          sx={{ fontSize: 10, color: "text.secondary" }}
        >
          {formatDate(order.created_at)} - {new Date(order.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })}
        </Typography>
      </Box>
      <CardContent sx={{ flex: 1, p: 1.5 }}>
        <Typography
          variant="subtitle1"
          fontWeight="700"
          sx={{ mb: 0.5, color: "text.primary", lineHeight: 1.2 }}
        >
          {order.customer_name}
        </Typography>
        {order.items?.length > 0 && (
          <Box sx={{ mb: 1.5, display: "flex", flexDirection: "column", gap: 0.5 }}>
            {order.items.map((it, idx) => (
              <Box
                key={idx}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                  p: 0.8,
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: alpha(theme.palette.primary.main, 0.2),
                }}
              >
                <Typography
                  variant="subtitle2"
                  fontWeight="900"
                  color="primary.main"
                  sx={{
                    minWidth: 28,
                    height: 28,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "primary.main",
                    color: "white",
                    borderRadius: "50%",
                    fontSize: 12,
                  }}
                >
                  {it.quantity}
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight="700"
                  sx={{ color: "primary.dark", flex: 1 }}
                >
                  {it.item_name}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        {(order.delivery_notes || order.notes) && (
          <Box
            sx={{
              mb: 1.5,
              p: 1,
              bgcolor: alpha(theme.palette.warning.main, 0.08),
              borderRadius: 1,
              border: "1px dashed",
              borderColor: "warning.main",
            }}
          >
            <Typography
              variant="caption"
              fontWeight="800"
              color="warning.dark"
              sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.3 }}
            >
              <NotesIcon sx={{ fontSize: 14 }} /> NOTAS:
            </Typography>
            <Typography
              variant="caption"
              fontWeight="600"
              sx={{ color: "text.primary", fontStyle: "italic", display: "block" }}
            >
              {order.delivery_notes || order.notes}
            </Typography>
          </Box>
        )}

        <Stack spacing={0.8}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <PhoneIcon sx={{ fontSize: 14, color: "success.main" }} />
            <Typography
              variant="caption"
              component="a"
              href={phoneNumber ? `tel:${phoneNumber}` : "#"}
              sx={{
                fontWeight: 600,
                color: "inherit",
                textDecoration: "none",
                "&:hover": { textDecoration: "underline" },
              }}
            >
              {phoneNumber || "S/T"}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
            <MapIcon sx={{ fontSize: 14, color: "info.main", mt: 0.2 }} />
            <Typography
              variant="caption"
              sx={{
                fontWeight: 500,
                lineHeight: 1.1,
                color: "text.secondary",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {order.delivery_address || order.address}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <LocalShippingIcon sx={{ fontSize: 14, color: "warning.main" }} />
            <Typography variant="caption" fontWeight="700" color="warning.dark">
              {(() => {
                const rider = riders.find((r) => r.id === order.rider_id);
                return rider
                  ? rider.full_name || `${rider.first_name} ${rider.last_name || ""}`
                  : "NO ASIGNADO";
              })()}
            </Typography>
          </Box>
        </Stack>
        <Box sx={{ mt: 1.5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
           <Typography variant="caption" fontWeight="700" color="text.secondary">TOTAL:</Typography>
           <Typography variant="subtitle1" fontWeight="800" color="primary">
            {formatCurrency(order.total_amount, currency)}
          </Typography>
        </Box>
      </CardContent>
      <Divider />
      <CardActions sx={{ justifyContent: "space-between", p: 1 }}>
        <Stack direction="row" spacing={0.5}>
          {!isRiderView && (
            <>
              <IconButton
                size="small"
                sx={{ color: "success.main" }}
                onClick={() => onWhatsapp(order.id)}
                title="Reenviar WhatsApp"
              >
                <WhatsAppIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                sx={{ color: "error.main" }}
                onClick={() => onCancel(order.id)}
                title="Cancelar"
              >
                <CancelIcon fontSize="small" />
              </IconButton>
            </>
          )}
          <IconButton
            size="small"
            sx={{ color: "info.main" }}
            onClick={handleOpenGoogleMaps}
            title="Ver en Google Maps"
          >
            <LocationOnIcon fontSize="small" />
          </IconButton>
        </Stack>
        <Button
          variant="contained"
          size="small"
          color="success"
          startIcon={<PaymentIcon sx={{ fontSize: 16 }} />}
          onClick={() => onPay(order)}
          sx={{
            borderRadius: 1,
            fontWeight: 700,
            px: 1.5,
            fontSize: 11,
          }}
        >
          Cobrar
        </Button>
      </CardActions>
    </Card>
  );
};
export const OrderMonitor = ({ orders, riders, userLocation, onRefresh, isRiderView = false, currency = "PEN" }) => {
  const theme = useTheme();
  const [monitorView, setMonitorView] = useState("cards");

  const getRiderColor = (riderId) => {
    if (!riderId) return theme.palette.text.disabled;
    const colors = [
      "#673ab7", "#2196f3", "#00c853", "#ff9100", "#f50057", 
      "#00b0ff", "#d500f9", "#00bfa5", "#3d5afe", "#4caf50"
    ];
    const idStr = riderId.toString();
    let hash = 0;
    for (let i = 0; i < idStr.length; i++) {
      hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const isMultiRider = useMemo(() => {
    const activeRiderIds = new Set(orders.map(o => o.rider_id).filter(id => id));
    return activeRiderIds.size > 1;
  }, [orders]);

  // States for Edit Order
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);

  // States for Change Rider (keeping for backward compatibility or simple use)
  const [selectedOrderForRider, setSelectedOrderForRider] = useState(null);
  const [openRiderDialog, setOpenRiderDialog] = useState(false);
  const [newRiderId, setNewRiderId] = useState("");

  // States for Payment
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [selectedOrderToConfirm, setSelectedOrderToConfirm] = useState(null);
  const [payments, setPayments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalPaid = useMemo(
    () => payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
    [payments],
  );
  const remainingAmount = useMemo(
    () =>
      selectedOrderToConfirm
        ? parseFloat(selectedOrderToConfirm.total_amount) - totalPaid
        : 0,
    [selectedOrderToConfirm, totalPaid],
  );

  const handleOpenEditOrder = (order) => {
    setEditingOrder({
      id: order.id,
      rider_id: order.rider_id || "",
      delivery_notes: order.delivery_notes || order.notes || "",
      scheduled_at: order.scheduled_at ? order.scheduled_at.slice(0, 16) : "",
      total_amount: order.total_amount || 0,
      quantity: order.items?.[0]?.quantity || 1,
    });
    setOpenEditDialog(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditingOrder(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateOrder = async () => {
    setIsSubmitting(true);
    try {
      // Enviar tanto delivery_notes como notes para asegurar compatibilidad
      const updateData = {
        ...editingOrder,
        notes: editingOrder.delivery_notes, // Copiar para compatibilidad
      };
      await salesAPI.updateQuickOrder(editingOrder.id, updateData);
      notificationSwal("Éxito", "Pedido actualizado.", "success");
      setOpenEditDialog(false);
      onRefresh();
    } catch (e) {
      notificationSwal("Error", e.response?.data?.message || "No se pudo actualizar.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenPaymentDialog = (order) => {
    setSelectedOrderToConfirm(order);
    setPayments([]);
    setOpenPaymentDialog(true);
  };

  const handleConfirmDelivery = async () => {
    if (Math.abs(remainingAmount) > 0.01)
      return notificationSwal("Monto", "Pago incompleto.", "error");
    setIsSubmitting(true);
    
    const formData = new FormData();
    payments.forEach((p, index) => {
      formData.append(`payments[${index}][payment_method]`, p.payment_method);
      formData.append(`payments[${index}][amount]`, p.amount);
      formData.append(`payments[${index}][reference]`, p.reference || "");
      if (p.payment_image) {
        formData.append(`payments[${index}][payment_image]`, p.payment_image);
      }
    });

    try {
      await salesAPI.confirmDelivery(selectedOrderToConfirm.id, formData);
      notificationSwal("Éxito", "Entrega confirmada.", "success");
      setOpenPaymentDialog(false);
      onRefresh();
    } catch (e) {
      const errorMsg = e.response?.data?.message || e.response?.data?.error || "Error al confirmar.";
      notificationSwal("Error", errorMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelOrder = async (id) => {
    if (await confirmSwal("¿Cancelar?", "Se liberará el stock.")) {
      try {
        await salesAPI.cancelOrder(id);
        notificationSwal("Cancelado", "Pedido anulado.", "success");
        onRefresh();
      } catch (e) {
        notificationSwal("Error", "No se pudo cancelar.", "error");
      }
    }
  };

  const handleWhatsappResend = async (saleId) => {
    try {
      const response = await salesAPI.whatsappResend(saleId);
      notificationSwal(
        "WhatsApp Enviado",
        `Mensaje enviado correctamente al número: ${response.data.target_phone || response.data.phone}`,
        "success"
      );
    } catch (error) {
      console.error("Error resending WhatsApp:", error);
      notificationSwal(
        "Error",
        error.response?.data?.message || "No se pudo reenviar el mensaje de WhatsApp.",
        "error"
      );
    }
  };

  const handleOpenChangeRider = (order) => {
    setSelectedOrderForRider(order);
    setNewRiderId(order.rider_id || "");
    setOpenRiderDialog(true);
  };

  const handleChangeRider = async () => {
    try {
      await salesAPI.updateQuickOrder(selectedOrderForRider.id, {
        rider_id: newRiderId
      });
      notificationSwal("Éxito", "Motorizado actualizado.", "success");
      setOpenRiderDialog(false);
      onRefresh();
    } catch (e) {
      notificationSwal("Error", "No se pudo actualizar el motorizado.", "error");
    }
  };

  const handleOpenRouteInGoogleMaps = () => {
    const validOrders = orders.filter(
      (o) => (o.latitude || o.client?.latitude) && (o.longitude || o.client?.longitude)
    );

    if (validOrders.length === 0) {
      return notificationSwal("Aviso", "No hay pedidos con ubicación para generar la ruta.", "warning");
    }

    let url = "https://www.google.com/maps/dir/?api=1";
    
    if (userLocation) {
      url += `&origin=${userLocation.lat},${userLocation.lng}`;
    } else {
      url += "&origin=My+Location";
    }

    const waypoints = validOrders.map(o => {
      const lat = o.latitude || o.client.latitude;
      const lng = o.longitude || o.client.longitude;
      return `${lat},${lng}`;
    });

    const destination = waypoints.pop();
    if (waypoints.length > 0) {
      url += `&waypoints=${waypoints.join("|")}`;
    }
    url += `&destination=${destination}`;

    window.open(url, "_blank");
  };

  const orderMarkerIcon = (color = theme.palette.primary.main) =>
    new L.divIcon({
      html: `
        <svg viewBox="0 0 24 24" width="32" height="32" style="filter: drop-shadow(0 2px 3px rgba(0,0,0,0.3));">
          <path fill="${color}" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
      className: "order-marker",
    });

  const userMarkerIcon = new L.divIcon({
    html: `
      <svg viewBox="0 0 24 24" width="28" height="28" style="filter: drop-shadow(0 2px 3px rgba(0,0,0,0.3));">
        <path fill="${theme.palette.secondary.main}" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ mb: 1, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 1 }}>
        <IconButton 
          size="small" 
          color="primary" 
          onClick={handleOpenRouteInGoogleMaps}
          title="Ver Ruta en Google Maps"
          sx={{ 
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.2) }
          }}
        >
          <DirectionsIcon fontSize="small" />
        </IconButton>
        <ToggleButtonGroup
          size="small"
          value={monitorView}
          exclusive
          onChange={(e, v) => v && setMonitorView(v)}
          sx={{ height: 32 }}
        >
          <ToggleButton value="cards" sx={{ px: 1 }}>
            <GridViewIcon fontSize="small" />
          </ToggleButton>
          <ToggleButton value="map" sx={{ px: 1 }}>
            <MapIcon fontSize="small" />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ flex: 1, overflow: "hidden" }}>
        {orders.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 10, opacity: 0.2 }}>
            <LocalShippingIcon sx={{ fontSize: 80, mb: 1, color: "primary.main" }} />
            <Typography variant="h6" fontWeight="700">No hay pedidos pendientes</Typography>
          </Box>
        ) : monitorView === "cards" ? (
          <Box sx={{ height: "100%", overflowY: "auto", px: 0.5, pb: 2 }}>
            <Grid container spacing={1.5}>
              {orders.map((order) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={order.id}>
                  <OrderCard
                    order={order}
                    riders={riders}
                    onPay={handleOpenPaymentDialog}
                    onCancel={handleCancelOrder}
                    onWhatsapp={handleWhatsappResend}
                    onEdit={handleOpenEditOrder}
                    isRiderView={isRiderView}
                    currency={currency}
                    onChangeRider={handleOpenChangeRider}
                    markerColor={isMultiRider ? getRiderColor(order.rider_id) : null}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        ) : (
          <Card variant="outlined" sx={{ height: "100%", borderRadius: 1, overflow: "hidden" }}>
            <MapContainer
              center={userLocation ? [userLocation.lat, userLocation.lng] : [-9.93, -76.24]}
              zoom={14}
              style={{ height: "100%", width: "100%" }}
            >
              <LayersControl position="topright">
                <LayersControl.BaseLayer checked name="Google Calles">
                  <TileLayer
                    url="http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                    subdomains={["mt0", "mt1", "mt2", "mt3"]}
                  />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Google Híbrido">
                  <TileLayer
                    url="http://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                    subdomains={["mt0", "mt1", "mt2", "mt3"]}
                  />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Google Satélite">
                  <TileLayer
                    url="http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                    subdomains={["mt0", "mt1", "mt2", "mt3"]}
                  />
                </LayersControl.BaseLayer>
              </LayersControl>
              {orders
                .filter((o) => (o.latitude || o.client?.latitude) && (o.longitude || o.client?.longitude))
                .map((order) => (
                  <Marker
                    key={order.id}
                    position={[
                      parseFloat(order.latitude || order.client.latitude),
                      parseFloat(order.longitude || order.client.longitude),
                    ]}
                    icon={orderMarkerIcon(isMultiRider ? getRiderColor(order.rider_id) : theme.palette.primary.main)}
                  >
                    <Popup minWidth={280}>
                      <Box sx={{ p: 0.2 }}>
                        <OrderCard
                          order={order}
                          riders={riders}
                          onPay={handleOpenPaymentDialog}
                          onCancel={handleCancelOrder}
                          onWhatsapp={handleWhatsappResend}
                          onEdit={handleOpenEditOrder}
                          isRiderView={isRiderView}
                          currency={currency}
                          onChangeRider={handleOpenChangeRider}
                          markerColor={isMultiRider ? getRiderColor(order.rider_id) : null}
                        />
                      </Box>
                    </Popup>
                  </Marker>
                ))}
              {userLocation && (
                <Marker position={[userLocation.lat, userLocation.lng]} icon={userMarkerIcon}>
                  <Popup>Tu ubicación</Popup>
                </Marker>
              )}
              <MapFitBounds orders={orders} />
            </MapContainer>
          </Card>
        )}
      </Box>

      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Editar Pedido</DialogTitle>
        <DialogContent dividers>
          {editingOrder && (
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Motorizado</InputLabel>
                <Select
                  name="rider_id"
                  value={editingOrder.rider_id}
                  label="Motorizado"
                  onChange={handleEditChange}
                >
                  {riders.map((r) => (
                    <MenuItem key={r.id} value={r.id}>
                      {r.full_name || `${r.first_name} ${r.last_name || ""}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Fecha Programada"
                name="scheduled_at"
                type="datetime-local"
                value={editingOrder.scheduled_at}
                onChange={handleEditChange}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Cantidad"
                    name="quantity"
                    type="number"
                    value={editingOrder.quantity}
                    onChange={handleEditChange}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Total"
                    name="total_amount"
                    type="number"
                    value={editingOrder.total_amount}
                    onChange={handleEditChange}
                    fullWidth
                    size="small"
                    InputProps={{
                      startAdornment: (
                        <Typography variant="body2" sx={{ mr: 1, fontWeight: 700, color: "text.secondary" }}>
                          {currency === "PEN" ? "S/" : "$"}
                        </Typography>
                      ),
                    }}
                  />
                </Grid>
              </Grid>
              <TextField
                label="Notas / Referencia"
                name="delivery_notes"
                value={editingOrder.delivery_notes}
                onChange={handleEditChange}
                fullWidth
                size="small"
                multiline
                rows={3}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Cancelar</Button>
          <Button 
            onClick={handleUpdateOrder} 
            variant="contained" 
            disabled={isSubmitting}
          >
            {isSubmitting ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialogo Cambiar Motorizado (Quick) */}
      <Dialog open={openRiderDialog} onClose={() => setOpenRiderDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Cambiar Motorizado</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Nuevo Motorizado</InputLabel>
            <Select
              value={newRiderId}
              label="Nuevo Motorizado"
              onChange={(e) => setNewRiderId(e.target.value)}
            >
              {riders.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.full_name || `${r.first_name} ${r.last_name || ""}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRiderDialog(false)}>Cancelar</Button>
          <Button onClick={handleChangeRider} variant="contained" color="primary">Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialogo Cobrar */}
      <Dialog
        open={openPaymentDialog}
        onClose={() => setOpenPaymentDialog(false)}
        maxWidth="xs"
        fullWidth
        TransitionComponent={Transition}
        sx={{ "& .MuiDialog-paper": { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ textAlign: "center", bgcolor: "success.main", color: "white", py: 1.5 }}>
          <Typography variant="subtitle1" fontWeight="700">COBRAR PEDIDO</Typography>
          <Typography variant="caption" sx={{ opacity: 0.9 }}>
            #{selectedOrderToConfirm?.sale_number}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ mt: 2, px: 2 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              textAlign: "center",
              mb: 2,
              bgcolor: alpha(theme.palette.success.main, 0.04),
              borderRadius: 1,
              border: "1px solid",
              borderColor: "success.light",
            }}
          >
            <Typography variant="h4" fontWeight="800" color="success.main">
              {formatCurrency(selectedOrderToConfirm?.total_amount || 0, currency)}
            </Typography>
            <Typography variant="caption" fontWeight="600" color="text.secondary">TOTAL A RECIBIR</Typography>
          </Paper>
          
          <PaymentMethodSelector
            totalAmount={selectedOrderToConfirm?.total_amount || 0}
            payments={payments}
            setPayments={setPayments}
            currency={currency}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            fullWidth
            variant="contained"
            color="success"
            onClick={handleConfirmDelivery}
            disabled={isSubmitting || Math.abs(remainingAmount) > 0.01}
            sx={{ borderRadius: 1, py: 1.2, fontWeight: 700 }}
          >
            {isSubmitting ? <CircularProgress size={24} color="inherit" /> : "CONFIRMAR ENTREGA"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
