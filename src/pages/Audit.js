import React, { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Paper,
  alpha,
  useTheme,
  CircularProgress,
} from "@mui/material";
import {
  Search as SearchIcon,
  History as HistoryIcon,
} from "@mui/icons-material";
import { SaleTimeline } from "../components/SaleTimeline";
import { salesAPI } from "../utils/api";
import { notificationSwal } from "../utils/swal-helpers";

export const Audit = () => {
  const theme = useTheme();
  const [saleId, setSaleId] = useState("");
  const [timelineData, setTimelineData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    if (!saleId) return;
    setIsLoading(true);
    try {
      const res = await salesAPI.timeline(saleId);
      setTimelineData(res.data || []);
    } catch (e) {
      console.error("Error fetching timeline", e);
      notificationSwal("Error", "No se encontró historial para esta venta.", "error");
      setTimelineData([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: "auto" }}>
      <Typography variant="h4" fontWeight="800" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <HistoryIcon color="primary" fontSize="large" /> Auditoría de Ventas
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Busca el ID de una venta para ver su historia completa en lenguaje natural.
      </Typography>

      <Paper 
        elevation={0} 
        sx={{ 
          p: 1, 
          mb: 5, 
          display: "flex", 
          alignItems: "center", 
          borderRadius: 3,
          border: "2px solid",
          borderColor: alpha(theme.palette.primary.main, 0.1)
        }}
      >
        <TextField
          fullWidth
          variant="standard"
          placeholder="Ingresa el ID de la venta (ej: 17)..."
          value={saleId}
          onChange={(e) => setSaleId(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          sx={{ ml: 2, "& .MuiInput-underline:before, & .MuiInput-underline:after": { display: "none" } }}
        />
        <IconButton
          onClick={handleSearch}
          disabled={isLoading}
          sx={{ 
            bgcolor: "primary.main", 
            color: "white", 
            "&:hover": { bgcolor: "primary.dark" },
            borderRadius: 2,
            p: 1.5
          }}
        >
          {isLoading ? <CircularProgress size={24} color="inherit" /> : <SearchIcon />}
        </IconButton>
      </Paper>

      <Box sx={{ bgcolor: "background.paper", borderRadius: 4, p: 3, border: "1px solid", borderColor: "divider" }}>
        <SaleTimeline logs={timelineData} loading={isLoading} />
      </Box>
    </Box>
  );
};
