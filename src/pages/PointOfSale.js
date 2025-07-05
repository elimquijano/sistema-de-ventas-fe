import React, { useState, useEffect } from "react";
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
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Badge,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tab,
  Tabs,
  useTheme,
} from "@mui/material";
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
  ShoppingCart as ShoppingCartIcon,
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  CashRegister as CashRegisterIcon,
  Assessment as AssessmentIcon,
  Inventory as InventoryIcon,
  Build as BuildIcon,
  Clear as ClearIcon,
} from "@mui/icons-material";
import { formatCurrency } from "../utils/formatters";
import { notificationSwal, confirmSwal } from "../utils/swal-helpers";

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`pos-tabpanel-${index}`}
      aria-labelledby={`pos-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

export const PointOfSale = () => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [cart, setCart] = useState([]);
  const [cashRegisterOpen, setCashRegisterOpen] = useState(false);
  const [openQuantityDialog, setOpenQuantityDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountReceived, setAmountReceived] = useState("");
  const [openReportsDialog, setOpenReportsDialog] = useState(false);
  const [reportType, setReportType] = useState("sales");

  useEffect(() => {
    loadProducts();
    loadServices();
    // Verificar estado de caja registradora
    const isOpen = localStorage.getItem("cashRegisterOpen") === "true";
    setCashRegisterOpen(isOpen);
  }, []);

  const loadProducts = () => {
    const mockProducts = [
      {
        id: 1,
        name: "Coca Cola",
        price: 2.50,
        stock: 45,
        image_url: "https://images.pexels.com/photos/50593/coca-cola-cold-drink-soft-drink-coke-50593.jpeg?auto=compress&cs=tinysrgb&w=200",
        type: "product"
      },
      {
        id: 2,
        name: "Pan Integral",
        price: 3.00,
        stock: 8,
        image_url: "https://images.pexels.com/photos/209206/pexels-photo-209206.jpeg?auto=compress&cs=tinysrgb&w=200",
        type: "product"
      },
      {
        id: 3,
        name: "Detergente",
        price: 8.50,
        stock: 25,
        image_url: "https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg?auto=compress&cs=tinysrgb&w=200",
        type: "product"
      },
      {
        id: 4,
        name: "Leche",
        price: 4.20,
        stock: 15,
        image_url: "https://images.pexels.com/photos/236010/pexels-photo-236010.jpeg?auto=compress&cs=tinysrgb&w=200",
        type: "product"
      },
      {
        id: 5,
        name: "Galletas",
        price: 1.80,
        stock: 30,
        image_url: "https://images.pexels.com/photos/230325/pexels-photo-230325.jpeg?auto=compress&cs=tinysrgb&w=200",
        type: "product"
      },
      {
        id: 6,
        name: "Agua",
        price: 1.00,
        stock: 50,
        image_url: "https://images.pexels.com/photos/327090/pexels-photo-327090.jpeg?auto=compress&cs=tinysrgb&w=200",
        type: "product"
      },
    ];
    setProducts(mockProducts);
  };

  const loadServices = () => {
    const mockServices = [
      {
        id: 1,
        name: "Corte de Cabello",
        price: 15.00,
        duration: 30,
        type: "service"
      },
      {
        id: 2,
        name: "Manicure",
        price: 25.00,
        duration: 45,
        type: "service"
      },
      {
        id: 3,
        name: "Reparación Celular",
        price: 50.00,
        duration: 120,
        type: "service"
      },
    ];
    setServices(mockServices);
  };

  const handleOpenCashRegister = async () => {
    const confirmed = await confirmSwal(
      "Abrir Caja",
      "¿Desea abrir la caja registradora?",
      { confirmButtonText: "Abrir Caja" }
    );
    
    if (confirmed) {
      setCashRegisterOpen(true);
      localStorage.setItem("cashRegisterOpen", "true");
      notificationSwal("Caja Abierta", "La caja registradora ha sido abierta.", "success");
    }
  };

  const handleCloseCashRegister = async () => {
    const confirmed = await confirmSwal(
      "Cerrar Caja",
      "¿Desea cerrar la caja registradora? Se generará un reporte de ventas.",
      { confirmButtonText: "Cerrar Caja", icon: "warning" }
    );
    
    if (confirmed) {
      setCashRegisterOpen(false);
      localStorage.setItem("cashRegisterOpen", "false");
      setCart([]);
      notificationSwal("Caja Cerrada", "La caja registradora ha sido cerrada.", "success");
    }
  };

  const handleItemClick = (item) => {
    if (!cashRegisterOpen) {
      notificationSwal("Caja Cerrada", "Debe abrir la caja registradora primero.", "warning");
      return;
    }

    if (item.type === "product" && item.stock <= 0) {
      notificationSwal("Sin Stock", "Este producto no tiene stock disponible.", "error");
      return;
    }

    setSelectedItem(item);
    setQuantity(1);
    setOpenQuantityDialog(true);
  };

  const handleAddToCart = () => {
    const existingItem = cart.find(item => item.id === selectedItem.id && item.type === selectedItem.type);
    
    if (existingItem) {
      setCart(cart.map(item => 
        item.id === selectedItem.id && item.type === selectedItem.type
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ));
    } else {
      setCart([...cart, { ...selectedItem, quantity }]);
    }
    
    setOpenQuantityDialog(false);
    setSelectedItem(null);
  };

  const handleRemoveFromCart = (itemId, type) => {
    setCart(cart.filter(item => !(item.id === itemId && item.type === type)));
  };

  const handleUpdateQuantity = (itemId, type, newQuantity) => {
    if (newQuantity <= 0) {
      handleRemoveFromCart(itemId, type);
      return;
    }
    
    setCart(cart.map(item => 
      item.id === itemId && item.type === type
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const handleProcessSale = () => {
    if (cart.length === 0) {
      notificationSwal("Carrito Vacío", "Agregue productos o servicios al carrito.", "warning");
      return;
    }
    setOpenPaymentDialog(true);
  };

  const handleCompleteSale = () => {
    const total = getTotalAmount();
    const received = parseFloat(amountReceived) || 0;
    
    if (paymentMethod === "cash" && received < total) {
      notificationSwal("Monto Insuficiente", "El monto recibido es menor al total.", "error");
      return;
    }

    // Simular venta completada
    notificationSwal("Venta Completada", "La venta ha sido procesada exitosamente.", "success");
    setCart([]);
    setOpenPaymentDialog(false);
    setAmountReceived("");
    setPaymentMethod("cash");
  };

  const getChange = () => {
    const total = getTotalAmount();
    const received = parseFloat(amountReceived) || 0;
    return Math.max(0, received - total);
  };

  const renderProductGrid = (items, type) => (
    <Grid container spacing={2}>
      {items.map((item) => (
        <Grid item xs={6} sm={4} md={3} lg={2} key={`${type}-${item.id}`}>
          <Card
            sx={{
              cursor: "pointer",
              height: "100%",
              transition: "transform 0.2s",
              "&:hover": {
                transform: "scale(1.02)",
                boxShadow: 3,
              },
              opacity: item.type === "product" && item.stock <= 0 ? 0.5 : 1,
            }}
            onClick={() => handleItemClick(item)}
          >
            <CardContent sx={{ p: 1, textAlign: "center" }}>
              {item.type === "product" && (
                <Badge
                  badgeContent={item.stock}
                  color={item.stock <= 10 ? "error" : "primary"}
                  sx={{ width: "100%", mb: 1 }}
                >
                  <Avatar
                    src={item.image_url}
                    sx={{ width: 60, height: 60, mx: "auto" }}
                  >
                    <InventoryIcon />
                  </Avatar>
                </Badge>
              )}
              {item.type === "service" && (
                <Avatar
                  sx={{ width: 60, height: 60, mx: "auto", mb: 1, bgcolor: "secondary.main" }}
                >
                  <BuildIcon />
                </Avatar>
              )}
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.75rem" }}>
                {item.name}
              </Typography>
              <Typography variant="h6" color="primary" sx={{ fontWeight: 700 }}>
                {formatCurrency(item.price)}
              </Typography>
              {item.type === "product" && item.stock <= 0 && (
                <Chip label="Sin Stock" size="small" color="error" />
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  return (
    <Box>
      {/* Header con controles de caja */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          p: 2,
          bgcolor: "background.paper",
          borderRadius: 2,
          boxShadow: 1,
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Punto de Venta
        </Typography>
        
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <Chip
            label={cashRegisterOpen ? "Caja Abierta" : "Caja Cerrada"}
            color={cashRegisterOpen ? "success" : "error"}
            icon={<CashRegisterIcon />}
          />
          
          {!cashRegisterOpen ? (
            <Button
              variant="contained"
              startIcon={<CashRegisterIcon />}
              onClick={handleOpenCashRegister}
              sx={{ background: "linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)" }}
            >
              Abrir Caja
            </Button>
          ) : (
            <>
              <Button
                variant="outlined"
                startIcon={<AssessmentIcon />}
                onClick={() => setOpenReportsDialog(true)}
              >
                Reportes
              </Button>
              <Button
                variant="contained"
                startIcon={<CashRegisterIcon />}
                onClick={handleCloseCashRegister}
                color="error"
              >
                Cerrar Caja
              </Button>
            </>
          )}
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Panel de productos/servicios */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Tabs
                value={tabValue}
                onChange={(e, newValue) => setTabValue(newValue)}
                sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}
              >
                <Tab label="Productos" />
                <Tab label="Servicios" />
              </Tabs>
              
              <TabPanel value={tabValue} index={0}>
                {renderProductGrid(products, "product")}
              </TabPanel>
              
              <TabPanel value={tabValue} index={1}>
                {renderProductGrid(services, "service")}
              </TabPanel>
            </CardContent>
          </Card>
        </Grid>

        {/* Carrito de compras */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: "fit-content", position: "sticky", top: 20 }}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Carrito
                </Typography>
                <Badge badgeContent={getTotalItems()} color="primary">
                  <ShoppingCartIcon />
                </Badge>
              </Box>

              <Divider sx={{ mb: 2 }} />

              {cart.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
                  El carrito está vacío
                </Typography>
              ) : (
                <List sx={{ maxHeight: 300, overflow: "auto" }}>
                  {cart.map((item, index) => (
                    <ListItem key={`${item.type}-${item.id}-${index}`} sx={{ px: 0 }}>
                      <ListItemText
                        primary={item.name}
                        secondary={
                          <Box>
                            <Typography variant="body2">
                              {formatCurrency(item.price)} x {item.quantity}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              Total: {formatCurrency(item.price * item.quantity)}
                            </Typography>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleUpdateQuantity(item.id, item.type, item.quantity - 1)}
                          >
                            <RemoveIcon />
                          </IconButton>
                          <Typography variant="body2" sx={{ minWidth: 20, textAlign: "center" }}>
                            {item.quantity}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => handleUpdateQuantity(item.id, item.type, item.quantity + 1)}
                          >
                            <AddIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemoveFromCart(item.id, item.type)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Total:
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: "primary.main" }}>
                  {formatCurrency(getTotalAmount())}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<ClearIcon />}
                  onClick={() => setCart([])}
                  disabled={cart.length === 0}
                >
                  Limpiar
                </Button>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<PaymentIcon />}
                  onClick={handleProcessSale}
                  disabled={cart.length === 0 || !cashRegisterOpen}
                  sx={{ background: "linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)" }}
                >
                  Cobrar
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog para cantidad */}
      <Dialog open={openQuantityDialog} onClose={() => setOpenQuantityDialog(false)}>
        <DialogTitle>Agregar al Carrito</DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box sx={{ textAlign: "center", py: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {selectedItem.name}
              </Typography>
              <Typography variant="h5" color="primary" sx={{ mb: 3 }}>
                {formatCurrency(selectedItem.price)}
              </Typography>
              
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2, mb: 2 }}>
                <IconButton
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <RemoveIcon />
                </IconButton>
                <TextField
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  sx={{ width: 80 }}
                  inputProps={{ min: 1, style: { textAlign: "center" } }}
                />
                <IconButton onClick={() => setQuantity(quantity + 1)}>
                  <AddIcon />
                </IconButton>
              </Box>
              
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Subtotal: {formatCurrency(selectedItem.price * quantity)}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenQuantityDialog(false)}>Cancelar</Button>
          <Button onClick={handleAddToCart} variant="contained">
            Agregar al Carrito
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de pago */}
      <Dialog open={openPaymentDialog} onClose={() => setOpenPaymentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Procesar Pago</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Typography variant="h5" sx={{ textAlign: "center", mb: 3, fontWeight: 600 }}>
              Total a Pagar: {formatCurrency(getTotalAmount())}
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Método de Pago</InputLabel>
              <Select
                value={paymentMethod}
                label="Método de Pago"
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <MenuItem value="cash">Efectivo</MenuItem>
                <MenuItem value="card">Tarjeta</MenuItem>
                <MenuItem value="transfer">Transferencia</MenuItem>
                <MenuItem value="credit">Crédito</MenuItem>
              </Select>
            </FormControl>

            {paymentMethod === "cash" && (
              <TextField
                fullWidth
                label="Monto Recibido"
                type="number"
                step="0.01"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                sx={{ mb: 2 }}
              />
            )}

            {paymentMethod === "cash" && amountReceived && (
              <Box sx={{ textAlign: "center", p: 2, bgcolor: "background.default", borderRadius: 1 }}>
                <Typography variant="h6">
                  Cambio: {formatCurrency(getChange())}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPaymentDialog(false)}>Cancelar</Button>
          <Button onClick={handleCompleteSale} variant="contained">
            Completar Venta
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de reportes */}
      <Dialog open={openReportsDialog} onClose={() => setOpenReportsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Reportes de Ventas</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Tabs
              value={reportType}
              onChange={(e, newValue) => setReportType(newValue)}
              sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}
            >
              <Tab label="Ventas del Día" value="sales" />
              <Tab label="Productos Vendidos" value="products" />
            </Tabs>

            {reportType === "sales" && (
              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>Resumen de Ventas</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Card sx={{ p: 2, textAlign: "center" }}>
                      <Typography variant="h4" color="primary">15</Typography>
                      <Typography variant="body2">Ventas Totales</Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={6}>
                    <Card sx={{ p: 2, textAlign: "center" }}>
                      <Typography variant="h4" color="success.main">{formatCurrency(450.75)}</Typography>
                      <Typography variant="body2">Ingresos Totales</Typography>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}

            {reportType === "products" && (
              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>Productos Más Vendidos</Typography>
                <List>
                  <ListItem>
                    <ListItemText primary="Coca Cola" secondary="12 unidades vendidas" />
                    <Typography variant="body2">{formatCurrency(30.00)}</Typography>
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Pan Integral" secondary="8 unidades vendidas" />
                    <Typography variant="body2">{formatCurrency(24.00)}</Typography>
                  </ListItem>
                </List>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReportsDialog(false)}>Cerrar</Button>
          <Button variant="contained" startIcon={<ReceiptIcon />}>
            Exportar a Excel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};