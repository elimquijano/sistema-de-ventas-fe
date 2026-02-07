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
  Tooltip,
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
import { clientsAPI } from "../utils/api";
import { useAuth } from "../contexts/AuthContext";

// --- CONFIGURACIÓN DE ÍCONOS LEAFLET ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const clientIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/128/5674/5674903.png",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

const activeClientIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/128/8587/8587894.png",
  iconSize: [45, 45],
  iconAnchor: [22, 45],
  popupAnchor: [0, -45],
});

// --- COMPONENTE PRINCIPAL ---
export const Clients = () => {
  const theme = useTheme();
  const { hasPermission } = useAuth();
  const { BaseLayer } = LayersControl;

  // Estados de Datos
  const [clients, setClients] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  // Estados de UI
  const [selectedClient, setSelectedClient] = useState(null);
  const [openCRUDDialog, setOpenCRUDDialog] = useState(false);
  const [openLocationDialog, setOpenLocationDialog] = useState(false);
  const [openImageDialog, setOpenImageDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados de Formulario
  const [editingClient, setEditingClient] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    image: null,
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
      // Filtramos solo los que tengan coordenadas válidas
      const validClients = (response.data.data || []).filter(
        (c) => c.latitude && c.longitude,
      );
      setClients(validClients);
    } catch (error) {
      console.error("Error loading clients:", error);
      notificationSwal("Error", "No se pudieron cargar los clientes.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

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

  // --- MANEJADORES DE UI ---

  const handleOpenCRUD = (client = null) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name || "",
        address: client.address || "",
        phone: client.phone || "",
        image: null,
      });
      setImagePreview(client.image_path);
      setTempLocation({
        lat: parseFloat(client.latitude),
        lng: parseFloat(client.longitude),
      });
    } else {
      setEditingClient(null);
      setFormData({ name: "", address: "", phone: "", image: null });
      setImagePreview(null);
      setTempLocation(userLocation || { lat: -12.0464, lng: -77.0428 });
    }
    setOpenCRUDDialog(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({ ...prev, image: file }));
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSaveClient = async () => {
    const data = new FormData();
    data.append("name", formData.name);
    data.append("address", formData.address);
    data.append("phone", formData.phone);
    if (formData.image) data.append("image", formData.image);

    // Ubicación obligatoria
    if (tempLocation) {
      data.append("latitude", tempLocation.lat);
      data.append("longitude", tempLocation.lng);
    }

    setIsSubmitting(true);
    try {
      if (editingClient) {
        await clientsAPI.update(editingClient.id, data);
        notificationSwal(
          "Éxito",
          "Cliente actualizado correctamente",
          "success",
        );
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

  // --- MANEJO DE UBICACIÓN ---
  const handleOpenLocationPicker = () => {
    setLocationMode(editingClient ? "manual" : "tracking");
    setOpenLocationDialog(true);
  };

  const handleConfirmLocation = () => {
    if (locationMode === "manual" && locationMapRef.current) {
      const center = locationMapRef.current.getCenter();
      setTempLocation({ lat: center.lat, lng: center.lng });
    }
    setOpenLocationDialog(false);
  };

  // Animación del mapa principal
  const flyToClient = (client) => {
    if (mapRef.current && client.latitude && client.longitude) {
      mapRef.current.flyTo([client.latitude, client.longitude], 18);
      setSelectedClient(client);
    }
  };

  // --- ICONOS DINÁMICOS ---
  const userMarkerIcon = useMemo(
    () =>
      new L.divIcon({
        html: renderToString(
          <PersonPinCircle
            style={{ fontSize: 40, color: theme.palette.secondary.main }}
          />,
        ),
        className: "user-location-icon",
        iconSize: [40, 40],
        iconAnchor: [20, 40],
      }),
    [theme.palette.secondary.main],
  );

  return (
    <Box sx={{ height: "calc(100vh - 100px)", position: "relative", m: -1 }}>
      {/* --- MAPA PRINCIPAL --- */}
      <MapContainer
        center={[-12.0464, -77.0428]}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        ref={mapRef}
      >
        <ZoomControl position="bottomright" />
        <LayersControl position="topright">
          <BaseLayer checked name="Google Híbrido">
            <TileLayer
              url="http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}"
              subdomains={["mt0", "mt1", "mt2", "mt3"]}
            />
          </BaseLayer>
          <BaseLayer name="Google Satélite">
            <TileLayer
              url="http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
              subdomains={["mt0", "mt1", "mt2", "mt3"]}
            />
          </BaseLayer>
          <BaseLayer name="OpenStreetMap">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          </BaseLayer>
        </LayersControl>

        {/* Marcador de Usuario */}
        {userLocation && (
          <Marker position={userLocation} icon={userMarkerIcon}>
            <Tooltip>Tu ubicación</Tooltip>
          </Marker>
        )}

        {/* Marcadores de Clientes */}
        {clients.map((client) => (
          <Marker
            key={client.id}
            position={[client.latitude, client.longitude]}
            icon={
              selectedClient?.id === client.id ? activeClientIcon : clientIcon
            }
            eventHandlers={{ click: () => setSelectedClient(client) }}
          >
            <Popup minWidth={250}>
              <Box sx={{ p: 1 }}>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 700, color: "primary.main" }}
                >
                  {client.name}
                </Typography>
                <Divider sx={{ my: 1 }} />

                <Stack spacing={1}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <PhoneIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      {client.phone || "Sin teléfono"}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <HomeIcon fontSize="small" color="action" />
                    <Typography variant="body2" sx={{ whiteSpace: "normal" }}>
                      {client.address}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
                    <Box
                      sx={{
                        textAlign: "center",
                        flex: 1,
                        bgcolor: "grey.100",
                        p: 0.5,
                        borderRadius: 1,
                      }}
                    >
                      <TimeIcon fontSize="small" color="secondary" />
                      <Typography variant="caption" display="block">
                        Tiempo Est.
                      </Typography>
                      <Typography variant="body2" fontWeight="600">
                        {client.estimated_time || "N/A"}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        textAlign: "center",
                        flex: 1,
                        bgcolor: "grey.100",
                        p: 0.5,
                        borderRadius: 1,
                      }}
                    >
                      <RouteIcon fontSize="small" color="secondary" />
                      <Typography variant="caption" display="block">
                        Distancia
                      </Typography>
                      <Typography variant="body2" fontWeight="600">
                        {client.approximate_distance || "N/A"}
                      </Typography>
                    </Box>
                  </Box>
                </Stack>

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mt: 2,
                    gap: 1,
                  }}
                >
                  {client.image_path && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<ViewIcon />}
                      onClick={() => setOpenImageDialog(true)}
                    >
                      Ver Foto
                    </Button>
                  )}
                  {hasPermission("clientes.edit") && (
                    <IconButton
                      size="small"
                      onClick={() => handleOpenCRUD(client)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                  )}
                  <Button
                    size="small"
                    variant="contained"
                    color="secondary"
                    onClick={() => {
                      const url = `https://www.google.com/maps/dir/?api=1&destination=${client.latitude},${client.longitude}&travelmode=driving`;
                      window.open(url, "_blank");
                    }}
                  >
                    GPS
                  </Button>
                </Box>
              </Box>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* --- UI FLOTANTE --- */}

      {/* Buscador superior */}
      <Box
        sx={{
          position: "absolute",
          top: 20,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1000,
          width: "90%",
          maxWidth: 500,
        }}
      >
        <Paper
          elevation={4}
          sx={{
            p: 0.5,
            borderRadius: 3,
            display: "flex",
            alignItems: "center",
          }}
        >
          <Autocomplete
            fullWidth
            options={clients}
            getOptionLabel={(option) => option.name}
            onChange={(e, val) => val && flyToClient(val)}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Buscar cliente..."
                variant="standard"
                InputProps={{
                  ...params.InputProps,
                  disableUnderline: true,
                  startAdornment: (
                    <SearchIcon
                      sx={{ ml: 2, mr: 1, color: "text.secondary" }}
                    />
                  ),
                }}
                sx={{ ml: 1 }}
              />
            )}
          />
        </Paper>
      </Box>

      {/* Botones de acción inferiores */}
      <Box
        sx={{
          position: "absolute",
          bottom: 25,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1000,
          display: "flex",
          gap: 2,
        }}
      >
        {hasPermission("clientes.create") && (
          <Fab
            variant="extended"
            color="primary"
            onClick={() => handleOpenCRUD()}
            sx={{
              px: 4,
              background: "linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)",
            }}
          >
            <AddIcon sx={{ mr: 1 }} /> Agregar Cliente
          </Fab>
        )}
        <Fab
          color="secondary"
          onClick={() =>
            userLocation &&
            mapRef.current?.flyTo([userLocation.lat, userLocation.lng], 16)
          }
        >
          <MyLocationIcon />
        </Fab>
      </Box>

      {/* --- DIÁLOGOS --- */}

      {/* CRUD Modal */}
      <Dialog
        open={openCRUDDialog}
        onClose={() => setOpenCRUDDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingClient ? "Editar Cliente" : "Nuevo Cliente"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nombre / Negocio"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Teléfono"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<EditLocationAlt />}
                onClick={handleOpenLocationPicker}
                sx={{ height: "56px" }}
                color={tempLocation ? "success" : "primary"}
              >
                {tempLocation ? "Ubicación Lista" : "Fijar Ubicación"}
              </Button>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Dirección / Referencia"
                multiline
                rows={2}
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </Grid>
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
                <Button component="label" startIcon={<CloudUploadIcon />}>
                  {imagePreview ? "Cambiar Imagen" : "Subir Foto del Local"}
                  <input type="file" hidden onChange={handleFileChange} />
                </Button>
                {imagePreview && (
                  <Box
                    sx={{ mt: 1, display: "flex", justifyContent: "center" }}
                  >
                    <Avatar
                      src={imagePreview}
                      variant="rounded"
                      sx={{ width: 120, height: 120 }}
                    />
                  </Box>
                )}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenCRUDDialog(false)}>Cancelar</Button>
          {editingClient && hasPermission("clientes.delete") && (
            <Button
              color="error"
              onClick={() => handleDeleteClient(editingClient.id)}
            >
              Eliminar
            </Button>
          )}
          <Button
            variant="contained"
            onClick={handleSaveClient}
            disabled={isSubmitting || !formData.name || !tempLocation}
            startIcon={isSubmitting && <CircularProgress size={20} />}
          >
            Guardar Cliente
          </Button>
        </DialogActions>
      </Dialog>

      {/* Location Picker Modal (Superior) */}
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
          <Typography variant="h6" fontWeight="700">
            Ajustar Ubicación
          </Typography>
          <Stack direction="row" spacing={1}>
            <MuiTooltip title="Usar GPS">
              <IconButton
                color={locationMode === "tracking" ? "primary" : "default"}
                onClick={() => setLocationMode("tracking")}
              >
                <GpsFixed />
              </IconButton>
            </MuiTooltip>
            <MuiTooltip title="Ajuste Manual">
              <IconButton
                color={locationMode === "manual" ? "primary" : "default"}
                onClick={() => setLocationMode("manual")}
              >
                <EditLocationAlt />
              </IconButton>
            </MuiTooltip>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: 400, position: "relative" }}>
          <MapContainer
            center={
              tempLocation
                ? [tempLocation.lat, tempLocation.lng]
                : [-12.0464, -77.0428]
            }
            zoom={18}
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
              bottom: 15,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 1000,
            }}
          >
            <Paper
              sx={{
                px: 2,
                py: 1,
                borderRadius: 2,
                bgcolor: "rgba(255,255,255,0.9)",
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {locationMode === "tracking"
                  ? "Siguiendo GPS en tiempo real..."
                  : "Mueve el mapa para centrar el icono en el local"}
              </Typography>
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLocationDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleConfirmLocation}>
            Confirmar Ubicación
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image View Modal */}
      <Dialog
        open={openImageDialog}
        onClose={() => setOpenImageDialog(false)}
        maxWidth="md"
      >
        <Box sx={{ position: "relative" }}>
          <IconButton
            onClick={() => setOpenImageDialog(false)}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              bgcolor: "rgba(0,0,0,0.5)",
              color: "white",
              "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
            }}
          >
            <Close />
          </IconButton>
          <img
            src={selectedClient?.image_path}
            alt={selectedClient?.name}
            style={{ width: "100%", maxHeight: "80vh", objectFit: "contain" }}
          />
        </Box>
      </Dialog>
    </Box>
  );
};
