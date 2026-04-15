import React from "react";
import {
  Box,
  Typography,
  IconButton,
  Badge,
  Menu,
  Divider,
  Button,
  Chip,
  List,
  ListItem,
  Tooltip,
  alpha,
  useTheme,
  CircularProgress,
  Link,
} from "@mui/material";
import {
  Notifications as NotificationsIcon,
  NotificationsNone as NotificationsNoneIcon,
  Circle as CircleIcon,
  Delete as DeleteIcon,
  Done as DoneIcon,
  Info as InfoIcon,
} from "@mui/icons-material";
import { useNotifications } from "../contexts/NotificationContext";
import { useNavigate } from "react-router-dom";

// Simple relative time formatter since date-fns is not available
const formatRelativeTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "hace unos segundos";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `hace ${diffInMinutes} min`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `hace ${diffInHours} h`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `hace ${diffInDays} d`;
  
  return date.toLocaleDateString();
};

const NotificationMenu = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = async (e, id) => {
    e.stopPropagation();
    await markAsRead(id);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    await deleteNotification(id);
  };

  const handleViewAll = (e) => {
    if (e) e.preventDefault();
    handleClose();
    navigate("/dashboard/notifications");
  };

  const getIcon = (type) => {
    if (type && type.includes("AuditPerformedNotification")) {
      return <InfoIcon color="primary" sx={{ fontSize: 20 }} />;
    }
    return <CircleIcon sx={{ fontSize: 8 }} color="primary" />;
  };

  const getNotificationStyles = (notification) => {
    const isUnread = !notification.read_at;
    const hoverBg = theme.palette.mode === 'dark' 
      ? alpha(theme.palette.primary.main, 0.15) 
      : alpha(theme.palette.primary.main, 0.04);

    return {
      px: 2,
      py: 1.5,
      cursor: "pointer",
      backgroundColor: isUnread 
        ? (theme.palette.mode === 'dark' ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.primary.main, 0.02)) 
        : "inherit",
      "&:hover": {
        backgroundColor: hoverBg,
      },
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      gap: 0.5,
      borderBottom: `1px solid ${theme.palette.divider}`,
      transition: theme.transitions.create('background-color'),
    };
  };

  return (
    <>
      <Tooltip title="Notificaciones">
        <IconButton color="inherit" onClick={handleOpen}>
          <Badge badgeContent={unreadCount} color="error" sx={{ '& .MuiBadge-badge': { fontWeight: 600 } }}>
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 360,
            maxHeight: 520,
            mt: 1.5,
            boxShadow: theme.palette.mode === 'dark' ? theme.shadows[10] : '0 8px 32px rgba(0,0,0,0.08)',
            borderRadius: 2,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            border: `1px solid ${theme.palette.divider}`,
          },
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link
            component="button"
            variant="h6"
            onClick={handleViewAll}
            sx={{ 
              fontWeight: 700, 
              fontSize: "1rem", 
              color: theme.palette.text.primary,
              textDecoration: 'none',
              '&:hover': {
                color: theme.palette.primary.main,
              }
            }}
          >
            Notificaciones
          </Link>
          {unreadCount > 0 && (
            <Chip
              label={`${unreadCount} nuevas`}
              size="small"
              color="primary"
              sx={{ fontWeight: 700, height: 20, fontSize: '0.7rem' }}
            />
          )}
        </Box>

        <Divider />

        <Box sx={{ maxHeight: 380, overflowY: "auto", flexGrow: 1 }}>
          {loading && notifications.length === 0 ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <CircularProgress size={24} thickness={5} />
            </Box>
          ) : notifications.length > 0 ? (
            <List disablePadding>
              {notifications.map((notification) => {
                const data = notification.data || {};
                const isUnread = !notification.read_at;
                
                return (
                  <ListItem
                    key={notification.id}
                    sx={getNotificationStyles(notification)}
                    onClick={() => {
                      if (isUnread) markAsRead(notification.id);
                    }}
                  >
                    <Box sx={{ display: "flex", width: "100%", gap: 1.5 }}>
                      <Box sx={{ mt: 0.5, display: 'flex', justifyContent: 'center', width: 24 }}>
                        {getIcon(notification.type)}
                      </Box>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography 
                          variant="subtitle2" 
                          sx={{ 
                            fontWeight: isUnread ? 700 : 600,
                            lineHeight: 1.2,
                            mb: 0.5,
                            color: isUnread ? theme.palette.text.primary : theme.palette.text.secondary
                          }}
                        >
                          {data.title || "Notificación"}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{ 
                            fontSize: "0.8rem",
                            lineHeight: 1.4,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            mb: 1
                          }}
                        >
                          {data.message}
                        </Typography>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <Typography variant="caption" sx={{ color: theme.palette.text.disabled, fontWeight: 500 }}>
                            {formatRelativeTime(notification.created_at)}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            {isUnread && (
                              <Tooltip title="Marcar como leída">
                                <IconButton 
                                  size="small" 
                                  onClick={(e) => handleMarkAsRead(e, notification.id)}
                                  sx={{ 
                                    color: theme.palette.success.main, 
                                    p: 0.5,
                                    '&:hover': { backgroundColor: alpha(theme.palette.success.main, 0.1) }
                                  }}
                                >
                                  <DoneIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Eliminar">
                              <IconButton 
                                size="small" 
                                onClick={(e) => handleDelete(e, notification.id)}
                                sx={{ 
                                  color: theme.palette.error.light, 
                                  p: 0.5,
                                  '&:hover': { backgroundColor: alpha(theme.palette.error.main, 0.1) }
                                }}
                              >
                                <DeleteIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  </ListItem>
                );
              })}
            </List>
          ) : (
            <Box sx={{ p: 6, textAlign: "center" }}>
              <NotificationsNoneIcon sx={{ fontSize: 48, color: theme.palette.text.disabled, mb: 1.5, opacity: 0.5 }} />
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>
                No tienes notificaciones pendientes
              </Typography>
            </Box>
          )}
        </Box>

        <Divider />

        <Box sx={{ p: 1.5 }}>
          <Button 
            variant="contained"
            size="small" 
            fullWidth 
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            startIcon={<DoneIcon />}
            sx={{ 
              textTransform: "none",
              boxShadow: 'none',
              '&:hover': { boxShadow: 'none' }
            }}
          >
            Marcar todo como leído
          </Button>
        </Box>
      </Menu>
    </>
  );
};

export default NotificationMenu;
