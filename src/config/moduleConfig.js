import React from "react";

// Importar todos los componentes existentes
import { Users } from "../pages/Users";
import { UserRoles } from "../pages/UserRoles";
import { UserPermissions } from "../pages/UserPermissions";
import { Modules } from "../pages/Modules";
import { Settings as SettingsPage } from "../pages/Settings";

// Importar nuevos componentes del sistema de ventas
import { Business } from "../pages/Business";
import { Products } from "../pages/Products";
import { Services } from "../pages/Services";
import { PointOfSale } from "../pages/PointOfSale";
import { Sales } from "../pages/Sales";
import { Expenses } from "../pages/Expenses";
import { Credits } from "../pages/Credits";
import { BusinessDashboard } from "../pages/BusinessDashboard";
import { Categories } from "../pages/Categories";
import { Loans } from "../pages/Loans";

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
  Business as BusinessIcon,
  Inventory,
  Build,
  PointOfSale as PointOfSaleIcon,
  Receipt,
  AccountBalance,
  CreditCard,
  Assessment,
  Store,
} from "@mui/icons-material";

// Mapeo de componentes - AQUÍ AGREGAS NUEVOS COMPONENTES
export const componentMap = {
  // Componentes existentes
  Users,
  UserRoles,
  UserPermissions,
  Modules,
  SettingsPage,
  
  // Nuevos componentes del sistema de ventas
  BusinessDashboard,
  Business,
  Products,
  Services,
  PointOfSale,
  Sales,
  Expenses,
  Credits,
  Categories,
  Loans,
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
  Business: <BusinessIcon />,
  Inventory: <Inventory />,
  Build: <Build />,
  PointOfSale: <PointOfSaleIcon />,
  Receipt: <Receipt />,
  AccountBalance: <AccountBalance />,
  CreditCard: <CreditCard />,
  Assessment: <Assessment />,
  Store: <Store />,
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