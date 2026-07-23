import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
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
  Badge,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tab,
  Tabs,
  useTheme,
  AppBar,
  Toolbar,
  useMediaQuery,
  InputAdornment,
  Stack,
  Autocomplete,
  CircularProgress,
  Tooltip as MuiTooltip,
  alpha,
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
  AddCard as AddCardIcon,
} from "@mui/icons-material";
import { formatCurrency } from "../utils/formatters";
import { notificationSwal } from "../utils/swal-helpers";
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
import { MapComponent } from "../components/MapComponent";

import { OrderMonitor } from "../components/OrderMonitor";
import { StrictAutocomplete } from "../components/StrictAutocomplete";

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;


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

const getNowDateTimeLocal = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(new Date())
    .reduce((result, part) => ({ ...result, [part.type]: part.value }), {});

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};

export const Orders = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));

  const [tabValue, setTabValue] = useState(0);
  const [itemTabValue, setItemTabValue] = useState(0);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [allClients, setAllClients] = useState([]);
  const [currency, setCurrency] = useState(user?.business?.currency || "PEN");
  const [riders, setRiders] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [orderItems, setOrderItems] = useState([]);
  const [editableTotal, setEditableTotal] = useState("");

  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerLocation, setCustomerLocation] = useState(null);
  const [selectedRider, setSelectedRider] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [scheduledAt, setScheduledAt] = useState(getNowDateTimeLocal());
  const [isScheduledAtEditable, setIsScheduledAtEditable] = useState(false);
  const lastScheduledAtTap = useRef(0);
  const [userLocation, setUserLocation] = useState(null);

  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [openLocationDialog, setOpenLocationDialog] = useState(false);
  const [locationMode, setLocationMode] = useState("manual");
  const [tempLocation, setTempLocation] = useState(null);
  const locationMapRef = useRef();

  const calculatedTotal = useMemo(() => {
    return orderItems.reduce(
      (total, item) => total + Number(item.price || 0) * item.quantity,
      0,
    );
  }, [orderItems]);

  const handleScheduledAtTap = () => {
    const now = Date.now();
    if (now - lastScheduledAtTap.current < 500) {
      setScheduledAt(getNowDateTimeLocal());
      setIsScheduledAtEditable(true);
      lastScheduledAtTap.current = 0;
      return;
    }
    lastScheduledAtTap.current = now;
  };

  useEffect(() => {
    if (orderItems.length) setEditableTotal(calculatedTotal.toString());
    else setEditableTotal("");
  }, [calculatedTotal, orderItems.length]);

  const filteredItems = useMemo(() => {
    const type = itemTabValue === 0 ? "product" : "service";
    let all = type === "product" ? products : services;

    // Filter out products with stock <= 0
    if (type === "product") {
      all = all.filter((p) => p.stock > 0);
    }

    let filtered = all;
    if (searchQuery) {
      filtered = all.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // Sort alphabetically by name
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }, [products, services, searchQuery, itemTabValue]);

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
      const [prodRes, servRes, clientRes] = await Promise.all([
        productsAPI.getAll({ per_page: -1 }),
        servicesAPI.getAll({ per_page: -1 }),
        clientsAPI.getAll({ per_page: -1 }),
      ]);
      setProducts(
        (prodRes.data.data || []).map((p) => ({ ...p, type: "product" })),
      );
      setServices(
        (servRes.data.data || []).map((s) => ({ ...s, type: "service" })),
      );
      setAllClients(clientRes.data.data || []);
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
    setOrderItems((current) => {
      const existing = current.find(
        (item) => item.id === itemToAdd.id && item.type === itemToAdd.type,
      );
      if (!existing) return [...current, { ...itemToAdd, quantity: 1 }];
      if (itemToAdd.type === "product" && existing.quantity >= Number(itemToAdd.stock)) {
        notificationSwal("Stock insuficiente", "No hay más unidades disponibles.", "warning");
        return current;
      }
      return current.map((item) =>
        item.id === itemToAdd.id && item.type === itemToAdd.type
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      );
    });
  };

  const changeItemQuantity = (target, change) => {
    setOrderItems((current) => current.map((item) => {
      if (item.id !== target.id || item.type !== target.type) return item;
      const nextQuantity = Math.max(1, item.quantity + change);
      if (item.type === "product" && nextQuantity > Number(item.stock)) {
        notificationSwal("Stock insuficiente", "No hay más unidades disponibles.", "warning");
        return item;
      }
      return { ...item, quantity: nextQuantity };
    }));
  };

  const removeOrderItem = (target) => {
    setOrderItems((current) => current.filter(
      (item) => item.id !== target.id || item.type !== target.type,
    ));
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

    // Calcular distancia y tiempo desde el negocio
    if (user?.business?.latitude && user?.business?.longitude) {
      calculateDistanceAndTime(
        {
          lat: parseFloat(user.business.latitude),
          lng: parseFloat(user.business.longitude),
        },
        { lat, lng },
      );
    }
  };

  const calculateDistanceAndTime = async (origin, dest) => {
    if (!MAPBOX_TOKEN) return;
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?access_token=${MAPBOX_TOKEN}&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distanceKm = (route.distance / 1000).toFixed(2);
        const durationMin = Math.round(route.duration / 60);

        // Guardar en notas para referencia visual o enviarlo al backend
        const infoStr = `Distancia: ${distanceKm} km | Tiempo aprox: ${durationMin} min`;
        setOrderNotes((prev) => (prev ? `${prev}\n${infoStr}` : infoStr));
      }
    } catch (error) {
      console.error("Error calculating Mapbox directions:", error);
    }
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
    if (!customerPhone || orderItems.length === 0 || !selectedRider) {
      notificationSwal(
        "Faltan Datos",
        "Teléfono, al menos un producto y motorizado son obligatorios.",
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
      const firstItem = orderItems[0];
      await salesAPI.quickOrder({
        phone: customerPhone,
        customer_name: customerName,
        address: customerAddress,
        latitude: customerLocation?.lat,
        longitude: customerLocation?.lng,
        product_id: firstItem.id,
        quantity: firstItem.quantity,
        items: orderItems.map((item) => ({
          id: item.id,
          product_id: item.id,
          type: item.type,
          quantity: item.quantity,
          price: Number(item.price),
          unit_price: Number(item.price),
        })),
        total_amount: parseFloat(editableTotal) || 0,
        discount: discount,
        rider_id: selectedRider,
        notes: orderNotes,
        delivery_notes: orderNotes,
        scheduled_at: scheduledAt || null,
      });
      notificationSwal("Registrado", "Pedido creado con éxito.", "success");
      setOrderItems([]);
      setCustomerPhone("");
      setCustomerName("");
      setCustomerAddress("");
      setCustomerLocation(null);
      setOrderNotes("");
      setSelectedRider("");
      setScheduledAt(getNowDateTimeLocal());
      setIsScheduledAtEditable(false);
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

  return (
    <Box
      sx={{
        height: "calc(100vh - 64px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <AppBar
        position="static"
        color="inherit"
        elevation={0}
        sx={{ borderBottom: 1, borderColor: "divider" }}
      >
        <Toolbar
          variant="dense"
          sx={{
            justifyContent: "space-between",
            px: { xs: 0.5, sm: 1.5 },
            minHeight: 48,
          }}
        >
          <Tabs
            value={tabValue}
            onChange={(e, v) => setTabValue(v)}
            variant={isMobile ? "fullWidth" : "standard"}
            sx={{
              minHeight: 48,
              "& .MuiTab-root": {
                minHeight: 48,
                fontWeight: 700,
                px: { xs: 1, sm: 3 },
              },
            }}
          >
            <Tab
              label={isMobile ? "" : "Nueva Orden"}
              icon={<AddIcon fontSize="small" />}
              iconPosition="start"
              sx={{ minWidth: isMobile ? 50 : 140 }}
            />
            <Tab
              label={
                isMobile ? (
                  ""
                ) : (
                  <Badge
                    badgeContent={pendingOrders.length}
                    color="error"
                    overlap="rectangular"
                    sx={{
                      "& .MuiBadge-badge": { fontWeight: 800, fontSize: 10 },
                    }}
                  >
                    Monitor
                  </Badge>
                )
              }
              icon={<LocalShippingIcon fontSize="small" />}
              iconPosition="start"
              sx={{ minWidth: isMobile ? 50 : 140 }}
            />
          </Tabs>

          <Stack direction="row" spacing={0.5} alignItems="center">
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
          <Grid
            container
            spacing={1}
            sx={{ height: "100%", overflowY: isTablet ? "auto" : "hidden" }}
          >
            <Grid
              item
              xs={12}
              md={3}
              sx={{ height: isTablet ? "auto" : "100%" }}
            >
              <Card
                variant="outlined"
                sx={{ height: "100%", borderRadius: 1.5 }}
              >
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
                        setScheduledAt(getNowDateTimeLocal());
                        setIsScheduledAtEditable(false);
                        setOrderItems([]);
                      }}
                      color="error"
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </Typography>
                  <Stack spacing={1.5}>
                    <StrictAutocomplete
                      options={allClients}
                      filterKey="phone"
                      matchMode="start"
                      getOptionLabel={(o) => o.phone}
                      getOptionSublabel={(o) => o.name}
                      value={customerPhone}
                      onInputChange={(v) => setCustomerPhone(v)}
                      onChange={(client) => {
                        setCustomerPhone(client.phone || "");
                        setCustomerName(client.name || "");
                        setCustomerAddress(client.address || "");
                        if (client.latitude && client.longitude)
                          setCustomerLocation({
                            lat: parseFloat(client.latitude),
                            lng: parseFloat(client.longitude),
                          });
                      }}
                      TextFieldProps={{
                        fullWidth: true,
                        size: "small",
                        label: "Teléfono",
                        InputProps: {
                          startAdornment: (
                            <PhoneIcon
                              sx={{
                                mr: 1,
                                color: "text.secondary",
                                fontSize: 18,
                              }}
                            />
                          ),
                        },
                      }}
                    />
                    <StrictAutocomplete
                      options={allClients}
                      filterKey="name"
                      matchMode="any"
                      getOptionLabel={(o) => o.name}
                      getOptionSublabel={(o) => o.phone}
                      value={customerName}
                      onInputChange={(v) => setCustomerName(v)}
                      onChange={(client) => {
                        setCustomerPhone(client.phone || "");
                        setCustomerName(client.name || "");
                        setCustomerAddress(client.address || "");
                        if (client.latitude && client.longitude)
                          setCustomerLocation({
                            lat: parseFloat(client.latitude),
                            lng: parseFloat(client.longitude),
                          });
                      }}
                      TextFieldProps={{
                        fullWidth: true,
                        size: "small",
                        label: "Nombre",
                      }}
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
                              <React.Fragment>
                                {p.InputProps.endAdornment}
                                <InputAdornment position="end">
                                  <MuiTooltip title="Seleccionar en mapa">
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={() => {
                                        // Prioridad: Ubicación ya puesta > Ubicación GPS > Ubicación Negocio (esto lo maneja MapComponent si mandamos null)
                                        setTempLocation(
                                          customerLocation ||
                                            userLocation ||
                                            null,
                                        );
                                        setOpenLocationDialog(true);
                                      }}
                                      sx={{
                                        bgcolor: alpha(
                                          theme.palette.primary.main,
                                          0.1,
                                        ),
                                        "&:hover": {
                                          bgcolor: alpha(
                                            theme.palette.primary.main,
                                            0.2,
                                          ),
                                        },
                                        ml: 0.5,
                                      }}
                                    >
                                      <MapIcon fontSize="small" />
                                    </IconButton>
                                  </MuiTooltip>
                                </InputAdornment>
                              </React.Fragment>
                            ),
                          }}
                        />
                      )}
                    />
                    <Box
                      onClick={handleScheduledAtTap}
                      onMouseDown={(e) => {
                        if (e.detail > 1) e.preventDefault();
                      }}
                      title="Doble clic o doble toque para editar"
                      sx={{
                        userSelect: "none",
                        WebkitUserSelect: "none",
                        touchAction: "manipulation",
                      }}
                    >
                      <TextField
                        fullWidth
                        size="small"
                        type="datetime-local"
                        label="Programar entrega"
                        value={scheduledAt}
                        disabled={!isScheduledAtEditable}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        onBlur={() => setIsScheduledAtEditable(false)}
                        InputLabelProps={{ shrink: true }}
                        sx={
                          isScheduledAtEditable
                            ? undefined
                            : { pointerEvents: "none" }
                        }
                      />
                    </Box>
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

            <Grid
              item
              xs={12}
              md={6}
              sx={{ height: isTablet ? "55vh" : "100%" }}
            >
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
                    <Tab
                      label={`Productos (${products.length})`}
                      sx={{ fontWeight: 700 }}
                    />
                    <Tab
                      label={`Servicios (${services.length})`}
                      sx={{ fontWeight: 700 }}
                    />
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
                        <SearchIcon
                          sx={{ mr: 1, color: "text.secondary", fontSize: 18 }}
                        />
                      ),
                    }}
                  />
                </Box>
                <Box sx={{ flex: 1, overflowY: "auto", p: 0.5 }}>
                  <Grid container spacing={1}>
                    {filteredItems.map((item) => (
                      <Grid
                        item
                        xs={6}
                        sm={4}
                        md={4}
                        lg={3}
                        key={`${item.type}-${item.id}`}
                      >
                        <Card
                          elevation={0}
                          sx={{
                            borderRadius: 1,
                            border: "1px solid",
                            borderColor:
                              orderItems.some((orderItem) => orderItem.id === item.id && orderItem.type === item.type)
                                ? "divider"
                                : theme.palette.warning.main,
                            bgcolor:
                              orderItems.some((orderItem) => orderItem.id === item.id && orderItem.type === item.type)
                                ? theme.palette.background.paper
                                : alpha(theme.palette.warning.main, 0.08),
                            transition: "all 0.1s",
                            cursor: "pointer",
                            position: "relative",
                            "&:hover": {
                              boxShadow: theme.shadows[2],
                              borderColor: "divider",
                              bgcolor:
                                theme.palette.mode === "light"
                                  ? alpha(theme.palette.common.black, 0.03)
                                  : theme.palette.background.default,
                            },
                          }}
                          onClick={() => handleItemClick(item)}
                        >
                          <CardContent
                            sx={{
                              p: 0.8,
                              textAlign: "center",
                              "&:last-child": { pb: 0.8 },
                            }}
                          >
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
                                  minWidth: 18,
                                }}
                              />
                            )}
                            <Avatar
                              src={
                                item.image_path
                                  ? `${API_STORAGE_URL}/${item.image_path}`
                                  : null
                              }
                              variant="rounded"
                              sx={{
                                width: 44,
                                height: 44,
                                mx: "auto",
                                mb: 0.5,
                                bgcolor: "background.paper",
                                border: "1px solid",
                                borderColor: "grey.200",
                              }}
                            >
                              {item.type === "product" ? (
                                <InventoryIcon
                                  sx={{ fontSize: 22 }}
                                  color="primary"
                                />
                              ) : (
                                <BuildIcon
                                  sx={{ fontSize: 22 }}
                                  color="secondary"
                                />
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
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Card>
            </Grid>

            <Grid
              item
              xs={12}
              md={3}
              sx={{ height: isTablet ? "auto" : "100%" }}
            >
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
                <Box
                  sx={{
                    bgcolor: theme.palette.warning.main,
                    py: 0.8,
                    textAlign: "center",
                  }}
                >
                  <Typography
                    variant="caption"
                    fontWeight="800"
                    color="white"
                    sx={{ letterSpacing: 1 }}
                  >
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
                  {orderItems.length > 0 ? (
                    <Box sx={{ flex: 1 }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mb: 1,
                        }}
                      >
                        <Typography
                          variant="body2"
                          fontWeight="700"
                          sx={{ color: theme.palette.warning.main }}
                        >
                          PRODUCTOS ({orderItems.length})
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => setOrderItems([])}
                          title="Vaciar orden"
                          sx={{ p: 0.5 }}
                        >
                          <DeleteForeverIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      <Stack spacing={1} sx={{ mb: 2, maxHeight: 240, overflowY: "auto", pr: 0.5 }}>
                        {orderItems.map((item) => (
                          <Box
                            key={`${item.type}-${item.id}`}
                            sx={{ p: 1, border: "1px solid", borderColor: "divider", borderRadius: 1 }}
                          >
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1, mb: 0.75 }}>
                              <Typography variant="caption" fontWeight="700" sx={{ lineHeight: 1.2 }}>
                                {item.name}
                              </Typography>
                              <IconButton size="small" color="error" onClick={() => removeOrderItem(item)} sx={{ p: 0.25 }}>
                                <DeleteIcon sx={{ fontSize: 17 }} />
                              </IconButton>
                            </Box>
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <Box sx={{ display: "flex", alignItems: "center", border: "1px solid", borderColor: theme.palette.warning.main, borderRadius: 1 }}>
                                <IconButton size="small" onClick={() => changeItemQuantity(item, -1)} sx={{ p: 0.25, color: theme.palette.warning.main }}>
                                  <RemoveIcon sx={{ fontSize: 17 }} />
                                </IconButton>
                                <Typography sx={{ mx: 1, minWidth: 18, textAlign: "center", fontWeight: 700, fontSize: 13 }}>{item.quantity}</Typography>
                                <IconButton size="small" onClick={() => changeItemQuantity(item, 1)} sx={{ p: 0.25, color: theme.palette.warning.main }}>
                                  <AddIcon sx={{ fontSize: 17 }} />
                                </IconButton>
                              </Box>
                              <Typography variant="caption" fontWeight="800">
                                {formatCurrency(Number(item.price) * item.quantity, currency)}
                              </Typography>
                            </Box>
                          </Box>
                        ))}
                      </Stack>

                      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel sx={{ fontSize: 13 }}>
                          Motorizado
                        </InputLabel>
                        <Select
                          value={selectedRider}
                          label="Motorizado"
                          onChange={(e) => setSelectedRider(e.target.value)}
                          sx={{ borderRadius: 1, fontSize: 13 }}
                        >
                          {riders.map((r) => (
                            <MenuItem
                              key={r.id}
                              value={r.id}
                              sx={{ fontSize: 13 }}
                            >
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
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            mb: 0.5,
                          }}
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
                                <Typography
                                  fontWeight="800"
                                  color="info.main"
                                  variant="subtitle1"
                                >
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
                      <ShoppingCartIcon
                        sx={{
                          fontSize: 60,
                          mb: 1,
                          color: theme.palette.warning.main,
                        }}
                      />
                      <Typography variant="caption" fontWeight="700">
                        LISTA VACÍA
                      </Typography>
                    </Box>
                  )}

                  <Button
                    fullWidth
                    variant="contained"
                    size="medium"
                    onClick={handleCreateQuickOrder}
                    disabled={
                      isLoading ||
                      orderItems.length === 0 ||
                      !customerPhone ||
                      !selectedRider
                    }
                    startIcon={
                      isLoading ? (
                        <CircularProgress size={18} color="inherit" />
                      ) : (
                        <SendIcon fontSize="small" />
                      )
                    }
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
          <OrderMonitor
            orders={pendingOrders}
            riders={riders}
            userLocation={userLocation}
            onRefresh={loadPendingOrders}
            currency={currency}
          />
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
            px: 2,
          }}
        >
          <Typography variant="subtitle1" fontWeight="700">
            FIJAR UBICACIÓN
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: 400, position: "relative" }}>
          <MapComponent
            center={tempLocation}
            zoom={15}
            isPicker={true}
            locationMode={locationMode}
            onModeChange={setLocationMode}
            onLocationSelect={setTempLocation}
            height="100%"
            onMapInstance={(instance) => {
              locationMapRef.current = instance;
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 1.5 }}>
          <Button
            onClick={() => setOpenLocationDialog(false)}
            color="inherit"
            sx={{ fontWeight: 600 }}
          >
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
    </Box>
  );
};
