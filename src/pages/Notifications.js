import React, { useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  IconButton,
  Tooltip,
  Divider,
  Button,
  Chip,
  alpha,
  useTheme,
  CircularProgress,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Done as DoneIcon,
  Info as InfoIcon,
  Notifications as NotificationsIcon,
  NotificationsNone as NotificationsNoneIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { useNotifications } from "../contexts/NotificationContext";

const Notifications = () => {
  const theme = useTheme();
  const {
    notifications,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    unreadCount,
  } = useNotifications();

  useEffect(() => {
    // Fetch all notifications (not just unread) when entering the page
    fetchNotifications({ unread: false });
  }, [fetchNotifications]);

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString("es-ES", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const getIcon = (type) => {
    if (type && type.includes("AuditPerformedNotification")) {
      return <InfoIcon color="primary" />;
    }
    return <NotificationsIcon color="primary" />;
  };

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", py: { xs: 2, md: 4 }, px: 2 }}>
      <Box sx={{ 
        display: "flex", 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: "space-between", 
        alignItems: { xs: 'flex-start', sm: 'center' }, 
        mb: 4,
        gap: 2
      }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: theme.palette.text.primary, mb: 0.5 }}>
            Centro de Notificaciones
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestiona todas tus alertas y actividad reciente
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <Button
            variant="outlined"
            size="medium"
            startIcon={<RefreshIcon />}
            onClick={() => fetchNotifications({ unread: false })}
            sx={{ borderRadius: 2, fontWeight: 600 }}
          >
            Actualizar
          </Button>
          <Button
            variant="contained"
            size="medium"
            startIcon={<DoneIcon />}
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            sx={{ borderRadius: 2, fontWeight: 600, boxShadow: 'none', '&:hover': { boxShadow: 'none' } }}
          >
            Marcar todas como leídas
          </Button>
        </Box>
      </Box>

      <Paper 
        elevation={0}
        sx={{ 
          borderRadius: 3, 
          overflow: "hidden", 
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper
        }}
      >
        {loading && notifications.length === 0 ? (
          <Box sx={{ p: 10, textAlign: "center" }}>
            <CircularProgress size={40} thickness={4} />
            <Typography sx={{ mt: 2, fontWeight: 500 }} color="text.secondary">
              Cargando tus notificaciones...
            </Typography>
          </Box>
        ) : notifications.length > 0 ? (
          <List disablePadding>
            {notifications.map((notification, index) => {
              const data = notification.data || {};
              const isUnread = !notification.read_at;

              return (
                <React.Fragment key={notification.id}>
                  <ListItem
                    sx={{
                      px: { xs: 2, md: 4 },
                      py: 3,
                      backgroundColor: isUnread
                        ? (theme.palette.mode === 'dark' ? alpha(theme.palette.primary.main, 0.08) : alpha(theme.palette.primary.main, 0.02))
                        : "inherit",
                      "&:hover": {
                        backgroundColor: theme.palette.mode === 'dark' 
                          ? alpha(theme.palette.primary.main, 0.12) 
                          : alpha(theme.palette.primary.main, 0.05),
                      },
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 3,
                      transition: theme.transitions.create('background-color'),
                    }}
                  >
                    <Box sx={{ 
                      mt: 0.5, 
                      p: 1.5, 
                      borderRadius: 2, 
                      backgroundColor: isUnread ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.action.disabledBackground, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {getIcon(notification.type)}
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: 'flex-start', mb: 1 }}>
                        <Box>
                          <Typography variant="h6" sx={{ 
                            fontWeight: isUnread ? 700 : 600, 
                            color: isUnread ? theme.palette.text.primary : theme.palette.text.secondary,
                            fontSize: '1.1rem'
                          }}>
                            {data.title || "Notificación"}
                          </Typography>
                        </Box>
                        <Typography variant="caption" sx={{ color: theme.palette.text.disabled, fontWeight: 600, whiteSpace: 'nowrap', ml: 2 }}>
                          {formatDateTime(notification.created_at)}
                        </Typography>
                      </Box>
                      <Typography variant="body1" sx={{ color: theme.palette.text.secondary, mb: 2, lineHeight: 1.6 }}>
                        {data.message}
                      </Typography>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Box sx={{ display: "flex", gap: 1 }}>
                          {isUnread && (
                            <Chip
                              label="NUEVA"
                              size="small"
                              color="primary"
                              sx={{ fontWeight: 800, height: 22, fontSize: "0.65rem", letterSpacing: 0.5 }}
                            />
                          )}
                          {data.auditable_type && (
                             <Chip
                               label={data.auditable_type.split('\\').pop()}
                               size="small"
                               variant="outlined"
                               sx={{ height: 22, fontSize: "0.65rem", fontWeight: 600 }}
                             />
                          )}
                        </Box>
                        <Box sx={{ display: "flex", gap: 1 }}>
                          {isUnread && (
                            <Tooltip title="Marcar como leída">
                              <IconButton
                                size="small"
                                onClick={() => markAsRead(notification.id)}
                                sx={{ 
                                  color: theme.palette.success.main,
                                  backgroundColor: alpha(theme.palette.success.main, 0.05),
                                  '&:hover': { backgroundColor: alpha(theme.palette.success.main, 0.15) }
                                }}
                              >
                                <DoneIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Eliminar">
                            <IconButton
                              size="small"
                              onClick={() => deleteNotification(notification.id)}
                              sx={{ 
                                color: theme.palette.error.main,
                                backgroundColor: alpha(theme.palette.error.main, 0.05),
                                '&:hover': { backgroundColor: alpha(theme.palette.error.main, 0.15) }
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </Box>
                  </ListItem>
                  {index < notifications.length - 1 && <Divider sx={{ opacity: 0.6 }} />}
                </React.Fragment>
              );
            })}
          </List>
        ) : (
          <Box sx={{ p: 12, textAlign: "center" }}>
            <NotificationsNoneIcon sx={{ fontSize: 80, color: theme.palette.text.disabled, mb: 3, opacity: 0.3 }} />
            <Typography variant="h5" sx={{ color: theme.palette.text.secondary, fontWeight: 700, mb: 1 }}>
              Bandeja de entrada vacía
            </Typography>
            <Typography variant="body1" color="text.disabled">
              Aquí aparecerán las alertas importantes sobre tu negocio.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default Notifications;
