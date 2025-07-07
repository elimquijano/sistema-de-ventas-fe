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
  Paper,
  Fab,
  Slide,
  AppBar,
  Toolbar,
  Container,
} from "@mui/material";
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
  ShoppingCart as ShoppingCartIcon,
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  PointOfSale as CashRegisterIcon,
  Assessment as AssessmentIcon,
  Inventory as InventoryIcon,
  Build as BuildIcon,
  Clear as ClearIcon,
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  CreditCard as CreditCardIcon,
  AccountBalance as BankIcon,
} from "@mui/icons-material";
import { formatCurrency } from "../utils/formatters";
import { notificationSwal, confirmSwal } from "../utils/swal-helpers";
import {
  cashRegisterAPI,
  productsAPI,
  salesAPI,
  servicesAPI,
} from "../utils/api";
import { useAuth } from "../contexts/AuthContext";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

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
  const { hasPermission } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [cart, setCart] = useState([]);
  const [cashRegisterOpen, setCashRegisterOpen] = useState(false);
  const [initialAmount, setInitialAmount] = useState(0);
  const [currentCash, setCurrentCash] = useState(0);
  const [currency, setCurrency] = useState("PEN");
  const [openQuantityDialog, setOpenQuantityDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [paymentType, setPaymentType] = useState("paid"); // "paid" o "credit"
  const [customerName, setCustomerName] = useState("");
  const [openReportsDialog, setOpenReportsDialog] = useState(false);
  const [reportType, setReportType] = useState("sales");
  const [openInitCashDialog, setOpenInitCashDialog] = useState(false);
  const [initCashAmount, setInitCashAmount] = useState("");
  const [dailySales, setDailySales] = useState([]);
  const [salesSummary, setSalesSummary] = useState({
    totalSales: 0,
    totalAmount: 0,
    cashSales: 0,
    creditSales: 0,
  });

  useEffect(() => {
    loadProducts();
    loadServices();
    checkCashRegisterStatus();
  }, []);

  const checkCashRegisterStatus = async () => {
    try {
      const response = await cashRegisterAPI.getCurrent();
      if (response.data.success) {
        const { initial_amount, currency } = response.data.data;
        setInitialAmount(initial_amount);
        setCurrentCash(initial_amount); // This should be calculated based on sales
        setCurrency(currency);
        setCashRegisterOpen(true);
      }
    } catch (error) {
      // It's okay if there's no open cash register
    }
  };

  const loadProducts = async () => {
    try {
      const response = await productsAPI.getAll();
      setProducts(response.data.data.map((p) => ({ ...p, type: "product" })));
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  const loadServices = async () => {
    try {
      const response = await servicesAPI.getAll();
      setServices(response.data.data.map((s) => ({ ...s, type: "service" })));
    } catch (error) {
      console.error("Error loading services:", error);
    }
  };

  const handleOpenCashRegister = () => {
    if (!hasPermission("pos.create")) {
      return;
    }
    setOpenInitCashDialog(true);
  };

  const handleInitializeCash = async () => {
    try {
      const amount = parseFloat(initCashAmount) || 0;
      await cashRegisterAPI.create({ initial_amount: amount, currency });

      setInitialAmount(amount);
      setCurrentCash(amount);
      setCashRegisterOpen(true);

      setOpenInitCashDialog(false);
      setInitCashAmount("");

      notificationSwal(
        "Caja Abierta",
        `Caja inicializada con ${formatCurrency(amount, currency)}`,
        "success"
      );
    } catch (error) {
      console.error("Error opening cash register:", error);
      notificationSwal(
        "Error",
        "Error al abrir la caja registradora.",
        "error"
      );
    }
  };

  const handleCloseCashRegister = async () => {
    if (!hasPermission("pos.edit")) {
      return;
    }
    const confirmed = await confirmSwal(
      "Cerrar Caja",
      `¿Desea cerrar la caja registradora?`,
      { confirmButtonText: "Cerrar Caja", icon: "warning" }
    );

    if (confirmed) {
      try {
        const currentRegister = await cashRegisterAPI.getCurrent();
        await cashRegisterAPI.close(currentRegister.data.data.id, {
          final_amount: currentCash,
        });
        setCashRegisterOpen(false);
        setCart([]);
        notificationSwal(
          "Caja Cerrada",
          "La caja registradora ha sido cerrada exitosamente.",
          "success"
        );
      } catch (error) {
        console.error("Error closing cash register:", error);
        notificationSwal(
          "Error",
          "Error al cerrar la caja registradora.",
          "error"
        );
      }
    }
  };

  const handleItemClick = (item) => {
    if (!cashRegisterOpen) {
      notificationSwal(
        "Caja Cerrada",
        "Debe abrir la caja registradora primero.",
        "warning"
      );
      return;
    }

    if (item.type === "product" && item.stock <= 0) {
      notificationSwal(
        "Sin Stock",
        "Este producto no tiene stock disponible.",
        "error"
      );
      return;
    }

    setSelectedItem(item);
    setQuantity(1);
    setOpenQuantityDialog(true);
  };

  const handleAddToCart = () => {
    const existingItem = cart.find(
      (item) => item.id === selectedItem.id && item.type === selectedItem.type
    );

    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === selectedItem.id && item.type === selectedItem.type
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      );
    } else {
      setCart([...cart, { ...selectedItem, quantity }]);
    }

    setOpenQuantityDialog(false);
    setSelectedItem(null);
  };

  const handleRemoveFromCart = (itemId, type) => {
    setCart(cart.filter((item) => !(item.id === itemId && item.type === type)));
  };

  const handleUpdateQuantity = (itemId, type, newQuantity) => {
    if (newQuantity <= 0) {
      handleRemoveFromCart(itemId, type);
      return;
    }

    setCart(
      cart.map((item) =>
        item.id === itemId && item.type === type
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const handleProcessSale = () => {
    if (!hasPermission("pos.create")) {
      return;
    }
    if (cart.length === 0) {
      notificationSwal(
        "Carrito Vacío",
        "Agregue productos o servicios al carrito.",
        "warning"
      );
      return;
    }
    setOpenPaymentDialog(true);
  };

  const handleCompleteSale = async () => {
    const total = getTotalAmount();

    if (paymentType === "credit" && !customerName.trim()) {
      notificationSwal(
        "Datos Incompletos",
        "Ingrese el nombre del cliente para ventas a crédito.",
        "error"
      );
      return;
    }

    const saleData = {
      items: cart.map((item) => ({
        id: item.id,
        type: item.type,
        quantity: item.quantity,
        price: item.price,
      })),
      total_amount: total,
      payment_method: paymentType === "paid" ? "cash" : "credit",
      customer_name:
        paymentType === "credit" ? customerName : "Cliente General",
    };

    try {
      await salesAPI.create(saleData);

      if (paymentType === "paid") {
        const newCashAmount = currentCash + total;
        setCurrentCash(newCashAmount);
      }

      notificationSwal(
        "Venta Completada",
        paymentType === "paid"
          ? `Venta procesada por ${formatCurrency(total, currency)}`
          : `Venta a crédito registrada para ${customerName}`,
        "success"
      );

      setCart([]);
      setOpenPaymentDialog(false);
      setCustomerName("");
      setPaymentType("paid");
    } catch (error) {
      console.error("Error completing sale:", error);
      notificationSwal("Error", "Error al completar la venta.", "error");
    }
  };

  const renderProductGrid = (items, type) => (
    <Grid container spacing={2} sx={{ p: 2 }}>
      {items.map((item) => (
        <Grid item xs={6} sm={4} md={3} key={`${type}-${item.id}`}>
          <Card
            sx={{
              cursor: "pointer",
              height: 200,
              transition: "all 0.3s ease",
              "&:hover": {
                transform: "scale(1.05)",
                boxShadow: 6,
              },
              "&:active": {
                transform: "scale(0.95)",
              },
              opacity: item.type === "product" && item.stock <= 0 ? 0.5 : 1,
              position: "relative",
              overflow: "hidden",
            }}
            onClick={() => handleItemClick(item)}
          >
            <CardContent
              sx={{
                p: 1,
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Stock Badge */}
              {item.type === "product" && (
                <Chip
                  label={`Stock: ${item.stock}`}
                  size="small"
                  color={item.stock <= 10 ? "error" : "success"}
                  sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    fontSize: "0.7rem",
                    height: 20,
                    zIndex: 1,
                  }}
                />
              )}

              {/* Image */}
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  mb: 1,
                }}
              >
                {item.type === "product" ? (
                  <Avatar
                    src={item.image_url}
                    sx={{ width: 80, height: 80 }}
                    variant="rounded"
                  >
                    <InventoryIcon sx={{ fontSize: 40 }} />
                  </Avatar>
                ) : (
                  <Avatar
                    sx={{ width: 80, height: 80, bgcolor: "secondary.main" }}
                    variant="rounded"
                  >
                    <BuildIcon sx={{ fontSize: 40 }} />
                  </Avatar>
                )}
              </Box>

              {/* Product Info */}
              <Box sx={{ textAlign: "center" }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    lineHeight: 1.2,
                    mb: 0.5,
                    minHeight: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {item.name}
                </Typography>
                <Typography
                  variant="h6"
                  color="primary"
                  sx={{
                    fontWeight: 900,
                    fontSize: "1.1rem",
                  }}
                >
                  {formatCurrency(item.price, currency)}
                </Typography>
              </Box>

              {/* Out of Stock Overlay */}
              {item.type === "product" && item.stock <= 0 && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    bgcolor: "rgba(0,0,0,0.7)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: "bold",
                  }}
                >
                  AGOTADO
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const expectedCash = initialAmount + salesSummary.cashSales;

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
      }}
    >
      {/* Header */}
      <AppBar position="static" sx={{ bgcolor: "primary.main" }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Punto de Venta
          </Typography>

          <Chip
            label={cashRegisterOpen ? "Caja Abierta" : "Caja Cerrada"}
            color={cashRegisterOpen ? "success" : "error"}
            icon={<CashRegisterIcon />}
            sx={{ mr: 2, color: "white", fontWeight: 600 }}
          />

          {cashRegisterOpen && (
            <Chip
              label={`${formatCurrency(currentCash, currency)}`}
              color="info"
              icon={<MoneyIcon />}
              sx={{ mr: 2, color: "white", fontWeight: 600 }}
            />
          )}

          {!cashRegisterOpen ? (
            <Button
              variant="contained"
              startIcon={<CashRegisterIcon />}
              onClick={handleOpenCashRegister}
              sx={{
                bgcolor: "success.main",
                "&:hover": { bgcolor: "success.dark" },
                fontWeight: 600,
              }}
            >
              Abrir Caja
            </Button>
          ) : (
            <>
              <Button
                variant="outlined"
                startIcon={<AssessmentIcon />}
                onClick={() => setOpenReportsDialog(true)}
                sx={{
                  mr: 1,
                  color: "white",
                  borderColor: "white",
                  "&:hover": {
                    borderColor: "white",
                    bgcolor: "rgba(255,255,255,0.1)",
                  },
                }}
              >
                Reportes
              </Button>
              <Button
                variant="contained"
                startIcon={<CashRegisterIcon />}
                onClick={handleCloseCashRegister}
                sx={{
                  bgcolor: "error.main",
                  "&:hover": { bgcolor: "error.dark" },
                }}
              >
                Cerrar Caja
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ flex: 1, display: "flex", py: 2 }}>
        <Grid container spacing={2} sx={{ height: "100%" }}>
          {/* Products/Services Panel */}
          <Grid item xs={12} md={8}>
            <Card
              sx={{ height: "100%", display: "flex", flexDirection: "column" }}
            >
              <Tabs
                value={tabValue}
                onChange={(e, newValue) => setTabValue(newValue)}
                sx={{
                  borderBottom: 1,
                  borderColor: "divider",
                  "& .MuiTab-root": {
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    minHeight: 60,
                  },
                }}
              >
                <Tab label={`Productos (${products.length})`} />
                <Tab label={`Servicios (${services.length})`} />
              </Tabs>

              <Box sx={{ flex: 1, overflow: "auto" }}>
                <TabPanel value={tabValue} index={0}>
                  {renderProductGrid(products, "product")}
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                  {renderProductGrid(services, "service")}
                </TabPanel>
              </Box>
            </Card>
          </Grid>

          {/* Shopping Cart */}
          <Grid item xs={12} md={4}>
            <Card
              sx={{ height: "100%", display: "flex", flexDirection: "column" }}
            >
              <CardContent sx={{ pb: 1 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Carrito de Compras
                  </Typography>
                  <Badge
                    badgeContent={getTotalItems()}
                    color="primary"
                    max={99}
                  >
                    <ShoppingCartIcon sx={{ fontSize: 28 }} />
                  </Badge>
                </Box>
              </CardContent>

              <Divider />

              <Box sx={{ flex: 1, overflow: "auto", px: 2 }}>
                {cart.length === 0 ? (
                  <Box sx={{ textAlign: "center", py: 6 }}>
                    <ShoppingCartIcon
                      sx={{ fontSize: 64, color: "text.secondary", mb: 2 }}
                    />
                    <Typography variant="h6" color="text.secondary">
                      Carrito vacío
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Selecciona productos para agregar
                    </Typography>
                  </Box>
                ) : (
                  <List sx={{ py: 1 }}>
                    {cart.map((item, index) => (
                      <ListItem
                        key={`${item.type}-${item.id}-${index}`}
                        sx={{ px: 0, py: 1 }}
                      >
                        <Box sx={{ width: "100%" }}>
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
                              sx={{ fontWeight: 600, flex: 1 }}
                            >
                              {item.name}
                            </Typography>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() =>
                                handleRemoveFromCart(item.id, item.type)
                              }
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>

                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <IconButton
                                size="small"
                                onClick={() =>
                                  handleUpdateQuantity(
                                    item.id,
                                    item.type,
                                    item.quantity - 1
                                  )
                                }
                                disabled={item.quantity <= 1}
                              >
                                <RemoveIcon />
                              </IconButton>
                              <Typography
                                variant="body2"
                                sx={{
                                  minWidth: 30,
                                  textAlign: "center",
                                  fontWeight: 600,
                                }}
                              >
                                {item.quantity}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={() =>
                                  handleUpdateQuantity(
                                    item.id,
                                    item.type,
                                    item.quantity + 1
                                  )
                                }
                              >
                                <AddIcon />
                              </IconButton>
                            </Box>

                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 700 }}
                            >
                              {formatCurrency(
                                item.price * item.quantity,
                                currency
                              )}
                            </Typography>
                          </Box>
                        </Box>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>

              <Divider />

              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 3,
                  }}
                >
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    Total:
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 900, color: "primary.main" }}
                  >
                    {formatCurrency(getTotalAmount(), currency)}
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<ClearIcon />}
                    onClick={() => setCart([])}
                    disabled={cart.length === 0}
                    sx={{ height: 56 }}
                  >
                    Limpiar
                  </Button>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<PaymentIcon />}
                    onClick={handleProcessSale}
                    disabled={cart.length === 0 || !cashRegisterOpen}
                    sx={{
                      height: 56,
                      fontSize: "1.1rem",
                      fontWeight: 700,
                      background:
                        "linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)",
                    }}
                  >
                    Cobrar
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Initialize Cash Dialog */}
      <Dialog
        open={openInitCashDialog}
        onClose={() => setOpenInitCashDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ textAlign: "center", pb: 1 }}>
          <CashRegisterIcon
            sx={{ fontSize: 48, color: "primary.main", mb: 1 }}
          />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Inicializar Caja
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Moneda</InputLabel>
                <Select
                  value={currency}
                  label="Moneda"
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <MenuItem value="PEN">PEN - Soles Peruanos</MenuItem>
                  <MenuItem value="USD">USD - Dólares</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Monto inicial en caja"
                type="number"
                step="0.01"
                value={initCashAmount}
                onChange={(e) => setInitCashAmount(e.target.value)}
                placeholder="0.00"
                InputProps={{
                  startAdornment: (
                    <MoneyIcon sx={{ mr: 1, color: "text.secondary" }} />
                  ),
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenInitCashDialog(false)} size="large">
            Cancelar
          </Button>
          <Button
            onClick={handleInitializeCash}
            variant="contained"
            size="large"
            sx={{
              background: "linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)",
              px: 4,
            }}
          >
            Abrir Caja
          </Button>
        </DialogActions>
      </Dialog>

      {/* Quantity Dialog */}
      <Dialog
        open={openQuantityDialog}
        onClose={() => setOpenQuantityDialog(false)}
        TransitionComponent={Transition}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ textAlign: "center" }}>
          Agregar al Carrito
        </DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box sx={{ textAlign: "center", py: 2 }}>
              <Avatar
                src={selectedItem.image_url}
                sx={{ width: 100, height: 100, mx: "auto", mb: 2 }}
                variant="rounded"
              >
                {selectedItem.type === "product" ? (
                  <InventoryIcon sx={{ fontSize: 50 }} />
                ) : (
                  <BuildIcon sx={{ fontSize: 50 }} />
                )}
              </Avatar>

              <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                {selectedItem.name}
              </Typography>
              <Typography
                variant="h4"
                color="primary"
                sx={{ mb: 3, fontWeight: 700 }}
              >
                {formatCurrency(selectedItem.price, currency)}
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                  mb: 3,
                }}
              >
                <IconButton
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  size="large"
                  sx={{ bgcolor: "grey.100" }}
                >
                  <RemoveIcon />
                </IconButton>
                <TextField
                  type="number"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  sx={{ width: 100 }}
                  inputProps={{
                    min: 1,
                    style: {
                      textAlign: "center",
                      fontSize: "1.5rem",
                      fontWeight: "bold",
                    },
                  }}
                />
                <IconButton
                  onClick={() => setQuantity(quantity + 1)}
                  size="large"
                  sx={{ bgcolor: "grey.100" }}
                >
                  <AddIcon />
                </IconButton>
              </Box>

              <Paper sx={{ p: 2, bgcolor: "primary.light", color: "white" }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  Subtotal:{" "}
                  {formatCurrency(selectedItem.price * quantity, currency)}
                </Typography>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenQuantityDialog(false)} size="large">
            Cancelar
          </Button>
          <Button
            onClick={handleAddToCart}
            variant="contained"
            size="large"
            sx={{ px: 4 }}
          >
            Agregar al Carrito
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog
        open={openPaymentDialog}
        onClose={() => setOpenPaymentDialog(false)}
        maxWidth="sm"
        fullWidth
        TransitionComponent={Transition}
      >
        <DialogTitle sx={{ textAlign: "center" }}>
          <PaymentIcon sx={{ fontSize: 48, color: "primary.main", mb: 1 }} />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Procesar Venta
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Paper
              sx={{
                p: 3,
                mb: 3,
                bgcolor: "primary.light",
                color: "white",
                textAlign: "center",
              }}
            >
              <Typography variant="h4" sx={{ fontWeight: 900 }}>
                {formatCurrency(getTotalAmount(), currency)}
              </Typography>
              <Typography variant="body1">Total a Procesar</Typography>
            </Paper>

            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Tipo de Pago:
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6}>
                <Button
                  fullWidth
                  variant={paymentType === "paid" ? "contained" : "outlined"}
                  onClick={() => setPaymentType("paid")}
                  sx={{
                    height: 80,
                    flexDirection: "column",
                    gap: 1,
                    fontSize: "1rem",
                    fontWeight: 600,
                  }}
                  startIcon={<CheckCircleIcon />}
                >
                  Pago Inmediato
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button
                  fullWidth
                  variant={paymentType === "credit" ? "contained" : "outlined"}
                  onClick={() => setPaymentType("credit")}
                  sx={{
                    height: 80,
                    flexDirection: "column",
                    gap: 1,
                    fontSize: "1rem",
                    fontWeight: 600,
                  }}
                  startIcon={<ScheduleIcon />}
                  color="warning"
                >
                  Por Cobrar
                </Button>
              </Grid>
            </Grid>

            {paymentType === "credit" && (
              <TextField
                fullWidth
                label="Nombre del Cliente"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ingrese el nombre del cliente"
                required
                sx={{ mb: 2 }}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenPaymentDialog(false)} size="large">
            Cancelar
          </Button>
          <Button
            onClick={handleCompleteSale}
            variant="contained"
            size="large"
            sx={{
              background: "linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)",
              px: 4,
              fontSize: "1.1rem",
              fontWeight: 700,
            }}
          >
            {paymentType === "paid" ? "Completar Venta" : "Registrar Crédito"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reports Dialog */}
      <Dialog
        open={openReportsDialog}
        onClose={() => setOpenReportsDialog(false)}
        maxWidth="md"
        fullWidth
        TransitionComponent={Transition}
      >
        <DialogTitle>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Reportes del Día
            </Typography>
            <IconButton onClick={() => setOpenReportsDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={6} md={3}>
              <Paper
                sx={{
                  p: 2,
                  textAlign: "center",
                  bgcolor: "primary.light",
                  color: "white",
                }}
              >
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {salesSummary.totalSales}
                </Typography>
                <Typography variant="body2">Ventas Totales</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper
                sx={{
                  p: 2,
                  textAlign: "center",
                  bgcolor: "success.light",
                  color: "white",
                }}
              >
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {formatCurrency(initialAmount, currency)}
                </Typography>
                <Typography variant="body2">Dinero Inicial</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper
                sx={{
                  p: 2,
                  textAlign: "center",
                  bgcolor: "info.light",
                  color: "white",
                }}
              >
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {formatCurrency(currentCash, currency)}
                </Typography>
                <Typography variant="body2">Dinero Actual</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper
                sx={{
                  p: 2,
                  textAlign: "center",
                  bgcolor: "warning.light",
                  color: "white",
                }}
              >
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {formatCurrency(expectedCash, currency)}
                </Typography>
                <Typography variant="body2">Dinero Esperado</Typography>
              </Paper>
            </Grid>
          </Grid>

          <Tabs
            value={reportType}
            onChange={(e, newValue) => setReportType(newValue)}
            sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}
          >
            <Tab label="Ventas del Día" value="sales" />
            <Tab label="Resumen de Productos" value="products" />
          </Tabs>

          {reportType === "sales" && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Ventas Realizadas ({dailySales.length})
              </Typography>
              {dailySales.length > 0 ? (
                <List>
                  {dailySales.map((sale) => (
                    <ListItem
                      key={sale.id}
                      sx={{
                        border: 1,
                        borderColor: "divider",
                        borderRadius: 1,
                        mb: 1,
                      }}
                    >
                      <ListItemText
                        primary={`${sale.saleNumber} - ${sale.customerName}`}
                        secondary={`${sale.items.length} productos - ${
                          sale.paymentType === "paid" ? "Pagado" : "Por cobrar"
                        }`}
                      />
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {formatCurrency(sale.total, currency)}
                      </Typography>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ textAlign: "center", py: 4 }}
                >
                  No hay ventas registradas hoy
                </Typography>
              )}
            </Box>
          )}

          {reportType === "products" && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Productos Más Vendidos
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: "center", py: 4 }}
              >
                Funcionalidad disponible próximamente
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};
