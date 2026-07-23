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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Pagination,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Slide,
  Tabs,
  Tab,
  Stack,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Visibility as ViewIcon,
  Print as PrintIcon,
  Close as CloseIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import { formatCurrency, formatDate } from "../utils/formatters";
import { notificationSwal, confirmSwal } from "../utils/swal-helpers";
import { cashRegisterAPI, usersAPI, salesAPI } from "../utils/api";
import { useAuth } from "../contexts/AuthContext";
import { CashRegisterReport } from "../components/CashRegisterReport";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export const CashRegisters = () => {
  const { user, hasPermission } = useAuth();
  const [cashRegisters, setCashRegisters] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchFilters, setSearchFilters] = useState({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Modal Report States
  const [openReportsDialog, setOpenReportsDialog] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [reportType, setReportType] = useState("sales");
  const [isPrinting, setIsPrinting] = useState(false);

  // Init Cash Dialog States
  const [openInitCashDialog, setOpenInitCashDialog] = useState(false);
  const [initCashAmount, setInitCashAmount] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [currency, setCurrency] = useState("PEN");

  // Manual Inflow States
  const [openInflowDialog, setOpenInflowDialog] = useState(false);
  const [inflowAmount, setInflowAmount] = useState("");
  const [inflowNotes, setInflowNotes] = useState("");
  const [selectedCashRegisterId, setSelectedCashRegisterId] = useState(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    loadCashRegisters();
    loadUsers();
  }, [page, searchFilters]);

  const loadCashRegisters = async () => {
    setIsLoading(true);
    try {
      const response = await cashRegisterAPI.getAll({ page, ...searchFilters });
      setCashRegisters(response.data.data);
      setTotalPages(response.data.last_page);
    } catch (error) {
      console.error("Error loading cash registers:", error);
      notificationSwal(
        "Error",
        "Hubo un error al cargar las cajas registradoras.",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await usersAPI.getAll({ per_page: -1 });
      setUsers(response.data.data);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const handleChangeFilter = (event) => {
    const { name, value } = event.target;
    setSearchFilters((prevFilters) => {
      const newFilters = { ...prevFilters };
      if (value === "") {
        delete newFilters[name];
      } else {
        newFilters[name] = value;
      }
      return newFilters;
    });
    setPage(1);
  };

  const handleOpenReports = async (cashRegister) => {
    try {
      const response = await cashRegisterAPI.getReport(cashRegister.id);
      const report = response.data;
      const sales = report.sales || [];
      const totalSales = sales.length;
      const cashSalesAmount = sales
        .filter((s) => s.payment_method === "cash")
        .reduce((sum, s) => sum + parseFloat(s.total_amount), 0);

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
        currency: report.currency || "PEN", // Fallback if currency is missing in some endpoint
        opened_by: report.opened_by || cashRegister.opened_by,
        opened_at: report.opened_at || cashRegister.opened_at,
        closed_at: report.closed_at || cashRegister.closed_at,
        status: report.status || cashRegister.status,
      });
      setOpenReportsDialog(true);
    } catch (error) {
      console.error("Error loading report:", error);
      notificationSwal("Error", "No se pudo cargar el reporte.", "error");
    }
  };

  const handleAddInflow = async () => {
    if (!inflowAmount || parseFloat(inflowAmount) <= 0) {
      notificationSwal("Error", "Ingrese un monto válido.", "error");
      return;
    }

    try {
      await cashRegisterAPI.addInflow(selectedCashRegisterId, {
        amount: parseFloat(inflowAmount),
        notes: inflowNotes,
      });
      notificationSwal("Éxito", "Dinero agregado a caja.", "success");
      setOpenInflowDialog(false);
      setInflowAmount("");
      setInflowNotes("");
      loadCashRegisters();
    } catch (error) {
      console.error("Error adding inflow:", error);
      notificationSwal("Error", "No se pudo agregar el dinero.", "error");
    }
  };

  const handleOpenInflowDialog = (id) => {
    setSelectedCashRegisterId(id);
    setOpenInflowDialog(true);
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

  const handleInitializeCash = async () => {
    try {
      const amount = parseFloat(initCashAmount) || 0;
      const payload = {
        initial_amount: amount,
        currency,
      };

      if (selectedUserId) {
        payload.user_id = selectedUserId;
      }

      await cashRegisterAPI.create(payload);
      loadCashRegisters();
      setOpenInitCashDialog(false);
      setInitCashAmount("");
      setSelectedUserId("");
      notificationSwal(
        "Caja Abierta",
        `Caja inicializada con ${formatCurrency(amount, currency)}`,
        "success",
      );
    } catch (error) {
      notificationSwal(
        "Error",
        error.response?.data?.message || "Error al abrir la caja registradora.",
        "error",
      );
    }
  };

  const handleCloseCashRegister = async (cashRegister) => {
    const confirmed = await confirmSwal(
      "Cerrar Caja",
      `¿Desea cerrar la caja registradora de ${cashRegister.opened_by?.full_name}?`,
      { confirmButtonText: "Cerrar Caja", icon: "warning" },
    );
    if (confirmed) {
      try {
        await cashRegisterAPI.close(cashRegister.id, {
          final_amount:
            cashRegister.total_in_cash || cashRegister.expected_amount,
        });
        loadCashRegisters();
        notificationSwal(
          "Caja Cerrada",
          "La caja registradora ha sido cerrada exitosamente.",
          "success",
        );
      } catch (error) {
        console.error("Error closing cash register:", error);
        notificationSwal(
          "Error",
          error.response?.data?.message ||
            "Error al cerrar la caja registradora.",
          "error",
        );
      }
    }
  };

  const getStatusLabel = (status) => {
    return status === "open" ? "Abierta" : "Cerrada";
  };

  const getStatusColor = (status) => {
    return status === "open" ? "success" : "error";
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Cajas Registradoras
        </Typography>
        {hasPermission("cajas.create") && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenInitCashDialog(true)}
          >
            Abrir Caja
          </Button>
        )}
      </Box>

      <Card>
        <CardContent>
          {/* Filters */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Estado</InputLabel>
                <Select
                  name="status"
                  value={searchFilters.status || ""}
                  label="Estado"
                  onChange={handleChangeFilter}
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="open">Abierta</MenuItem>
                  <MenuItem value="closed">Cerrada</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Responsable</InputLabel>
                <Select
                  name="opened_by"
                  value={searchFilters.opened_by || ""}
                  label="Responsable"
                  onChange={handleChangeFilter}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.full_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Fecha Apertura"
                type="date"
                name="opened_at"
                value={searchFilters.opened_at || ""}
                onChange={handleChangeFilter}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Fecha Cierre"
                type="date"
                name="closed_at"
                value={searchFilters.closed_at || ""}
                onChange={handleChangeFilter}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>

          {/* Table */}
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Apertura</TableCell>
                  <TableCell>Cierre</TableCell>
                  <TableCell>Monto Inicial</TableCell>
                  <TableCell>Monto Final</TableCell>
                  <TableCell>Ganancia</TableCell>
                  <TableCell>Responsable</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      {/* <CircularProgress /> */}
                    </TableCell>
                  </TableRow>
                ) : (
                  cashRegisters.map((cr) => (
                    <TableRow key={cr.id}>
                      <TableCell>{cr.id}</TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(cr.status)}
                          color={getStatusColor(cr.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{formatDate(cr.opened_at)}</TableCell>
                      <TableCell>
                        {cr.closed_at ? formatDate(cr.closed_at) : "-"}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(cr.initial_amount, cr.currency)}
                      </TableCell>
                      <TableCell>
                        {cr.final_amount
                          ? formatCurrency(cr.final_amount, cr.currency)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "success.main" }}>
                          {formatCurrency(cr.profit || 0, cr.currency)}
                        </Typography>
                      </TableCell>
                      <TableCell>{cr.opened_by?.full_name || "-"}</TableCell>
                      <TableCell align="right">
                        {cr.status === "open" &&
                          hasPermission("cajas.create") && (
                            <>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleOpenInflowDialog(cr.id)}
                                title="Inyectar Dinero"
                              >
                                <AddIcon />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleCloseCashRegister(cr)}
                                title="Cerrar Caja"
                              >
                                <CloseIcon />
                              </IconButton>
                            </>
                          )}
                        <IconButton
                          size="small"
                          onClick={() => handleOpenReports(cr)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {!isLoading && cashRegisters.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      No hay registros encontrados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

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

      {/* Initialize Cash Dialog */}
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
              <InputLabel>Usuario Responsable</InputLabel>
              <Select
                value={selectedUserId}
                label="Usuario Responsable"
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                <MenuItem value="">
                  <em>Actual ({user.full_name})</em>
                </MenuItem>
                {users.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.full_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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

      {/* Reports Modal */}
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
              Reportes de Caja
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton onClick={() => setOpenReportsDialog(false)}>
                <CloseIcon />
              </IconButton>
            </Stack>
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

      {/* Manual Inflow Dialog */}
      <Dialog
        open={openInflowDialog}
        onClose={() => setOpenInflowDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Inyectar Dinero a Caja</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Use esta opción para agregar dinero extra a la caja abierta (ej: sencillo).
            </Typography>
            <TextField
              fullWidth
              label="Monto a inyectar"
              type="number"
              value={inflowAmount}
              onChange={(e) => setInflowAmount(e.target.value)}
              autoFocus
            />
            <TextField
              fullWidth
              label="Notas/Motivo"
              multiline
              rows={2}
              value={inflowNotes}
              onChange={(e) => setInflowNotes(e.target.value)}
              placeholder="Ej: Sencillo para cambio"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenInflowDialog(false)}>Cancelar</Button>
          <Button onClick={handleAddInflow} variant="contained" color="primary">
            Agregar Dinero
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
