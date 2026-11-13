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
  Avatar,
  Divider,
  alpha,
  useTheme,
  Alert,
  Tooltip,
  Stack,
  FormControlLabel,
  Switch,
} from "@mui/material";
import {
  Settings as SettingsIcon,
  EventBusy as AbsentIcon,
  AttachMoney as MoneyIcon,
  Calculate as CalculateIcon,
  CheckCircle as PayIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  History as HistoryIcon,
  WarningAmber as WarningIcon,
  CalendarMonth as CalendarIcon,
  ChevronLeft as PreviousIcon,
  ChevronRight as NextIcon,
} from "@mui/icons-material";
import { formatCurrency, formatDate, getCurrentPeruDate } from "../utils/formatters";
import { notificationSwal, confirmSwal } from "../utils/swal-helpers";
import { usersAPI, payrollAPI } from "../utils/api";
import { getApiErrorMessage } from "../utils/apiErrors";

const ATTENDANCE_STATUSES = {
  absent: { label: "Faltó", color: "error" },
};

const WEEK_DAYS = [
  ["mon", "Lun"],
  ["tue", "Mar"],
  ["wed", "Mié"],
  ["thu", "Jue"],
  ["fri", "Vie"],
  ["sat", "Sáb"],
  ["sun", "Dom"],
];

const DEFAULT_SCHEDULE = {
  mon: true,
  tue: true,
  wed: true,
  thu: true,
  fri: true,
  sat: false,
  sun: false,
};

const unwrapRows = (response) => {
  const rows = response?.data?.data ?? response?.data ?? [];
  return Array.isArray(rows) ? rows : [];
};

const rowUserId = (row) =>
  row?.user_id ?? row?.employee_id ?? row?.user?.id ?? row?.employee?.id;

export const Payroll = () => {
  const theme = useTheme();
  const [users, setUsers] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dialogs
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [advanceDialogOpen, setAdvanceDialogOpen] = useState(false);
  const [calcDialogOpen, setCalcDialogOpen] = useState(false);
  const [advancesDetailsDialogOpen, setAdvancesDetailsDialogOpen] = useState(false);
  const [absencesDetailsDialogOpen, setAbsencesDetailsDialogOpen] = useState(false);
  const [bulkAbsenceDialogOpen, setBulkAbsenceDialogOpen] = useState(false);
  const [paymentDetailsDialogOpen, setPaymentDetailsDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  const [selectedUser, setSelectedUser] = useState(null);
  const selectedUserId = selectedUser?.id;
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(getCurrentPeruDate().slice(0, 7));
  
  // Form States
  const [configData, setConfigData] = useState({
    base_salary: "",
    payment_frequency: "monthly",
    start_date: "",
    work_schedule: DEFAULT_SCHEDULE,
  });

  const [attendanceData, setAttendanceData] = useState({
    id: null,
    user_id: "",
    date: getCurrentPeruDate(),
    notes: ""
  });

  const [advanceData, setAdvanceData] = useState({
    id: null,
    user_id: "",
    amount: "",
    date: getCurrentPeruDate(),
    description: ""
  });

  const [calcParams, setCalcParams] = useState({
    end_date: getCurrentPeruDate(),
    payment_date: getCurrentPeruDate(),
    notes: "",
  });

  const [bulkAbsenceData, setBulkAbsenceData] = useState({
    user_id: "",
    start_date: getCurrentPeruDate(),
    end_date: getCurrentPeruDate(),
    notes: "",
    overwrite: false,
    exclude_dates: "",
  });

  const [calcResult, setCalcResult] = useState(null);
  const [loadingCalc, setLoadingCalc] = useState(false);

  useEffect(() => {
    loadUsers();
    loadPayrollRecords();
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!selectedUserId) {
      setSelectedConfig(null);
      return () => { cancelled = true; };
    }
    payrollAPI.getConfig(selectedUserId)
      .then((response) => {
        if (!cancelled) setSelectedConfig(response.data?.data || response.data || null);
      })
      .catch(() => {
        if (!cancelled) setSelectedConfig(null);
      });
    return () => { cancelled = true; };
  }, [selectedUserId]);

  const loadPayrollRecords = async () => {
    const results = await Promise.allSettled([
      payrollAPI.getAttendance({ per_page: -1 }),
      payrollAPI.getAdvances({ per_page: -1 }),
      payrollAPI.getPayments({ per_page: -1 }),
    ]);
    if (results[0].status === "fulfilled") setAttendances(unwrapRows(results[0].value));
    if (results[1].status === "fulfilled") setAdvances(unwrapRows(results[1].value));
    if (results[2].status === "fulfilled") setPayments(unwrapRows(results[2].value));
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getAll({
        per_page: -1,
        status: "active",
      });
      const loadedUsers = response.data.data || [];
      setUsers(loadedUsers);
      setSelectedUser((current) => current || loadedUsers[0] || null);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenConfig = async (user) => {
    setSelectedUser(user);
    try {
      const response = await payrollAPI.getConfig(user.id);
      if (response.data) {
        const config = response.data.data || response.data;
        setConfigData({
          base_salary: String(config.base_salary ?? ""),
          payment_frequency: config.payment_frequency || "monthly",
          start_date: config.start_date || "",
          work_schedule: { ...DEFAULT_SCHEDULE, ...(config.work_schedule || {}) },
        });
      }
    } catch (error) {
      setConfigData({
        base_salary: "",
        payment_frequency: "monthly",
        start_date: "",
        work_schedule: DEFAULT_SCHEDULE,
      });
    }
    setConfigDialogOpen(true);
  };

  const handleSaveConfig = async () => {
    const salary = Number(configData.base_salary);
    if (!Number.isFinite(salary) || salary <= 0) {
      notificationSwal("Revisa el sueldo", "Ingresa un sueldo mayor que cero.", "warning");
      return;
    }
    setIsSubmitting(true);
    try {
      const savedConfig = {
        ...configData,
        base_salary: salary,
        start_date: configData.start_date || null,
      };
      await payrollAPI.setConfig(selectedUser.id, savedConfig);
      setSelectedConfig(savedConfig);
      notificationSwal("Configuración guardada", "El sueldo, la fecha de inicio y los días de trabajo están listos.", "success");
      setConfigDialogOpen(false);
    } catch (error) {
      notificationSwal("Error", getApiErrorMessage(error, "No se pudo guardar la configuración."), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAttendance = (user = null, attendance = null) => {
    if (user) setSelectedUser(user);
    setAttendanceData({
      id: attendance?.id || null,
      user_id: attendance ? rowUserId(attendance) || user?.id || selectedUser?.id || "" : user?.id || selectedUser?.id || "",
      date: attendance?.date?.slice(0, 10) || getCurrentPeruDate(),
      notes: attendance?.notes || "",
    });
    setAttendanceDialogOpen(true);
  };

  const handleSaveAttendance = async () => {
    if (!attendanceData.user_id || !attendanceData.date) {
      notificationSwal("Falta la fecha", "Selecciona el día de la falta.", "warning");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        user_id: attendanceData.user_id,
        date: attendanceData.date,
        status: "absent",
        notes: attendanceData.notes,
      };
      if (attendanceData.id) await payrollAPI.updateAttendance(attendanceData.id, payload);
      else await payrollAPI.saveAttendance(payload);
      notificationSwal("Falta guardada", "Ese día será descontado del pago.", "success");
      setAttendanceDialogOpen(false);
      loadPayrollRecords();
    } catch (error) {
      notificationSwal("Error", getApiErrorMessage(error, "No se pudo guardar la falta."), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAdvance = (user = null, advance = null) => {
    if (user) setSelectedUser(user);
    setAdvanceData({
      id: advance?.id || null,
      user_id: advance ? rowUserId(advance) : user?.id || "",
      amount: String(advance?.amount ?? ""),
      date: advance?.date?.slice(0, 10) || getCurrentPeruDate(),
      description: advance?.description || "",
    });
    setAdvanceDialogOpen(true);
  };

  const handleSaveAdvance = async () => {
    const amount = Number(advanceData.amount);
    if (!advanceData.user_id || !Number.isFinite(amount) || amount <= 0 || !advanceData.date) {
      notificationSwal("Revisa los datos", "Selecciona empleado, monto mayor que cero y fecha.", "warning");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        user_id: advanceData.user_id,
        amount,
        date: advanceData.date,
        description: advanceData.description,
      };
      if (advanceData.id) await payrollAPI.updateAdvance(advanceData.id, payload);
      else await payrollAPI.saveAdvance(payload);
      notificationSwal(advanceData.id ? "Adelanto actualizado" : "Adelanto registrado", "El adelanto y su gasto asociado quedaron guardados.", "success");
      setAdvanceDialogOpen(false);
      loadPayrollRecords();
    } catch (error) {
      notificationSwal("Error", getApiErrorMessage(error, "No se pudo guardar el adelanto."), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCalculate = (user) => {
    setSelectedUser(user);
    setCalcResult(null);
    setCalcParams({
      end_date: getCurrentPeruDate(),
      payment_date: getCurrentPeruDate(),
      notes: `Pago de planilla: ${user?.full_name || ""}`,
    });
    setCalcDialogOpen(true);
  };

  const handleCalculate = async () => {
    setLoadingCalc(true);
    try {
      const response = await payrollAPI.calculate(selectedUser.id, { end_date: calcParams.end_date });
      const calculation = response.data?.data || response.data;
      if (calculation.message && !calculation.summary) {
        notificationSwal("Información", calculation.message, "info");
        setCalcResult(null);
      } else {
        setCalcResult(calculation);
      }
    } catch (error) {
      notificationSwal("Error", getApiErrorMessage(error, "No se pudo calcular el pago."), "error");
    } finally {
      setLoadingCalc(false);
    }
  };

  const handleProcessPayment = async () => {
    const finalPayment = Number(calcResult?.summary?.final_payment || 0);
    const carryover = Number(calcResult?.summary?.carryover_amount || 0);
    const confirmed = await confirmSwal(
      "¿Procesar esta planilla?",
      carryover > 0
        ? `Se pagará ${formatCurrency(finalPayment)} a ${selectedUser?.full_name}. La deuda restante de ${formatCurrency(carryover)} pasará automáticamente al siguiente periodo.`
        : `Se pagará ${formatCurrency(finalPayment)} a ${selectedUser?.full_name} y se registrará el movimiento correspondiente.`,
      { confirmButtonText: "Sí, procesar planilla", icon: "question" }
    );

    if (confirmed) {
      setIsSubmitting(true);
      try {
        const response = await payrollAPI.pay(selectedUser.id, {
          end_date: calcResult?.period?.end,
          payment_date: calcParams.payment_date,
          notes: calcParams.notes || `Pago de planilla: ${selectedUser?.full_name}`,
        });
        const result = response.data?.data || response.data;
        const carried = Number(result?.payment?.carryover_amount ?? result?.carryover_advance?.amount ?? carryover);
        notificationSwal(
          "Planilla procesada",
          carried > 0
            ? `Pago registrado. Quedó ${formatCurrency(carried)} como deuda pendiente para el siguiente periodo.`
            : "El pago y sus descuentos quedaron registrados correctamente.",
          "success"
        );
        setCalcDialogOpen(false);
        loadPayrollRecords();
      } catch (error) {
        notificationSwal("Error", getApiErrorMessage(error, "No se pudo procesar el pago."), "error");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const employeeName = (row) => {
    const embedded = row?.user || row?.employee;
    if (embedded?.full_name) return embedded.full_name;
    return users.find((user) => String(user.id) === String(rowUserId(row)))?.full_name || "Empleado";
  };

  const handleDeleteAttendance = async (attendance) => {
    const confirmed = await confirmSwal(
      "¿Quitar esta falta?",
      `${employeeName(attendance)} · ${formatDate(attendance.date)}. El día volverá a contarse como asistido.`,
      { confirmButtonText: "Sí, quitar falta", icon: "warning" }
    );
    if (!confirmed) return;
    try {
      await payrollAPI.deleteAttendance(attendance.id);
      notificationSwal("Falta eliminada", "El día vuelve a contarse como asistido.", "success");
      setAttendanceDialogOpen(false);
      loadPayrollRecords();
    } catch (error) {
      notificationSwal("Error", getApiErrorMessage(error, "No se pudo quitar la falta."), "error");
    }
  };

  const handleOpenBulkAbsences = (user = null) => {
    const today = getCurrentPeruDate();
    const initialDate = today.startsWith(calendarMonth) ? today : `${calendarMonth}-01`;
    setBulkAbsenceData({
      user_id: user?.id || "",
      start_date: initialDate,
      end_date: initialDate,
      notes: "",
      overwrite: false,
      exclude_dates: "",
    });
    setBulkAbsenceDialogOpen(true);
  };

  const handleSaveBulkAbsences = async () => {
    if (!bulkAbsenceData.user_id || !bulkAbsenceData.start_date || !bulkAbsenceData.end_date) {
      notificationSwal("Faltan datos", "Selecciona empleado y rango de fechas.", "warning");
      return;
    }
    if (bulkAbsenceData.start_date > bulkAbsenceData.end_date) {
      notificationSwal("Revisa las fechas", "La fecha final no puede ser anterior a la inicial.", "warning");
      return;
    }
    if (bulkAbsenceData.overwrite) {
      const confirmed = await confirmSwal(
        "¿Reemplazar días ya registrados?",
        "Los días trabajados, descansos, enfermedades o feriados dentro del rango pasarán a ser faltas.",
        { confirmButtonText: "Sí, reemplazar", icon: "warning" }
      );
      if (!confirmed) return;
    }
    setIsSubmitting(true);
    try {
      const response = await payrollAPI.saveBulkAbsences({
        user_id: bulkAbsenceData.user_id,
        start_date: bulkAbsenceData.start_date,
        end_date: bulkAbsenceData.end_date,
        notes: bulkAbsenceData.notes,
        overwrite: bulkAbsenceData.overwrite,
        exclude_dates: bulkAbsenceData.exclude_dates
          .split(/[\s,;]+/)
          .map((date) => date.trim())
          .filter(Boolean),
      });
      const result = response.data?.data || response.data;
      const counts = result?.counts || {};
      notificationSwal(
        "Faltas procesadas",
        `Nuevas: ${counts.created || 0}. Actualizadas: ${counts.updated || 0}. Restauradas: ${counts.restored || 0}. Omitidas: ${counts.skipped || 0}.`,
        "success"
      );
      setBulkAbsenceDialogOpen(false);
      loadPayrollRecords();
    } catch (error) {
      notificationSwal("Error", getApiErrorMessage(error, "No se pudieron registrar las faltas."), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAdvance = async (advance) => {
    const confirmed = await confirmSwal(
      "¿Eliminar este adelanto?",
      `${employeeName(advance)} · ${formatCurrency(advance.amount)}. También se eliminará lógicamente su gasto asociado.`,
      { confirmButtonText: "Sí, eliminar", icon: "warning" }
    );
    if (!confirmed) return;
    try {
      await payrollAPI.deleteAdvance(advance.id);
      notificationSwal("Adelanto eliminado", "El adelanto pendiente y su gasto asociado fueron retirados.", "success");
      loadPayrollRecords();
    } catch (error) {
      notificationSwal("Error", getApiErrorMessage(error, "No se pudo eliminar el adelanto."), "error");
    }
  };

  const monthAttendances = attendances.filter((row) =>
    String(rowUserId(row)) === String(selectedUserId) &&
    String(row.date || "").startsWith(calendarMonth) &&
    row.status === "absent"
  );
  const attendanceByDate = monthAttendances.reduce((result, row) => ({ ...result, [String(row.date).slice(0, 10)]: row }), {});
  const employeeAdvances = advances
    .filter((row) => String(rowUserId(row)) === String(selectedUserId) && row.status === "pending")
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const employeePayments = payments
    .filter((row) => String(rowUserId(row)) === String(selectedUserId))
    .sort((a, b) => new Date(b.payment_date || b.created_at) - new Date(a.payment_date || a.created_at));
  const pendingAdvanceTotal = employeeAdvances.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const exceptionCount = monthAttendances.length;

  const [calendarYear, calendarMonthNumber] = calendarMonth.split("-").map(Number);
  const monthDate = new Date(calendarYear, calendarMonthNumber - 1, 1);
  const monthLabel = monthDate.toLocaleDateString("es-PE", { month: "long", year: "numeric" });
  const daysInMonth = new Date(calendarYear, calendarMonthNumber, 0).getDate();
  const firstDayOffset = (monthDate.getDay() + 6) % 7;
  const calendarCells = [
    ...Array(firstDayOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      return `${calendarMonth}-${String(day).padStart(2, "0")}`;
    }),
  ];
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  const isAttendedDay = (date) => {
    if (!date || attendanceByDate[date] || date > getCurrentPeruDate()) return false;
    if (selectedConfig?.start_date && date < String(selectedConfig.start_date).slice(0, 10)) return false;
    return true;
  };
  const attendedCount = calendarCells.filter((date) => isAttendedDay(date)).length;

  const moveCalendarMonth = (amount) => {
    const nextMonth = new Date(calendarYear, calendarMonthNumber - 1 + amount, 1);
    setCalendarMonth(`${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`);
  };

  const renderCalendar = () => (
    <Card variant="outlined" sx={{ borderRadius: 3, height: "100%" }}>
      <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ sm: "center" }} sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <IconButton aria-label="Mes anterior" onClick={() => moveCalendarMonth(-1)}><PreviousIcon /></IconButton>
            <Box sx={{ minWidth: { sm: 190 }, textAlign: "center" }}>
              <Typography variant="h6" fontWeight="800" sx={{ textTransform: "capitalize" }}>{monthLabel}</Typography>
            </Box>
            <IconButton aria-label="Mes siguiente" onClick={() => moveCalendarMonth(1)}><NextIcon /></IconButton>
          </Stack>
          <Button size="small" variant="outlined" color="error" startIcon={<AbsentIcon />} onClick={() => handleOpenBulkAbsences(selectedUser)}>
            Marcar varias faltas
          </Button>
        </Stack>

        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: "success.main" }} />
            <Typography variant="caption" color="text.secondary">Asistió</Typography>
          </Stack>
          {Object.entries(ATTENDANCE_STATUSES).map(([key, status]) => (
            <Stack key={key} direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: `${status.color}.main` }} />
              <Typography variant="caption" color="text.secondary">{status.label}</Typography>
            </Stack>
          ))}
        </Stack>

        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: { xs: 0.4, sm: 0.8 } }}>
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => (
            <Typography key={day} variant="caption" fontWeight="800" color="text.secondary" align="center" sx={{ py: 0.5 }}>{day}</Typography>
          ))}
          {calendarCells.map((date, index) => {
            if (!date) return <Box key={`empty-${index}`} />;
            const attendance = attendanceByDate[date];
            const status = attendance ? ATTENDANCE_STATUSES[attendance.status] : null;
            const dayNumber = Number(date.slice(-2));
            const isToday = date === getCurrentPeruDate();
            const isWeekend = index % 7 >= 5;
            const attended = isAttendedDay(date);
            return (
              <Tooltip key={date} title={attendance?.notes || (attendance ? status?.label : attended ? "Asistió" : "Registrar falta")} arrow>
                <Box
                  component="button"
                  type="button"
                  onClick={() => handleOpenAttendance(selectedUser, attendance || { date })}
                  sx={{
                    minWidth: 0,
                    minHeight: { xs: 62, sm: 88 },
                    p: { xs: 0.7, sm: 1 },
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: isToday ? "primary.main" : status ? `${status.color}.main` : attended ? "success.main" : "divider",
                    bgcolor: status ? alpha(theme.palette[status.color].main, 0.12) : attended ? alpha(theme.palette.success.main, 0.16) : isWeekend ? alpha(theme.palette.action.disabled, 0.06) : "background.paper",
                    color: "text.primary",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "transform 120ms ease, border-color 120ms ease",
                    "&:hover": { transform: "translateY(-1px)", borderColor: status ? `${status.color}.main` : "primary.main" },
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography fontWeight={isToday ? "900" : "700"} fontSize={{ xs: 13, sm: 14 }}>{dayNumber}</Typography>
                    {attended && <PayIcon sx={{ color: "success.main", fontSize: { xs: 14, sm: 17 } }} />}
                  </Stack>
                  {status && (
                    <Typography variant="caption" fontWeight="800" color={`${status.color}.main`} sx={{ display: "block", mt: { xs: 0.3, sm: 1 }, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {status.label}
                    </Typography>
                  )}
                </Box>
              </Tooltip>
            );
          })}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
          Verde significa que asistió. Solo una falta marcada en rojo descuenta el día.
        </Typography>
      </CardContent>
    </Card>
  );

  const renderPayrollSummary = () => (
    <Stack spacing={2}>
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="overline" color="text.secondary">Resumen de {monthLabel}</Typography>
          <Grid container spacing={1.5} sx={{ mt: 0 }}>
            <Grid item xs={6}>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderColor: "success.main" }}>
                <Typography variant="h5" fontWeight="900" color="success.main">{attendedCount}</Typography>
                <Typography variant="caption" color="text.secondary">Días asistidos</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6}>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderColor: exceptionCount ? "error.main" : "divider" }}>
                <Typography variant="h5" fontWeight="900" color={exceptionCount ? "error.main" : "text.primary"}>{exceptionCount}</Typography>
                <Typography variant="caption" color="text.secondary">Faltas</Typography>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
            <Box>
              <Typography fontWeight="800">Adelantos pendientes</Typography>
              <Typography variant="h5" fontWeight="900" color="warning.main">{formatCurrency(pendingAdvanceTotal)}</Typography>
            </Box>
            <Chip size="small" color={employeeAdvances.length ? "warning" : "success"} label={employeeAdvances.length ? `${employeeAdvances.length} pendiente${employeeAdvances.length === 1 ? "" : "s"}` : "Ninguno"} />
          </Stack>
          <Box sx={{ maxHeight: 240, overflowY: "auto" }}>
            {employeeAdvances.map((advance) => (
              <Stack key={advance.id} direction="row" alignItems="center" spacing={1} sx={{ py: 1, borderTop: 1, borderColor: "divider" }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography fontWeight="700">{formatCurrency(advance.amount)}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>{formatDate(advance.date)} · {advance.description || "Sin descripción"}</Typography>
                </Box>
                <Tooltip title="Editar"><IconButton size="small" onClick={() => handleOpenAdvance(selectedUser, advance)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => handleDeleteAdvance(advance)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
              </Stack>
            ))}
          </Box>
          {employeeAdvances.length === 0 && <Typography variant="body2" color="text.secondary">No hay dinero pendiente por descontar.</Typography>}
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography fontWeight="800" sx={{ mb: 1 }}>Pagos recientes</Typography>
          {employeePayments.slice(0, 3).map((payment) => (
            <Box
              key={payment.id}
              component="button"
              type="button"
              onClick={() => { setSelectedPayment(payment); setPaymentDetailsDialogOpen(true); }}
              sx={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, py: 1.25, px: 0, border: 0, borderTop: 1, borderColor: "divider", bgcolor: "transparent", color: "text.primary", cursor: "pointer", textAlign: "left" }}
            >
              <Box>
                <Typography variant="body2" fontWeight="700">{formatDate(payment.payment_date || payment.created_at)}</Typography>
                <Typography variant="caption" color="text.secondary">Ver detalle</Typography>
              </Box>
              <Typography fontWeight="900" color="success.main">{formatCurrency(payment.final_payment)}</Typography>
            </Box>
          ))}
          {employeePayments.length === 0 && <Typography variant="body2" color="text.secondary">Aún no hay pagos procesados.</Typography>}
        </CardContent>
      </Card>
    </Stack>
  );

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
        <CalendarIcon color="primary" sx={{ fontSize: 38 }} />
        <Box>
          <Typography variant="h4" fontWeight="800">Planilla</Typography>
          <Typography color="text.secondary">Elige una persona y trabaja directamente sobre su calendario.</Typography>
        </Box>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={5}>
            <FormControl fullWidth>
              <InputLabel>Empleado</InputLabel>
              <Select
                value={selectedUser?.id || ""}
                label="Empleado"
                onChange={(event) => setSelectedUser(users.find((user) => String(user.id) === String(event.target.value)) || null)}
                renderValue={(value) => users.find((user) => String(user.id) === String(value))?.full_name || ""}
              >
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar sx={{ width: 30, height: 30, bgcolor: "primary.main", fontSize: 13 }}>{user.first_name?.[0]}{user.last_name?.[0]}</Avatar>
                      <Typography fontWeight="700">{user.full_name}</Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={7}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent={{ md: "flex-end" }}>
              <Button variant="outlined" startIcon={<SettingsIcon />} disabled={!selectedUser} onClick={() => handleOpenConfig(selectedUser)}>
                Configurar sueldo
              </Button>
              <Button variant="outlined" color="warning" startIcon={<MoneyIcon />} disabled={!selectedUser} onClick={() => handleOpenAdvance(selectedUser)}>
                Registrar adelanto
              </Button>
              <Button variant="contained" color="success" startIcon={<CalculateIcon />} disabled={!selectedUser} onClick={() => handleOpenCalculate(selectedUser)}>
                Calcular pago
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Paper variant="outlined" sx={{ py: 10, textAlign: "center", borderRadius: 3 }}><CircularProgress size={34} /></Paper>
      ) : !selectedUser ? (
        <Paper variant="outlined" sx={{ py: 8, px: 2, textAlign: "center", borderRadius: 3 }}>
          <Typography variant="h6">No hay personal activo</Typography>
          <Typography color="text.secondary">Cuando registres un empleado aparecerá aquí.</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          <Grid item xs={12} lg={8}>{renderCalendar()}</Grid>
          <Grid item xs={12} lg={4}>{renderPayrollSummary()}</Grid>
        </Grid>
      )}

      {/* Config Dialog */}
      <Dialog open={configDialogOpen} onClose={() => setConfigDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}><SettingsIcon color="primary" /> Preparar sueldo de {selectedUser?.full_name}</DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2 }}>La fecha de inicio evita pagar días anteriores al ingreso real.</Alert>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Sueldo base"
                type="number"
                value={configData.base_salary}
                onChange={(e) => setConfigData({ ...configData, base_salary: e.target.value })}
                InputProps={{ startAdornment: <MoneyIcon sx={{ mr: 1, color: 'action.active' }} /> }}
                helperText="Es el sueldo correspondiente a la frecuencia elegida."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>¿Cada cuánto se paga?</InputLabel>
                <Select
                  value={configData.payment_frequency}
                  label="¿Cada cuánto se paga?"
                  onChange={(e) => setConfigData({ ...configData, payment_frequency: e.target.value })}
                >
                  <MenuItem value="daily">Diario</MenuItem>
                  <MenuItem value="weekly">Semanal</MenuItem>
                  <MenuItem value="monthly">Mensual</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Primer día en planilla"
                type="date"
                value={configData.start_date}
                onChange={(e) => setConfigData({ ...configData, start_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography fontWeight="800" sx={{ mb: 1 }}>Días que normalmente trabaja</Typography>
                <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
                  {WEEK_DAYS.map(([key, label]) => (
                    <FormControlLabel
                      key={key}
                      label={label}
                      control={
                        <Switch
                          checked={Boolean(configData.work_schedule[key])}
                          onChange={(event) => setConfigData({
                            ...configData,
                            work_schedule: { ...configData.work_schedule, [key]: event.target.checked },
                          })}
                        />
                      }
                    />
                  ))}
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleSaveConfig} variant="contained" disabled={isSubmitting}>Guardar sueldo</Button>
        </DialogActions>
      </Dialog>

      {/* Attendance Dialog */}
      <Dialog open={attendanceDialogOpen} onClose={() => setAttendanceDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          <AbsentIcon /> {attendanceData.id ? "Editar falta" : "Registrar falta"} · {selectedUser?.full_name}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Esta fecha se descontará del pago. Si no existe una falta, el día cuenta como asistido aunque sea un descanso configurado.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Fecha"
                type="date"
                value={attendanceData.date}
                onChange={(e) => setAttendanceData({ ...attendanceData, date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Motivo de la falta (opcional)"
                multiline
                rows={3}
                value={attendanceData.notes}
                onChange={(e) => setAttendanceData({ ...attendanceData, notes: e.target.value })}
                placeholder="Ejemplo: no asistió"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          {attendanceData.id && (
            <Button
              color="error"
              startIcon={<DeleteIcon />}
              sx={{ mr: "auto" }}
              onClick={() => handleDeleteAttendance({ id: attendanceData.id, user_id: attendanceData.user_id, date: attendanceData.date })}
            >
              Quitar falta
            </Button>
          )}
          <Button onClick={() => setAttendanceDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleSaveAttendance} variant="contained" color="error" disabled={isSubmitting}>Guardar falta</Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Absences Dialog */}
      <Dialog open={bulkAbsenceDialogOpen} onClose={() => setBulkAbsenceDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: "error.main", display: "flex", alignItems: "center", gap: 1 }}>
          <AbsentIcon /> Varias faltas · {selectedUser?.full_name}
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2 }}>El rango incluye el primer y el último día. Puedes excluir feriados u otras fechas escribiéndolas abajo.</Alert>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth type="date" label="Desde" value={bulkAbsenceData.start_date} onChange={(e) => setBulkAbsenceData({ ...bulkAbsenceData, start_date: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth type="date" label="Hasta" value={bulkAbsenceData.end_date} onChange={(e) => setBulkAbsenceData({ ...bulkAbsenceData, end_date: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Motivo o nota" value={bulkAbsenceData.notes} onChange={(e) => setBulkAbsenceData({ ...bulkAbsenceData, notes: e.target.value })} placeholder="Ejemplo: ausencia por regularizar" />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Fechas que NO deben marcarse (opcional)"
                value={bulkAbsenceData.exclude_dates}
                onChange={(e) => setBulkAbsenceData({ ...bulkAbsenceData, exclude_dates: e.target.value })}
                placeholder="2026-11-02, 2026-11-06"
                helperText="Separa las fechas con coma o espacio."
              />
            </Grid>
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: bulkAbsenceData.overwrite ? "warning.main" : "divider" }}>
                <FormControlLabel
                  control={<Switch color="warning" checked={bulkAbsenceData.overwrite} onChange={(e) => setBulkAbsenceData({ ...bulkAbsenceData, overwrite: e.target.checked })} />}
                  label={<Box><Typography fontWeight="700">Reemplazar días que ya tienen registro</Typography><Typography variant="caption" color="text.secondary">Apagado es lo más seguro: protege días trabajados, descansos, enfermedades y feriados.</Typography></Box>}
                />
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkAbsenceDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleSaveBulkAbsences} disabled={isSubmitting}>Registrar faltas</Button>
        </DialogActions>
      </Dialog>

      {/* Advance Dialog */}
      <Dialog open={advanceDialogOpen} onClose={() => setAdvanceDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: 'warning.dark', display: 'flex', alignItems: 'center', gap: 1 }}>
          <MoneyIcon /> {advanceData.id ? "Editar adelanto" : "Registrar adelanto"} · {selectedUser?.full_name}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Se descontará automáticamente de una planilla futura.</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Monto entregado"
                type="number"
                value={advanceData.amount}
                onChange={(e) => setAdvanceData({ ...advanceData, amount: e.target.value })}
                InputProps={{ startAdornment: <MoneyIcon sx={{ mr: 1, color: "action.active" }} /> }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Fecha"
                type="date"
                value={advanceData.date}
                onChange={(e) => setAdvanceData({ ...advanceData, date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descripción"
                multiline
                rows={2}
                value={advanceData.description}
                onChange={(e) => setAdvanceData({ ...advanceData, description: e.target.value })}
                placeholder="Ejemplo: adelanto solicitado por el empleado"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdvanceDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleSaveAdvance} variant="contained" color="warning" disabled={isSubmitting}>{advanceData.id ? "Guardar cambios" : "Registrar adelanto"}</Button>
        </DialogActions>
      </Dialog>

      {/* Calculate & Pay Dialog */}
      <Dialog open={calcDialogOpen} onClose={() => setCalcDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Revisar y pagar a {selectedUser?.full_name}
          <Chip label="Cálculo automático" size="small" color="secondary" variant="outlined" />
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', flexDirection: { xs: "column", sm: "row" }, gap: 2, alignItems: 'center', mb: 2 }}>
                <TextField
                  fullWidth
                  label="Pagar hasta la fecha"
                  type="date"
                  value={calcParams.end_date}
                  onChange={(e) => setCalcParams({ ...calcParams, end_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
                <Button 
                  variant="outlined" 
                  onClick={handleCalculate} 
                  startIcon={<CalculateIcon />} 
                  disabled={loadingCalc}
                  sx={{ height: 56, px: 4 }}
                >
                  {loadingCalc ? <CircularProgress size={24} /> : "Calcular"}
                </Button>
              </Box>
            </Grid>
            
            {calcResult && (
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 0, overflow: 'hidden' }}>
                  <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderBottom: `1px solid ${theme.palette.divider}` }}>
                    <Typography variant="subtitle1" fontWeight="700">Resumen del Periodo</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Periodo detectado: <strong>{formatDate(calcResult?.period?.start)}</strong> al <strong>{formatDate(calcResult?.period?.end)}</strong> ({calcResult?.period?.total_days} días)
                    </Typography>
                  </Box>
                  
                  <Box sx={{ p: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Sueldo Base:</Typography>
                        <Typography variant="body1" fontWeight="600">{formatCurrency(calcResult?.summary?.base_salary)}</Typography>
                      </Grid>
                      <Grid item xs={6} align="right">
                        <Typography variant="body2" color="text.secondary">Tasa Diaria:</Typography>
                        <Typography variant="body1" fontWeight="600">{formatCurrency(calcResult?.summary?.daily_rate)}</Typography>
                      </Grid>

                      <Grid item xs={12}><Divider /></Grid>

                      <Grid item xs={6}>
                        <Typography variant="body2">Días Trabajados:</Typography>
                        <Typography variant="body1" fontWeight="700" color="success.main">{calcResult?.summary?.days_worked} días</Typography>
                      </Grid>
                      <Grid item xs={6} align="right">
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1 }}>
                          <Typography variant="body2">Faltas:</Typography>
                          {calcResult?.absences_details?.length > 0 && (
                            <Tooltip title="Ver faltas">
                              <IconButton size="small" color="error" onClick={() => setAbsencesDetailsDialogOpen(true)}>
                                <ViewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                        <Typography variant="body1" fontWeight="700" color="error.main">{calcResult?.summary?.absences} días</Typography>
                      </Grid>

                      <Grid item xs={12}><Divider /></Grid>

                      <Grid item xs={6}>
                        <Typography variant="body2">Sueldo Bruto:</Typography>
                      </Grid>
                      <Grid item xs={6} align="right">
                        <Typography variant="body1" fontWeight="700">{formatCurrency(calcResult?.summary?.gross_salary)}</Typography>
                      </Grid>

                      <Grid item xs={6} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color="warning.main">Deuda pendiente encontrada:</Typography>
                        {calcResult?.advances_details?.length > 0 && (
                          <Tooltip title="Ver detalle de adelantos">
                            <IconButton size="small" color="error" onClick={() => setAdvancesDetailsDialogOpen(true)}>
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Grid>
                      <Grid item xs={6} align="right">
                        <Typography variant="body1" color="warning.main" fontWeight="700">{formatCurrency(calcResult?.summary?.pending_advances_total)}</Typography>
                      </Grid>

                      <Grid item xs={6}>
                        <Typography variant="body2" color="error.main">Descuento aplicado en este pago:</Typography>
                      </Grid>
                      <Grid item xs={6} align="right">
                        <Typography variant="body1" color="error.main" fontWeight="700">-{formatCurrency(calcResult?.summary?.advances_to_discount)}</Typography>
                      </Grid>

                      {Number(calcResult?.summary?.carryover_amount || 0) > 0 && (
                        <Grid item xs={12}>
                          <Alert severity="warning" icon={<WarningIcon />}>
                            Quedarán <strong>{formatCurrency(calcResult?.summary?.carryover_amount)}</strong> pendientes. El sistema los llevará al siguiente periodo sin crear otro gasto por ese dinero.
                          </Alert>
                        </Grid>
                      )}

                      <Grid item xs={12}>
                        <Box sx={{ 
                          mt: 1, 
                          p: 2, 
                          borderRadius: 2, 
                          bgcolor: 'success.main', 
                          color: 'success.contrastText',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                        }}>
                          <Box>
                            <Typography variant="subtitle2" sx={{ opacity: 0.9, textTransform: 'uppercase' }}>Pago Neto Final</Typography>
                            <Typography variant="h4" sx={{ fontWeight: 800 }}>
                              {formatCurrency(calcResult?.summary?.final_payment)}
                            </Typography>
                          </Box>
                          <PayIcon sx={{ fontSize: 40, opacity: 0.5 }} />
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2, mt: 2, borderRadius: 2 }}>
                  <Typography fontWeight="800" sx={{ mb: 2 }}>Datos del pago</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={5}>
                      <TextField
                        fullWidth
                        type="date"
                        label="Fecha del pago"
                        value={calcParams.payment_date}
                        onChange={(e) => setCalcParams({ ...calcParams, payment_date: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={7}>
                      <TextField
                        fullWidth
                        label="Nota del pago"
                        value={calcParams.notes}
                        onChange={(e) => setCalcParams({ ...calcParams, notes: e.target.value })}
                        placeholder="Ejemplo: pago de noviembre"
                      />
                    </Grid>
                  </Grid>
                </Paper>
                
                {(calcResult?.absences_details?.length > 0 || calcResult?.advances_details?.length > 0) && (
                   <Box sx={{ mt: 2, px: 1 }}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        * Se han aplicado descuentos por {calcResult?.summary?.absences} faltas y {calcResult?.advances_details?.length} adelantos pendientes.
                      </Typography>
                   </Box>
                )}
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCalcDialogOpen(false)}>Cerrar</Button>
          {calcResult && (
             <Button 
                variant="contained" 
                color="success" 
                size="large"
                startIcon={<PayIcon />} 
                onClick={handleProcessPayment}
                disabled={isSubmitting}
                sx={{ borderRadius: 2, px: 4 }}
              >
               Procesar planilla
             </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Absences Details Dialog */}
      <Dialog open={absencesDetailsDialogOpen} onClose={() => setAbsencesDetailsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AbsentIcon color="error" /> Faltas: {selectedUser?.full_name}
        </DialogTitle>
        <DialogContent dividers>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(theme.palette.error.main, 0.05) }}>
                  <TableCell sx={{ fontWeight: 700 }}>Fecha</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Motivo / Notas</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(calcResult?.absences_details || [])
                  .slice()
                  .sort((a, b) => new Date(a.date) - new Date(b.date))
                  .map((absence) => {
                    const status = ATTENDANCE_STATUSES[absence.status] || { label: "Faltó", color: "error" };
                    return (
                      <TableRow key={absence.id} hover>
                        <TableCell>{formatDate(absence.date)}</TableCell>
                        <TableCell>{absence.notes || "Sin motivo registrado"}</TableCell>
                        <TableCell><Chip label={status.label} size="small" color={status.color} /></TableCell>
                      </TableRow>
                    );
                  })}
                <TableRow>
                  <TableCell colSpan={2} sx={{ fontWeight: 800, pt: 2 }}>Total de faltas</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: "error.main", pt: 2 }}>
                    {calcResult?.summary?.absences} días
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAbsencesDetailsDialogOpen(false)} variant="contained" color="inherit">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Advances Details Dialog */}
      <Dialog open={advancesDetailsDialogOpen} onClose={() => setAdvancesDetailsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ViewIcon color="error" /> Detalle de Adelantos: {selectedUser?.full_name}
        </DialogTitle>
        <DialogContent dividers>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(theme.palette.error.main, 0.05) }}>
                  <TableCell sx={{ fontWeight: 700 }}>Fecha</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Descripción</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Monto</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(calcResult?.advances_details || [])
                  .slice()
                  .sort((a, b) => new Date(a.date) - new Date(b.date))
                  .map((advance) => (
                    <TableRow key={advance.id} hover>
                      <TableCell>{formatDate(advance.date)}</TableCell>
                      <TableCell>{advance.description || "Sin descripción"}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>{formatCurrency(advance.amount)}</TableCell>
                    </TableRow>
                  ))}
                <TableRow>
                  <TableCell colSpan={2} sx={{ fontWeight: 800, pt: 2 }}>Total a Descontar</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: 'error.main', pt: 2 }}>
                    -{formatCurrency(calcResult?.summary?.advances_to_discount)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdvancesDetailsDialogOpen(false)} variant="contained" color="inherit">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Audit Dialog */}
      <Dialog open={paymentDetailsDialogOpen} onClose={() => setPaymentDetailsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}><HistoryIcon color="primary" /> Detalle del pago</DialogTitle>
        <DialogContent dividers>
          {selectedPayment && (
            <Stack spacing={2}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="h6" fontWeight="800">{employeeName(selectedPayment)}</Typography>
                <Typography color="text.secondary">
                  Periodo: {formatDate(selectedPayment.period_start || selectedPayment.start_date)} al {formatDate(selectedPayment.period_end || selectedPayment.end_date)}
                </Typography>
                <Typography color="text.secondary">Pagado el {formatDate(selectedPayment.payment_date || selectedPayment.date || selectedPayment.created_at)}</Typography>
              </Paper>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Paper variant="outlined" sx={{ p: 2, height: "100%", borderColor: "primary.main" }}>
                    <Typography variant="caption" color="text.secondary">Sueldo bruto</Typography>
                    <Typography variant="h6" fontWeight="800">{formatCurrency(selectedPayment.gross_salary)}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper variant="outlined" sx={{ p: 2, height: "100%", borderColor: "error.main" }}>
                    <Typography variant="caption" color="text.secondary">Adelantos descontados</Typography>
                    <Typography variant="h6" fontWeight="800" color="error.main">-{formatCurrency(selectedPayment.advances_discounted ?? selectedPayment.advances_to_discount)}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper variant="outlined" sx={{ p: 2, height: "100%", borderColor: "success.main" }}>
                    <Typography variant="caption" color="text.secondary">Pago final</Typography>
                    <Typography variant="h6" fontWeight="800" color="success.main">{formatCurrency(selectedPayment.final_payment)}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper variant="outlined" sx={{ p: 2, height: "100%", borderColor: Number(selectedPayment.carryover_amount || 0) > 0 ? "warning.main" : "success.main" }}>
                    <Typography variant="caption" color="text.secondary">Deuda trasladada</Typography>
                    <Typography variant="h6" fontWeight="800" color={Number(selectedPayment.carryover_amount || 0) > 0 ? "warning.main" : "success.main"}>{formatCurrency(selectedPayment.carryover_amount || 0)}</Typography>
                  </Paper>
                </Grid>
              </Grid>
              {selectedPayment.notes && <Alert severity="info"><strong>Nota:</strong> {selectedPayment.notes}</Alert>}
              {selectedPayment.expense && (
                <Alert severity="success">Movimiento de caja asociado: {formatCurrency(selectedPayment.expense.amount ?? selectedPayment.final_payment)}</Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions><Button variant="contained" onClick={() => setPaymentDetailsDialogOpen(false)}>Listo</Button></DialogActions>
      </Dialog>
    </Box>
  );
};
