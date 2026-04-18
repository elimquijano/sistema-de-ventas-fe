import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  LayersControl,
  ZoomControl,
  Popup,
  Circle,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { renderToString } from "react-dom/server";

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
  Grid,
  Avatar,
  Divider,
  CircularProgress,
} from "@mui/material";
import {
  GpsFixed,
  Save,
  PersonPinCircle,
  Close,
  Map as MapIcon,
  EditLocationAlt,
  PhotoCamera,
  Visibility,
  Phone,
  Home,
} from "@mui/icons-material";
import { notificationSwal } from "../utils/swal-helpers";
import { clientsAPI } from "../utils/api";
import { compressImage } from "../utils/imageCompression";

// --- CONFIGURACIÓN DE ÍCONOS ---

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const motorcycleIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/128/9561/9561839.png",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

const clientDestinationIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/128/8587/8587894.png",
  iconSize: [40, 40],
  iconAnchor: [10, 40],
  popupAnchor: [0, -40],
});

const clientIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/128/5674/5674903.png",
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35],
});

// --- COMPONENTE PRINCIPAL ---

export default function LocationTracker() {
  const theme = useTheme();
  const { BaseLayer } = LayersControl;

  const personPinIcon = useMemo(
    () =>
      new L.divIcon({
        html: renderToString(
          <PersonPinCircle
            style={{ fontSize: 50, color: theme.palette.primary.main }}
          />
        ),
        className: "leaflet-mui-icon",
        iconSize: [50, 50],
        iconAnchor: [25, 50],
      }),
    [theme.palette.primary.main]
  );

  // Estados principales
  const [mode, setMode] = useState("register");
  const [registerMode, setRegisterMode] = useState("tracking");

  // Estados de datos
  const [clients, setClients] = useState([]); // Resultados de búsqueda
  const [userLocation, setUserLocation] = useState(null);
  const [locationToSave, setLocationToSave] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [loadingClients, setLoadingClients] = useState(false); // Estado de carga de búsqueda

  // Estados de UI
  const [dialogOpen, setDialogOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientImage, setClientImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loadingAddress, setLoadingAddress] = useState(false);

  // Estado para ver imagen en grande
  const [viewImageModal, setViewImageModal] = useState({ open: false, url: "", title: "" });

  const mapRef = useRef();
  const lastCenteredLocation = useRef(null);
  const autocompleteInputRef = useRef();
  const fileInputRef = useRef();
  const searchTimeoutRef = useRef(null); // Ref para debounce

  // Token de Mapbox
  const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

  // Solo mostrar el cliente seleccionado o los resultados de búsqueda en el mapa
  const clientsToDisplay = useMemo(() => {
    return selectedClient ? [selectedClient] : clients;
  }, [selectedClient, clients]);

  // --- LÓGICA Y MANEJADORES ---

  // Búsqueda dinámica de clientes
  const handleClientSearch = useCallback(async (event, value, reason) => {
    if (reason === 'reset' || !value) {
      if (!value) setClients([]);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setLoadingClients(true);
      try {
        // Usamos clientsAPI con parámetro de búsqueda
        const response = await clientsAPI.getAll({ search: value });
        const formattedClients = response.data.data.map((client) => ({
          ...client,
          location: { lat: parseFloat(client.latitude), lng: parseFloat(client.longitude) },
        }));
        setClients(formattedClients);
      } catch (error) {
        console.error("Error searching clients:", error);
      } finally {
        setLoadingClients(false);
      }
    }, 500); // Debounce de 500ms
  }, []);

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setUserLocation({
          lat: latitude,
          lng: longitude,
          accuracy: accuracy,
        });
      },
      (error) => {
        console.error("Error obteniendo ubicación:", error);
        // Si hay error, intentar forzar una lectura única como respaldo
        navigator.geolocation.getCurrentPosition(
          (pos) => setUserLocation({ 
            lat: pos.coords.latitude, 
            lng: pos.coords.longitude, 
            accuracy: pos.coords.accuracy 
          }),
          null,
          { enableHighAccuracy: true }
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation) return;

    if (mode === "register" && registerMode === "tracking") {
      const currentPos = L.latLng(userLocation.lat, userLocation.lng);
      
      if (!lastCenteredLocation.current) {
        map.flyTo(currentPos, 17);
        lastCenteredLocation.current = currentPos;
      } else {
        const distance = currentPos.distanceTo(lastCenteredLocation.current);
        // Solo centrar si se ha movido más de 5 metros para evitar vibraciones visuales
        if (distance > 5) {
          map.flyTo(currentPos, 17);
          lastCenteredLocation.current = currentPos;
        }
      }
    }
  }, [mode, registerMode, userLocation]);

  const handleCenterOnUser = useCallback(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.flyTo([userLocation.lat, userLocation.lng], 17);
    }
  }, [userLocation]);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setSelectedClient(null);
    setClients([]); // Limpiar búsqueda al cambiar modo
    if (newMode === "register") {
      setRegisterMode("tracking");
    }
  };

  const handleToggleRegisterMode = () => {
    const newRegisterMode = registerMode === "tracking" ? "manual" : "tracking";
    setRegisterMode(newRegisterMode);
    if (newRegisterMode === "tracking") {
      handleCenterOnUser();
    }
  };

  // Función para obtener dirección desde Mapbox
  const fetchAddressFromMapbox = async (lat, lng) => {
    if (!MAPBOX_TOKEN) return;
    setLoadingAddress(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}`
      );
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        setClientAddress(data.features[0].place_name);
      }
    } catch (error) {
      console.error("Error fetching address from Mapbox:", error);
    } finally {
      setLoadingAddress(false);
    }
  };

  const handleSaveClick = () => {
    let locToSave;
    if (registerMode === "tracking" && userLocation) {
      locToSave = userLocation;
      // Advertir si la precisión es baja (> 80 metros)
      if (userLocation.accuracy > 80) {
        notificationSwal(
          "Aviso de Precisión",
          `La señal GPS es débil (margen de error: ${Math.round(
            userLocation.accuracy
          )}m). Considera esperar unos segundos o usar el modo manual para mayor exactitud.`,
          "warning"
        );
      }
    } else if (registerMode === "manual" && mapRef.current) {
      locToSave = mapRef.current.getCenter();
    }

    if (locToSave) {
      setLocationToSave(locToSave);
      setClientName("");
      setClientPhone("");
      setClientAddress("");
      setClientImage(null);
      setImagePreview(null);
      setDialogOpen(true);
      
      fetchAddressFromMapbox(locToSave.lat, locToSave.lng);
    } else {
      notificationSwal("Error", "Ubicación no disponible para guardar.", "error");
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressedFile = await compressImage(file);
        setClientImage(compressedFile);
        setImagePreview(URL.createObjectURL(compressedFile));
      } catch (error) {
        console.error("Error al procesar la imagen:", error);
        setClientImage(file);
        setImagePreview(URL.createObjectURL(file));
      }
    }
  };

  const handleConfirmSave = async () => {
    if (!clientName.trim() || !locationToSave) {
      notificationSwal("Atención", "El nombre del cliente es obligatorio.", "warning");
      return;
    }

    const formData = new FormData();
    formData.append("name", clientName.trim());
    formData.append("latitude", locationToSave.lat);
    formData.append("longitude", locationToSave.lng);
    formData.append("address", clientAddress.trim());
    if (clientPhone) formData.append("phone", clientPhone.trim());
    if (clientImage) formData.append("image", clientImage);

    try {
      // Usar clientsAPI.create
      await clientsAPI.create(formData);
      notificationSwal("Éxito", "¡Cliente guardado con éxito!", "success");

      setDialogOpen(false);
      // No recargamos todos, limpiamos
      setMode("search");
    } catch (error) {
      console.error("Error saving client:", error);
      const errorMessage = error.response?.data?.message || "No se pudo guardar el cliente.";
      notificationSwal("Error", errorMessage, "error");
    }
  };

  const handleSelectClient = (event, value) => {
    setSelectedClient(value);
    if (value && autocompleteInputRef.current) {
      autocompleteInputRef.current.blur();
    }
    const map = mapRef.current;
    if (!map) return;

    if (value && userLocation) {
      const bounds = L.latLngBounds(
        [userLocation.lat, userLocation.lng],
        [value.location.lat, value.location.lng]
      );
      map.flyToBounds(bounds, { padding: [50, 50] });
    } else if (value) {
      map.flyTo([value.location.lat, value.location.lng], 17);
    }
  };

  const openInGoogleMaps = () => {
    if (selectedClient) {
      if (userLocation) {
        const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${selectedClient.location.lat},${selectedClient.location.lng}&travelmode=driving`;
        window.open(url, "_blank");
      } else {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedClient.location.lat},${selectedClient.location.lng}&travelmode=driving`;
        window.open(url, "_blank");
        notificationSwal("Información", "Ubicación del vehículo no disponible. Abriendo solo el destino.", "info");
      }
    }
  };

  return (
    <Box sx={{ height: "100%", p: 1 }}>
      <Paper
        sx={{
          width: "100%",
          height: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box sx={{ p: 1, zIndex: 10, borderBottom: 1, borderColor: "divider" }}>
          <Stack direction="row" spacing={1}>
            <Button
              fullWidth
              variant={mode === "register" ? "contained" : "outlined"}
              onClick={() => handleModeChange("register")}
              startIcon={<Save />}
            >
              Registrar
            </Button>
            <Button
              fullWidth
              variant={mode === "search" ? "contained" : "outlined"}
              onClick={() => handleModeChange("search")}
              startIcon={<PersonPinCircle />}
            >
              Buscar
            </Button>
          </Stack>
        </Box>

        <Box sx={{ flex: 1, position: "relative" }}>
          <MapContainer
            center={[-12.0464, -77.0428]}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
            zoomControl={false}
            ref={mapRef}
          >
            <LayersControl position="bottomright">
              <BaseLayer name="Carto">
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
              </BaseLayer>
              <BaseLayer name="OpenStreetMap">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              </BaseLayer>
              <BaseLayer name="Google">
                <TileLayer
                  url="http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                  subdomains={["mt0", "mt1", "mt2", "mt3"]}
                  maxZoom={20}
                />
              </BaseLayer>
              <BaseLayer name="Google Satélite">
                <TileLayer
                  url="http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                  subdomains={["mt0", "mt1", "mt2", "mt3"]}
                  maxZoom={20}
                />
              </BaseLayer>
              <BaseLayer checked name="Google Híbrido">
                <TileLayer
                  url="http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}"
                  subdomains={["mt0", "mt1", "mt2", "mt3"]}
                  maxZoom={20}
                />
              </BaseLayer>
              <BaseLayer name="Google Relieve">
                <TileLayer
                  url="http://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}"
                  subdomains={["mt0", "mt1", "mt2", "mt3"]}
                  maxZoom={20}
                />
              </BaseLayer>
            </LayersControl>

            <ZoomControl position="bottomleft" />

            {mode === "register" &&
              registerMode === "tracking" &&
              userLocation && (
                <>
                  <Marker position={userLocation} icon={personPinIcon} />
                  <Circle
                    center={userLocation}
                    radius={userLocation.accuracy || 0}
                    pathOptions={{
                      color: theme.palette.primary.main,
                      fillColor: theme.palette.primary.main,
                      fillOpacity: 0.1,
                      weight: 1,
                    }}
                  />
                </>
              )}
            {mode === "search" && (
              <>
                {userLocation && (
                  <>
                    <Marker position={userLocation} icon={motorcycleIcon} />
                    <Circle
                      center={userLocation}
                      radius={userLocation.accuracy || 0}
                      pathOptions={{
                        color: theme.palette.secondary.main,
                        fillColor: theme.palette.secondary.main,
                        fillOpacity: 0.1,
                        weight: 1,
                      }}
                    />
                  </>
                )}
                {clientsToDisplay.map((client) => (
                  <Marker
                    key={client.id}
                    position={client.location}
                    icon={
                      selectedClient && selectedClient.id === client.id
                        ? clientDestinationIcon
                        : clientIcon
                    }
                  >
                    {/* Popup mejorado */}
                    <Popup minWidth={200}>
                      <Box sx={{ p: 1, textAlign: "center" }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {client.name}
                        </Typography>
                        <Divider sx={{ my: 1 }} />
                        {client.phone && (
                          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                            <Phone fontSize="small" color="action" />
                            <Typography variant="body2">{client.phone}</Typography>
                          </Box>
                        )}
                        {client.address && (
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Home fontSize="small" color="action" />
                            <Typography variant="caption" sx={{ textAlign: 'left' }}>
                              {client.address}
                            </Typography>
                          </Box>
                        )}
                        {client.image_path && (
                          <Button
                            size="small"
                            variant="outlined"
                            fullWidth
                            startIcon={<Visibility />}
                            onClick={() => setViewImageModal({
                              open: true,
                              url: client.image_path,
                              title: client.name
                            })}
                            sx={{ mt: 1 }}
                          >
                            Ver Foto
                          </Button>
                        )}
                      </Box>
                    </Popup>
                  </Marker>
                ))}
              </>
            )}
          </MapContainer>

          <Box
            sx={{
              position: "absolute",
              top: 15,
              right: 15,
              zIndex: 401,
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            {mode === "search" && (
              <IconButton
                onClick={handleCenterOnUser}
                title="Centrar en mi ubicación"
                sx={{
                  backgroundColor: "white",
                  "&:hover": { backgroundColor: "rgba(255,255,255,0.9)" },
                }}
              >
                <GpsFixed />
              </IconButton>
            )}
            {mode === "register" && (
              <IconButton
                onClick={handleToggleRegisterMode}
                title={
                  registerMode === "tracking"
                    ? "Ajustar Manualmente"
                    : "Usar mi Ubicación GPS"
                }
                color="secondary"
                sx={{
                  backgroundColor: "white",
                  "&:hover": { backgroundColor: "rgba(255,255,255,0.9)" },
                }}
              >
                {registerMode === "tracking" ? (
                  <EditLocationAlt />
                ) : (
                  <GpsFixed />
                )}
              </IconButton>
            )}
          </Box>

          {mode === "register" && (
            <>
              {registerMode === "manual" && (
                <Box
                  sx={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    zIndex: 401,
                    pointerEvents: "none",
                  }}
                >
                  <PersonPinCircle
                    sx={{
                      fontSize: 50,
                      color: theme.palette.primary.main,
                      filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
                    }}
                  />
                </Box>
              )}
              <Box
                sx={{
                  position: "absolute",
                  bottom: 30,
                  left: "50%",
                  transform: "translateX(-50%)",
                  zIndex: 401,
                }}
              >
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleSaveClick}
                  startIcon={<Save />}
                >
                  Registrar Ubicación
                </Button>
              </Box>
            </>
          )}

          {mode === "search" && (
            <Box
              sx={{
                position: "absolute",
                top: 15,
                left: 15,
                right: 15,
                zIndex: 401,
                maxWidth: 400,
              }}
            >
              <Autocomplete
                options={clients}
                getOptionLabel={(option) => option.name}
                value={selectedClient}
                onChange={handleSelectClient}
                onInputChange={handleClientSearch}
                filterOptions={(x) => x} // Desactivar filtrado local
                loading={loadingClients}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Buscar cliente..."
                    variant="outlined"
                    sx={{ bgcolor: "background.paper", borderRadius: 1 }}
                    inputRef={autocompleteInputRef}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <React.Fragment>
                          {loadingClients ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </React.Fragment>
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props}>
                    <PersonPinCircle sx={{ mr: 1, color: "text.secondary" }} />
                    {option.name}
                  </li>
                )}
              />
            </Box>
          )}

          {mode === "search" && selectedClient && (
            <Box
              sx={{
                position: "absolute",
                bottom: 30,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 401,
              }}
            >
              <Button
                variant="contained"
                color="secondary"
                size="large"
                onClick={openInGoogleMaps}
                startIcon={<MapIcon />}
              >
                Ver Ruta en Google Maps
              </Button>
            </Box>
          )}
        </Box>

        {/* --- DIÁLOGO DE REGISTRO ACTUALIZADO --- */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            Guardar Ubicación
            <IconButton
              onClick={() => setDialogOpen(false)}
              sx={{ position: "absolute", right: 8, top: 8 }}
            >
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12}>
                <TextField
                  autoFocus
                  label="Nombre del Cliente / Negocio"
                  fullWidth
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Teléfono (Opcional)"
                  fullWidth
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  type="tel"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label={loadingAddress ? "Cargando dirección..." : "Dirección"}
                  fullWidth
                  multiline
                  rows={2}
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  placeholder="Se autocompletará con Mapbox..."
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              {/* Sección de Foto estilo Clients.js */}
              <Grid item xs={12}>
                 <Box
                  sx={{
                    border: "1px dashed grey",
                    borderRadius: 2,
                    p: 2,
                    textAlign: "center",
                    position: "relative",
                  }}
                >
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="icon-button-file"
                    type="file"
                    capture="environment"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                  />
                  <label htmlFor="icon-button-file">
                    <Button 
                      variant="outlined" 
                      component="span" 
                      startIcon={<PhotoCamera />}
                    >
                      {imagePreview ? "Cambiar Foto" : "Tomar Foto / Subir Imagen"}
                    </Button>
                  </label>
                  
                  {imagePreview && (
                    <Box sx={{ mt: 2, display: "flex", justifyContent: "center" }}>
                      <Avatar
                        src={imagePreview}
                        variant="rounded"
                        sx={{ width: 150, height: 150, objectFit: 'cover' }}
                      />
                    </Box>
                  )}
                </Box>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleConfirmSave}
              variant="contained"
              disabled={!clientName.trim()}
            >
              Guardar
            </Button>
          </DialogActions>
        </Dialog>

        {/* --- MODAL VER FOTO --- */}
        <Dialog 
          open={viewImageModal.open} 
          onClose={() => setViewImageModal({ ...viewImageModal, open: false })}
          maxWidth="md"
        >
           <DialogTitle sx={{ m: 0, p: 2 }}>
            {viewImageModal.title}
            <IconButton
              onClick={() => setViewImageModal({ ...viewImageModal, open: false })}
              sx={{
                position: 'absolute',
                right: 8,
                top: 8,
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            {viewImageModal.url && (
              <img 
                src={viewImageModal.url} 
                alt={viewImageModal.title} 
                style={{ width: "100%", height: "auto", maxHeight: '80vh', objectFit: 'contain' }} 
              />
            )}
          </DialogContent>
        </Dialog>

      </Paper>
    </Box>
  );
}