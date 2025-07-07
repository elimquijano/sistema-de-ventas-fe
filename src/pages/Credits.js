import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Pagination,
  CircularProgress,
  Tab,
  Tabs,
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Payment as PaymentIcon,
  AccountBalance as AccountBalanceIcon,
  ShoppingCart as ShoppingCartIcon,
  Build as BuildIcon,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { formatCurrency, formatDate } from "../utils/formatters";
import { confirmSwal, notificationSwal } from "../utils/swal-helpers";
import { creditsAPI, loansAPI } from "../utils/api";

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`credits-tabpanel-${index}`}
      aria-labelledby={`credits-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

export const Credits = () => {
  const { hasPermission } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [salesCredits, setSalesCredits] = useState([]);
  const [itemLoans, setItemLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchFilters, setSearchFilters] = useState({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  useEffect(() => {
    loadCredits();
  }, [tabValue, page, searchFilters]);

  const loadCredits = async () => {
    try {
      setLoading(true);
      if (tabValue === 0) {
        const response = await creditsAPI.getAll({ page, ...searchFilters });
        setSalesCredits(response.data.data);
        setTotalPages(response.data.last_page);
      } else {
        const response = await loansAPI.getAll({ page, ...searchFilters });
        setItemLoans(response.data.data);
        setTotalPages(response.data.last_page);
      }
    } catch (error) {
      console.error("Error loading credits:", error);
      notificationSwal(
        "Error",
        "Hubo un error al cargar los créditos.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChangeFilter = (event) => {
    const { name, value } = event.target;
    setSearchFilters((prevFilters) => {
      if (value === "") {
        const { [name]: _, ...newFilters } = prevFilters;
        return newFilters;
      }
      return { ...prevFilters, [name]: value };
    });
  };

  const handleOpenPaymentDialog = (credit) => {
    setSelectedCredit(credit);
    setPaymentAmount(credit.pending_amount.toString());
    setOpenPaymentDialog(true);
  };

  const handleProcessPayment = async () => {
    try {
      const amount = parseFloat(paymentAmount);
      if (amount <= 0 || amount > selectedCredit.pending_amount) {
        notificationSwal("Error", "Monto de pago inválido.", "error");
        return;
      }

      await creditsAPI.processPayment(selectedCredit.id, { amount });

      notificationSwal(
        "Pago Registrado",
        `Se ha registrado un pago de ${formatCurrency(amount)}.`,
        "success"
      );
      
      setOpenPaymentDialog(false);
      setSelectedCredit(null);
      setPaymentAmount("");
      loadCredits();
    } catch (error) {
      console.error("Error processing payment:", error);
      notificationSwal("Error", "Error al procesar el pago.", "error");
    }
  };

  const handleMarkAsReturned = async (loanId) => {
    const userConfirmed = await confirmSwal(
      "Marcar como Devuelto",
      "¿Confirma que el artículo ha sido devuelto?",
      {
        confirmButtonText: "Sí, marcar como devuelto",
        icon: "question",
      }
    );

    if (userConfirmed) {
      try {
        await loansAPI.markAsReturned(loanId);
        notificationSwal(
          "Artículo Devuelto",
          "El artículo ha sido marcado como devuelto.",
          "success"
        );
        loadCredits();
      } catch (error) {
        console.error("Error marking as returned:", error);
        notificationSwal("Error", "Error al marcar como devuelto.", "error");
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "paid":
      case "returned":
        return "success";
      case "pending":
        return "warning";
      case "overdue":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status, type) => {
    if (type === "sales") {
      const labels = {
        paid: "Pagado",
        pending: "Pendiente",
        overdue: "Vencido",
      };
      return labels[status] || status;
    } else {
      const labels = {
        returned: "Devuelto",
        pending: "Pendiente",
        overdue: "Vencido",
      };
      return labels[status] || status;
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 400,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Créditos y Préstamos
      </Typography>

      <Card>
        <CardContent>
          <Tabs
            value={tabValue}
            onChange={(e, newValue) => setTabValue(newValue)}
            sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}
          >
            <Tab
              label="Ventas a Crédito"
              icon={<ShoppingCartIcon />}
              iconPosition="start"
            />
            <Tab
              label="Préstamos de Artículos"
              icon={<BuildIcon />}
              iconPosition="start"
            />
          </Tabs>

          {/* Filtros */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Buscar por cliente..."
                name="search"
                value={searchFilters.search || ""}
                onChange={handleChangeFilter}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Estado</InputLabel>
                <Select
                  name="status"
                  value={searchFilters.status || ""}
                  label="Estado"
                  onChange={handleChangeFilter}
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="pending">Pendiente</MenuItem>
                  <MenuItem value="paid">Pagado</MenuItem>
                  <MenuItem value="returned">Devuelto</MenuItem>
                  <MenuItem value="overdue">Vencido</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Ventas a Crédito */}
          <TabPanel value={tabValue} index={0}>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Cliente</TableCell>
                    <TableCell>Venta</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell>Pagado</TableCell>
                    <TableCell>Pendiente</TableCell>
                    <TableCell>Vencimiento</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {salesCredits.map((credit) => (
                    <TableRow key={credit.id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {credit.customer_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {credit.sale_number}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatCurrency(credit.total_amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="success.main">
                          {formatCurrency(credit.paid_amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="error.main" sx={{ fontWeight: 600 }}>
                          {formatCurrency(credit.pending_amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>{formatDate(credit.due_date)}</TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(credit.status, "sales")}
                          size="small"
                          color={getStatusColor(credit.status)}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {credit.status === "pending" && (
                          <IconButton
                            size="small"
                            onClick={() => handleOpenPaymentDialog(credit)}
                            color="primary"
                          >
                            <PaymentIcon />
                          </IconButton>
                        )}
                        <IconButton size="small">
                          <EditIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* Préstamos de Artículos */}
          <TabPanel value={tabValue} index={1}>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Cliente</TableCell>
                    <TableCell>Artículo</TableCell>
                    <TableCell>Fecha Préstamo</TableCell>
                    <TableCell>Fecha Vencimiento</TableCell>
                    <TableCell>Fecha Devolución</TableCell>
                    <TableCell>Depósito</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {itemLoans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {loan.customer_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {loan.item_name}
                        </Typography>
                        {loan.notes && (
                          <Typography variant="caption" color="text.secondary">
                            {loan.notes}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(loan.loan_date)}</TableCell>
                      <TableCell>{formatDate(loan.due_date)}</TableCell>
                      <TableCell>
                        {loan.return_date ? (
                          formatDate(loan.return_date)
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No devuelto
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatCurrency(loan.deposit_amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(loan.status, "loans")}
                          size="small"
                          color={getStatusColor(loan.status)}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {loan.status === "pending" && (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleMarkAsReturned(loan.id)}
                            sx={{ mr: 1 }}
                          >
                            Marcar Devuelto
                          </Button>
                        )}
                        <IconButton size="small">
                          <EditIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(event, value) => setPage(value)}
              color="primary"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Dialog para procesar pago */}
      <Dialog
        open={openPaymentDialog}
        onClose={() => setOpenPaymentDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Registrar Pago</DialogTitle>
        <DialogContent>
          {selectedCredit && (
            <Box sx={{ py: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Cliente: {selectedCredit.customer_name}
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Venta: {selectedCredit.sale_number}
              </Typography>
              <Typography variant="body1" sx={{ mb: 3 }}>
                Monto Pendiente: {formatCurrency(selectedCredit.pending_amount)}
              </Typography>
              
              <TextField
                fullWidth
                label="Monto a Pagar"
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                inputProps={{
                  max: selectedCredit.pending_amount,
                  min: 0.01,
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPaymentDialog(false)}>Cancelar</Button>
          <Button
            onClick={handleProcessPayment}
            variant="contained"
            disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
            sx={{
              background: "linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)",
            }}
          >
            Registrar Pago
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};