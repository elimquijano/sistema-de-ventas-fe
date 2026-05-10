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
  Tabs,
  Tab,
  Avatar,
  Divider,
  alpha,
  useTheme,
  Alert,
  Tooltip,
  Stack,
} from "@mui/material";
import {
  Add as AddIcon,
  Settings as SettingsIcon,
  EventBusy as AbsentIcon,
  AttachMoney as MoneyIcon,
  Calculate as CalculateIcon,
  CheckCircle as PayIcon,
  Visibility as ViewIcon,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { formatCurrency, formatDate } from "../utils/formatters";
import { notificationSwal, confirmSwal } from "../utils/swal-helpers";
import { usersAPI, payrollAPI } from "../utils/api";

export const Payroll = () => {
  const theme = useTheme();
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dialogs
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [advanceDialogOpen, setAdvanceDialogOpen] = useState(false);
  const [calcDialogOpen, setCalcDialogOpen] = useState(false);
  const [advancesDetailsDialogOpen, setAdvancesDetailsDialogOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  
  // Form States
  const [configData, setConfigData] = useState({
    base_salary: "",
    payment_frequency: "monthly",
  });

  const [attendanceData, setAttendanceData] = useState({
    date: new Date().toISOString().split("T")[0],
    status: "absent",
    notes: ""
  });

  const [advanceData, setAdvanceData] = useState({
    amount: "",
    date: new Date().toISOString().split("T")[0],
    description: ""
  });

  const [calcParams, setCalcParams] = useState({
    end_date: new Date().toISOString().split("T")[0],
  });

  const [calcResult, setCalcResult] = useState(null);
  const [loadingCalc, setLoadingCalc] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getAll({ per_page: -1 });
      setUsers(response.data.data || []);
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
        setConfigData({
          base_salary: response.data.base_salary.toString(),
          payment_frequency: response.data.payment_frequency,
        });
      }
    } catch (error) {
      setConfigData({
        base_salary: "",
        payment_frequency: "monthly",
      });
    }
    setConfigDialogOpen(true);
  };

  const handleSaveConfig = async () => {
    setIsSubmitting(true);
    try {
      await payrollAPI.setConfig(selectedUser.id, configData);
      notificationSwal("Configuración Guardada", "La configuración de planilla ha sido actualizada.", "success");
      setConfigDialogOpen(false);
    } catch (error) {
      notificationSwal("Error", "No se pudo guardar la configuración.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAttendance = (user) => {
    setSelectedUser(user);
    setAttendanceData({
      date: new Date().toISOString().split("T")[0],
      status: "absent",
      notes: ""
    });
    setAttendanceDialogOpen(true);
  };

  const handleSaveAttendance = async () => {
    if (!attendanceData.notes) {
      notificationSwal("Atención", "Por favor indica el motivo de la falta en las notas.", "warning");
      return;
    }
    setIsSubmitting(true);
    try {
      await payrollAPI.saveAttendance({ ...attendanceData, user_id: selectedUser.id });
      notificationSwal("Falta Registrada", "La falta ha sido guardada exitosamente. Se descontará en el próximo pago.", "success");
      setAttendanceDialogOpen(false);
    } catch (error) {
      notificationSwal("Error", "No se pudo registrar la falta.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAdvance = (user) => {
    setSelectedUser(user);
    setAdvanceData({
      amount: "",
      date: new Date().toISOString().split("T")[0],
      description: ""
    });
    setAdvanceDialogOpen(true);
  };

  const handleSaveAdvance = async () => {
    setIsSubmitting(true);
    try {
      await payrollAPI.saveAdvance({ ...advanceData, user_id: selectedUser.id });
      notificationSwal("Adelanto Registrado", "El adelanto ha sido guardado y se descontará en la planilla.", "success");
      setAdvanceDialogOpen(false);
    } catch (error) {
      notificationSwal("Error", "No se pudo registrar el adelanto.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCalculate = (user) => {
    setSelectedUser(user);
    setCalcResult(null);
    setCalcParams({ end_date: new Date().toISOString().split("T")[0] });
    setCalcDialogOpen(true);
  };

  const handleCalculate = async () => {
    setLoadingCalc(true);
    try {
      const response = await payrollAPI.calculate(selectedUser.id, calcParams);
      if (response.data.message && !response.data.summary) {
        notificationSwal("Información", response.data.message, "info");
        setCalcResult(null);
      } else {
        setCalcResult(response.data);
      }
    } catch (error) {
      notificationSwal("Error", error.response?.data?.error || error.response?.data?.message || "No se pudo calcular el pago.", "error");
    } finally {
      setLoadingCalc(false);
    }
  };

  const handleProcessPayment = async () => {
    const confirmed = await confirmSwal(
      "¿Confirmar Pago?",
      `Se registrará un pago de ${formatCurrency(calcResult?.summary?.final_payment)} para ${selectedUser?.full_name}. Esto generará un gasto en caja.`,
      "question"
    );

    if (confirmed) {
      setIsSubmitting(true);
      try {
        await payrollAPI.pay(selectedUser.id, {
          end_date: calcResult?.period?.end,
          payment_date: new Date().toISOString().split("T")[0],
          notes: `Pago de planilla: ${selectedUser?.full_name}. Periodo ${formatDate(calcResult?.period?.start)} al ${formatDate(calcResult?.period?.end)}`
        });
        notificationSwal("Pago Exitoso", "El pago de planilla ha sido procesado correctamente.", "success");
        setCalcDialogOpen(false);
      } catch (error) {
        notificationSwal("Error", "No se pudo procesar el pago.", "error");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Planilla y Personal
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Sistema de Asistencia Automática:</strong> Se asume que el personal asiste todos los días laborables. Solo registre las <strong>Faltas</strong> para aplicar descuentos proporcionales automáticamente.
      </Alert>

      <Card>
        <CardContent>
          <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)} sx={{ mb: 3 }}>
            <Tab label="Personal Activo" />
          </Tabs>

          {activeTab === 0 && (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Empleado</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Rol</TableCell>
                    <TableCell align="right">Gestión de Pagos y Asistencia</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <Avatar sx={{ bgcolor: theme.palette.primary.main }}>{user.first_name?.[0]}{user.last_name?.[0]}</Avatar>
                          <Typography variant="subtitle2">{user.full_name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {user.roles?.map(r => <Chip key={r.id} label={r.name} size="small" sx={{ mr: 0.5 }} />)}
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Tooltip title="Configurar Sueldo Base">
                            <IconButton onClick={() => handleOpenConfig(user)} color="primary" size="small">
                              <SettingsIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Registrar Falta">
                            <IconButton onClick={() => handleOpenAttendance(user)} color="error" size="small">
                              <AbsentIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Entregar Adelanto">
                            <IconButton onClick={() => handleOpenAdvance(user)} color="warning" size="small">
                              <MoneyIcon />
                            </IconButton>
                          </Tooltip>
                          <Button 
                            size="small" 
                            variant="contained" 
                            startIcon={<CalculateIcon />} 
                            onClick={() => handleOpenCalculate(user)}
                            sx={{ ml: 1, borderRadius: 2 }}
                          >
                            Pagar
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Config Dialog */}
      <Dialog open={configDialogOpen} onClose={() => setConfigDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Sueldo y Frecuencia: {selectedUser?.full_name}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Sueldo Base"
                type="number"
                value={configData.base_salary}
                onChange={(e) => setConfigData({ ...configData, base_salary: e.target.value })}
                InputProps={{ startAdornment: <MoneyIcon sx={{ mr: 1, color: 'action.active' }} /> }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Frecuencia de Pago</InputLabel>
                <Select
                  value={configData.payment_frequency}
                  label="Frecuencia de Pago"
                  onChange={(e) => setConfigData({ ...configData, payment_frequency: e.target.value })}
                >
                  <MenuItem value="daily">Diario</MenuItem>
                  <MenuItem value="weekly">Semanal</MenuItem>
                  <MenuItem value="monthly">Mensual</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleSaveConfig} variant="contained" disabled={isSubmitting}>Guardar Configuración</Button>
        </DialogActions>
      </Dialog>

      {/* Attendance (Absence) Dialog */}
      <Dialog open={attendanceDialogOpen} onClose={() => setAttendanceDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          <AbsentIcon /> Registrar Falta: {selectedUser?.full_name}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            El registro de una falta descontará automáticamente el monto proporcional al día en la próxima planilla.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Fecha de la Falta"
                type="date"
                value={attendanceData.date}
                onChange={(e) => setAttendanceData({ ...attendanceData, date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Motivo / Notas"
                multiline
                rows={3}
                required
                value={attendanceData.notes}
                onChange={(e) => setAttendanceData({ ...attendanceData, notes: e.target.value })}
                placeholder="Ej: No avisó, permiso sin goce, etc."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAttendanceDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleSaveAttendance} variant="contained" color="error" disabled={isSubmitting}>Registrar Falta</Button>
        </DialogActions>
      </Dialog>

      {/* Advance Dialog */}
      <Dialog open={advanceDialogOpen} onClose={() => setAdvanceDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: 'warning.dark', display: 'flex', alignItems: 'center', gap: 1 }}>
          <MoneyIcon /> Entregar Adelanto: {selectedUser?.full_name}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Monto del Adelanto"
                type="number"
                value={advanceData.amount}
                onChange={(e) => setAdvanceData({ ...advanceData, amount: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
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
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdvanceDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleSaveAdvance} variant="contained" color="warning" disabled={isSubmitting}>Entregar Adelanto</Button>
        </DialogActions>
      </Dialog>

      {/* Calculate & Pay Dialog */}
      <Dialog open={calcDialogOpen} onClose={() => setCalcDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Liquidación de Pago: {selectedUser?.full_name}
          <Chip label="Cálculo Automático" size="small" color="secondary" variant="outlined" />
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
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
                        <Typography variant="body2">Faltas detectadas:</Typography>
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
                        <Typography variant="body2" color="error.main">Adelantos a Descontar:</Typography>
                        {calcResult?.advances_details?.length > 0 && (
                          <Tooltip title="Ver detalle de adelantos">
                            <IconButton size="small" color="error" onClick={() => setAdvancesDetailsDialogOpen(true)}>
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Grid>
                      <Grid item xs={6} align="right">
                        <Typography variant="body1" color="error.main" fontWeight="700">-{formatCurrency(calcResult?.summary?.advances_to_discount)}</Typography>
                      </Grid>

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
               Confirmar Pago Total
             </Button>
          )}
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
    </Box>
  );
};
