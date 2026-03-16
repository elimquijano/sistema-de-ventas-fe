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
} from "@mui/icons-material";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
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

const MapRecenter = ({ location }) => {
  const map = useMap();
  useEffect(() => {
    if (location) map.flyTo([location.lat, location.lng], 17);
  }, [location, map]);
  return null;
};

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
      style={{ height: "100%" }}
    >
      {value === index && <Box sx={{ py: 2, height: "100%" }}>{children}</Box>}
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

export const Orders = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // --- ESTADOS ---
  const [tabValue, setTabValue] = useState(0);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [currency, setCurrency] = useState(user?.business?.currency || "PEN");
  const [riders, setRiders] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchingClient, setIsSearchingClient] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // --- ESTADOS DE SELECCIÓN ---
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [editableTotal, setEditableTotal] = useState("");

  // --- ESTADOS DE CLIENTE ---
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerLocation, setCustomerLocation] = useState(null);
  const [isNewCustomer, setIsNewCustomer] = useState(true);
  const [selectedRider, setSelectedRider] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [userLocation, setUserLocation] = useState(null);

  // --- ESTADOS DE MAPA ---
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [openLocationDialog, setOpenLocationDialog] = useState(false);
  const [locationMode, setLocationMode] = useState("manual");
  const [tempLocation, setTempLocation] = useState(null);
  const locationMapRef = useRef();

  // --- ESTADOS DE PAGO ---
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [selectedOrderToConfirm, setSelectedOrderToConfirm] = useState(null);
  const [payments, setPayments] = useState([]);
  const [cashReceived, setCashReceived] = useState("");

  // --- MEMOS ---
  const calculatedTotal = useMemo(() => {
    if (!selectedProduct) return 0;
    return selectedProduct.price * quantity;
  }, [selectedProduct, quantity]);

  useEffect(() => {
    if (selectedProduct) setEditableTotal(calculatedTotal.toString());
    else setEditableTotal("");
  }, [calculatedTotal, selectedProduct]);

  const filteredItems = useMemo(() => {
    let all = [...products, ...services];
    if (selectedCategory !== "all") {
      all = all.filter((item) => item.category_id === selectedCategory);
    }
    if (!searchQuery) return all;
    return all.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [products, services, searchQuery, selectedCategory]);

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
  const cashChange = useMemo(() => {
    if (!cashReceived) return 0;
    const cashTotal = payments
      .filter((p) => p.payment_method === "cash")
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const change = parseFloat(cashReceived) - cashTotal;
    return change >= 0 ? change : 0;
  }, [payments, cashReceived]);

  // --- EFECTOS ---
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

  // --- ACCIONES ---
  const loadData = async () => {
    try {
      const [prodRes, servRes, catRes] = await Promise.all([
        productsAPI.getAll({ per_page: -1 }),
        servicesAPI.getAll({ per_page: -1 }),
        categoriesAPI.getAll({ per_page: -1 }),
      ]);
      setProducts(
        (prodRes.data.data || []).map((p) => ({ ...p, type: "product" })),
      );
      setServices(
        (servRes.data.data || []).map((s) => ({ ...s, type: "service" })),
      );
      setCategories(catRes.data.data || []);
    } catch (e) {
      console.error("Error loading data", e);
    }
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
    setPayments([
      {
        id: Date.now(),
        payment_method: "cash",
        amount: order.total_amount,
        reference: "",
      },
    ]);
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
            style={{ fontSize: 32, color: theme.palette.secondary.main }}
          />,
        ),
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      }),
    [theme.palette.secondary.main],
  );

  return (
    <Box
      sx={{
        height: "calc(100vh - 64px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pr: 2,
        }}
      >
        <Tabs
          value={tabValue}
          onChange={(e, v) => setTabValue(v)}
          sx={{ px: 2 }}
        >
          <Tab label="Nueva Orden" icon={<AddIcon />} iconPosition="start" />
          <Tab
            label={
              <Badge
                badgeContent={pendingOrders.length}
                color="error"
                overlap="rectangular"
              >
                Monitor
              </Badge>
            }
            icon={<LocalShippingIcon />}
            iconPosition="start"
          />
        </Tabs>
        <IconButton
          size="small"
          onClick={() => {
            loadData();
            loadPendingOrders();
          }}
          color="primary"
        >
          <RefreshIcon />
        </IconButton>
      </Paper>

      <Box sx={{ flex: 1, overflow: "hidden", p: 2 }}>
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={2} sx={{ height: "100%" }}>
            {/* IZQUIERDA: CLIENTE */}
            <Grid item xs={12} md={3}>
              <Card sx={{ height: "100%", borderRadius: 3 }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography
                    variant="subtitle2"
                    fontWeight="800"
                    sx={{
                      mb: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <PersonAddIcon color="primary" fontSize="small" /> DATOS
                      DEL CLIENTE
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
                        endAdornment: (
                          <IconButton
                            size="small"
                            onClick={handleSearchCustomer}
                            disabled={isSearchingClient}
                          >
                            <SearchIcon />
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
                      getOptionLabel={(o) =>
                        typeof o === "string" ? o : o.place_name || ""
                      }
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
                                onClick={() => {
                                  setTempLocation(
                                    customerLocation || userLocation,
                                  );
                                  setOpenLocationDialog(true);
                                }}
                              >
                                <MapIcon />
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

            {/* CENTRO: CATALOGO */}
            <Grid item xs={12} md={6}>
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: 3,
                }}
              >
                <Box
                  sx={{
                    p: 1.5,
                    borderBottom: 1,
                    borderColor: "divider",
                    display: "flex",
                    gap: 1,
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
                        <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />
                      ),
                    }}
                  />
                  <Select
                    size="small"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    sx={{ width: 150 }}
                  >
                    <MenuItem value="all">Todas</MenuItem>
                    {categories.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.name}
                      </MenuItem>
                    ))}
                  </Select>
                </Box>
                <Box sx={{ flex: 1, overflowY: "auto", p: 1.5 }}>
                  <Grid container spacing={1}>
                    {filteredItems.map((item) => (
                      <Grid item xs={6} sm={4} key={`${item.type}-${item.id}`}>
                        <Card
                          variant="outlined"
                          sx={{
                            borderRadius: 2,
                            borderColor:
                              selectedProduct?.id === item.id
                                ? "primary.main"
                                : "divider",
                            bgcolor:
                              selectedProduct?.id === item.id
                                ? alpha(theme.palette.primary.main, 0.05)
                                : "white",
                          }}
                        >
                          <CardActionArea
                            onClick={() => {
                              setSelectedProduct(item);
                              setQuantity(1);
                            }}
                            sx={{ p: 1, textAlign: "center" }}
                          >
                            <Avatar
                              src={
                                item.image_path
                                  ? `${API_STORAGE_URL}/${item.image_path}`
                                  : null
                              }
                              sx={{
                                width: 32,
                                height: 32,
                                mx: "auto",
                                mb: 0.5,
                              }}
                            >
                              {item.type === "product" ? (
                                <InventoryIcon sx={{ fontSize: 18 }} />
                              ) : (
                                <BuildIcon sx={{ fontSize: 18 }} />
                              )}
                            </Avatar>
                            <Typography
                              variant="caption"
                              fontWeight="700"
                              sx={{
                                display: "block",
                                height: 24,
                                overflow: "hidden",
                                lineHeight: 1,
                              }}
                            >
                              {item.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="primary"
                              fontWeight="800"
                            >
                              {formatCurrency(item.price, currency)}
                            </Typography>
                          </CardActionArea>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Card>
            </Grid>

            {/* DERECHA: TICKET */}
            <Grid item xs={12} md={3}>
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: 3,
                  border: "2px solid",
                  borderColor: "brown",
                }}
              >
                <CardContent
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    p: 2,
                    backgroundImage:
                      "radial-gradient(#0000001a 1px, transparent 0)",
                    backgroundSize: "10px 10px",
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    fontWeight="900"
                    align="center"
                    sx={{ mb: 1, color: "brown" }}
                  >
                    ORDEN DE DESPACHO
                  </Typography>
                  <Divider
                    sx={{ mb: 2, borderStyle: "dashed", borderColor: "brown" }}
                  />

                  {selectedProduct ? (
                    <Box sx={{ flex: 1 }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          mb: 1,
                        }}
                      >
                        <Typography
                          variant="body2"
                          fontWeight="800"
                          sx={{ lineHeight: 1.2 }}
                        >
                          {selectedProduct.name}
                        </Typography>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setSelectedProduct(null)}
                          sx={{ mt: -0.5 }}
                        >
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ mb: 3 }}
                      >
                        <Stack
                          direction="row"
                          alignItems="center"
                          sx={{
                            border: 1,
                            borderColor: "divider",
                            borderRadius: 2,
                            px: 0.5,
                          }}
                        >
                          <IconButton
                            size="small"
                            onClick={() =>
                              setQuantity(Math.max(1, quantity - 1))
                            }
                          >
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          <Typography sx={{ mx: 1.5, fontWeight: 800 }}>
                            {quantity}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => setQuantity(quantity + 1)}
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                        <Typography variant="subtitle1" fontWeight="900">
                          {formatCurrency(
                            selectedProduct.price * quantity,
                            currency,
                          )}
                        </Typography>
                      </Stack>

                      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel>Asignar Motorizado</InputLabel>
                        <Select
                          value={selectedRider}
                          label="Asignar Motorizado"
                          onChange={(e) => setSelectedRider(e.target.value)}
                        >
                          {riders.map((r) => (
                            <MenuItem key={r.id} value={r.id}>
                              {r.full_name ||
                                `${r.first_name} ${r.last_name || ""}`}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <Box
                        sx={{
                          bgcolor: alpha(theme.palette.info.main, 0.05),
                          p: 1.5,
                          borderRadius: 2,
                          mb: 2,
                          border: "1px solid",
                          borderColor: "info.light",
                        }}
                      >
                        <Typography
                          variant="caption"
                          color="info.main"
                          fontWeight="800"
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            mb: 0.5,
                          }}
                        >
                          <ReceiptIcon sx={{ fontSize: 14 }} /> MONTO A COBRAR:
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
                                <Typography
                                  fontWeight="900"
                                  color="info.main"
                                  sx={{ mr: 0.5 }}
                                >
                                  {currency === "PEN" ? "S/" : "$"}
                                </Typography>
                              </InputAdornment>
                            ),
                            disableUnderline: true,
                            sx: {
                              fontWeight: 900,
                              fontSize: "1.4rem",
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
                        opacity: 0.3,
                      }}
                    >
                      <ShoppingCartIcon sx={{ fontSize: 40, mb: 1 }} />
                      <Typography variant="caption">Ticket vacío</Typography>
                    </Box>
                  )}

                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={handleCreateQuickOrder}
                    disabled={
                      isLoading ||
                      !selectedProduct ||
                      !customerPhone ||
                      !selectedRider
                    }
                    startIcon={
                      isLoading ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : (
                        <SendIcon />
                      )
                    }
                    sx={{ py: 1.5, borderRadius: 3, fontWeight: 800 }}
                  >
                    REGISTRAR PEDIDO
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ height: "100%", overflowY: "auto", px: 1 }}>
            {pendingOrders.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 8, opacity: 0.4 }}>
                <HistoryIcon sx={{ fontSize: 64, mb: 1 }} />
                <Typography variant="h6">Sin pedidos pendientes</Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {pendingOrders.map((order) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={order.id}>
                    <Card
                      sx={{
                        borderRadius: 3,
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        border: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      <Box
                        sx={{
                          p: 1,
                          px: 2,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Chip
                          label={`#${order.sale_number}`}
                          size="small"
                          sx={{
                            fontWeight: 800,
                            height: 20,
                            fontSize: 10,
                          }}
                        />
                        <Typography
                          variant="caption"
                          fontWeight="700"
                          sx={{ fontSize: 10 }}
                        >
                          {formatDate(order.created_at)}
                        </Typography>
                      </Box>
                      <CardContent sx={{ flex: 1, p: 2 }}>
                        <Typography
                          variant="subtitle2"
                          fontWeight="900"
                          noWrap
                          sx={{ mb: 0.5 }}
                        >
                          {order.customer_name}
                        </Typography>
                        {order.items?.length > 0 && (
                          <Chip
                            label={order.items[0].item_name}
                            size="small"
                            variant="outlined"
                            color="primary"
                            sx={{
                              height: 18,
                              fontSize: 9,
                              mb: 1.5,
                              fontWeight: 700,
                            }}
                          />
                        )}

                        <Stack spacing={0.8}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <PhoneIcon
                              sx={{ fontSize: 14, color: "text.secondary" }}
                            />
                            <Typography
                              variant="caption"
                              sx={{ fontWeight: 600 }}
                            >
                              {order.delivery_phone ||
                                order.phone ||
                                order.client?.phone ||
                                "S/T"}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 1,
                            }}
                          >
                            <MapIcon
                              sx={{
                                fontSize: 14,
                                color: "text.secondary",
                                mt: 0.3,
                              }}
                            />
                            <Typography
                              variant="caption"
                              sx={{
                                lineHeight: 1.1,
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                              }}
                            >
                              {order.delivery_address || order.address}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <LocalShippingIcon
                              sx={{ fontSize: 14, color: "secondary.main" }}
                            />
                            <Typography
                              variant="caption"
                              fontWeight="800"
                              color="secondary.dark"
                            >
                              {(() => {
                                const rider = riders.find(
                                  (r) => r.id === order.rider_id,
                                );
                                return rider
                                  ? rider.full_name ||
                                      `${rider.first_name} ${rider.last_name || ""}`
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
                                bgcolor: alpha(theme.palette.error.main, 0.05),
                                p: 0.5,
                                borderRadius: 1,
                              }}
                            >
                              <ScheduleIcon sx={{ fontSize: 14 }} />
                              <Typography variant="caption" fontWeight="800">
                                ENTREGA: {formatDate(order.scheduled_at)}
                              </Typography>
                            </Box>
                          )}
                        </Stack>
                        <Typography
                          variant="h6"
                          fontWeight="900"
                          color="primary"
                          sx={{ mt: 1.5 }}
                        >
                          {formatCurrency(order.total_amount, currency)}
                        </Typography>
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
                            color="success"
                            onClick={() => handleWhatsappResend(order.id)}
                            title="Reenviar WhatsApp"
                          >
                            <WhatsAppIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleCancelOrder(order.id)}
                          >
                            <CancelIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<PaymentIcon />}
                          onClick={() => handleOpenConfirmDialog(order)}
                          sx={{
                            borderRadius: 2,
                            fontWeight: 800,
                            fontSize: 11,
                            px: 2,
                          }}
                        >
                          Cobrar
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </TabPanel>
      </Box>

      {/* DIALOGOS */}
      <Dialog
        open={openLocationDialog}
        onClose={() => setOpenLocationDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          Fijar Ubicación del Cliente{" "}
          <Stack direction="row">
            <IconButton
              onClick={() => setLocationMode("tracking")}
              color={locationMode === "tracking" ? "primary" : "default"}
            >
              <GpsFixedIcon />
            </IconButton>
            <IconButton
              onClick={() => setLocationMode("manual")}
              color={locationMode === "manual" ? "primary" : "default"}
            >
              <EditLocationIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: 400, position: "relative" }}>
          <MapContainer
            center={
              tempLocation
                ? [tempLocation.lat, tempLocation.lng]
                : [-9.93, -76.24]
            }
            zoom={15}
            style={{ height: "100%", width: "100%" }}
            ref={locationMapRef}
          >
            <TileLayer
              url="http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}"
              subdomains={["mt0", "mt1", "mt2", "mt3"]}
            />
            {locationMode === "tracking" && tempLocation && (
              <Marker
                position={[tempLocation.lat, tempLocation.lng]}
                icon={userMarkerIcon}
              />
            )}
            <MapRecenter location={tempLocation} />
          </MapContainer>
          {locationMode === "manual" && (
            <Box
              sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                zIndex: 1000,
                pointerEvents: "none",
              }}
            >
              <EditLocationIcon
                sx={{
                  fontSize: 48,
                  color: theme.palette.primary.main,
                  filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenLocationDialog(false)} color="inherit">
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmLocation}
            sx={{ borderRadius: 2, px: 3 }}
          >
            Confirmar Punto
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openPaymentDialog}
        onClose={() => setOpenPaymentDialog(false)}
        maxWidth="xs"
        fullWidth
        TransitionComponent={Transition}
      >
        <DialogTitle sx={{ textAlign: "center", pb: 0 }}>
          CONFIRMAR COBRO{" "}
          <Typography variant="caption" display="block" fontWeight="700">
            ORDEN #{selectedOrderToConfirm?.sale_number}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              textAlign: "center",
              mb: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              borderRadius: 3,
              border: "2px solid",
              borderColor: "primary.light",
            }}
          >
            <Typography variant="h4" fontWeight="900" color="primary">
              {formatCurrency(
                selectedOrderToConfirm?.total_amount || 0,
                currency,
              )}
            </Typography>
            <Typography
              variant="caption"
              fontWeight="700"
              color="text.secondary"
            >
              TOTAL A RECIBIR
            </Typography>
          </Paper>
          <Stack spacing={1}>
            {payments.map((p) => (
              <Paper
                key={p.id}
                variant="outlined"
                sx={{ p: 1.5, position: "relative", borderRadius: 2 }}
              >
                <Typography
                  variant="caption"
                  fontWeight="800"
                  color="text.secondary"
                >
                  {PAYMENT_METHODS.find(
                    (m) => m.value === p.payment_method,
                  )?.label.toUpperCase()}
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  variant="standard"
                  type="number"
                  value={p.amount}
                  onChange={(e) =>
                    setPayments(
                      payments.map((x) =>
                        x.id === p.id ? { ...x, amount: e.target.value } : x,
                      ),
                    )
                  }
                  InputProps={{
                    disableUnderline: true,
                    sx: { fontWeight: 800, fontSize: "1.1rem" },
                  }}
                  autoFocus
                />
                <IconButton
                  size="small"
                  color="error"
                  sx={{ position: "absolute", top: 4, right: 4 }}
                  onClick={() =>
                    setPayments(payments.filter((x) => x.id !== p.id))
                  }
                >
                  <DeleteForeverIcon fontSize="small" />
                </IconButton>
              </Paper>
            ))}
            <Typography
              variant="caption"
              fontWeight="800"
              sx={{ mt: 1, display: "block" }}
            >
              AÑADIR MÉTODO:
            </Typography>
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
                          amount:
                            remainingAmount > 0
                              ? remainingAmount.toFixed(2)
                              : "0",
                        },
                      ])
                    }
                    sx={{
                      fontSize: 10,
                      borderRadius: 1.5,
                      fontWeight: 700,
                      height: 35,
                    }}
                  >
                    {m.label}
                  </Button>
                </Grid>
              ))}
            </Grid>
            {payments.some((p) => p.payment_method === "cash") && (
              <Box sx={{ mt: 2, p: 1.5, bgcolor: "grey.100", borderRadius: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Efectivo recibido"
                  type="number"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  variant="standard"
                  InputProps={{ sx: { fontWeight: 800 } }}
                />
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mt: 1,
                  }}
                >
                  <Typography variant="subtitle2" fontWeight="800">
                    Vuelto:
                  </Typography>
                  <Typography
                    variant="subtitle2"
                    fontWeight="900"
                    color="info.main"
                  >
                    {formatCurrency(cashChange, currency)}
                  </Typography>
                </Box>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2 }}>
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleConfirmDelivery}
            disabled={isLoading || Math.abs(remainingAmount) > 0.01}
            sx={{ borderRadius: 3, height: 50, fontWeight: 900 }}
          >
            FINALIZAR ENTREGA
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
