import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  LayersControl,
  Marker,
  Popup,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  TextField,
  Autocomplete,
  useTheme,
  IconButton,
  Typography,
  Card,
  CardContent,
  Avatar,
  Divider,
  Grid,
  CircularProgress,
  Tooltip as MuiTooltip,
  Fab,
} from "@mui/material";
import {
  GpsFixed,
  Save,
  PersonPinCircle,
  Close,
  Map as MapIcon,
  EditLocationAlt,
  Add as AddIcon,
  Search as SearchIcon,
  Phone as PhoneIcon,
  Home as HomeIcon,
  AccessTime as TimeIcon,
  Route as RouteIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  CloudUpload as CloudUploadIcon,
  MyLocation as MyLocationIcon,
} from "@mui/icons-material";
import { notificationSwal, confirmSwal } from "../utils/swal-helpers";
import { clientsAPI, businessAPI } from "../utils/api";
import { compressImage } from "../utils/imageCompression";
import { useAuth } from "../contexts/AuthContext";
import { MapComponent } from "../components/MapComponent";

// --- CONFIGURACIÓN DE ÍCONOS LEAFLET ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

// Función para crear el marcador tipo PIN CLÁSICO (Optimizado)
const createClassicPinIcon = (isActive = false, theme) => {
  const color = isActive ? theme.palette.secondary.main : theme.palette.primary.main;
  const size = isActive ? 38 : 30;
  
  return L.divIcon({
    html: `
      <svg viewBox="0 0 24 24" width="${size}" height="${size}" style="filter: drop-shadow(0 2px 3px rgba(0,0,0,0.4));">
        <path fill="${color}" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    `,
    className: "custom-pin-icon",
    iconSize: [size, size],
    iconAnchor: [size / 2, size], 
    popupAnchor: [0, -size]
  });
};

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

// --- COMPONENTE PRINCIPAL ---
export const Clients = () => {
  const theme = useTheme();
  const { hasPermission, user } = useAuth();
  const { BaseLayer } = LayersControl;

  // Estados de Datos
  const [clients, setClients] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState(null);

  // Estados de UI
  const [selectedClient, setSelectedClient] = useState(null);
  const [openCRUDDialog, setOpenCRUDDialog] = useState(false);
  const [openLocationDialog, setOpenLocationDialog] = useState(false);
  const [openImageDialog, setOpenImageDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingMapbox, setIsFetchingMapbox] = useState(false);

  // Estados de Formulario
  const [editingClient, setEditingClient] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    address_detail: "",
    phone: "",
    image: null,
    estimated_time: "",
    approximate_distance: "",
  });

  // Estados de Ubicación (Modal de ajuste)
  const [tempLocation, setTempLocation] = useState(null);
  const [locationMode, setLocationMode] = useState("tracking"); // 'tracking' o 'manual'

  const mapRef = useRef();
  const locationMapRef = useRef();

  // --- CARGA DE DATOS ---
  const loadClients = useCallback(async () => {
    try {
      setLoading(true);
      const response = await clientsAPI.getAll({ per_page: -1 });
      const validClients = (response.data.data || []).filter(
        (c) => c.latitude && c.longitude,
      );
      setClients(validClients);

      if (user?.business_id) {
        const bizRes = await businessAPI.getById(user.business_id);
        setBusiness(bizRes.data);
      }
    } catch (error) {
      console.error("Error loading clients:", error);
      notificationSwal("Error", "No se pudieron cargar los clientes.", "error");
    } finally {
      setLoading(false);
    }
  }, [user?.business_id]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  // GPS en tiempo real
  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(coords);
        if (locationMode === "tracking" && openLocationDialog) {
          setTempLocation(coords);
        }
      },
      (error) => console.error("Error GPS:", error),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [locationMode, openLocationDialog]);

  // --- MAPBOX HELPERS ---
  const fetchMapboxData = async (lat, lng) => {
    if (!MAPBOX_TOKEN) return;
    setIsFetchingMapbox(true);
    try {
      // 1. Obtener dirección (Geocoding)
      const geoRes = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&language=es`
      );
      const geoData = await geoRes.json();
      const address = geoData.features?.[0]?.place_name || "";

      let time = "";
      let dist = "";

      // 2. Obtener Tiempo/Distancia si tenemos la ubicación del usuario
      if (userLocation) {
        const dirRes = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${userLocation.lng},${userLocation.lat};${lng},${lat}?access_token=${MAPBOX_TOKEN}`
        );
        const dirData = await dirRes.json();
        if (dirData.routes?.[0]) {
          const route = dirData.routes[0];
          time = `${Math.round(route.duration / 60)} min`;
          dist = `${(route.distance / 1000).toFixed(1)} km`;
        }
      }

      setFormData(prev => ({
        ...prev,
        address: address.split(",")[0] + (address.split(",")[1] || ""),
        estimated_time: time,
        approximate_distance: dist
      }));
    } catch (error) {
      console.error("Error fetching Mapbox data:", error);
    } finally {
      setIsFetchingMapbox(false);
    }
  };

  // --- MANEJADORES DE UI ---
  const handleOpenCRUD = (client = null) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name || "",
        address: client.address || "",
        address_detail: client.address_detail || "",
        phone: client.phone || "",
        image: null,
        estimated_time: client.estimated_time || "",
        approximate_distance: client.approximate_distance || "",
      });
      setImagePreview(client.image_path);
      setTempLocation({
        lat: parseFloat(client.latitude),
        lng: parseFloat(client.longitude),
      });
    } else {
      setEditingClient(null);
      setFormData({ 
        name: "", 
        address: "", 
        address_detail: "", 
        phone: "", 
        image: null,
        estimated_time: "",
        approximate_distance: "",
      });
      setImagePreview(null);
      setTempLocation(userLocation || { lat: -12.0464, lng: -77.0428 });
    }
    setOpenCRUDDialog(true);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressedFile = await compressImage(file);
        setFormData((prev) => ({ ...prev, image: compressedFile }));
        setImagePreview(URL.createObjectURL(compressedFile));
      } catch (error) {
        console.error("Error al procesar la imagen:", error);
        setFormData((prev) => ({ ...prev, image: file }));
        setImagePreview(URL.createObjectURL(file));
      }
    }
  };

  const handleSaveClient = async () => {
    const data = new FormData();
    data.append("name", formData.name);
    data.append("address", formData.address);
    data.append("address_detail", formData.address_detail);
    data.append("phone", formData.phone);
    data.append("estimated_time", formData.estimated_time);
    data.append("approximate_distance", formData.approximate_distance);
    
    if (formData.image) data.append("image", formData.image);

    if (tempLocation) {
      data.append("latitude", tempLocation.lat);
      data.append("longitude", tempLocation.lng);
    }

    setIsSubmitting(true);
    try {
      if (editingClient) {
        await clientsAPI.update(editingClient.id, data);
        notificationSwal("Éxito", "Cliente actualizado correctamente", "success");
      } else {
        await clientsAPI.create(data);
        notificationSwal("Éxito", "Cliente creado correctamente", "success");
      }
      setOpenCRUDDialog(false);
      loadClients();
    } catch (error) {
      notificationSwal("Error", "No se pudo guardar el cliente", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClient = async (id) => {
    const confirm = await confirmSwal(
      "¿Eliminar cliente?",
      "Esta acción no se puede deshacer",
      { icon: "warning" },
    );
    if (confirm) {
      try {
        await clientsAPI.delete(id);
        notificationSwal("Éxito", "Cliente eliminado", "success");
        loadClients();
      } catch (error) {
        notificationSwal("Error", "No se pudo eliminar", "error");
      }
    }
  };

  const handleOpenLocationPicker = () => {
    setLocationMode(editingClient ? "manual" : "tracking");
    setOpenLocationDialog(true);
  };

  const handleConfirmLocation = () => {
    let finalCoords = tempLocation;
    if (locationMode === "manual" && locationMapRef.current) {
      const center = locationMapRef.current.getCenter();
      finalCoords = { lat: center.lat, lng: center.lng };
    }
    
    if (finalCoords) {
      setTempLocation(finalCoords);
      fetchMapboxData(finalCoords.lat, finalCoords.lng);
    }
    setOpenLocationDialog(false);
  };

  const flyToClient = (client) => {
    if (mapRef.current && client.latitude && client.longitude) {
      mapRef.current.flyTo([client.latitude, client.longitude], 18);
      setSelectedClient(client);
    }
  };

  const userMarkerIcon = useMemo(
    () =>
      new L.divIcon({
        html: `
          <svg viewBox="0 0 24 24" width="36" height="36" style="filter: drop-shadow(0 2px 3px rgba(0,0,0,0.3));">
            <circle cx="12" cy="12" r="8" fill="white" />
            <circle cx="12" cy="12" r="6" fill="${theme.palette.secondary.main}" />
            <circle cx="12" cy="12" r="3" fill="white" />
          </svg>
        `,
        className: "user-location-icon",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      }),
    [theme.palette.secondary.main],
  );

  const clientMarkers = useMemo(() => {
    return clients.map((client) => (
      <Marker
        key={client.id}
        position={[client.latitude, client.longitude]}
        icon={createClassicPinIcon(selectedClient?.id === client.id, theme)}
        title={client.name}
        eventHandlers={{ click: () => setSelectedClient(client) }}
      >
        <Popup minWidth={200} closeButton={false}>
          <Box sx={{ p: 0.5 }}>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 800, color: "primary.main", lineHeight: 1.2, mb: 0.5 }}
            >
              {client.name}
            </Typography>

            <Stack spacing={0.5}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <PhoneIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                <Typography variant="caption" sx={{ fontWeight: 500 }}>
                  {client.phone || "---"}
                </Typography>
              </Box>
              
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                <HomeIcon sx={{ fontSize: 14, color: "text.secondary", mt: 0.2 }} />
                <Typography variant="caption" sx={{ lineHeight: 1.2, color: "text.primary" }}>
                  {client.address} {client.address_detail && `• ${client.address_detail}`}
                </Typography>
              </Box>

              <Grid container spacing={0.5} sx={{ mt: 0.5 }}>
                <Grid item xs={6}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, bgcolor: "grey.50", p: 0.4, borderRadius: 1, border: "1px solid", borderColor: "grey.200" }}>
                    <TimeIcon sx={{ fontSize: 12, color: "secondary.main" }} />
                    <Typography variant="caption" sx={{ fontSize: "0.65rem", fontWeight: 700 }}>
                      {client.estimated_time || "N/A"}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, bgcolor: "grey.50", p: 0.4, borderRadius: 1, border: "1px solid", borderColor: "grey.200" }}>
                    <RouteIcon sx={{ fontSize: 12, color: "secondary.main" }} />
                    <Typography variant="caption" sx={{ fontSize: "0.65rem", fontWeight: 700 }}>
                      {client.approximate_distance || "N/A"}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Stack>

            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 1, pt: 1, borderTop: "1px dashed", borderColor: "grey.300", gap: 0.5 }}>
              <Box sx={{ display: "flex", gap: 0.5 }}>
                {client.image_path && (
                  <IconButton
                    size="small"
                    onClick={() => setOpenImageDialog(true)}
                    sx={{ bgcolor: "primary.light", color: "primary.contrastText", p: 0.5, "&:hover": { bgcolor: "primary.main" } }}
                  >
                    <ViewIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                )}
                {hasPermission("clientes.edit") && (
                  <IconButton
                    size="small"
                    onClick={() => handleOpenCRUD(client)}
                    sx={{ bgcolor: "grey.100", p: 0.5 }}
                  >
                    <EditIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                )}
              </Box>
              
              <Button
                size="small"
                variant="contained"
                color="secondary"
                disableElevation
                onClick={() => {
                  const url = `https://www.google.com/maps/dir/?api=1&destination=${client.latitude},${client.longitude}&travelmode=driving`;
                  window.open(url, "_blank");
                }}
                sx={{ fontSize: "0.65rem", py: 0, px: 1, minWidth: "auto", height: 24, borderRadius: 1 }}
                startIcon={<MyLocationIcon sx={{ fontSize: "12px !important" }} />}
              >
                GPS
              </Button>
            </Box>
          </Box>
        </Popup>
      </Marker>
    ));
  }, [clients, selectedClient, theme, hasPermission]);

  return (
    <Box sx={{ height: "calc(100vh - 100px)", position: "relative", m: -1 }}>
      <MapComponent
        center={userLocation}
        zoom={13}
        height="100%"
        onMapInstance={(instance) => { mapRef.current = instance; }}
        businessData={business ? {
          lat: parseFloat(business.latitude),
          lng: parseFloat(business.longitude),
          name: business.name,
          address: business.address
        } : null}
        markers={clients.map(client => ({
          lat: client.latitude,
          lng: client.longitude,
          icon: createClassicPinIcon(selectedClient?.id === client.id, theme),
          popup: (
            <Box sx={{ p: 0.5 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 800, color: "primary.main", lineHeight: 1.2, mb: 0.5 }}
              >
                {client.name}
              </Typography>

              <Stack spacing={0.5}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <PhoneIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                  <Typography variant="caption" sx={{ fontWeight: 500 }}>
                    {client.phone || "---"}
                  </Typography>
                </Box>
                
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                  <HomeIcon sx={{ fontSize: 14, color: "text.secondary", mt: 0.2 }} />
                  <Typography variant="caption" sx={{ lineHeight: 1.2, color: "text.primary" }}>
                    {client.address} {client.address_detail && `• ${client.address_detail}`}
                  </Typography>
                </Box>

                <Grid container spacing={0.5} sx={{ mt: 0.5 }}>
                  <Grid item xs={6}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, bgcolor: "grey.50", p: 0.4, borderRadius: 1, border: "1px solid", borderColor: "grey.200" }}>
                      <TimeIcon sx={{ fontSize: 12, color: "secondary.main" }} />
                      <Typography variant="caption" sx={{ fontSize: "0.65rem", fontWeight: 700 }}>
                        {client.estimated_time || "N/A"}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, bgcolor: "grey.50", p: 0.4, borderRadius: 1, border: "1px solid", borderColor: "grey.200" }}>
                      <RouteIcon sx={{ fontSize: 12, color: "secondary.main" }} />
                      <Typography variant="caption" sx={{ fontSize: "0.65rem", fontWeight: 700 }}>
                        {client.approximate_distance || "N/A"}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Stack>

              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 1, pt: 1, borderTop: "1px dashed", borderColor: "grey.300", gap: 0.5 }}>
                <Box sx={{ display: "flex", gap: 0.5 }}>
                  {client.image_path && (
                    <IconButton
                      size="small"
                      onClick={() => setOpenImageDialog(true)}
                      sx={{ bgcolor: "primary.light", color: "primary.contrastText", p: 0.5, "&:hover": { bgcolor: "primary.main" } }}
                    >
                      <ViewIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  )}
                  {hasPermission("clientes.edit") && (
                    <IconButton
                      size="small"
                      onClick={() => handleOpenCRUD(client)}
                      sx={{ bgcolor: "grey.100", p: 0.5 }}
                    >
                      <EditIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  )}
                </Box>
                
                <Button
                  size="small"
                  variant="contained"
                  color="secondary"
                  disableElevation
                  onClick={() => {
                    const url = `https://www.google.com/maps/dir/?api=1&destination=${client.latitude},${client.longitude}&travelmode=driving`;
                    window.open(url, "_blank");
                  }}
                  sx={{ fontSize: "0.65rem", py: 0, px: 1, minWidth: "auto", height: 24, borderRadius: 1 }}
                  startIcon={<MyLocationIcon sx={{ fontSize: "12px !important" }} />}
                >
                  GPS
                </Button>
              </Box>
            </Box>
          )
        }))}
      />

      <Box sx={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 1000, width: "90%", maxWidth: 500 }}>
        <Paper elevation={4} sx={{ p: 0.5, borderRadius: 3, display: "flex", alignItems: "center" }}>
          <Autocomplete
            fullWidth
            options={clients}
            getOptionLabel={(option) => `${option.name} ${option.phone || ""}`}
            renderOption={(props, option) => (
              <Box component="li" {...props} sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", py: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: "bold" }}>{option.name}</Typography>
                <Typography variant="caption" color="text.secondary">{option.phone || "Sin teléfono"}</Typography>
              </Box>
            )}
            onChange={(e, val) => val && flyToClient(val)}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Buscar cliente..."
                variant="standard"
                InputProps={{
                  ...params.InputProps,
                  disableUnderline: true,
                  startAdornment: <SearchIcon sx={{ ml: 2, mr: 1, color: "text.secondary" }} />,
                }}
                sx={{ ml: 1 }}
              />
            )}
          />
        </Paper>
      </Box>

      <Box sx={{ position: "absolute", bottom: 25, left: "50%", transform: "translateX(-50%)", zIndex: 1000, display: "flex", gap: 2 }}>
        {hasPermission("clientes.create") && (
          <Fab
            variant="extended"
            color="primary"
            onClick={() => handleOpenCRUD()}
            sx={{ px: 4, background: "linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)" }}
          >
            <AddIcon sx={{ mr: 1 }} /> Agregar Cliente
          </Fab>
        )}
        <Fab color="secondary" onClick={() => userLocation && mapRef.current?.flyTo([userLocation.lat, userLocation.lng], 16)}>
          <MyLocationIcon />
        </Fab>
      </Box>

      <Dialog open={openCRUDDialog} onClose={() => setOpenCRUDDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {editingClient ? "Editar Cliente" : "Nuevo Cliente"}
          {isFetchingMapbox && <CircularProgress size={20} />}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="Nombre / Negocio" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Teléfono" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button fullWidth variant="outlined" startIcon={<EditLocationAlt />} onClick={handleOpenLocationPicker} sx={{ height: "56px" }} color={tempLocation ? "success" : "primary"}>
                {tempLocation ? "Ubicación Lista" : "Fijar Ubicación"}
              </Button>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Dirección principal" multiline rows={2} value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} helperText="Se autocompletará al fijar la ubicación" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Referencia / Detalle" value={formData.address_detail} onChange={(e) => setFormData({ ...formData, address_detail: e.target.value })} placeholder="Ejem: Frente al parque, local azul..." />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ border: "1px dashed grey", borderRadius: 2, p: 2, textAlign: "center", position: "relative" }}>
                <Button component="label" startIcon={<CloudUploadIcon />}>
                  {imagePreview ? "Cambiar Imagen" : "Subir Foto del Local"}
                  <input type="file" hidden onChange={handleFileChange} />
                </Button>
                {imagePreview && (
                  <Box sx={{ mt: 1, display: "flex", justifyContent: "center" }}>
                    <Avatar src={imagePreview} variant="rounded" sx={{ width: 120, height: 120 }} />
                  </Box>
                )}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenCRUDDialog(false)}>Cancelar</Button>
          {editingClient && hasPermission("clientes.delete") && (
            <Button color="error" onClick={() => handleDeleteClient(editingClient.id)}>Eliminar</Button>
          )}
          <Button variant="contained" onClick={handleSaveClient} disabled={isSubmitting || !formData.name || !tempLocation || isFetchingMapbox} startIcon={isSubmitting && <CircularProgress size={20} />}>
            Guardar Cliente
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openLocationDialog} onClose={() => setOpenLocationDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6" fontWeight="700">Ajustar Ubicación</Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: 400, position: "relative" }}>
          <MapComponent
            center={tempLocation}
            zoom={18}
            isPicker={true}
            locationMode={locationMode}
            onModeChange={setLocationMode}
            onLocationSelect={setTempLocation}
            height="100%"
            onMapInstance={(instance) => { locationMapRef.current = instance; }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLocationDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleConfirmLocation}>Confirmar Ubicación</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openImageDialog} onClose={() => setOpenImageDialog(false)} maxWidth="md">
        <Box sx={{ position: "relative" }}>
          <IconButton onClick={() => setOpenImageDialog(false)} sx={{ position: "absolute", right: 8, top: 8, bgcolor: "rgba(0,0,0,0.5)", color: "white", "&:hover": { bgcolor: "rgba(0,0,0,0.7)" } }}><Close /></IconButton>
          <img src={selectedClient?.image_path} alt={selectedClient?.name} style={{ width: "100%", maxHeight: "80vh", objectFit: "contain" }} />
        </Box>
      </Dialog>
    </Box>
  );
};
