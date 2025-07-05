import React, { useState, useEffect } from "react";
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  InputBase,
  Badge,
  Collapse,
  useTheme,
  alpha,
  Button,
  Chip,
  Switch,
  FormControlLabel,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Search as SearchIcon,
  Notifications as NotificationsIcon,
  ExpandLess,
  ExpandMore,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  Fullscreen as FullscreenIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  FullscreenExit,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from "@mui/icons-material";
import { useNavigate, useLocation, Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme as useCustomTheme } from "../contexts/ThemeContext";
import { notificationsAPI, modulesAPI } from "../utils/api";
import { getIcon } from "../config/moduleConfig";
import { DynamicRoutes } from "../routes/DynamicRouteGenerator";
import { findFirstValidRoute } from "../utils/navigationUtils";

const drawerWidth = 260;
const collapsedDrawerWidth = 64;

const enterFullscreen = (element = document.documentElement) => {
  if (element.requestFullscreen) element.requestFullscreen();
  else if (element.mozRequestFullScreen) element.mozRequestFullScreen();
  else if (element.webkitRequestFullscreen) element.webkitRequestFullscreen();
  else if (element.msRequestFullscreen) element.msRequestFullscreen();
};

const exitFullscreen = () => {
  if (document.exitFullscreen) document.exitFullscreen();
  else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
  else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  else if (document.msExitFullscreen) document.msExitFullscreen();
};

export const DashboardLayout = () => {
  const theme = useTheme();
  const { isDarkMode, toggleDarkMode } = useCustomTheme();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasPermission } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const [expandedItems, setExpandedItems] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuModules, setMenuModules] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentDrawerWidth = sidebarCollapsed
    ? collapsedDrawerWidth
    : drawerWidth;

  useEffect(() => {
    loadNotifications();
    loadMenuModules();
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await notificationsAPI.getAll({ unread: true });
      setNotifications(response.data.data || []);
      setUnreadCount(response.data.unread_count || 0);
    } catch (error) {
      console.error("Error loading notifications:", error);
      const mockNotifications = [
        {
          id: 1,
          type: "info",
          title: "Welcome",
          message: "Welcome to Berry Dashboard",
          read_at: null,
          created_at: new Date().toISOString(),
        },
      ];
      setNotifications(mockNotifications);
      setUnreadCount(1);
    }
  };

  const loadMenuModules = async () => {
    try {
      setLoading(true);
      const response = await modulesAPI.menu();
      const modules = response.data.data || [];
      setMenuModules(modules);
      const firstRoute = findFirstValidRoute(modules);
      const isAtDashboardRoot =
        location.pathname === "/dashboard" ||
        location.pathname === "/dashboard/";
      if (isAtDashboardRoot && firstRoute && firstRoute !== "/dashboard") {
        navigate(firstRoute, { replace: true });
      }
    } catch (error) {
      console.error("Error loading menu modules:", error);
      // Fallback a menú estático si falla la API
      setMenuModules([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFullscreen = () => {
    if (!isFullscreen) {
      enterFullscreen();
    } else {
      exitFullscreen();
    }
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (event) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchor(null);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
    handleClose();
  };

  const handleExpandClick = (text) => {
    if (sidebarCollapsed) return;
    setExpandedItems((prev) =>
      prev.includes(text)
        ? prev.filter((item) => item !== text)
        : [...prev, text]
    );
  };

  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking notifications as read:", error);
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    }
  };

  const renderMenuItem = (item, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.name);
    const isActive = item.route && location.pathname === item.route;

    return (
      <React.Fragment key={item.id}>
        <ListItem disablePadding sx={{ display: "block" }}>
          <ListItemButton
            sx={{
              minHeight: 40,
              justifyContent: sidebarCollapsed ? "center" : "initial",
              px: sidebarCollapsed ? 1 : 2,
              py: 0.5,
              pl: sidebarCollapsed ? 1 : depth * 2 + 2,
              backgroundColor: isActive
                ? alpha(theme.palette.primary.main, 0.08)
                : "transparent",
              borderRadius: 1,
              mx: sidebarCollapsed ? 0.5 : 1,
              mb: 0.5,
              "&:hover": {
                backgroundColor: alpha(theme.palette.primary.main, 0.04),
              },
            }}
            onClick={() => {
              if (hasChildren && !sidebarCollapsed) {
                handleExpandClick(item.name);
              } else if (item.route) {
                navigate(item.route);
              }
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: sidebarCollapsed ? 0 : 1.5,
                justifyContent: "center",
                color: isActive
                  ? theme.palette.primary.main
                  : theme.palette.text.secondary,
                fontSize: "1.2rem",
              }}
            >
              {getIcon(item.icon)}
            </ListItemIcon>
            {!sidebarCollapsed && (
              <>
                <ListItemText
                  primary={item.name}
                  sx={{
                    color: isActive
                      ? theme.palette.primary.main
                      : theme.palette.text.primary,
                    "& .MuiListItemText-primary": {
                      fontWeight: isActive ? 600 : 400,
                      fontSize: "0.875rem",
                    },
                  }}
                />
                {hasChildren && (
                  <IconButton
                    size="small"
                    sx={{ color: theme.palette.text.secondary, p: 0 }}
                  >
                    {isExpanded ? (
                      <ExpandLess fontSize="small" />
                    ) : (
                      <ExpandMore fontSize="small" />
                    )}
                  </IconButton>
                )}
              </>
            )}
          </ListItemButton>
        </ListItem>
        {hasChildren && !sidebarCollapsed && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children?.map((child) => renderMenuItem(child, depth + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  const renderModule = (module) => {
    const visibleItems =
      module.children?.filter(
        (item) => item.status === "active" && item.show_in_menu
      ) || [];

    // Si es un módulo sin hijos visibles, no mostrarlo
    if (module.type === "module" && visibleItems.length === 0) return null;

    // Si es una página individual, mostrarla directamente
    if (module.type === "page") {
      return renderMenuItem(module);
    }

    return (
      <Box key={module.id} sx={{ mb: 2 }}>
        {!sidebarCollapsed && (
          <Typography
            variant="caption"
            sx={{
              px: 2,
              py: 1,
              display: "block",
              color: theme.palette.text.secondary,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              fontSize: "0.75rem",
            }}
          >
            {module.name}
          </Typography>
        )}
        <List dense>{visibleItems.map((item) => renderMenuItem(item))}</List>
      </Box>
    );
  };

  const drawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Logo */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          px: sidebarCollapsed ? 1 : 2,
          py: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
          justifyContent: sidebarCollapsed ? "center" : "flex-start",
        }}
      >
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mr: sidebarCollapsed ? 0 : 1,
          }}
        >
          <Typography variant="body2" sx={{ color: "white", fontWeight: 700 }}>
            🍇
          </Typography>
        </Box>
        {!sidebarCollapsed && (
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, color: theme.palette.primary.main }}
          >
            BERRY
          </Typography>
        )}
      </Box>

      {/* Menu Items */}
      <Box sx={{ flex: 1, overflow: "auto", py: 1 }}>
        {loading ? (
          <Box sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              Cargando menú...
            </Typography>
          </Box>
        ) : (
          menuModules.map((module) => renderModule(module))
        )}
      </Box>

      {/* Collapse Button */}
      <Box sx={{ p: 1, borderTop: `1px solid ${theme.palette.divider}` }}>
        <IconButton
          onClick={handleSidebarToggle}
          sx={{
            width: "100%",
            justifyContent: "center",
            color: theme.palette.text.secondary,
          }}
        >
          {sidebarCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex" }}>
      {/* Header */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${currentDrawerWidth}px)` },
          ml: { sm: `${currentDrawerWidth}px` },
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          boxShadow: "none",
          borderBottom: `1px solid ${theme.palette.divider}`,
          transition: theme.transitions.create(["width", "margin"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar sx={{ minHeight: "64px !important" }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>

          {/* Search */}
          <Box
            sx={{
              position: "relative",
              borderRadius: 1,
              backgroundColor: alpha(theme.palette.common.black, 0.04),
              "&:hover": {
                backgroundColor: alpha(theme.palette.common.black, 0.06),
              },
              marginLeft: 0,
              width: "100%",
              maxWidth: 300,
            }}
          >
            <Box
              sx={{
                padding: theme.spacing(0, 2),
                height: "100%",
                position: "absolute",
                pointerEvents: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <SearchIcon fontSize="small" />
            </Box>
            <InputBase
              placeholder="Search"
              sx={{
                color: "inherit",
                width: "100%",
                "& .MuiInputBase-input": {
                  padding: theme.spacing(1, 1, 1, 0),
                  paddingLeft: `calc(1em + ${theme.spacing(4)})`,
                  fontSize: "0.875rem",
                },
              }}
            />
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          {/* Header Actions */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Tooltip title="Toggle Dark Mode">
              <IconButton color="inherit" onClick={toggleDarkMode}>
                {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>

            <Tooltip title="Fullscreen">
              <IconButton color="inherit" onClick={handleToggleFullscreen}>
                {isFullscreen ? <FullscreenExit /> : <FullscreenIcon />}
              </IconButton>
            </Tooltip>

            <Tooltip title="Notifications">
              <IconButton color="inherit" onClick={handleNotificationClick}>
                <Badge badgeContent={unreadCount} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            <Tooltip title="Profile">
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenu}
                color="inherit"
                sx={{ ml: 1 }}
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: theme.palette.primary.main,
                    fontSize: "0.875rem",
                  }}
                >
                  {user?.first_name?.charAt(0)}
                  {user?.last_name?.charAt(0)}
                </Avatar>
              </IconButton>
            </Tooltip>

            {/* Notifications Menu */}
            <Menu
              anchorEl={notificationAnchor}
              open={Boolean(notificationAnchor)}
              onClose={handleNotificationClose}
              PaperProps={{
                sx: {
                  width: 330,
                  maxHeight: 500,
                  mt: 1,
                  border: `1px solid ${theme.palette.divider}`,
                },
              }}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            >
              {/* Header de notificaciones */}
              <Box
                sx={{
                  p: 2,
                  borderBottom: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 1,
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    All Notification
                    <Chip
                      label={unreadCount.toString().padStart(2, "0")}
                      color="warning"
                      size="small"
                      sx={{ fontSize: "0.75rem", height: 20 }}
                    />
                  </Typography>
                </Box>
                <Button
                  size="small"
                  onClick={markAllAsRead}
                  sx={{
                    color: theme.palette.primary.main,
                    textTransform: "none",
                    p: 0,
                  }}
                >
                  Mark as all read
                </Button>
              </Box>

              {/* Lista de notificaciones */}
              <Box sx={{ maxHeight: 300, overflow: "auto" }}>
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <Box
                      key={notification.id}
                      sx={{
                        p: 2,
                        borderBottom: `1px solid ${theme.palette.divider}`,
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 600, fontSize: "0.875rem" }}
                      >
                        {notification.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontSize: "0.75rem", mt: 0.5 }}
                      >
                        {notification.message}
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mt: 1,
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          {new Date(notification.created_at).toLocaleString()}
                        </Typography>
                        {!notification.read_at && (
                          <Chip
                            label="Unread"
                            color="error"
                            size="small"
                            sx={{ fontSize: "0.6rem", height: 18 }}
                          />
                        )}
                      </Box>
                    </Box>
                  ))
                ) : (
                  <Box sx={{ p: 2, textAlign: "center" }}>
                    <Typography variant="body2" color="text.secondary">
                      No notifications
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Footer */}
              <Box
                sx={{
                  p: 2,
                  textAlign: "center",
                  borderTop: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Button color="primary" sx={{ textTransform: "none" }}>
                  View All
                </Button>
              </Box>
            </Menu>

            {/* User Menu */}
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              keepMounted
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
              PaperProps={{
                sx: {
                  width: 290,
                  mt: 1,
                },
              }}
            >
              <Box
                sx={{
                  p: 2,
                  borderBottom: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Hola, {user?.first_name} {user?.last_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user?.roles?.[0]?.name || "User"}
                </Typography>
              </Box>

              <Box sx={{ p: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={isDarkMode}
                      onChange={toggleDarkMode}
                      color="primary"
                    />
                  }
                  label="Modo Oscuro"
                  sx={{ mb: 1 }}
                />
                <FormControlLabel
                  control={<Switch color="primary" />}
                  label="Permitir Notificaciones"
                />
              </Box>

              <Divider />

              <MenuItem onClick={() => navigate("/dashboard/settings")}>
                <ListItemIcon>
                  <SettingsIcon fontSize="small" />
                </ListItemIcon>
                Configuración de Cuenta
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                Cerrar Sesión
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Box
        component="nav"
        sx={{
          width: { sm: currentDrawerWidth },
          flexShrink: { sm: 0 },
          transition: theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              borderRight: `1px solid ${theme.palette.divider}`,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: currentDrawerWidth,
              borderRight: `1px solid ${theme.palette.divider}`,
              transition: theme.transitions.create("width", {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
              }),
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${currentDrawerWidth}px)` },
          mt: "64px",
          backgroundColor: theme.palette.background.default,
          minHeight: "calc(100vh - 64px)",
          transition: theme.transitions.create(["width", "margin"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "calc(100vh - 64px)",
            }}
          >
            <CircularProgress />
          </Box>
        ) : // Si menuModules está vacío después de cargar, significa que el usuario no tiene acceso a NADA.
        menuModules.length > 0 ? (
          <DynamicRoutes navConfig={menuModules} />
        ) : (
          <Navigate to="/unauthorized" replace />
        )}
      </Box>
    </Box>
  );
};
