import React from "react";

// Importar todos los componentes
import { Dashboard as DashboardPage } from "../pages/Dashboard";
import { Analytics as AnalyticsPage } from "../pages/Analytics";
import { Users } from "../pages/Users";
import { UserRoles } from "../pages/UserRoles";
import { UserPermissions } from "../pages/UserPermissions";
import { Customers } from "../pages/Customers";
import { Statistics } from "../pages/Statistics";
import { DataPage } from "../pages/DataPage";
import { ChartPage } from "../pages/ChartPage";
import { Chat as ChatPage } from "../pages/Chat";
import { Kanban } from "../pages/Kanban";
import { Mail as MailPage } from "../pages/Mail";
import { Calendar } from "../pages/Calendar";
import { Modules } from "../pages/Modules";
import { Settings as SettingsPage } from "../pages/Settings";

// Importar iconos de Material-UI
import {
  Dashboard,
  People,
  ShoppingCart,
  Settings,
  Notifications,
  Search,
  Favorite,
  Home,
  Mail,
  Menu,
  Article,
} from "@mui/icons-material";

// Mapeo de componentes - AQUÍ AGREGAS NUEVOS COMPONENTES
export const componentMap = {
  // Componentes existentes
  DashboardPage,
  AnalyticsPage,
  Users,
  UserRoles,
  UserPermissions,
  Customers,
  Statistics,
  DataPage,
  ChartPage,
  ChatPage,
  Kanban,
  MailPage,
  Calendar,
  Modules,
  SettingsPage,
};

// Mapeo de iconos - AQUÍ TIENES TODOS LOS ICONOS DISPONIBLES
export const iconMap = {
  Dashboard: <Dashboard />,
  People: <People />,
  ShoppingCart: <ShoppingCart />,
  Settings: <Settings />,
  Notifications: <Notifications />,
  Search: <Search />,
  Favorite: <Favorite />,
  Home: <Home />,
  Mail: <Mail />,
  Menu: <Menu />,
};

// Función para obtener icono por nombre
export const getIcon = (iconName) => {
  return iconMap[iconName] || <Article />;
};

// Función para obtener componente por nombre
export const getComponent = (componentName) => {
  return componentMap[componentName];
};

// Lista de iconos disponibles para el selector (solo los más comunes)
export const availableIcons = Object.keys(iconMap).map((icon) => ({
  label: icon,
  value: icon.replace("Icon", ""),
  icon: iconMap[icon],
}));

export default {
  componentMap,
  iconMap,
  getIcon,
  getComponent,
  availableIcons,
};
