import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Avatar,
  Divider,
  Badge,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tab,
  Tabs,
  useTheme,
  Paper,
  Slide,
  AppBar,
  Toolbar,
  Container,
  useMediaQuery,
  InputAdornment,
  Stack,
  Autocomplete,
  CircularProgress,
  Tooltip as MuiTooltip,
  alpha,
  CardActionArea,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
  ShoppingCart as ShoppingCartIcon,
  Payment as PaymentIcon,
  Inventory as InventoryIcon,
  Build as BuildIcon,
  Clear as ClearIcon,
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon,
  Close as CloseIcon,
  DeleteForever as DeleteForeverIcon,
  CreditCard as CreditCardIcon,
  PriceCheck as PriceCheckIcon,
  Search as SearchIcon,
  PersonAdd as PersonAddIcon,
  LocalShipping as LocalShippingIcon,
  Notes as NotesIcon,
  GpsFixed as GpsFixedIcon,
  EditLocationAlt as EditLocationIcon,
  MyLocation as MyLocationIcon,
  History as HistoryIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  PhoneIphone as PhoneIcon,
  Map as MapIcon,
  Send as SendIcon,
  WhatsApp as WhatsAppIcon,
  ReceiptLong as ReceiptIcon,
  Refresh as RefreshIcon,
  Category as CategoryIcon,
  GridView as GridViewIcon,
  LocationOn as LocationOnIcon,
  Info as InfoIcon,
} from "@mui/icons-material";
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { renderToString } from "react-dom/server";
import { formatCurrency, formatDate } from "../utils/formatters";
import { notificationSwal, confirmSwal } from "../utils/swal-helpers";
import {
  API_STORAGE_URL,
  cashRegisterAPI,
  productsAPI,
  salesAPI,
  servicesAPI,
  clientsAPI,
  usersAPI,
  categoriesAPI,
} from "../utils/api";
import { useAuth } from "../contexts/AuthContext";

// --- CONFIGURACIÓN DE ÍCONOS LEAFLET ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const MapRecenter = ({ location, zoom = 17 }) => {
  const map = useMap();
  useEffect(() => {
    if (location) map.flyTo([location.lat, location.lng], zoom);
  }, [location, map, zoom]);
  return null;
};

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

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
      style={{ height: "100%", width: "100%" }}
    >
      {value === index && (
        <Box sx={{ py: { xs: 0.5, md: 1 }, height: "100%" }}>{children}</Box>
      )}
    </div>
  );
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Efectivo", icon: <MoneyIcon /> },
  { value: "yape", label: "Yape", icon: <PriceCheckIcon /> },
  { value: "plin", label: "Plin", icon: <PriceCheckIcon /> },
  { value: "card", label: "Tarjeta", icon: <CreditCardIcon /> },
  { value: "transfer", label: "Transferencia", icon: <CreditCardIcon /> },
  { value: "credit", label: "Crédito", icon: <ScheduleIcon /> },
];

const getNowDateTimeLocal = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};

export const Orders = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));

  const [tabValue, setTabValue] = useState(0);
  const [itemTabValue, setItemTabValue] = useState(0);
  const [monitorView, setMonitorView] = useState("cards");
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [currency, setCurrency] = useState(user?.business?.currency || "PEN");
  const [riders, setRiders] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchingClient, setIsSearchingClient] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [editableTotal, setEditableTotal] = useState("");

  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerLocation, setCustomerLocation] = useState(null);
  const [isNewCustomer, setIsNewCustomer] = useState(true);
  const [selectedRider, setSelectedRider] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [scheduledAt, setScheduledAt] = useState(getNowDateTimeLocal());
  const [userLocation, setUserLocation] = useState(null);

  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [openLocationDialog, setOpenLocationDialog] = useState(false);
  const [locationMode, setLocationMode] = useState("manual");
  const [tempLocation, setTempLocation] = useState(null);
  const locationMapRef = useRef();

  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [selectedOrderToConfirm, setSelectedOrderToConfirm] = useState(null);
  const [payments, setPayments] = useState([]);

  const calculatedTotal = useMemo(() => {
    if (!selectedProduct) return 0;
    return selectedProduct.price * quantity;
  }, [selectedProduct, quantity]);

  useEffect(() => {
    if (selectedProduct) setEditableTotal(calculatedTotal.toString());
    else setEditableTotal("");
  }, [calculatedTotal, selectedProduct]);

  const filteredItems = useMemo(() => {
    const type = itemTabValue === 0 ? "product" : "service";
    let all = type === "product" ? products : services;

    if (!searchQuery) return all;
    return all.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [products, services, searchQuery, itemTabValue]);

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

  useEffect(() => {
    loadData();
    loadRiders();
    loadPendingOrders();
  }, []);

  useEffect(() => {
    if (user?.business?.currency) setCurrency(user.business.currency);
  }, [user]);

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (p) =>
        setUserLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => console.error(e),
      { enableHighAccuracy: true },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const loadData = async () => {
    try {
      const [prodRes, servRes] = await Promise.all([
        productsAPI.getAll({ per_page: -1 }),
        servicesAPI.getAll({ per_page: -1 }),
      ]);
      setProducts(
        (prodRes.data.data || []).map((p) => ({ ...p, type: "product" })),
      );
      setServices(
        (servRes.data.data || []).map((s) => ({ ...s, type: "service" })),
      );
    } catch (e) {
      console.error("Error loading data", e);
    }
  };

  const handleItemClick = (itemToAdd) => {
    if (itemToAdd.type === "product" && itemToAdd.stock <= 0) {
      notificationSwal(
        "Sin Stock",
        "Este producto no tiene stock disponible.",
        "error",
      );
      return;
    }
    setSelectedProduct(itemToAdd);
    setQuantity(1);
  };

  const loadRiders = async () => {
    try {
      const res = await usersAPI.getAll({ per_page: -1 });
      setRiders((res.data.data || []).filter((u) => u.status === "active"));
    } catch (e) {
      console.error("Error loading riders", e);
    }
  };

  const loadPendingOrders = async () => {
    try {
      const res = await salesAPI.getAll({
        status: "pending",
        is_delivery: 1,
        per_page: -1,
      });
      setPendingOrders(res.data.data || []);
    } catch (e) {
      console.error("Error loading orders", e);
    }
  };

  const handleSearchCustomer = async () => {
    if (!customerPhone) return;
    setIsSearchingClient(true);
    try {
      const res = await clientsAPI.getAll({ phone: customerPhone });
      const clients = res.data.data || [];
      if (clients.length > 0) {
        const c = clients[0];
        setCustomerName(c.name);
        setCustomerAddress(c.address);
        setCustomerLocation({
          lat: parseFloat(c.latitude),
          lng: parseFloat(c.longitude),
        });
        setIsNewCustomer(false);
      } else {
        setIsNewCustomer(true);
        setCustomerName("");
        setCustomerAddress("");
        setCustomerLocation(null);
      }
    } finally {
      setIsSearchingClient(false);
    }
  };

  const handleAddressSearch = async (query) => {
    if (!query || query.length < 3 || !MAPBOX_TOKEN) return;
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&language=es&limit=5&country=pe`,
    );
    const data = await res.json();
    setAddressSuggestions(data.features || []);
  };

  const handleSelectSuggestion = (s) => {
    if (!s) return;
    setCustomerAddress(s.place_name);
    setCustomerLocation({ lat: s.center[1], lng: s.center[0] });
    setAddressSuggestions([]);
  };

  const fetchMapboxAddress = async (lat, lng) => {
    if (!MAPBOX_TOKEN) return;
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&language=es`,
    );
    const data = await res.json();
    setCustomerAddress(data.features?.[0]?.place_name || "");
  };

  const handleConfirmLocation = () => {
    let coords = tempLocation;
    if (locationMode === "manual" && locationMapRef.current) {
      const c = locationMapRef.current.getCenter();
      coords = { lat: c.lat, lng: c.lng };
    }
    if (coords) {
      setCustomerLocation(coords);
      fetchMapboxAddress(coords.lat, coords.lng);
    }
    setOpenLocationDialog(false);
  };

  const handleCreateQuickOrder = async () => {
    if (!customerPhone || !selectedProduct || !selectedRider) {
      notificationSwal(
        "Faltan Datos",
        "Teléfono, Producto y Motorizado son obligatorios.",
        "warning",
      );
      return;
    }
    setIsLoading(true);
    try {
      const discount = Math.max(
        0,
        calculatedTotal - (parseFloat(editableTotal) || 0),
      );
      await salesAPI.quickOrder({
        phone: customerPhone,
        customer_name: customerName,
        address: customerAddress,
        latitude: customerLocation?.lat,
        longitude: customerLocation?.lng,
        product_id: selectedProduct.id,
        quantity,
        total_amount: parseFloat(editableTotal) || 0,
        discount: discount,
        rider_id: selectedRider,
        notes: orderNotes,
        scheduled_at: scheduledAt || null,
      });
      notificationSwal("Registrado", "Pedido creado con éxito.", "success");
      setSelectedProduct(null);
      setCustomerPhone("");
      setCustomerName("");
      setCustomerAddress("");
      setCustomerLocation(null);
      setOrderNotes("");
      setSelectedRider("");
      setScheduledAt("");
      loadPendingOrders();
    } catch (e) {
      notificationSwal(
        "Error",
        e.response?.data?.message || "No se pudo crear.",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (Math.abs(remainingAmount) > 0.01)
      return notificationSwal("Monto", "Pago incompleto.", "error");
    setIsLoading(true);
    try {
      await salesAPI.confirmDelivery(selectedOrderToConfirm.id, {
        payments: payments.map((p) => ({ ...p, amount: parseFloat(p.amount) })),
      });
      notificationSwal("Éxito", "Entrega confirmada.", "success");
      setOpenPaymentDialog(false);
      loadPendingOrders();
    } catch (e) {
      notificationSwal("Error", "Error al confirmar.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenConfirmDialog = (order) => {
    setSelectedOrderToConfirm(order);
    setPayments([]);
    setOpenPaymentDialog(true);
  };

  const handleCancelOrder = async (id) => {
    if (await confirmSwal("¿Cancelar?", "Se liberará el stock.")) {
      try {
        await salesAPI.cancelOrder(id);
        notificationSwal("Cancelado", "Pedido anulado.", "success");
        loadPendingOrders();
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
        `Mensaje enviado correctamente al número: ${response.data.target_phone}`,
        "success",
      );
    } catch (error) {
      console.error("Error resending WhatsApp:", error);
      notificationSwal(
        "Error",
        error.response?.data?.message ||
          "No se pudo reenviar el mensaje de WhatsApp.",
        "error",
      );
    }
  };

  const userMarkerIcon = useMemo(
    () =>
      new L.divIcon({
        html: renderToString(
          <MyLocationIcon
            style={{ fontSize: 28, color: theme.palette.secondary.main }}
          />,
        ),
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      }),
    [theme.palette.secondary.main],
  );

  const orderMarkerIcon = (color = theme.palette.primary.main) =>
    new L.divIcon({
      html: renderToString(
        <LocationOnIcon style={{ fontSize: 32, color: color }} />,
      ),
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
      className: "order-marker",
    });

  const OrderCard = ({ order }) => (
    <Card
      elevation={1}
      sx={{
        borderRadius: 1.5,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        border: "1px solid",
        borderColor: order.scheduled_at ? "error.light" : "divider",
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
          bgcolor: order.scheduled_at ? alpha(theme.palette.error.main, 0.04) : alpha(theme.palette.primary.main, 0.04),
        }}
      >
        <Chip
          label={`#${order.sale_number}`}
          size="small"
          color={order.scheduled_at ? "error" : "primary"}
          sx={{ fontWeight: 800, height: 20, fontSize: 10, borderRadius: 1 }}
        />
        <Typography
          variant="caption"
          fontWeight="600"
          sx={{ fontSize: 10, color: "text.secondary" }}
        >
          {formatDate(order.created_at)}
        </Typography>
      </Box>
      <CardContent sx={{ flex: 1, p: 1.5 }}>
        <Typography
          variant="subtitle1"
          fontWeight="700"
          noWrap
          sx={{ mb: 0.5, color: "text.primary", lineHeight: 1.2 }}
        >
          {order.customer_name}
        </Typography>
        {order.items?.length > 0 && (
          <Box sx={{ mb: 1.5, display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {order.items.map((it, idx) => (
              <Chip
                key={idx}
                label={`${it.quantity}x ${it.item_name}`}
                size="small"
                variant="outlined"
                sx={{
                  height: 18,
                  fontSize: 9,
                  fontWeight: 600,
                  borderColor: "primary.light",
                  color: "primary.main",
                  borderRadius: 1
                }}
              />
            ))}
          </Box>
        )}

        <Stack spacing={0.8}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <PhoneIcon sx={{ fontSize: 14, color: "success.main" }} />
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              {order.delivery_phone || order.phone || order.client?.phone || "S/T"}
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
          {order.scheduled_at && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                color: "error.main",
                bgcolor: alpha(theme.palette.error.main, 0.08),
                p: 0.5,
                borderRadius: 1,
              }}
            >
              <ScheduleIcon sx={{ fontSize: 14 }} />
              <Typography variant="caption" fontWeight="800" sx={{ fontSize: 9 }}>
                ENTREGA: {formatDate(order.scheduled_at)}
              </Typography>
            </Box>
          )}
        </Stack>
        <Box sx={{ mt: 1.5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
           <Typography variant="caption" fontWeight="700" color="text.secondary">TOTAL:</Typography>
           <Typography variant="subtitle1" fontWeight="800" color="primary">
            {formatCurrency(order.total_amount, currency)}
          </Typography>
        </Box>
      </CardContent>
      <Divider />
      <CardActions
        sx={{
          justifyContent: "space-between",
          p: 1,
        }}
      >
        <Stack direction="row" spacing={0.5}>
          <IconButton
            size="small"
            sx={{ color: "success.main" }}
            onClick={() => handleWhatsappResend(order.id)}
            title="Reenviar WhatsApp"
          >
            <WhatsAppIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            sx={{ color: "error.main" }}
            onClick={() => handleCancelOrder(order.id)}
          >
            <CancelIcon fontSize="small" />
          </IconButton>
        </Stack>
        <Button
          variant="contained"
          size="small"
          color="success"
          startIcon={<PaymentIcon sx={{ fontSize: 16 }} />}
          onClick={() => handleOpenConfirmDialog(order)}
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

  return (
    <Box
      sx={{
        height: "calc(100vh - 64px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <AppBar position="static" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Toolbar variant="dense" sx={{ justifyContent: "space-between", px: { xs: 0.5, sm: 1.5 }, minHeight: 48 }}>
          <Tabs
            value={tabValue}
            onChange={(e, v) => setTabValue(v)}
            variant={isMobile ? "fullWidth" : "standard"}
            sx={{ 
              minHeight: 48,
              "& .MuiTab-root": { minHeight: 48, fontWeight: 700, px: { xs: 1, sm: 3 } }
            }}
          >
            <Tab 
              label={isMobile ? "" : "Nueva Orden"} 
              icon={<AddIcon fontSize="small" />} 
              iconPosition="start" 
              sx={{ minWidth: isMobile ? 50 : 140 }}
            />
            <Tab
              label={isMobile ? "" : (
                <Badge
                  badgeContent={pendingOrders.length}
                  color="error"
                  overlap="rectangular"
                  sx={{ "& .MuiBadge-badge": { fontWeight: 800, fontSize: 10 } }}
                >
                  Monitor
                </Badge>
              )}
              icon={<LocalShippingIcon fontSize="small" />}
              iconPosition="start"
              sx={{ minWidth: isMobile ? 50 : 140 }}
            />
          </Tabs>
          
          <Stack direction="row" spacing={0.5} alignItems="center">
            {tabValue === 1 && (
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
            )}
            <IconButton
              size="small"
              onClick={() => {
                loadData();
                loadPendingOrders();
              }}
              color="primary"
              sx={{ ml: 1 }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, overflow: "hidden", p: { xs: 0.5, sm: 1 } }}>
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={1} sx={{ height: "100%", overflowY: isTablet ? "auto" : "hidden" }}>
            <Grid item xs={12} md={3} sx={{ height: isTablet ? "auto" : "100%" }}>
              <Card variant="outlined" sx={{ height: "100%", borderRadius: 1.5 }}>
                <CardContent sx={{ p: 1.5 }}>
                  <Typography
                    variant="subtitle2"
                    fontWeight="700"
                    sx={{
                      mb: 1.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      color: "primary.main",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <PersonAddIcon fontSize="small" /> CLIENTE
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setCustomerPhone("");
                        setCustomerName("");
                        setCustomerAddress("");
                        setCustomerLocation(null);
                        setOrderNotes("");
                        setScheduledAt("");
                        setSelectedProduct(null);
                      }}
                      color="error"
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </Typography>
                  <Stack spacing={1.5}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Teléfono"
                      type="number"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      InputProps={{
                        startAdornment: <PhoneIcon sx={{ mr: 1, color: "text.secondary", fontSize: 18 }} />,
                        endAdornment: (
                          <IconButton
                            size="small"
                            onClick={handleSearchCustomer}
                            disabled={isSearchingClient}
                            color="primary"
                          >
                            <SearchIcon fontSize="small" />
                          </IconButton>
                        ),
                      }}
                    />
                    <TextField
                      fullWidth
                      size="small"
                      label="Nombre"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      disabled={!isNewCustomer && customerName !== ""}
                    />
                    <Autocomplete
                      freeSolo
                      size="small"
                      options={addressSuggestions}
                      getOptionLabel={(o) => typeof o === "string" ? o : o.place_name || ""}
                      onInputChange={(e, v) => handleAddressSearch(v)}
                      onChange={(e, v) => handleSelectSuggestion(v)}
                      inputValue={customerAddress}
                      renderInput={(p) => (
                        <TextField
                          {...p}
                          label="Dirección"
                          onChange={(e) => setCustomerAddress(e.target.value)}
                          InputProps={{
                            ...p.InputProps,
                            endAdornment: (
                              <IconButton
                                size="small"
                                color="secondary"
                                onClick={() => {
                                  setTempLocation(customerLocation || userLocation);
                                  setOpenLocationDialog(true);
                                }}
                              >
                                <MapIcon fontSize="small" />
                              </IconButton>
                            ),
                          }}
                        />
                      )}
                    />
                    <TextField
                      fullWidth
                      size="small"
                      type="datetime-local"
                      label="Programar entrega"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      rows={2}
                      label="Notas/Referencia"
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                    />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6} sx={{ height: isTablet ? "55vh" : "100%" }}>
              <Card
                variant="outlined"
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: 1.5,
                }}
              >
                <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                  <Tabs
                    value={itemTabValue}
                    onChange={(e, v) => setItemTabValue(v)}
                    variant="fullWidth"
                  >
                    <Tab label={`Productos (${products.length})`} sx={{ fontWeight: 700 }} />
                    <Tab label={`Servicios (${services.length})`} sx={{ fontWeight: 700 }} />
                  </Tabs>
                </Box>
                <Box
                  sx={{
                    p: 1,
                    borderBottom: 1,
                    borderColor: "divider",
                    bgcolor: "background.paper",
                  }}
                >
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Buscar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <SearchIcon sx={{ mr: 1, color: "text.secondary", fontSize: 18 }} />
                      ),
                    }}
                  />
                </Box>
                <Box sx={{ flex: 1, overflowY: "auto", p: 0.5 }}>
                  <Grid container spacing={1}>
                    {filteredItems.map((item) => (
                      <Grid item xs={6} sm={4} md={4} lg={3} key={`${item.type}-${item.id}`}>
                        <Card
                          elevation={0}
                          sx={{
                            borderRadius: 1,
                            border: "1px solid",
                            borderColor: selectedProduct?.id === item.id ? "divider" : theme.palette.warning.main,
                            bgcolor: selectedProduct?.id === item.id 
                              ? theme.palette.background.paper
                              : alpha(theme.palette.warning.main, 0.08),
                            transition: "all 0.1s",
                            cursor: "pointer",
                            position: "relative",
                            opacity: item.type === "product" && item.stock <= 0 ? 0.6 : 1,
                            "&:hover": { 
                              boxShadow: theme.shadows[2],
                              borderColor: "divider",
                              bgcolor: theme.palette.mode === "light" ? alpha(theme.palette.common.black, 0.03) : theme.palette.background.default
                            }
                          }}
                          onClick={() => handleItemClick(item)}
                        >
                          <CardContent sx={{ p: 0.8, textAlign: "center", "&:last-child": { pb: 0.8 } }}>
                            {item.type === "product" && (
                              <Chip
                                label={`Stock: ${item.stock}`}
                                size="small"
                                color={item.stock <= 5 ? "error" : "success"}
                                sx={{ 
                                  position: "absolute", 
                                  top: 3, 
                                  right: 3, 
                                  height: 14, 
                                  fontSize: 8, 
                                  fontWeight: 900,
                                  zIndex: 2,
                                  px: 0.5,
                                  minWidth: 18
                                }}
                              />
                            )}
                            <Avatar
                              src={item.image_path ? `${API_STORAGE_URL}/${item.image_path}` : null}
                              variant="rounded"
                              sx={{
                                width: 44,
                                height: 44,
                                mx: "auto",
                                mb: 0.5,
                                bgcolor: "background.paper",
                                border: "1px solid",
                                borderColor: "grey.200"
                              }}
                            >
                              {item.type === "product" ? (
                                <InventoryIcon sx={{ fontSize: 22 }} color="primary" />
                              ) : (
                                <BuildIcon sx={{ fontSize: 22 }} color="secondary" />
                              )}
                            </Avatar>
                            <Typography
                              variant="caption"
                              fontWeight="700"
                              sx={{
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                height: 24,
                                lineHeight: 1.1,
                                fontSize: 10.5,
                                mb: 0.3,
                              }}
                            >
                              {item.name}
                            </Typography>
                            <Typography
                              variant="subtitle2"
                              color="primary.main"
                              fontWeight="900"
                              sx={{ fontSize: 12, display: "block" }}
                            >
                              {formatCurrency(item.price, currency)}
                            </Typography>

                            {item.type === "product" && item.stock <= 0 && (
                              <Box
                                sx={{
                                  position: "absolute",
                                  inset: 0,
                                  bgcolor: "rgba(0,0,0,0.6)",
                                  color: "white",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  borderRadius: 1,
                                  zIndex: 3
                                }}
                              >
                                <Typography variant="caption" fontWeight="900" sx={{ fontSize: 9 }}>AGOTADO</Typography>
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Card>
            </Grid>

            <Grid item xs={12} md={3} sx={{ height: isTablet ? "auto" : "100%" }}>
              <Card
                elevation={0}
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: 1.5,
                  border: "1px solid",
                  borderColor: theme.palette.warning.main,
                  overflow: "hidden",
                }}
              >
                <Box sx={{ bgcolor: theme.palette.warning.main, py: 0.8, textAlign: "center" }}>
                  <Typography variant="caption" fontWeight="800" color="white" sx={{ letterSpacing: 1 }}>
                    ORDEN DE VENTA
                  </Typography>
                </Box>
                <CardContent
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    p: 1.5,
                  }}
                >
                  {selectedProduct ? (
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                        <Typography variant="body2" fontWeight="700" sx={{ color: theme.palette.warning.main, lineHeight: 1.2 }}>
                          {selectedProduct.name}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => setSelectedProduct(null)}
                          sx={{ p: 0.5 }}
                        >
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      
                      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            borderRadius: 1,
                            border: "1px solid",
                            borderColor: theme.palette.warning.main,
                          }}
                        >
                          <IconButton
                            size="small"
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            sx={{ color: theme.palette.warning.main, p: 0.5 }}
                          >
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          <Typography sx={{ mx: 1.5, fontWeight: 700, fontSize: 14 }}>
                            {quantity}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => setQuantity(quantity + 1)}
                            sx={{ color: theme.palette.warning.main, p: 0.5 }}
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Box>
                        <Typography variant="subtitle2" fontWeight="700">
                          {formatCurrency(selectedProduct.price * quantity, currency)}
                        </Typography>
                      </Stack>

                      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel sx={{ fontSize: 13 }}>Motorizado</InputLabel>
                        <Select
                          value={selectedRider}
                          label="Motorizado"
                          onChange={(e) => setSelectedRider(e.target.value)}
                          sx={{ borderRadius: 1, fontSize: 13 }}
                        >
                          {riders.map((r) => (
                            <MenuItem key={r.id} value={r.id} sx={{ fontSize: 13 }}>
                              {r.full_name || `${r.first_name} ${r.last_name || ""}`}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <Box
                        sx={{
                          bgcolor: alpha(theme.palette.info.main, 0.05),
                          p: 1.5,
                          borderRadius: 1,
                          mb: 2,
                          border: "1px solid",
                          borderColor: "info.light",
                        }}
                      >
                        <Typography
                          variant="caption"
                          color="info.main"
                          fontWeight="700"
                          sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}
                        >
                          <ReceiptIcon sx={{ fontSize: 14 }} /> TOTAL A PAGAR
                        </Typography>
                        <TextField
                          fullWidth
                          size="small"
                          variant="standard"
                          type="number"
                          value={editableTotal}
                          onChange={(e) => setEditableTotal(e.target.value)}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Typography fontWeight="800" color="info.main" variant="subtitle1">
                                  {currency === "PEN" ? "S/" : "$"}
                                </Typography>
                              </InputAdornment>
                            ),
                            disableUnderline: true,
                            sx: {
                              fontWeight: 800,
                              fontSize: "1.2rem",
                              color: "info.main",
                            },
                          }}
                        />
                      </Box>
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        opacity: 0.2,
                        py: 4,
                      }}
                    >
                      <ShoppingCartIcon sx={{ fontSize: 60, mb: 1, color: theme.palette.warning.main }} />
                      <Typography variant="caption" fontWeight="700">LISTA VACÍA</Typography>
                    </Box>
                  )}

                  <Button
                    fullWidth
                    variant="contained"
                    size="medium"
                    onClick={handleCreateQuickOrder}
                    disabled={isLoading || !selectedProduct || !customerPhone || !selectedRider}
                    startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : <SendIcon fontSize="small" />}
                    sx={{
                      py: 1,
                      borderRadius: 1,
                      fontWeight: 700,
                      bgcolor: theme.palette.warning.main,
                      "&:hover": { bgcolor: theme.palette.warning.dark },
                      fontSize: 13,
                    }}
                  >
                    REGISTRAR PEDIDO
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ height: "100%", overflow: "hidden" }}>
            {pendingOrders.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 10, opacity: 0.2 }}>
                <HistoryIcon sx={{ fontSize: 80, mb: 1, color: "primary.main" }} />
                <Typography variant="h6" fontWeight="700">No hay pedidos pendientes</Typography>
              </Box>
            ) : monitorView === "cards" ? (
              <Box sx={{ height: "100%", overflowY: "auto", px: 0.5, pb: 2 }}>
                <Grid container spacing={1.5}>
                  {pendingOrders.map((order) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={order.id}>
                      <OrderCard order={order} />
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
                    <LayersControl.BaseLayer name="Google Satélite">
                      <TileLayer
                        url="http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                        subdomains={["mt0", "mt1", "mt2", "mt3"]}
                      />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Google Híbrido">
                      <TileLayer
                        url="http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}"
                        subdomains={["mt0", "mt1", "mt2", "mt3"]}
                      />
                    </LayersControl.BaseLayer>
                  </LayersControl>
                  {pendingOrders
                    .filter((o) => (o.latitude || o.client?.latitude) && (o.longitude || o.client?.longitude))
                    .map((order) => (
                      <Marker
                        key={order.id}
                        position={[
                          parseFloat(order.latitude || order.client.latitude),
                          parseFloat(order.longitude || order.client.longitude),
                        ]}
                        icon={orderMarkerIcon(order.scheduled_at ? theme.palette.error.main : theme.palette.primary.main)}
                      >
                        <Popup minWidth={280} className="order-popup">
                          <Box sx={{ p: 0.2 }}>
                            <OrderCard order={order} />
                          </Box>
                        </Popup>
                      </Marker>
                    ))}
                  {userLocation && (
                    <Marker position={[userLocation.lat, userLocation.lng]} icon={userMarkerIcon}>
                      <Popup>Tu ubicación</Popup>
                    </Marker>
                  )}
                  <MapFitBounds orders={pendingOrders} />
                </MapContainer>
              </Card>
            )}
          </Box>
        </TabPanel>
      </Box>

      <Dialog
        open={openLocationDialog}
        onClose={() => setOpenLocationDialog(false)}
        maxWidth="md"
        fullWidth
        sx={{ "& .MuiDialog-paper": { borderRadius: 1.5 } }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            bgcolor: "primary.main",
            color: "white",
            py: 1,
            px: 2
          }}
        >
          <Typography variant="subtitle1" fontWeight="700">FIJAR UBICACIÓN</Typography>
          <Stack direction="row" spacing={1}>
            <IconButton
              size="small"
              onClick={() => setLocationMode("tracking")}
              sx={{ color: locationMode === "tracking" ? "white" : alpha("#fff", 0.5) }}
            >
              <GpsFixedIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => setLocationMode("manual")}
              sx={{ color: locationMode === "manual" ? "white" : alpha("#fff", 0.5) }}
            >
              <EditLocationIcon fontSize="small" />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: 400, position: "relative" }}>
          <MapContainer
            center={tempLocation ? [tempLocation.lat, tempLocation.lng] : [-9.93, -76.24]}
            zoom={15}
            style={{ height: "100%", width: "100%" }}
            ref={locationMapRef}
          >
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Google Calles">
                <TileLayer
                  url="http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                  subdomains={["mt0", "mt1", "mt2", "mt3"]}
                />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Google Satélite">
                <TileLayer
                  url="http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                  subdomains={["mt0", "mt1", "mt2", "mt3"]}
                />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Google Híbrido">
                <TileLayer
                  url="http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}"
                  subdomains={["mt0", "mt1", "mt2", "mt3"]}
                />
              </LayersControl.BaseLayer>
            </LayersControl>
            <MapRecenter location={tempLocation} />
          </MapContainer>
          {locationMode === "manual" && (
            <Box
              sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -100%)",
                zIndex: 1000,
                pointerEvents: "none",
              }}
            >
              <LocationOnIcon sx={{ fontSize: 40, color: "primary.main", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }} />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 1.5 }}>
          <Button onClick={() => setOpenLocationDialog(false)} color="inherit" sx={{ fontWeight: 600 }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmLocation}
            sx={{ borderRadius: 1, px: 3, fontWeight: 700 }}
          >
            CONFIRMAR
          </Button>
        </DialogActions>
      </Dialog>

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
          
          <Stack spacing={1.5}>
            {payments.map((p) => (
              <Box
                key={p.id}
                sx={{ p: 1.5, position: "relative", borderRadius: 1, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}
              >
                <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ position: "absolute", top: -8, left: 10, bgcolor: "background.paper", px: 0.5 }}>
                  {PAYMENT_METHODS.find((m) => m.value === p.payment_method)?.label}
                </Typography>
                <TextField
                  fullWidth
                  variant="standard"
                  type="number"
                  value={p.amount}
                  onChange={(e) =>
                    setPayments(payments.map((x) => x.id === p.id ? { ...x, amount: e.target.value } : x))
                  }
                  InputProps={{
                    disableUnderline: true,
                    sx: { fontWeight: 700, fontSize: "1.1rem" },
                  }}
                  autoFocus
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Referencia (Opcional)"
                  value={p.reference || ""}
                  onChange={(e) =>
                    setPayments(payments.map((x) => x.id === p.id ? { ...x, reference: e.target.value } : x))
                  }
                  sx={{ mt: 1 }}
                />
                <IconButton
                  size="small"
                  color="error"
                  sx={{ position: "absolute", top: 10, right: 10 }}
                  onClick={() => setPayments(payments.filter((x) => x.id !== p.id))}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
            
            <Grid container spacing={1}>
              {PAYMENT_METHODS.map((m) => (
                <Grid item xs={4} key={m.value}>
                  <Button
                    fullWidth
                    variant="outlined"
                    size="small"
                    onClick={() =>
                      setPayments([
                        ...payments,
                        {
                          id: Date.now(),
                          payment_method: m.value,
                          amount: remainingAmount > 0 ? remainingAmount.toFixed(2) : "0",
                          reference: ""
                        },
                      ])
                    }
                    sx={{ fontSize: 10, borderRadius: 1, fontWeight: 600, height: 32, borderColor: "divider" }}
                  >
                    {m.label}
                  </Button>
                </Grid>
              ))}
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            fullWidth
            variant="contained"
            color="success"
            onClick={handleConfirmDelivery}
            disabled={isLoading || Math.abs(remainingAmount) > 0.01}
            sx={{ borderRadius: 1, py: 1.2, fontWeight: 700 }}
          >
            CONFIRMAR ENTREGA
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
