import React, { useState, useEffect } from "react";
import { Box, Typography, Container, CircularProgress, AppBar, Toolbar, IconButton, Badge } from "@mui/material";
import { Refresh as RefreshIcon, LocalShipping as LocalShippingIcon } from "@mui/icons-material";
import { OrderMonitor } from "../components/OrderMonitor";
import { salesAPI, usersAPI } from "../utils/api";
import { useAuth } from "../contexts/AuthContext";
import { notificationSwal } from "../utils/swal-helpers";

export const RiderOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [riders, setRiders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const currency = user?.business?.currency || "PEN";

  useEffect(() => {
    loadData();
    const watchId = navigator.geolocation.watchPosition(
      (p) => setUserLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => console.error(e),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [ordersRes, ridersRes] = await Promise.all([
        salesAPI.getAll({
          status: "pending",
          is_delivery: 1,
          rider_id: user.id, // Filter by current rider
          per_page: -1,
        }),
        usersAPI.getAll({ per_page: -1 }),
      ]);
      setOrders(ordersRes.data.data || []);
      setRiders((ridersRes.data.data || []).filter(u => u.status === 'active'));
    } catch (e) {
      console.error("Error loading rider data", e);
      notificationSwal("Error", "No se pudieron cargar los pedidos.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePay = (order) => {
    // This will be handled by the parent if needed, but OrderMonitor has its own dialog now?
    // Wait, OrderMonitor in my previous write_file didn't have the payment dialog, 
    // it expected onPay to be passed.
    // I should probably move the payment logic/dialog to OrderMonitor to make it truly self-contained,
    // OR implement it here too.
    // To keep it simple and consistent with Orders.js, I'll implement the payment dialog here or pass a handler.
  };

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column", bgcolor: "background.default" }}>
      <AppBar position="static" elevation={0} color="primary">
        <Toolbar variant="dense">
          <LocalShippingIcon sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Mis Pedidos
          </Typography>
          <Badge badgeContent={orders.length} color="error" sx={{ mr: 2 }}>
            <LocalShippingIcon color="inherit" />
          </Badge>
          <IconButton color="inherit" onClick={loadData} disabled={isLoading}>
            {isLoading ? <CircularProgress size={24} color="inherit" /> : <RefreshIcon />}
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, overflow: "hidden", p: 1 }}>
        {isLoading && orders.length === 0 ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
            <CircularProgress />
          </Box>
        ) : (
          <OrderMonitor
            orders={orders}
            riders={riders}
            userLocation={userLocation}
            onRefresh={loadData}
            onPay={(order) => {
                // For now, I'll use a simple confirmation or re-use the payment logic.
                // Re-using the payment logic requires the Dialog.
                // I'll update OrderMonitor to INCLUDE the payment dialog for better portability.
            }}
            isRiderView={true}
            currency={currency}
          />
        )}
      </Box>
    </Box>
  );
};
