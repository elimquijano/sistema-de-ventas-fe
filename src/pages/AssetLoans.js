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
  Pagination,
  Autocomplete,
} from "@mui/material";
import {
  Add as AddIcon,
  AssignmentReturn as ReturnIcon,
  History as HistoryIcon,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { formatDate } from "../utils/formatters";
import { confirmSwal, notificationSwal } from "../utils/swal-helpers";
import { assetsAPI, assetLoansAPI, usersAPI } from "../utils/api";
import { AuditTimeline } from "../components/AuditTimeline";

const getCurrentLimaDate = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(new Date())
    .reduce((result, part) => ({ ...result, [part.type]: part.value }), {});

  return `${parts.year}-${parts.month}-${parts.day}`;
};

export const AssetLoans = () => {
  const { hasPermission } = useAuth();
  const [loans, setLoans] = useState([]);
  const [assets, setAssets] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchFilters, setSearchFilters] = useState({
    status: "loaned",
    search: "",
    loan_date: "",
    return_date: "",
    created_by: "",
  });

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
    loan_date: getCurrentLimaDate(),
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
  }, [page, searchFilters]);

  useEffect(() => {
    loadAssets();
    loadUsers();
  }, []);

  const loadLoans = async () => {
    try {
      setLoading(true);
      const response = await assetLoansAPI.getAll({ page, ...searchFilters });
      setLoans(response.data.data || []);
      setTotalPages(response.data.last_page || 1);
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

  const loadUsers = async () => {
    try {
      const response = await usersAPI.getAll();
      setUsers(response.data.data || []);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const handleChangeFilter = (event) => {
    const { name, value } = event.target;
    setPage(1);
    setSearchFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleOpenDialog = () => {
    setFormData({
      asset_id: "",
      borrower_name: "",
      quantity: "1",
      loan_date: getCurrentLimaDate(),
      due_date: "",
      notes: "",
    });
    setOpenDialog(true);
  };

  const handleSaveLoan = async () => {
    setIsSubmitting(true);
    try {
      await assetLoansAPI.create(formData);
      notificationSwal(
        "Préstamo Registrado",
        "El préstamo ha sido registrado exitosamente.",
        "success",
      );
      setOpenDialog(false);
      loadLoans();
      loadAssets(); // Refresh available quantity
    } catch (error) {
      console.error("Error saving loan:", error);
      notificationSwal(
        "Error",
        error.response?.data?.message || "Error al registrar el préstamo.",
        "error",
      );
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
        quantity: parseFloat(returnData.quantity),
      });
      notificationSwal(
        "Devolución Registrada",
        "La devolución ha sido registrada exitosamente.",
        "success",
      );
      setOpenReturnDialog(false);
      loadLoans();
      loadAssets();
    } catch (error) {
      console.error("Error returning loan:", error);
      notificationSwal(
        "Error",
        error.response?.data?.message || "Error al registrar la devolución.",
        "error",
      );
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
          Préstamos de Activos
        </Typography>
        {hasPermission("assets.loan.create") && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
            sx={{
              background: "linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)",
            }}
          >
            Registrar Préstamo
          </Button>
        )}
      </Box>

      <Card>
        <CardContent>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Buscar activo/beneficiario..."
                name="search"
                value={searchFilters.search}
                onChange={handleChangeFilter}
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Estado</InputLabel>
                <Select
                  name="status"
                  value={searchFilters.status}
                  label="Estado"
                  onChange={handleChangeFilter}
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="loaned">En Préstamo</MenuItem>
                  <MenuItem value="returned">Devuelto</MenuItem>
                  <MenuItem value="damaged">Dañado</MenuItem>
                  <MenuItem value="lost">Perdido</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {searchFilters.status !== "returned" && (
              <Grid item xs={6} md={2}>
                <TextField
                  fullWidth
                  label="Fecha Préstamo"
                  type="date"
                  name="loan_date"
                  value={searchFilters.loan_date}
                  onChange={handleChangeFilter}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            )}
            {searchFilters.status !== "loaned" && (
              <Grid item xs={6} md={2}>
                <TextField
                  fullWidth
                  label="Fecha Devolución"
                  type="date"
                  name="return_date"
                  value={searchFilters.return_date}
                  onChange={handleChangeFilter}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            )}
            {hasPermission("assets.loan.audit") && (
              <Grid item xs={6} md={2}>
                <Autocomplete
                  options={users}
                  getOptionLabel={(user) =>
                    `${user.first_name} ${user.last_name}`
                  }
                  value={
                    users.find((u) => u.id === searchFilters.created_by) || null
                  }
                  onChange={(e, newValue) =>
                    handleChangeFilter({
                      target: {
                        name: "created_by",
                        value: newValue ? newValue.id : "",
                      },
                    })
                  }
                  renderInput={(params) => (
                    <TextField {...params} label="Registrado por" fullWidth />
                  )}
                />
              </Grid>
            )}
          </Grid>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Activo</TableCell>
                      <TableCell>Beneficiario</TableCell>
                      <TableCell>Cant. Inicial</TableCell>
                      <TableCell>Cant. Pendiente</TableCell>
                      <TableCell>F. Préstamo</TableCell>
                      <TableCell>F. Devolución</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Registrado por</TableCell>
                      <TableCell align="right">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loans.map((loan) => (
                      <TableRow key={loan.id}>
                        <TableCell>
                          <Typography variant="subtitle2">
                            {loan.asset?.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {loan.borrower_name}
                          </Typography>
                        </TableCell>
                        <TableCell>{loan.quantity}</TableCell>
                        <TableCell
                          sx={{ color: "error.main", fontWeight: "bold" }}
                        >
                          {loan.pending_quantity}
                        </TableCell>
                        <TableCell>{formatDate(loan.loan_date)}</TableCell>
                        <TableCell>
                          {loan.return_date
                            ? formatDate(loan.return_date)
                            : "-"}
                        </TableCell>
                        <TableCell>{getStatusChip(loan.status)}</TableCell>
                        <TableCell>
                          {loan.creator?.full_name || "N/A"}
                        </TableCell>
                        <TableCell align="right">
                          {loan.status === "loaned" &&
                            hasPermission("assets.loan.complete") && (
                              <Tooltip title="Registrar Devolución">
                                <IconButton
                                  color="primary"
                                  onClick={() => handleOpenReturnDialog(loan)}
                                >
                                  <ReturnIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                          {hasPermission("assets.loan.audit") && (
                            <Tooltip title="Ver Historial">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenTimeline(loan.id)}
                              >
                                <HistoryIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {loans.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                          No se encontraron préstamos.
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
                  onChange={(e, v) => setPage(v)}
                  color="primary"
                />
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog para registrar préstamo */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Registrar Nuevo Préstamo</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Activo</InputLabel>
                <Select
                  value={formData.asset_id}
                  label="Activo"
                  onChange={(e) =>
                    setFormData({ ...formData, asset_id: e.target.value })
                  }
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
                onChange={(e) =>
                  setFormData({ ...formData, borrower_name: e.target.value })
                }
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Cantidad"
                type="number"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Fecha de Préstamo"
                type="date"
                value={formData.loan_date}
                onChange={(e) =>
                  setFormData({ ...formData, loan_date: e.target.value })
                }
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
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSaveLoan}
            variant="contained"
            disabled={
              !formData.asset_id || !formData.borrower_name || isSubmitting
            }
            sx={{
              background: "linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)",
            }}
          >
            Registrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para registrar devolución */}
      <Dialog
        open={openReturnDialog}
        onClose={() => setOpenReturnDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Registrar Devolución</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" gutterBottom>
              Activo: <strong>{selectedLoan?.asset?.name}</strong>
            </Typography>
            <Typography variant="body2" gutterBottom>
              Cantidad Pendiente:{" "}
              <strong>
                {selectedLoan?.pending_quantity || selectedLoan?.quantity}
              </strong>
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Cantidad a devolver"
                  type="number"
                  value={returnData.quantity}
                  onChange={(e) =>
                    setReturnData({ ...returnData, quantity: e.target.value })
                  }
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Estado de Devolución</InputLabel>
                  <Select
                    value={returnData.status}
                    label="Estado de Devolución"
                    onChange={(e) =>
                      setReturnData({ ...returnData, status: e.target.value })
                    }
                  >
                    <MenuItem value="returned">
                      Devuelto en buen estado
                    </MenuItem>
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
                  onChange={(e) =>
                    setReturnData({ ...returnData, notes: e.target.value })
                  }
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenReturnDialog(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
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
