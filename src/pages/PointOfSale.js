import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Drawer,
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
} from "@mui/material";
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
  ShoppingCart as ShoppingCartIcon,
  Payment as PaymentIcon,
  PointOfSale as CashRegisterIcon,
  Assessment as AssessmentIcon,
  Inventory as InventoryIcon,
  Build as BuildIcon,
  Clear as ClearIcon,
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon,
  Close as CloseIcon,
  Print as PrintIcon,
  AddCard as AddCardIcon,
  DeleteForever as DeleteForeverIcon,
  CreditCard as CreditCardIcon,
  PriceCheck as PriceCheckIcon,
} from "@mui/icons-material";
import { formatCurrency } from "../utils/formatters";
import { notificationSwal, confirmSwal } from "../utils/swal-helpers";
import { compressImage } from "../utils/imageCompression";
import {
  API_STORAGE_URL,
  cashRegisterAPI,
  productsAPI,
  salesAPI,
  servicesAPI,
} from "../utils/api";
import { useAuth } from "../contexts/AuthContext";
import { PaymentMethodSelector } from "../components/PaymentMethodSelector";
import { CashRegisterReport } from "../components/CashRegisterReport";

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

const PAYMENT_METHODS = [
  { value: "cash", label: "Efectivo", icon: <MoneyIcon /> },
  { value: "yape", label: "Yape", icon: <PriceCheckIcon /> },
  { value: "plin", label: "Plin", icon: <PriceCheckIcon /> },
  { value: "card", label: "Tarjeta", icon: <CreditCardIcon /> },
  { value: "transfer", label: "Transferencia", icon: <CreditCardIcon /> },
  { value: "credit", label: "Crédito", icon: <ScheduleIcon /> },
  { value: "discount", label: "Descuento", icon: <PriceCheckIcon /> },
  { value: "vale", label: "Vale", icon: <AddCardIcon /> },
];

export const PointOfSale = () => {
  const theme = useTheme();
  const { hasPermission } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [cart, setCart] = useState([]);
  const [cashRegister, setCashRegister] = useState(null);
  const [currency, setCurrency] = useState("PEN");
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [openReportsDialog, setOpenReportsDialog] = useState(false);
  const [openInitCashDialog, setOpenInitCashDialog] = useState(false);
  const [initCashAmount, setInitCashAmount] = useState("");
  const [reportData, setReportData] = useState(null);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditingTotal, setIsEditingTotal] = useState(false);
  const [editingTotal, setEditingTotal] = useState("");
  const lastTotalTap = useRef(0);
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [reportType, setReportType] = useState("sales");

  const [payments, setPayments] = useState([]);
  const [cashReceived, setCashReceived] = useState("");

  const totalAmount = useMemo(
    () => cart.reduce((total, item) => total + item.price * item.quantity, 0),
    [cart]
  );

  const totalPaid = useMemo(
    () => payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
    [payments]
  );

  const remainingAmount = useMemo(
    () => totalAmount - totalPaid,
    [totalAmount, totalPaid]
  );

  const cashChange = useMemo(() => {
    if (!cashReceived) return 0;
    const cashTotal = payments
      .filter((p) => p.payment_method === "cash")
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    const change = parseFloat(cashReceived) - cashTotal;
    return change >= 0 ? change : 0;
  }, [payments, cashReceived]);

  useEffect(() => {
    loadProducts();
    loadServices();
    checkCashRegisterStatus();
  }, []);

  const resetPaymentState = () => {
    setPayments([]);
    setCustomerName("");
    setCashReceived("");
  };

  const checkCashRegisterStatus = async () => {
    try {
      const response = await cashRegisterAPI.getCurrent();
      setCashRegister(response.data.success ? response.data.data : null);
      if (response.data.success) setCurrency(response.data.data.currency);
    } catch (error) {
      setCashRegister(null);
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
    if (!hasPermission("pos.create")) return;
    setOpenInitCashDialog(true);
  };

  const handleInitializeCash = async () => {
    try {
      const amount = parseFloat(initCashAmount) || 0;
      await cashRegisterAPI.create({ initial_amount: amount, currency });
      checkCashRegisterStatus();
      setOpenInitCashDialog(false);
      setInitCashAmount("");
      notificationSwal(
        "Caja Abierta",
        `Caja inicializada con ${formatCurrency(amount, currency)}`,
        "success"
      );
    } catch (error) {
      notificationSwal(
        "Error",
        "Error al abrir la caja registradora.",
        "error"
      );
    }
  };

  const handleOpenReports = async () => {
    if (!cashRegister) return;
    try {
      const response = await cashRegisterAPI.getReport(cashRegister.id);
      const report = response.data;
      const sales = report.sales || [];
      const totalSales = sales.length;
      const cashSalesAmount = sales
        .filter((s) => s.payment_method === "cash")
        .reduce((sum, s) => sum + parseFloat(s.total_amount), 0);
      const expectedCash = parseFloat(report.expected_amount);
      const productSummary = sales
        .flatMap((s) => s.items)
        .filter((i) => i.item_type.includes("Product"))
        .reduce((summary, item) => {
          if (summary[item.item_name]) {
            summary[item.item_name].quantity += item.quantity;
          } else {
            summary[item.item_name] = { ...item };
          }
          return summary;
        }, {});
      setReportData({
        ...report,
        sales,
        totalSales,
        cashSalesAmount,
        expectedCash: report.expected_amount,
        total_in_cash: report.report_current_cash,
        reportDifference: report.report_difference,
        manual_inflow: report.manual_inflow || 0,
        productSummary: Object.values(productSummary),
      });
      setOpenReportsDialog(true);
    } catch (error) {
      console.error("Error loading report:", error);
      notificationSwal("Error", "No se pudo cargar el reporte.", "error");
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
        await cashRegisterAPI.close(cashRegister.id, {
          final_amount: cashRegister.total_in_cash,
        });
        setCashRegister(null);
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

  const handlePrintReceipt = async (saleId) => {
    setIsPrinting(true);
    try {
      const response = await salesAPI.getSaleReceipt(saleId);
      const file = new Blob([response.data], { type: "application/pdf" });
      const fileURL = URL.createObjectURL(file);
      window.open(fileURL, "_blank");
    } catch (error) {
      console.error("Error printing receipt:", error);
      notificationSwal("Error", "No se pudo generar el recibo.", "error");
    } finally {
      setIsPrinting(false);
    }
  };

  const handleItemClick = (itemToAdd) => {
    if (!cashRegister) {
      notificationSwal(
        "Caja Cerrada",
        "Debe abrir la caja registradora primero.",
        "warning"
      );
      return;
    }
    if (itemToAdd.type === "product" && itemToAdd.stock <= 0) {
      notificationSwal(
        "Sin Stock",
        "Este producto no tiene stock disponible.",
        "error"
      );
      return;
    }
    setCart((prevCart) => {
      const existingItem = prevCart.find(
        (item) => item.id === itemToAdd.id && item.type === itemToAdd.type
      );
      if (existingItem) {
        const newStock = existingItem.stock - 1;
        if (itemToAdd.type === "product" && newStock < 0) {
          notificationSwal(
            "Stock insuficiente",
            `No hay suficiente stock para ${itemToAdd.name}.`,
            "warning"
          );
          return prevCart;
        }
        return prevCart.map((item) =>
          item.id === itemToAdd.id && item.type === itemToAdd.type
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { ...itemToAdd, quantity: 1 }];
    });
  };

  const handleRemoveFromCart = (itemId, type) => {
    setCart((prev) =>
      prev.filter((item) => !(item.id === itemId && item.type === type))
    );
  };

  const handleTotalTap = () => {
    const now = Date.now();
    if (now - lastTotalTap.current < 500) {
      setEditingTotal(totalAmount.toFixed(2));
      setIsEditingTotal(true);
      lastTotalTap.current = 0;
      return;
    }
    lastTotalTap.current = now;
  };

  const handleSaveTotal = () => {
    const finalTotal = Number(editingTotal);
    if (!Number.isFinite(finalTotal) || finalTotal < 0) {
      notificationSwal(
        "Precio inválido",
        "Ingrese un precio final válido.",
        "warning"
      );
      return;
    }

    setCart((prev) => {
      const currentTotal = prev.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      if (currentTotal > 0) {
        const factor = finalTotal / currentTotal;
        return prev.map((item) => ({ ...item, price: item.price * factor }));
      }
      return prev.map((item, index) => ({
        ...item,
        price: index === 0 ? finalTotal / item.quantity : 0,
      }));
    });
    setIsEditingTotal(false);
    setEditingTotal("");
  };

  const handleUpdateQuantity = (itemId, type, newQuantity) => {
    const itemDefinition = [...products, ...services].find(
      (i) => i.id === itemId && i.type === type
    );
    if (
      itemDefinition.type === "product" &&
      newQuantity > itemDefinition.stock
    ) {
      notificationSwal(
        "Stock insuficiente",
        `Solo quedan ${itemDefinition.stock} unidades de ${itemDefinition.name}.`,
        "warning"
      );
      return;
    }

    if (newQuantity <= 0) {
      handleRemoveFromCart(itemId, type);
    } else {
      setCart((prev) =>
        prev.map((item) =>
          item.id === itemId && item.type === type
            ? { ...item, quantity: newQuantity }
            : item
        )
      );
    }
  };

  const getTotalItems = () =>
    cart.reduce((total, item) => total + item.quantity, 0);

  const handleProcessSale = () => {
    if (!hasPermission("pos.create") || cart.length === 0) return;
    resetPaymentState();
    setOpenPaymentDialog(true);
  };

  const handleAddPayment = (method) => {
    const newPayment = {
      id: Date.now(),
      payment_method: method,
      amount: remainingAmount > 0 ? remainingAmount.toFixed(2) : "0.00",
      reference: "",
    };
    setPayments([...payments, newPayment]);
  };

  const handleRemovePayment = (id) => {
    setPayments(payments.filter((p) => p.id !== id));
  };

  const handlePaymentChange = (id, field, value) => {
    setPayments(
      payments.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const handleCompleteSale = async () => {
    if (Math.abs(remainingAmount) > 0.001) {
      notificationSwal(
        "Monto Incorrecto",
        `El monto pagado no coincide con el total de la venta.`,
        "error"
      );
      return;
    }
    if (
      payments.some((p) => p.payment_method === "credit") &&
      !customerName.trim()
    ) {
      notificationSwal(
        "Datos Incompletos",
        "Ingrese el nombre del cliente para ventas a crédito.",
        "error"
      );
      return;
    }

    const formData = new FormData();
    formData.append("customer_name", customerName.trim() || "Cliente General");
    formData.append("final_price", totalAmount.toFixed(2));
    formData.append("total_amount", totalAmount.toFixed(2));
    
    cart.forEach((item, index) => {
      formData.append(`items[${index}][id]`, item.id);
      formData.append(`items[${index}][type]`, item.type);
      formData.append(`items[${index}][quantity]`, item.quantity);
      formData.append(`items[${index}][price]`, item.price);
      formData.append(`items[${index}][unit_price]`, item.price);
    });

    payments.forEach((p, index) => {
      formData.append(`payments[${index}][payment_method]`, p.payment_method);
      formData.append(`payments[${index}][amount]`, p.amount);
      formData.append(`payments[${index}][reference]`, p.reference || "");
      if (p.payment_image) {
        formData.append(`payments[${index}][payment_image]`, p.payment_image);
      }
    });

    setIsLoading(true);
    try {
      await salesAPI.create(formData);
      notificationSwal(
        "Venta Completada",
        "Venta procesada exitosamente.",
        "success"
      );
      setCart([]);
      setOpenPaymentDialog(false);
      resetPaymentState();
      checkCashRegisterStatus();
      loadProducts();
    } catch (error) {
      const msg =
        error.response?.data?.message || error.response?.data?.error || "Error al completar la venta.";
      notificationSwal("Error", msg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const visibleProducts = useMemo(
    () => products.filter((product) => Number(product.stock) > 0),
    [products]
  );

  const renderEditableTotal = () =>
    isEditingTotal ? (
      <TextField
        autoFocus
        variant="standard"
        type="number"
        value={editingTotal}
        onChange={(e) => setEditingTotal(e.target.value)}
        onBlur={handleSaveTotal}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSaveTotal();
          if (e.key === "Escape") {
            setIsEditingTotal(false);
            setEditingTotal("");
          }
        }}
        inputProps={{ min: 0, step: "0.01" }}
        sx={{
          maxWidth: 150,
          "& input": {
            textAlign: "right",
            fontSize: theme.typography.h5.fontSize,
            fontWeight: 900,
            color: "primary.main",
          },
        }}
      />
    ) : (
      <Typography
        variant="h5"
        onClick={handleTotalTap}
        onMouseDown={(e) => {
          if (e.detail > 1) e.preventDefault();
        }}
        title="Doble clic o doble toque para editar el total"
        sx={{
          fontWeight: 900,
          color: "primary.main",
          cursor: "pointer",
          userSelect: "none",
          WebkitUserSelect: "none",
          touchAction: "manipulation",
        }}
      >
        {formatCurrency(totalAmount, currency)}
      </Typography>
    );

  const renderProductGrid = (items, type) => (
    <Grid container spacing={isMobile ? 1 : 2} sx={{ p: { xs: 1, md: 2 } }}>
      {items.map((item) => (
        <Grid item xs={6} sm={4} md={3} key={`${type}-${item.id}`}>
          <Card
            sx={{
              cursor: "pointer",
              height: 200,
              "&:hover": { boxShadow: 6 },
              opacity: item.type === "product" && item.stock <= 0 ? 0.5 : 1,
              position: "relative",
              backgroundColor: theme.palette.warning.light,
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
              {item.type === "product" && (
                <Chip
                  label={`Stock: ${item.stock}`}
                  size="small"
                  color={item.stock <= 10 ? "error" : "success"}
                  sx={{ position: "absolute", top: 8, right: 8, zIndex: 1 }}
                />
              )}
              <Avatar
                src={
                  item.image_path
                    ? `${API_STORAGE_URL}/${item.image_path}`
                    : null
                }
                sx={{ width: 80, height: 80, m: "auto" }}
                variant="rounded"
              >
                {!item.image_path &&
                  (item.type === "product" ? <InventoryIcon /> : <BuildIcon />)}
              </Avatar>
              <Box sx={{ textAlign: "center", mt: 1 }}>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700, minHeight: 32 }}
                >
                  {item.name}
                </Typography>
                <Typography
                  variant="h6"
                  color="primary"
                  sx={{ fontWeight: 900 }}
                >
                  {formatCurrency(item.price, currency)}
                </Typography>
              </Box>
              {item.type === "product" && item.stock <= 0 && (
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    bgcolor: "rgba(0,0,0,0.7)",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
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

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
      }}
    >
      <AppBar position="static" sx={{ bgcolor: "primary.main", padding: 1 }}>
        <Toolbar>
          {!isMobile && (
            <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
              Punto de Venta
            </Typography>
          )}

          {/* Versión para móvil */}
          {isMobile ? (
            <Grid
              container
              spacing={1}
              justifyContent="center"
              alignItems="center"
            >
              <Grid item xs={12} sm="auto">
                <Grid container spacing={1} justifyContent="center">
                  <Grid item>
                    {!cashRegister ? (
                      <Button
                        variant="contained"
                        onClick={handleOpenCashRegister}
                        sx={{
                          bgcolor: "success.main",
                          "&:hover": { bgcolor: "success.dark" },
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        Abrir Caja
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="contained"
                          onClick={handleOpenReports}
                          sx={{
                            bgcolor: "warning.main",
                            fontWeight: 600,
                            mr: 1,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Reportes
                        </Button>
                        <Button
                          variant="contained"
                          onClick={handleCloseCashRegister}
                          sx={{
                            bgcolor: "error.main",
                            "&:hover": { bgcolor: "error.dark" },
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Cerrar Caja
                        </Button>
                      </>
                    )}
                  </Grid>
                </Grid>
              </Grid>
              <Grid item xs={12} sm="auto">
                <Grid container spacing={1} justifyContent="center">
                  <Grid item>
                    <Chip
                      label={cashRegister ? "Abierta" : "Cerrada"}
                      color={cashRegister ? "success" : "error"}
                      icon={<CashRegisterIcon />}
                      sx={{ color: "white", fontWeight: 600 }}
                    />
                  </Grid>
                  {cashRegister && (
                    <Grid item>
                      <Chip
                        label={`${formatCurrency(
                          cashRegister.total_in_cash,
                          currency
                        )}`}
                        color="info"
                        icon={<MoneyIcon />}
                        sx={{ color: "white", fontWeight: 600 }}
                      />
                    </Grid>
                  )}
                  <Grid item>
                    <IconButton
                      color="inherit"
                      onClick={() => setCartDrawerOpen(true)}
                    >
                      <Badge badgeContent={getTotalItems()} color="error">
                        <ShoppingCartIcon />
                      </Badge>
                    </IconButton>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          ) : (
            // Versión original para PC
            <>
              <Chip
                label={cashRegister ? "Caja Abierta" : "Caja Cerrada"}
                color={cashRegister ? "success" : "error"}
                icon={<CashRegisterIcon />}
                sx={{ mr: 2, color: "white", fontWeight: 600 }}
              />
              {cashRegister && (
                <Chip
                  label={`${formatCurrency(
                    cashRegister.total_in_cash,
                    currency
                  )}`}
                  color="info"
                  icon={<MoneyIcon />}
                  sx={{ mr: 2, color: "white", fontWeight: 600 }}
                />
              )}
              {!cashRegister ? (
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
                    variant="contained"
                    startIcon={<AssessmentIcon />}
                    onClick={handleOpenReports}
                    sx={{
                      bgcolor: "warning.main",
                      mr: 1,
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
            </>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ flex: 1, py: 2, overflow: "hidden" }}>
        <Grid container spacing={2} sx={{ height: "100%" }}>
          <Grid item xs={12} md={7}>
            <Card
              sx={{ height: "100%", display: "flex", flexDirection: "column" }}
            >
              <Tabs
                value={tabValue}
                onChange={(e, val) => setTabValue(val)}
                sx={{ borderBottom: 1, borderColor: "divider" }}
              >
                <Tab label={`Productos (${visibleProducts.length})`} />
                <Tab label={`Servicios (${services.length})`} />
              </Tabs>
              <Box sx={{ flex: 1, overflowY: "auto" }}>
                <TabPanel value={tabValue} index={0}>
                  {renderProductGrid(visibleProducts, "product")}
                </TabPanel>
                <TabPanel value={tabValue} index={1}>
                  {renderProductGrid(services, "service")}
                </TabPanel>
              </Box>
            </Card>
          </Grid>
          {!isMobile && (
            <Grid item xs={12} md={5}>
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <CardContent
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Carrito
                  </Typography>
                  <Badge badgeContent={getTotalItems()} color="primary">
                    <ShoppingCartIcon />
                  </Badge>
                </CardContent>
                <Divider />
                <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
                  {cart.length === 0 ? (
                    <Box sx={{ textAlign: "center", py: 6 }}>
                      <ShoppingCartIcon
                        sx={{ fontSize: 64, color: "text.secondary" }}
                      />
                      <Typography color="text.secondary">
                        Carrito vacío
                      </Typography>
                    </Box>
                  ) : (
                    <List>
                      {cart.map((item) => (
                        <ListItem
                          key={`${item.type}-${item.id}`}
                          sx={{ p: 0, mb: 1 }}
                        >
                          <ListItemText
                            primary={item.name}
                            secondary={formatCurrency(
                              item.price * item.quantity,
                              currency
                            )}
                          />
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
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
                            >
                              <RemoveIcon />
                            </IconButton>
                            <Typography>{item.quantity}</Typography>
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
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() =>
                                handleRemoveFromCart(item.id, item.type)
                              }
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Stack>
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
                      mb: 2,
                    }}
                  >
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      Total:
                    </Typography>
                    {renderEditableTotal()}
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<ClearIcon />}
                      onClick={() => setCart([])}
                      disabled={!cart.length}
                    >
                      Limpiar
                    </Button>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<PaymentIcon />}
                      onClick={handleProcessSale}
                      disabled={!cart.length || !cashRegister}
                    >
                      Cobrar
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </Container>

      <Drawer
        anchor="right"
        open={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
      >
        <Box
          sx={{
            width: isMobile ? "100vw" : 320,
            p: 2,
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Carrito
            </Typography>
            <IconButton onClick={() => setCartDrawerOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ flex: 1, overflowY: "auto" }}>
            {cart.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 6 }}>
                <ShoppingCartIcon
                  sx={{ fontSize: 64, color: "text.secondary" }}
                />
                <Typography color="text.secondary">Carrito vacío</Typography>
              </Box>
            ) : (
              <List>
                {cart.map((item) => (
                  <ListItem
                    key={`${item.type}-${item.id}`}
                    sx={{ p: 0, mb: 1 }}
                  >
                    <ListItemText
                      primary={item.name}
                      secondary={formatCurrency(
                        item.price * item.quantity,
                        currency
                      )}
                    />
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <IconButton
                        size="small"
                        onClick={() =>
                          handleUpdateQuantity(
                            item.id,
                            item.type,
                            item.quantity - 1
                          )
                        }
                      >
                        <RemoveIcon />
                      </IconButton>
                      <Typography>{item.quantity}</Typography>
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
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoveFromCart(item.id, item.type)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
          <Divider sx={{ my: 1 }} />
          <Box>
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}
            >
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Total:
              </Typography>
              {renderEditableTotal()}
            </Box>
            <Stack direction="row" spacing={1}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={() => setCart([])}
                disabled={!cart.length}
              >
                Limpiar
              </Button>
              <Button
                fullWidth
                variant="contained"
                startIcon={<PaymentIcon />}
                onClick={() => {
                  setCartDrawerOpen(false);
                  handleProcessSale();
                }}
                disabled={!cart.length || !cashRegister}
              >
                Cobrar
              </Button>
            </Stack>
          </Box>
        </Box>
      </Drawer>

      <Dialog
        open={openPaymentDialog}
        onClose={() => setOpenPaymentDialog(false)}
        maxWidth="sm"
        fullWidth
        TransitionComponent={Transition}
      >
        <DialogTitle sx={{ textAlign: "center", position: "relative" }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Procesar Venta
          </Typography>
          <IconButton
            onClick={() => setOpenPaymentDialog(false)}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Paper
              variant="outlined"
              sx={{ p: 2, textAlign: "center", bgcolor: "grey.100" }}
            >
              <Typography
                variant="h4"
                sx={{ fontWeight: 900, color: "primary.main" }}
              >
                {formatCurrency(totalAmount, currency)}
              </Typography>
              <Typography variant="body1">Total a Pagar</Typography>
            </Paper>
            <TextField
              fullWidth
              label="Nombre del Cliente (Opcional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Cliente General"
            />
            <Divider>Métodos de Pago</Divider>
            
            <PaymentMethodSelector
              totalAmount={totalAmount}
              payments={payments}
              setPayments={setPayments}
              currency={currency}
            />

            {payments.some((p) => p.payment_method === "cash") && (
              <>
                <Divider>Calcule su Vuelto Rápido</Divider>
                <TextField
                  fullWidth
                  label="Efectivo Recibido"
                  type="number"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="h6">Vuelto:</Typography>
                  <Typography
                    variant="h6"
                    color="info.main"
                    sx={{ fontWeight: 700 }}
                  >
                    {formatCurrency(cashChange, currency)}
                  </Typography>
                </Stack>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            fullWidth
            size="large"
            variant="contained"
            onClick={handleCompleteSale}
            disabled={isLoading || Math.abs(remainingAmount) > 0.001}
          >
            {isLoading ? "Procesando..." : "Completar Venta"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openInitCashDialog}
        onClose={() => setOpenInitCashDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Inicializar Caja</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Moneda</InputLabel>
              <Select
                value={currency}
                label="Moneda"
                onChange={(e) => setCurrency(e.target.value)}
              >
                <MenuItem value="PEN">Soles (PEN)</MenuItem>
                <MenuItem value="USD">Dólares (USD)</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Monto inicial"
              type="number"
              value={initCashAmount}
              onChange={(e) => setInitCashAmount(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenInitCashDialog(false)}>Cancelar</Button>
          <Button onClick={handleInitializeCash} variant="contained">
            Abrir Caja
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openReportsDialog}
        onClose={() => setOpenReportsDialog(false)}
        maxWidth="md"
        fullWidth
        TransitionComponent={Transition}
      >
        <DialogTitle sx={{ p: { xs: 1, md: 3 } }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Reportes del Turno
            </Typography>
            <IconButton onClick={() => setOpenReportsDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 1, md: 3 } }} dividers>
          <CashRegisterReport 
            reportData={reportData} 
            onPrintReceipt={handlePrintReceipt}
            isPrinting={isPrinting}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};
