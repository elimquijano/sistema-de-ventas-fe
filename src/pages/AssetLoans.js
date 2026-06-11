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
  CircularProgress,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  AssignmentReturn as ReturnIcon,
  History as HistoryIcon,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { formatDate } from "../utils/formatters";
import { confirmSwal, notificationSwal } from "../utils/swal-helpers";
import { assetsAPI, assetLoansAPI } from "../utils/api";
import { AuditTimeline } from "../components/AuditTimeline";

export const AssetLoans = () => {
  const { hasPermission } = useAuth();
  const [loans, setLoans] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("loaned");
  const [openDialog, setOpenDialog] = useState(false);
  const [openReturnDialog, setOpenReturnDialog] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Timeline State
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [timelineLogs, setTimelineLogs] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const [formData, setFormData] = useState({
    asset_id: "",
    borrower_name: "",
    quantity: "1",
    loan_date: new Date().toISOString().split("T")[0],
    due_date: "",
    notes: "",
  });

  const [returnData, setReturnData] = useState({
    status: "returned",
    notes: "",
    quantity: "",
  });

  useEffect(() => {
    loadLoans();
    loadAssets();
  }, []);

  const loadLoans = async () => {
    try {
      setLoading(true);
      const response = await assetLoansAPI.getAll();
      setLoans(response.data.data || []);
    } catch (error) {
      console.error("Error loading loans:", error);
      notificationSwal("Error", "Error al cargar los préstamos.", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadAssets = async () => {
    try {
      const response = await assetsAPI.getAll({ status: "active" });
      setAssets(response.data.data || []);
    } catch (error) {
      console.error("Error loading assets:", error);
    }
  };

  const handleOpenDialog = () => {
    setFormData({
      asset_id: "",
      borrower_name: "",
      quantity: "1",
      loan_date: new Date().toISOString().split("T")[0],
      due_date: "",
      notes: "",
    });
    setOpenDialog(true);
  };

  const handleSaveLoan = async () => {
    setIsSubmitting(true);
    try {
      await assetLoansAPI.create(formData);
      notificationSwal("Préstamo Registrado", "El préstamo ha sido registrado exitosamente.", "success");
      setOpenDialog(false);
      loadLoans();
      loadAssets(); // Refresh available quantity
    } catch (error) {
      console.error("Error saving loan:", error);
      notificationSwal("Error", error.response?.data?.message || "Error al registrar el préstamo.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenReturnDialog = (loan) => {
    setSelectedLoan(loan);
    setReturnData({
      status: "returned",
      notes: "",
      quantity: loan.pending_quantity || loan.quantity,
    });
    setOpenReturnDialog(true);
  };

  const handleReturnLoan = async () => {
    setIsSubmitting(true);
    try {
      await assetLoansAPI.returnLoan(selectedLoan.id, {
        ...returnData,
        quantity: parseFloat(returnData.quantity)
      });
      notificationSwal("Devolución Registrada", "La devolución ha sido registrada exitosamente.", "success");
      setOpenReturnDialog(false);
      loadLoans();
      loadAssets();
    } catch (error) {
      console.error("Error returning loan:", error);
      notificationSwal("Error", error.response?.data?.message || "Error al registrar la devolución.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenTimeline = async (loanId) => {
    setTimelineOpen(true);
    setLoadingTimeline(true);
    try {
      const response = await assetLoansAPI.timeline(loanId);
      setTimelineLogs(response.data || []);
    } catch (error) {
      console.error("Error loading timeline:", error);
      notificationSwal("Error", "No se pudo cargar el historial.", "error");
    } finally {
      setLoadingTimeline(false);
    }
  };

  const getStatusChip = (status) => {
    const styles = {
      loaned: { label: "En Préstamo", color: "warning" },
      returned: { label: "Devuelto", color: "success" },
      damaged: { label: "Dañado", color: "error" },
      lost: { label: "Perdido", color: "error" },
    };
    const style = styles[status] || { label: status, color: "default" };
    return <Chip label={style.label} size="small" color={style.color} />;
  };

  const filteredLoans = loans.filter((loan) => {
    const assetName = loan.asset?.name.toLowerCase() || "";
    const borrowerName = (loan.borrower_name || "").toLowerCase();
    const matchesSearch = assetName.includes(searchTerm.toLowerCase()) || borrowerName.includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || loan.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Préstamos de Activos
        </Typography>
        {hasPermission("assets.loan.create") && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
            sx={{ background: "linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)" }}
          >
            Registrar Préstamo
          </Button>
        )}
      </Box>

      <Card>
        <CardContent>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Buscar por activo o beneficiario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
                  value={statusFilter}
                  label="Estado"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="loaned">En Préstamo</MenuItem>
                  <MenuItem value="returned">Devuelto</MenuItem>
                  <MenuItem value="damaged">Dañado</MenuItem>
                  <MenuItem value="lost">Perdido</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Activo</TableCell>
                    <TableCell>Beneficiario</TableCell>
                    <TableCell>Cant.</TableCell>
                    <TableCell>Fecha Préstamo</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Registrado por</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredLoans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell>
                        <Typography variant="subtitle2">{loan.asset?.name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{loan.borrower_name}</Typography>
                      </TableCell>
                      <TableCell>{loan.quantity}</TableCell>
                      <TableCell>{formatDate(loan.loan_date)}</TableCell>
                      <TableCell>{getStatusChip(loan.status)}</TableCell>
                      <TableCell>{loan.creator?.full_name || "N/A"}</TableCell>
                      <TableCell align="right">
                        {loan.status === "loaned" && hasPermission("assets.loan.complete") && (
                          <Tooltip title="Registrar Devolución">
                            <IconButton color="primary" onClick={() => handleOpenReturnDialog(loan)}>
                              <ReturnIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {hasPermission("assets.loan.audit") && (
                          <Tooltip title="Ver Historial">
                            <IconButton size="small" onClick={() => handleOpenTimeline(loan.id)}>
                              <HistoryIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Dialog para registrar préstamo */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Registrar Nuevo Préstamo</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Activo</InputLabel>
                <Select
                  value={formData.asset_id}
                  label="Activo"
                  onChange={(e) => setFormData({ ...formData, asset_id: e.target.value })}
                >
                  {assets.map((asset) => (
                    <MenuItem key={asset.id} value={asset.id}>
                      {asset.name} (Disp: {asset.available_quantity})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nombre de la Persona"
                value={formData.borrower_name}
                onChange={(e) => setFormData({ ...formData, borrower_name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Cantidad"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Fecha de Préstamo"
                type="date"
                value={formData.loan_date}
                onChange={(e) => setFormData({ ...formData, loan_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notas"
                multiline
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} disabled={isSubmitting}>Cancelar</Button>
          <Button
            onClick={handleSaveLoan}
            variant="contained"
            disabled={!formData.asset_id || !formData.borrower_name || isSubmitting}
            sx={{ background: "linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)" }}
          >
            Registrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para registrar devolución */}
      <Dialog open={openReturnDialog} onClose={() => setOpenReturnDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Registrar Devolución</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" gutterBottom>
              Activo: <strong>{selectedLoan?.asset?.name}</strong>
            </Typography>
            <Typography variant="body2" gutterBottom>
              Cantidad Pendiente: <strong>{selectedLoan?.pending_quantity || selectedLoan?.quantity}</strong>
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Cantidad a devolver"
                  type="number"
                  value={returnData.quantity}
                  onChange={(e) => setReturnData({ ...returnData, quantity: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Estado de Devolución</InputLabel>
                  <Select
                    value={returnData.status}
                    label="Estado de Devolución"
                    onChange={(e) => setReturnData({ ...returnData, status: e.target.value })}
                  >
                    <MenuItem value="returned">Devuelto en buen estado</MenuItem>
                    <MenuItem value="damaged">Dañado</MenuItem>
                    <MenuItem value="lost">Perdido</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notas de devolución"
                  multiline
                  rows={2}
                  value={returnData.notes}
                  onChange={(e) => setReturnData({ ...returnData, notes: e.target.value })}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReturnDialog(false)} disabled={isSubmitting}>Cancelar</Button>
          <Button
            onClick={handleReturnLoan}
            variant="contained"
            disabled={isSubmitting}
            color="primary"
          >
            Confirmar Devolución
          </Button>
        </DialogActions>
      </Dialog>

      {/* Timeline Dialog */}
      <Dialog
        open={timelineOpen}
        onClose={() => setTimelineOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <HistoryIcon color="primary" /> Historial del Préstamo
        </DialogTitle>
        <DialogContent>
          <AuditTimeline logs={timelineLogs} loading={loadingTimeline} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTimelineOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
