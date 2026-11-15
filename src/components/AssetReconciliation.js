import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Add as AddIcon,
  ArrowBack as BackIcon,
  CheckCircle as BalancedIcon,
  Close as CloseIcon,
  History as HistoryIcon,
  Inventory2 as InventoryIcon,
  LocalShipping as MovementIcon,
  Remove as RemoveIcon,
  ShoppingCart as SaleIcon,
  Circle as FullIcon,
  RadioButtonUnchecked as EmptyIcon,
  Save as SaveIcon,
  WarningAmber as WarningIcon,
} from "@mui/icons-material";
import { assetReconciliationAPI, assetsAPI } from "../utils/api";
import { getApiErrorMessage } from "../utils/apiErrors";
import { formatDate } from "../utils/formatters";
import { notificationSwal } from "../utils/swal-helpers";

const unwrap = (response) => response?.data?.data || response?.data || {};

const getPeruDateTime = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date()).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};

const toApiDateTime = (value) => value ? `${value.replace("T", " ")}:00` : "";

const quantityMessage = (difference, singular, plural) => {
  if (difference === 0) return `${plural} correctos`;
  const quantity = Math.abs(difference);
  return difference < 0
    ? `Falta ${quantity} ${quantity === 1 ? singular : plural}`
    : `Sobra ${quantity} ${quantity === 1 ? singular : plural}`;
};

const compareItem = (item, value, hasBaseline) => {
  const complete = value?.full_quantity !== "" && value?.full_quantity !== undefined && value?.empty_quantity !== "" && value?.empty_quantity !== undefined;
  if (!complete) return { status: "pending", item };
  const full = Number(value.full_quantity);
  const empty = Number(value.empty_quantity);
  if (!hasBaseline) {
    const expectedTotal = Number(item.asset?.available_quantity || 0);
    const totalDifference = full + empty - expectedTotal;
    return { status: totalDifference === 0 ? "balanced" : "different", item, full, empty, totalDifference };
  }
  const fullDifference = full - Number(item.expected?.full_quantity || 0);
  const emptyDifference = empty - Number(item.expected?.empty_quantity || 0);
  return {
    status: fullDifference === 0 && emptyDifference === 0 ? "balanced" : "different",
    item,
    full,
    empty,
    fullDifference,
    emptyDifference,
  };
};

const QuantityCounter = ({ label, value, expected, color, icon, onChange }) => {
  const numericValue = value === "" || value === undefined ? 0 : Math.max(0, Number(value) || 0);
  const update = (nextValue) => onChange(String(Math.max(0, nextValue)));

  return (
    <Box
      sx={(theme) => ({
        p: 1,
        borderRadius: 2,
        bgcolor: alpha(theme.palette[color].main, theme.palette.mode === "dark" ? 0.12 : 0.07),
      })}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: color + ".main" }}>
          {icon}
          <Typography variant="body2" fontWeight="900" color="text.primary">{label}</Typography>
        </Stack>
        {expected !== undefined && <Typography variant="caption" color="text.secondary">Meta {expected}</Typography>}
      </Stack>
      <Stack direction="row" spacing={0.5} alignItems="center">
        <IconButton
          aria-label={"Quitar un " + label.toLowerCase()}
          disabled={numericValue <= 0}
          onClick={() => update(numericValue - 1)}
          sx={(theme) => ({ width: 34, height: 34, bgcolor: alpha(theme.palette[color].main, 0.12), color: color + ".main" })}
        >
          <RemoveIcon />
        </IconButton>
        <TextField
          fullWidth
          type="number"
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          size="small"
          inputProps={{ min: 0, "aria-label": label, style: { textAlign: "center", fontSize: 22, fontWeight: 900, padding: "5px 2px" } }}
          sx={{ minWidth: 0, "& .MuiOutlinedInput-root": { bgcolor: "background.paper", borderRadius: 1.5 } }}
        />
        <IconButton
          aria-label={"Agregar un " + label.toLowerCase()}
          onClick={() => update(numericValue + 1)}
          sx={(theme) => ({ width: 34, height: 34, bgcolor: theme.palette[color].main, color: theme.palette[color].contrastText, "&:hover": { bgcolor: theme.palette[color].dark } })}
        >
          <AddIcon />
        </IconButton>
      </Stack>
    </Box>
  );
};

export const AssetReconciliation = ({ open, onClose, businessId, onConfigureProducts }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [view, setView] = useState("count");
  const [countedAt, setCountedAt] = useState(getPeruDateTime());
  const [preparation, setPreparation] = useState(null);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmNotes, setConfirmNotes] = useState("");
  const [pendingPayload, setPendingPayload] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [movementOpen, setMovementOpen] = useState(false);
  const [movement, setMovement] = useState({
    asset_id: "",
    type: "",
    condition: "full",
    quantity: "",
    occurred_at: getPeruDateTime(),
    counterparty: "",
    notes: "",
  });

  const items = useMemo(() => preparation?.items || [], [preparation]);

  const loadPreparation = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const response = await assetReconciliationAPI.prepare(businessId, { counted_at: toApiDateTime(countedAt) });
      const data = unwrap(response);
      setPreparation(data);
      setCounts(Object.fromEntries((data.items || []).map((item) => [item.asset.id, {
        full_quantity: item.counted?.full_quantity ?? "",
        empty_quantity: item.counted?.empty_quantity ?? "",
      }])));
    } catch (error) {
      notificationSwal("No se pudo preparar el conteo", getApiErrorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  }, [businessId, countedAt]);

  useEffect(() => {
    if (open) {
      setView("count");
      setCountedAt(getPeruDateTime());
    }
  }, [open]);

  useEffect(() => {
    if (open && countedAt) loadPreparation();
  }, [open, countedAt, loadPreparation]);

  const buildSnapshotPayload = () => {
    const invalid = items.some((item) => {
      const value = counts[item.asset.id] || {};
      return value.full_quantity === "" || value.empty_quantity === "" || Number(value.full_quantity) < 0 || Number(value.empty_quantity) < 0;
    });
    if (invalid) {
      notificationSwal("Falta completar el conteo", "Escribe llenos y vacíos de cada bien. Usa cero cuando no haya ninguno.", "warning");
      return null;
    }
    return {
      counted_at: toApiDateTime(countedAt),
      items: items.map((item) => ({
        asset_id: item.asset.id,
        full_quantity: Number(counts[item.asset.id].full_quantity),
        empty_quantity: Number(counts[item.asset.id].empty_quantity),
      })),
    };
  };

  const saveSnapshot = async (confirmed = false) => {
    const basePayload = pendingPayload || buildSnapshotPayload();
    if (!basePayload) return;
    const payload = confirmed ? { ...basePayload, confirm_unbalanced: true, notes: confirmNotes.trim() } : basePayload;
    if (confirmed && !payload.notes) {
      notificationSwal("Explica la diferencia", "Escribe una nota breve antes de confirmar el descuadre.", "warning");
      return;
    }
    setSubmitting(true);
    try {
      await assetReconciliationAPI.createSnapshot(businessId, payload);
      notificationSwal("Conteo guardado", confirmed ? "El descuadre quedó confirmado con su explicación." : "Los llenos y vacíos cuadran correctamente.", "success");
      setConfirmOpen(false);
      setPendingPayload(null);
      setConfirmNotes("");
      onClose();
    } catch (error) {
      if (error.response?.status === 409 && error.response?.data?.requires_confirmation) {
        setPendingPayload(basePayload);
        setConfirmOpen(true);
      } else {
        notificationSwal("No se pudo guardar", getApiErrorMessage(error), "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const loadHistory = async () => {
    setView("history");
    setHistoryLoading(true);
    try {
      const response = await assetReconciliationAPI.getSnapshots(businessId);
      const data = unwrap(response);
      setHistory(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      notificationSwal("No se pudo cargar el historial", getApiErrorMessage(error), "error");
    } finally {
      setHistoryLoading(false);
    }
  };

  const openSnapshot = async (snapshot) => {
    try {
      const response = await assetReconciliationAPI.getSnapshot(businessId, snapshot.id);
      setSelectedSnapshot(unwrap(response));
    } catch (error) {
      notificationSwal("No se pudo abrir el conteo", getApiErrorMessage(error), "error");
    }
  };

  const saveMovement = async () => {
    const quantity = Number(movement.quantity);
    const external = movement.type === "external_in" || movement.type === "external_out";
    if (!movement.asset_id || !movement.type || !Number.isFinite(quantity) || quantity <= 0 || !movement.occurred_at) {
      notificationSwal("Revisa el movimiento", "Selecciona qué ocurrió, el bien, una cantidad mayor que cero y la fecha.", "warning");
      return;
    }
    if (external && (!movement.condition || !movement.counterparty.trim())) {
      notificationSwal("Faltan datos", "Indica si son llenos o vacíos y quién entrega o recibe.", "warning");
      return;
    }
    const payload = {
      asset_id: movement.asset_id,
      type: movement.type,
      quantity,
      occurred_at: toApiDateTime(movement.occurred_at),
      notes: movement.notes,
      ...(external ? { condition: movement.condition, counterparty: movement.counterparty.trim() } : {}),
    };
    setSubmitting(true);
    try {
      await assetReconciliationAPI.createMovement(businessId, payload);
      notificationSwal("Movimiento guardado", "El conteo esperado ya considera este movimiento.", "success");
      setMovementOpen(false);
      setMovement({ asset_id: "", type: "", condition: "full", quantity: "", occurred_at: getPeruDateTime(), counterparty: "", notes: "" });
      loadPreparation();
    } catch (error) {
      notificationSwal("No se pudo guardar", getApiErrorMessage(error), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openMovementDialog = () => {
    setMovement({ asset_id: "", type: "", condition: "full", quantity: "", occurred_at: getPeruDateTime(), counterparty: "", notes: "" });
    setMovementOpen(true);
  };

  const hasBaseline = Boolean(preparation?.base_snapshot);
  const comparisonItems = useMemo(
    () => items.map((item) => compareItem(item, counts[item.asset.id], hasBaseline)),
    [items, counts, hasBaseline],
  );
  const comparisonSummary = comparisonItems.reduce((summary, comparison) => ({
    ...summary,
    [comparison.status]: summary[comparison.status] + 1,
  }), { pending: 0, balanced: 0, different: 0 });
  const selectedMovementItem = items.find((item) => String(item.asset.id) === String(movement.asset_id));

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth fullScreen={fullScreen} PaperProps={{ sx: { borderRadius: fullScreen ? 0 : 2.5, overflow: "hidden" } }}>
        <DialogTitle
          sx={(currentTheme) => ({
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            px: { xs: 1.25, sm: 2 },
            py: 1.25,
            color: currentTheme.palette.common.white,
            background: "linear-gradient(120deg, " + currentTheme.palette.primary.dark + ", " + currentTheme.palette.secondary.main + ")",
          })}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            {view === "history" && <IconButton onClick={() => setView("count")} sx={{ color: "inherit" }}><BackIcon /></IconButton>}
            <InventoryIcon />
            <Typography variant="h6" fontWeight="900">{view === "count" ? "Contar llenos y vacíos" : "Historial de conteos"}</Typography>
          </Stack>
          <IconButton onClick={onClose} sx={{ color: "inherit", bgcolor: "rgba(255,255,255,.1)" }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            p: { xs: 1.25, sm: 2 },
            bgcolor: theme.palette.mode === "dark" ? alpha(theme.palette.primary.main, 0.045) : alpha(theme.palette.primary.main, 0.025),
            backgroundImage: "radial-gradient(circle at top right, " + alpha(theme.palette.secondary.main, 0.08) + ", transparent 32%)",
          }}
        >
          {view === "count" ? (
            <>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ sm: "center" }} sx={{ mb: 1.25 }}>
                <TextField fullWidth size="small" type="datetime-local" label="Fecha del conteo" value={countedAt} onChange={(event) => setCountedAt(event.target.value)} onBlur={loadPreparation} InputLabelProps={{ shrink: true }} sx={{ maxWidth: { sm: 250 } }} />
                <Stack direction="row" spacing={0.5}>
                  <Button size="small" startIcon={<MovementIcon />} onClick={openMovementDialog}>Entrada o salida</Button>
                  <Button size="small" startIcon={<HistoryIcon />} onClick={loadHistory}>Historial</Button>
                </Stack>
              </Stack>
              {preparation?.base_snapshot && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.25 }}>
                  Comparando con {formatDate(preparation.base_snapshot.counted_at, "DD/MM/YYYY HH:mm")}
                </Typography>
              )}
              {!loading && items.length > 0 && (
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", mb: 1.5, py: 0.75, borderRadius: 2, bgcolor: "action.hover" }}>
                  <Box sx={{ textAlign: "center" }}><Typography fontWeight="900" color="primary.main">{comparisonSummary.pending}</Typography><Typography variant="caption" color="text.secondary">Pendientes</Typography></Box>
                  <Box sx={{ textAlign: "center" }}><Typography fontWeight="900" color="success.main">{comparisonSummary.balanced}</Typography><Typography variant="caption" color="text.secondary">Correctos</Typography></Box>
                  <Box sx={{ textAlign: "center" }}><Typography fontWeight="900" color={comparisonSummary.different ? "error.main" : "text.secondary"}>{comparisonSummary.different}</Typography><Typography variant="caption" color="text.secondary">Revisar</Typography></Box>
                </Box>
              )}
              {loading ? (
                <Box sx={{ py: 8, textAlign: "center" }}><CircularProgress /></Box>
              ) : items.length === 0 ? (
                <Alert severity="info">No hay bienes disponibles para contar.</Alert>
              ) : (
                <Grid container spacing={1.25}>
                  {items.map((item) => {
                    const value = counts[item.asset.id] || {};
                    const comparison = compareItem(item, value, hasBaseline);
                    const movementBadges = [
                      { label: "ventas", value: item.movements?.sales, sign: "−", color: "error" },
                      { label: "prestados", value: item.movements?.loaned_out, sign: "−", color: "warning" },
                      { label: "devueltos", value: item.movements?.returned_in, sign: "+", color: "success" },
                      { label: "recargados", value: item.movements?.refilled, sign: "+", color: "info" },
                      { label: "llenos recibidos", value: item.movements?.external_in_full, sign: "+", color: "success" },
                      { label: "vacíos recibidos", value: item.movements?.external_in_empty, sign: "+", color: "success" },
                      { label: "llenos devueltos", value: item.movements?.external_out_full, sign: "−", color: "warning" },
                      { label: "vacíos devueltos", value: item.movements?.external_out_empty, sign: "−", color: "warning" },
                    ].filter((movementItem) => Number(movementItem.value) > 0);
                    const cardColor = comparison.status === "balanced" ? theme.palette.success.main : comparison.status === "different" ? theme.palette.error.main : theme.palette.divider;
                    return (
                      <Grid item xs={12} md={6} key={item.asset.id}>
                        <Card
                          variant="outlined"
                          sx={{
                            borderRadius: 2,
                            height: "100%",
                            borderColor: comparison.status === "different" ? alpha(theme.palette.error.main, 0.55) : "divider",
                            bgcolor: comparison.status === "balanced" ? alpha(theme.palette.success.main, 0.025) : comparison.status === "different" ? alpha(theme.palette.error.main, 0.025) : "background.paper",
                          }}
                        >
                          <CardContent sx={{ p: 1.25, "&:last-child": { pb: 1.25 } }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                              <InventoryIcon sx={{ color: cardColor }} />
                              <Box>
                                <Typography fontWeight="900" lineHeight={1.2}>{item.asset.name}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {preparation?.base_snapshot
                                    ? `Esperado: ${item.expected?.full_quantity ?? 0} llenos + ${item.expected?.empty_quantity ?? 0} vacíos`
                                    : `Primer conteo: distribuye los ${item.asset.available_quantity} disponibles`}
                                </Typography>
                              </Box>
                              </Stack>
                              <Chip
                                size="small"
                                color={comparison.status === "balanced" ? "success" : comparison.status === "different" ? "error" : "default"}
                                label={comparison.status === "balanced" ? "Cuadra" : comparison.status === "different" ? "Revisar" : `Total: ${item.expected?.total_quantity ?? item.asset.available_quantity}`}
                              />
                            </Stack>
                            {movementBadges.length > 0 && (
                              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                                {movementBadges.map((movementItem) => (
                                  <Typography key={movementItem.label} variant="caption" fontWeight="800" color={movementItem.color + ".main"}>
                                    {movementItem.sign}{movementItem.value} {movementItem.label}
                                  </Typography>
                                ))}
                              </Stack>
                            )}
                            <Grid container spacing={1}>
                              <Grid item xs={6}>
                                <QuantityCounter
                                  label="Llenos"
                                  value={value.full_quantity}
                                  expected={hasBaseline ? item.expected?.full_quantity ?? 0 : undefined}
                                  color="success"
                                  icon={<FullIcon fontSize="small" />}
                                  onChange={(nextValue) => setCounts((current) => ({ ...current, [item.asset.id]: { ...current[item.asset.id], full_quantity: nextValue } }))}
                                />
                              </Grid>
                              <Grid item xs={6}>
                                <QuantityCounter
                                  label="Vacíos"
                                  value={value.empty_quantity}
                                  expected={hasBaseline ? item.expected?.empty_quantity ?? 0 : undefined}
                                  color="warning"
                                  icon={<EmptyIcon fontSize="small" />}
                                  onChange={(nextValue) => setCounts((current) => ({ ...current, [item.asset.id]: { ...current[item.asset.id], empty_quantity: nextValue } }))}
                                />
                              </Grid>
                            </Grid>
                            <Box sx={{ mt: 1 }}>
                              {comparison.status === "balanced" && <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center" sx={{ color: "success.main" }}><BalancedIcon fontSize="small" /><Typography variant="body2" fontWeight="900">Todo cuadra</Typography></Stack>}
                              {comparison.status === "different" && hasBaseline && (
                                <Grid container spacing={1}>
                                  <Grid item xs={6}><Box sx={{ p: 0.75, textAlign: "center", borderRadius: 1.5, bgcolor: comparison.fullDifference === 0 ? alpha(theme.palette.success.main, 0.08) : alpha(theme.palette.error.main, 0.08) }}><Typography variant="caption" fontWeight="900" color={comparison.fullDifference === 0 ? "success.main" : "error.main"}>{quantityMessage(comparison.fullDifference, "lleno", "llenos")}</Typography></Box></Grid>
                                  <Grid item xs={6}><Box sx={{ p: 0.75, textAlign: "center", borderRadius: 1.5, bgcolor: comparison.emptyDifference === 0 ? alpha(theme.palette.success.main, 0.08) : alpha(theme.palette.error.main, 0.08) }}><Typography variant="caption" fontWeight="900" color={comparison.emptyDifference === 0 ? "success.main" : "error.main"}>{quantityMessage(comparison.emptyDifference, "vacío", "vacíos")}</Typography></Box></Grid>
                                </Grid>
                              )}
                              {comparison.status === "different" && !hasBaseline && <Typography variant="caption" color="warning.main" fontWeight="800">{quantityMessage(comparison.totalDifference, "bien en total", "bienes en total")}</Typography>}
                            </Box>
                            {!item.sales_tracking_enabled && (
                              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 0.75 }}>
                                <Typography variant="caption" color="warning.main">Ventas sin vincular</Typography>
                                {onConfigureProducts && <Button color="warning" size="small" onClick={() => onConfigureProducts(item.asset)}>Vincular</Button>}
                              </Stack>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              )}
            </>
          ) : (
            <Box>
              {historyLoading ? (
                <Box sx={{ py: 8, textAlign: "center" }}><CircularProgress /></Box>
              ) : history.length === 0 ? (
                <Alert severity="info">Todavía no hay conteos guardados.</Alert>
              ) : (
                <Stack spacing={1.5}>
                  {history.map((snapshot) => (
                    <Paper key={snapshot.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ sm: "center" }}>
                        <Box>
                          <Typography fontWeight="800">{formatDate(snapshot.counted_at, "DD/MM/YYYY HH:mm")}</Typography>
                          <Typography variant="caption" color="text.secondary">{snapshot.items?.length ?? snapshot.items_count ?? 0} bienes contados</Typography>
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            size="small"
                            icon={snapshot.status === "balanced" ? <BalancedIcon /> : <WarningIcon />}
                            color={snapshot.status === "balanced" ? "success" : "warning"}
                            label={snapshot.status === "balanced" ? "Cuadrado" : "Con diferencia"}
                          />
                          <Button size="small" onClick={() => openSnapshot(snapshot)}>Ver detalle</Button>
                        </Stack>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Box>
          )}
        </DialogContent>
        {view === "count" && (
          <DialogActions sx={{ px: { xs: 1.25, sm: 2 }, py: 1, gap: 0.5, bgcolor: "background.paper" }}>
            <Typography variant="caption" fontWeight="800" color={comparisonSummary.different ? "warning.main" : comparisonSummary.pending ? "text.secondary" : "success.main"} sx={{ mr: "auto" }}>
              {comparisonSummary.pending ? (items.length - comparisonSummary.pending) + "/" + items.length + " listos" : comparisonSummary.different ? "Revisar" : "Todo listo"}
            </Typography>
            <Button size="small" onClick={onClose}>Cancelar</Button>
            <Button
              variant="contained"
              size="medium"
              color={comparisonSummary.different ? "warning" : "success"}
              startIcon={<SaveIcon />}
              onClick={() => saveSnapshot(false)}
              disabled={loading || submitting || items.length === 0 || comparisonSummary.pending > 0}
            >
              Guardar conteo
            </Button>
          </DialogActions>
        )}
      </Dialog>

      <Dialog open={movementOpen} onClose={() => setMovementOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2.5, overflow: "hidden" } }}>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, p: 1.5, color: "primary.contrastText", bgcolor: "primary.main" }}><MovementIcon /> Anotar entrada o salida</DialogTitle>
        <DialogContent dividers sx={{ p: { xs: 1.25, sm: 2 } }}>
          <Grid container spacing={1.25}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Bien</InputLabel>
                <Select value={movement.asset_id} label="Bien" onChange={(event) => setMovement({ ...movement, asset_id: event.target.value })}>
                  {items.map((item) => <MenuItem key={item.asset.id} value={item.asset.id}>{item.asset.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Typography fontWeight="900" sx={{ mb: 0.75 }}>¿Qué ocurrió?</Typography>
              <Grid container spacing={0.75}>
                {[
                  { value: "sale_help", label: "🛒 Vendí un bien", color: "success" },
                  { value: "refill", label: "🔄 Recargué vacíos", color: "secondary" },
                  { value: "external_in", label: "⬅️ Recibí bienes", color: "info" },
                  { value: "external_out", label: "➡️ Devolví bienes", color: "warning" },
                ].map((option) => (
                  <Grid item xs={12} sm={6} key={option.value}>
                    <Button
                      fullWidth
                      size="medium"
                      color={option.color}
                      variant={movement.type === option.value ? "contained" : "outlined"}
                      onClick={() => setMovement({ ...movement, type: option.value })}
                      sx={{ justifyContent: "flex-start", borderRadius: 1.5, py: 0.75, fontWeight: 800 }}
                    >
                      {option.label}
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </Grid>
            {movement.type === "sale_help" ? (
              <Grid item xs={12}>
                <Alert
                  severity={selectedMovementItem?.sales_tracking_enabled ? "success" : "warning"}
                  icon={<SaleIcon />}
                  action={!selectedMovementItem?.sales_tracking_enabled && selectedMovementItem && onConfigureProducts ? (
                    <Button color="inherit" size="small" onClick={() => { setMovementOpen(false); onConfigureProducts(selectedMovementItem.asset); }}>Vincular productos</Button>
                  ) : null}
                >
                  {selectedMovementItem?.sales_tracking_enabled
                    ? "No necesitas registrarla otra vez: la venta ya se descuenta automáticamente del número de llenos."
                    : selectedMovementItem
                      ? "Este bien todavía no reconoce sus ventas. Vincula los productos que lo entregan para que se descuenten automáticamente."
                      : "Selecciona primero el bien vendido. Las ventas se toman automáticamente desde los productos vinculados."}
                </Alert>
              </Grid>
            ) : movement.type ? (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth type="number" label="Cantidad" value={movement.quantity} onChange={(event) => setMovement({ ...movement, quantity: event.target.value })} inputProps={{ min: 1 }} />
                </Grid>
                {(movement.type === "external_in" || movement.type === "external_out") && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Estado</InputLabel>
                        <Select value={movement.condition} label="Estado" onChange={(event) => setMovement({ ...movement, condition: event.target.value })}>
                          <MenuItem value="full">Llenos</MenuItem>
                          <MenuItem value="empty">Vacíos</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth label={movement.type === "external_in" ? "¿Quién los entregó?" : "¿A quién se devolvieron?"} value={movement.counterparty} onChange={(event) => setMovement({ ...movement, counterparty: event.target.value })} />
                    </Grid>
                  </>
                )}
                <Grid item xs={12}>
                  <TextField fullWidth type="datetime-local" label="Fecha y hora" value={movement.occurred_at} onChange={(event) => setMovement({ ...movement, occurred_at: event.target.value })} InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth multiline rows={2} label="Nota (opcional)" value={movement.notes} onChange={(event) => setMovement({ ...movement, notes: event.target.value })} />
                </Grid>
              </>
            ) : (
              <Grid item xs={12}>
                <Alert severity="info">Elige qué ocurrió para mostrar únicamente los datos necesarios.</Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMovementOpen(false)}>{movement.type === "sale_help" ? "Entendido" : "Cancelar"}</Button>
          {movement.type && movement.type !== "sale_help" && <Button variant="contained" onClick={saveMovement} disabled={submitting}>Guardar movimiento</Button>}
        </DialogActions>
      </Dialog>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, color: "warning.main" }}><WarningIcon /> El conteo no cuadra</DialogTitle>
        <DialogContent dividers>
          <Alert severity="warning" sx={{ mb: 2 }}>Revisa físicamente una vez más. Si las cantidades son correctas, explica brevemente la diferencia.</Alert>
          {comparisonItems.filter((comparison) => comparison.status === "different").map((comparison) => (
            <Paper key={comparison.item.asset.id} variant="outlined" sx={{ p: 1.5, mb: 1, borderRadius: 2, borderColor: "error.main" }}>
              <Typography fontWeight="900">{comparison.item.asset.name}</Typography>
              {hasBaseline ? (
                <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                  <Typography variant="body2" color={comparison.fullDifference === 0 ? "success.main" : "error.main"}>{quantityMessage(comparison.fullDifference, "lleno", "llenos")}</Typography>
                  <Typography variant="body2" color={comparison.emptyDifference === 0 ? "success.main" : "error.main"}>{quantityMessage(comparison.emptyDifference, "vacío", "vacíos")}</Typography>
                </Stack>
              ) : (
                <Typography variant="body2" color="error.main">{quantityMessage(comparison.totalDifference, "bien en total", "bienes en total")}</Typography>
              )}
            </Paper>
          ))}
          <TextField
            fullWidth
            required
            multiline
            rows={3}
            label="¿Por qué existe la diferencia?"
            placeholder="Ejemplo: se verificó y falta un balón"
            value={confirmNotes}
            onChange={(event) => setConfirmNotes(event.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Volver a revisar</Button>
          <Button variant="contained" color="warning" onClick={() => saveSnapshot(true)} disabled={submitting || !confirmNotes.trim()}>Confirmar diferencia</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(selectedSnapshot)} onClose={() => setSelectedSnapshot(null)} maxWidth="md" fullWidth>
        <DialogTitle>Detalle del conteo</DialogTitle>
        <DialogContent dividers>
          {selectedSnapshot && (
            <>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Typography fontWeight="800">{formatDate(selectedSnapshot.counted_at, "DD/MM/YYYY HH:mm")}</Typography>
                <Chip size="small" color={selectedSnapshot.status === "balanced" ? "success" : "warning"} label={selectedSnapshot.status === "balanced" ? "Cuadrado" : "Con diferencia"} />
              </Stack>
              <Grid container spacing={1.5}>
                {(selectedSnapshot.items || []).map((item, index) => (
                  <Grid item xs={12} sm={6} key={item.id || item.asset_id || index}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Typography fontWeight="800">{item.asset?.name || item.asset_name || `Bien ${index + 1}`}</Typography>
                      <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                        <Typography variant="body2">Llenos: <strong>{item.counted?.full_quantity ?? item.full_quantity ?? 0}</strong></Typography>
                        <Typography variant="body2">Vacíos: <strong>{item.counted?.empty_quantity ?? item.empty_quantity ?? 0}</strong></Typography>
                      </Stack>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
              {selectedSnapshot.notes && <Alert severity="info" sx={{ mt: 2 }}>{selectedSnapshot.notes}</Alert>}
            </>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setSelectedSnapshot(null)}>Cerrar</Button></DialogActions>
      </Dialog>
    </>
  );
};

export const AssetProductMappingDialog = ({ open, onClose, asset }) => {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !asset?.id) return;
    setSearch("");
    setLoading(true);
    assetsAPI.getReconciliationProducts(asset.id)
      .then((response) => {
        const data = unwrap(response);
        setProducts((data.products || []).map((product) => ({
          ...product,
          units_per_sale: product.units_per_sale || 1,
        })));
      })
      .catch((error) => notificationSwal("No se pudieron cargar los productos", getApiErrorMessage(error), "error"))
      .finally(() => setLoading(false));
  }, [open, asset?.id]);

  const visibleProducts = products.filter((product) => product.name?.toLowerCase().includes(search.toLowerCase()));
  const selectedCount = products.filter((product) => product.selected).length;

  const save = async () => {
    const selected = products.filter((product) => product.selected);
    if (selected.some((product) => !Number.isFinite(Number(product.units_per_sale)) || Number(product.units_per_sale) <= 0)) {
      notificationSwal("Revisa las unidades", "Cada producto seleccionado debe descontar al menos un bien por venta.", "warning");
      return;
    }
    setSubmitting(true);
    try {
      await assetsAPI.setReconciliationProducts(asset.id, selected.map((product) => ({
        product_id: product.id,
        units_per_sale: Number(product.units_per_sale),
      })));
      notificationSwal("Productos vinculados", selected.length ? "Las ventas de estos productos ya se contarán automáticamente." : "Este bien quedó sin productos vinculados.", "success");
      onClose();
    } catch (error) {
      notificationSwal("No se pudo guardar", getApiErrorMessage(error), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6" fontWeight="900">Productos de {asset?.name}</Typography>
        <Typography variant="body2" color="text.secondary">Marca qué ventas entregan este bien lleno.</Typography>
      </DialogTitle>
      <DialogContent dividers>
        <TextField fullWidth size="small" placeholder="Buscar producto" value={search} onChange={(event) => setSearch(event.target.value)} sx={{ mb: 2 }} />
        {loading ? (
          <Box sx={{ py: 6, textAlign: "center" }}><CircularProgress /></Box>
        ) : visibleProducts.length === 0 ? (
          <Alert severity="info">No hay productos para mostrar.</Alert>
        ) : (
          <Stack spacing={1}>
            {visibleProducts.map((product) => (
              <Paper key={product.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderColor: product.selected ? "primary.main" : "divider" }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Checkbox
                    checked={Boolean(product.selected)}
                    onChange={(event) => setProducts((current) => current.map((item) => item.id === product.id ? { ...item, selected: event.target.checked } : item))}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontWeight="700">{product.name}</Typography>
                    {product.mapped_asset && product.mapped_asset.id !== asset?.id && (
                      <Typography variant="caption" color="warning.main">Actualmente pertenece a {product.mapped_asset.name}; al guardar se moverá aquí.</Typography>
                    )}
                  </Box>
                  {product.selected && (
                    <TextField
                      size="small"
                      type="number"
                      label="Bienes por venta"
                      value={product.units_per_sale}
                      onChange={(event) => setProducts((current) => current.map((item) => item.id === product.id ? { ...item, units_per_sale: event.target.value } : item))}
                      inputProps={{ min: 1 }}
                      sx={{ width: 130 }}
                    />
                  )}
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Typography variant="caption" color="text.secondary" sx={{ mr: "auto" }}>{selectedCount} seleccionados</Typography>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={save} disabled={loading || submitting}>Guardar productos</Button>
      </DialogActions>
    </Dialog>
  );
};
