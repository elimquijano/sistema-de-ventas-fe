import React, { useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  LayersControl,
  ZoomControl,
  useMapEvents,
  Popup,
  Tooltip,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Box, useTheme, Stack, IconButton, Typography, alpha } from "@mui/material";
import { GpsFixed, EditLocationAlt, PersonPinCircle } from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";

// Configuración de iconos por defecto de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

// Componente interno para capturar clics, movimiento y zoom
const MapEvents = ({ onLocationSelect, onZoomSelect, isPicker, mode }) => {
  const map = useMapEvents({
    move() {
      if (isPicker && mode === 'manual') {
        const center = map.getCenter();
        onLocationSelect({ lat: center.lat, lng: center.lng });
      }
    },
    click(e) {
      if (isPicker && mode === 'manual') {
        onLocationSelect(e.latlng);
      }
    },
    zoomend() {
      if (isPicker && onZoomSelect) {
        onZoomSelect(map.getZoom());
      }
    }
  });
  return null;
};

const createBusinessIcon = (theme) => {
  return L.divIcon({
    html: `
      <svg viewBox="0 0 24 24" width="40" height="40" style="filter: drop-shadow(0 2px 3px rgba(0,0,0,0.4));">
        <path fill="${theme.palette.primary.main}" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    `,
    className: "business-pin-icon",
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  });
};

export const MapComponent = ({
  center,
  zoom: initialZoom,
  onLocationSelect,
  onZoomSelect,
  markers = [],
  isPicker = false,
  locationMode = "manual", // 'tracking' o 'manual'
  onModeChange,
  height = "400px",
  businessData = null, // { lat, lng, name, address }
  showBusinessMarker = false,
  onMapInstance,
}) => {
  const { user } = useAuth();
  const theme = useTheme();
  const mapRef = useRef();
  const { BaseLayer } = LayersControl;

  // Prioridad de ubicación: 
  // 1. Props (center)
  // 2. Negocio del usuario logueado
  // 3. Lima (default)
  const bizCoords = user?.business?.latitude ? { 
    lat: parseFloat(user.business.latitude), 
    lng: parseFloat(user.business.longitude) 
  } : null;

  const defaultCenter = center || bizCoords || { lat: -12.0464, lng: -77.0428 };
  const defaultZoom = initialZoom || parseInt(user?.business?.zoom) || 13;

  return (
    <Box sx={{ height, width: "100%", position: "relative", borderRadius: 2, overflow: "hidden", border: `1px solid ${theme.palette.divider}` }}>
      <MapContainer
        center={[defaultCenter.lat, defaultCenter.lng]}
        zoom={defaultZoom}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        ref={(instance) => {
          mapRef.current = instance;
          if (onMapInstance) onMapInstance(instance);
        }}
      >
        <ZoomControl position="bottomright" />
        <LayersControl position="topright">
          <BaseLayer checked name="Google Híbrido">
            <TileLayer
              url="http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}"
              subdomains={["mt0", "mt1", "mt2", "mt3"]}
              attribution="&copy; Google Maps"
            />
          </BaseLayer>
          <BaseLayer name="Google Carreteras">
            <TileLayer
              url="http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
              subdomains={["mt0", "mt1", "mt2", "mt3"]}
              attribution="&copy; Google Maps"
            />
          </BaseLayer>
          <BaseLayer name="OpenStreetMap">
            <TileLayer 
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
          </BaseLayer>
        </LayersControl>

        <MapEvents 
          isPicker={isPicker} 
          mode={locationMode} 
          onLocationSelect={onLocationSelect} 
          onZoomSelect={onZoomSelect} 
        />

        {showBusinessMarker && (businessData || bizCoords) && (
          <Marker 
            position={[
              parseFloat(businessData?.lat || bizCoords?.lat), 
              parseFloat(businessData?.lng || bizCoords?.lng)
            ]} 
            icon={createBusinessIcon(theme)}
          >
            <Popup>
              <Typography variant="subtitle2" fontWeight="800">{businessData?.name || user?.business?.name}</Typography>
              <Typography variant="caption">{businessData?.address || user?.business?.address}</Typography>
            </Popup>
          </Marker>
        )}

        {markers.map((marker, index) => (
          <Marker key={index} position={[marker.lat, marker.lng]} icon={marker.icon || new L.Icon.Default()}>
            {marker.popup && <Popup>{marker.popup}</Popup>}
            {marker.tooltip && <Tooltip>{marker.tooltip}</Tooltip>}
          </Marker>
        ))}
      </MapContainer>

      {isPicker && locationMode === "manual" && (
        <Box sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 1000, pointerEvents: "none" }}>
          <PersonPinCircle sx={{ fontSize: 50, color: theme.palette.primary.main, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }} />
        </Box>
      )}

      {isPicker && onModeChange && (
        <Box sx={{ position: "absolute", top: 10, right: 50, zIndex: 1000, bgcolor: "background.paper", borderRadius: 1, boxShadow: 2, p: 0.5 }}>
          <Stack direction="row" spacing={0.5}>
            <IconButton 
              size="small" 
              color={locationMode === "tracking" ? "primary" : "default"} 
              onClick={() => onModeChange("tracking")}
              title="Seguir ubicación GPS"
            >
              <GpsFixed fontSize="small" />
            </IconButton>
            <IconButton 
              size="small" 
              color={locationMode === "manual" ? "primary" : "default"} 
              onClick={() => onModeChange("manual")}
              title="Selección manual"
            >
              <EditLocationAlt fontSize="small" />
            </IconButton>
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default MapComponent;
