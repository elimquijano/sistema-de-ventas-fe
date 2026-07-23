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
  Stack,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
} from "@mui/material";
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Edit as EditIcon,
  GetApp as ExportIcon,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { formatCurrency, formatDate } from "../utils/formatters";
import { confirmSwal, notificationSwal } from "../utils/swal-helpers";
import { purchasesAPI } from "../utils/api";
import { CreatePurchase } from "../components/CreatePurchase";
import { exportToExcel } from "../utils/excelExport";

export const Purchases = () => {
  const { hasPermission } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [searchFilters, setSearchFilters] = useState({});
  const [datePreset, setDatePreset] = useState("all");
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New states for Create and Edit
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [editFormData, setEditFormData] = useState({
    supplier_name: "",
    purchase_date: "",
    notes: "",
  });

  useEffect(() => {
    loadPurchases();
  }, [page, perPage, searchFilters]);

  const loadPurchases = async () => {
    setIsLoading(true);
    try {
      const response = await purchasesAPI.getAll({ page, per_page: perPage, ...searchFilters });
      setPurchases(response.data.data);
      setTotalPages(response.data.last_page);
    } catch (error) {
      console.error("Error loading purchases:", error);
      notificationSwal(
        "Error",
        "Hubo un error al cargar las compras.",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDatePresetChange = (event) => {
    const preset = event.target.value;
    setDatePreset(preset);

    const today = new Date();
    let date_from = "";
    let date_to = "";

    const formatDateInput = (date) => {
      return date.toISOString().split("T")[0];
    };

    if (preset === "today") {
      date_from = formatDateInput(today);
      date_to = formatDateInput(today);
    } else if (preset === "yesterday") {
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      date_from = formatDateInput(yesterday);
      date_to = formatDateInput(yesterday);
    } else if (preset === "this_month") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      date_from = formatDateInput(firstDay);
      date_to = formatDateInput(lastDay);
    }

    setSearchFilters((prev) => {
      const newFilters = { ...prev };
      if (preset === "all" || preset === "custom") {
        delete newFilters.date_from;
        delete newFilters.date_to;
      } else {
        newFilters.date_from = date_from;
        newFilters.date_to = date_to;
      }
      return newFilters;
    });
    setPage(1);
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

  const handleViewPurchase = (purchase) => {
    setSelectedPurchase(purchase);
    setOpenViewDialog(true);
  };

  const handleDeletePurchase = async (purchaseId) => {
    const userConfirmed = await confirmSwal(
      "¿Estás seguro?",
      "Esta acción eliminará la compra permanentemente y revertirá el stock de los productos.",
      { confirmButtonText: "Sí, eliminar", icon: "warning" }
    );

    if (userConfirmed) {
      setIsSubmitting(true);
      try {
        await purchasesAPI.delete(purchaseId);
        notificationSwal(
          "Compra Eliminada",
          "La compra ha sido eliminada exitosamente.",
          "success"
        );
        loadPurchases();
      } catch (error) {
        console.error("Error deleting purchase:", error);
        notificationSwal("Error", "Error al eliminar la compra.", "error");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleExportToExcel = () => {
    const dataToExport = purchases.map((purchase) => ({
      Número: purchase.purchase_number,
      Proveedor: purchase.supplier_name || "N/A",
      Total: purchase.total_amount,
      Fecha: formatDate(purchase.purchase_date),
      "Registrado Por": purchase.creator?.full_name || "N/A",
      Notas: purchase.notes || "N/A",
    }));
    exportToExcel(dataToExport, "compras_reporte", "Compras");
  };

  const handleEditPurchase = (purchase) => {
    setEditingPurchase(purchase);
    setEditFormData({
      supplier_name: purchase.supplier_name || "",
      purchase_date: purchase.purchase_date
        ? purchase.purchase_date.split("T")[0]
        : "",
      notes: purchase.notes || "",
    });
    setOpenEditDialog(true);
  };

  const handleSaveEditedPurchase = async () => {
    setIsSubmitting(true);
    try {
      await purchasesAPI.update(editingPurchase.id, editFormData);
      notificationSwal("Éxito", "Compra actualizada correctamente.", "success");
      setOpenEditDialog(false);
      loadPurchases();
    } catch (error) {
      console.error("Error updating purchase:", error);
      notificationSwal("Error", "No se pudo actualizar la compra.", "error");
    } finally {
      setIsSubmitting(false);
    }
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
          Compras
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={handleExportToExcel}
            disabled={purchases.length === 0}
          >
            Exportar
          </Button>

          {hasPermission("compras.create") && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenCreateDialog(true)}
            >
              Nueva Compra
            </Button>
          )}
        </Box>
      </Box>

      <Card>
        <CardContent>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Buscar por número o proveedor..."
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
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Rango de Fecha</InputLabel>
                <Select
                  value={datePreset}
                  label="Rango de Fecha"
                  onChange={handleDatePresetChange}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="today">Hoy</MenuItem>
                  <MenuItem value="yesterday">Ayer</MenuItem>
                  <MenuItem value="this_month">Este Mes</MenuItem>
                  <MenuItem value="custom">Personalizado</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {datePreset === "custom" && (
              <>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Desde"
                    type="date"
                    name="date_from"
                    value={searchFilters.date_from || ""}
                    onChange={handleChangeFilter}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Hasta"
                    type="date"
                    name="date_to"
                    value={searchFilters.date_to || ""}
                    onChange={handleChangeFilter}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </>
            )}
          </Grid>

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Número</TableCell>
                  <TableCell>Proveedor</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Registrado Por</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      {/* <CircularProgress /> */}
                    </TableCell>
                  </TableRow>
                ) : purchases.length > 0 ? (
                  purchases.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell>{purchase.purchase_number}</TableCell>
                      <TableCell>{purchase.supplier_name || "-"}</TableCell>
                      <TableCell>
                        {formatCurrency(purchase.total_amount)}
                      </TableCell>
                      <TableCell>
                        {formatDate(purchase.purchase_date)}
                      </TableCell>
                      <TableCell>{purchase.creator?.full_name}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleViewPurchase(purchase)}
                        >
                          <ViewIcon />
                        </IconButton>
                        {hasPermission("compras.edit") && (
                          <IconButton
                            size="small"
                            onClick={() => handleEditPurchase(purchase)}
                          >
                            <EditIcon />
                          </IconButton>
                        )}
                        {hasPermission("compras.delete") && (
                          <IconButton
                            size="small"
                            onClick={() => handleDeletePurchase(purchase.id)}
                            color="error"
                            disabled={isSubmitting}
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No se encontraron compras.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, mt: 3, flexWrap: "wrap" }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Mostrar</InputLabel>
              <Select
                value={perPage}
                label="Mostrar"
                onChange={(event) => { setPerPage(Number(event.target.value)); setPage(1); }}
              >
                {[10, 100, 1000, 10000].map((value) => <MenuItem key={value} value={value}>{value} registros</MenuItem>)}
              </Select>
            </FormControl>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(event, value) => setPage(value)}
              color="primary"
            />
          </Box>
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog
        open={openViewDialog}
        onClose={() => setOpenViewDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Detalles de Compra - {selectedPurchase?.purchase_number}
        </DialogTitle>
        <DialogContent dividers>
          {selectedPurchase && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Información General
                </Typography>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Proveedor
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {selectedPurchase.supplier_name || "N/A"}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Fecha de Compra
                      </Typography>
                      <Typography variant="body1">
                        {formatDate(selectedPurchase.purchase_date)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Registrado Por
                      </Typography>
                      <Typography variant="body1">
                        {selectedPurchase.creator?.full_name}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">
                        Notas
                      </Typography>
                      <Typography variant="body1">
                        {selectedPurchase.notes || "Sin notas"}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Productos
                </Typography>
                <List
                  dense
                  component={Paper}
                  variant="outlined"
                  sx={{ maxHeight: 300, overflow: "auto" }}
                >
                  {selectedPurchase.items?.map((item, index) => (
                    <React.Fragment key={index}>
                      <ListItem>
                        <ListItemText
                          primary={item.product_name}
                          secondary={`Cant: ${item.quantity} x ${formatCurrency(
                            item.cost
                          )}`}
                        />
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {formatCurrency(item.subtotal)}
                        </Typography>
                      </ListItem>
                      {index < selectedPurchase.items.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mt: 2,
                    pt: 2,
                    borderTop: 1,
                    borderColor: "divider",
                  }}
                >
                  <Typography variant="h6">Total:</Typography>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 700, color: "primary.main" }}
                  >
                    {formatCurrency(selectedPurchase.total_amount)}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewDialog(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Create Purchase Modal (Super Wide) */}
      <Dialog
        open={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle>Registrar Nueva Compra</DialogTitle>
        <DialogContent>
          <CreatePurchase
            onSuccess={() => {
              setOpenCreateDialog(false);
              loadPurchases();
            }}
            onCancel={() => setOpenCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Purchase Modal (Restricted Fields) */}
      <Dialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Editar Compra - {editingPurchase?.purchase_number}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Proveedor"
              fullWidth
              value={editFormData.supplier_name}
              onChange={(e) =>
                setEditFormData({
                  ...editFormData,
                  supplier_name: e.target.value,
                })
              }
            />
            <TextField
              label="Fecha de Compra"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={editFormData.purchase_date}
              onChange={(e) =>
                setEditFormData({
                  ...editFormData,
                  purchase_date: e.target.value,
                })
              }
            />
            <TextField
              label="Notas"
              fullWidth
              multiline
              rows={3}
              value={editFormData.notes}
              onChange={(e) =>
                setEditFormData({ ...editFormData, notes: e.target.value })
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenEditDialog(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveEditedPurchase}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Guardar Cambios"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
