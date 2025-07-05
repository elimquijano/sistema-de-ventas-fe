// URLs de la API
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
  },
  USERS: {
    BASE: '/users',
    BY_ID: (id) => `/users/${id}`,
    STATUS: (id) => `/users/${id}/status`,
    ROLES: (id) => `/users/${id}/roles`,
  },
  ROLES: {
    BASE: '/roles',
    BY_ID: (id) => `/roles/${id}`,
    PERMISSIONS: (id) => `/roles/${id}/permissions`,
  },
  PERMISSIONS: {
    BASE: '/permissions',
    BY_ID: (id) => `/permissions/${id}`,
    BY_MODULE: (moduleId) => `/permissions/module/${moduleId}`,
  },
  MODULES: {
    BASE: '/modules',
    BY_ID: (id) => `/modules/${id}`,
    TREE: '/modules/tree',
  },
  DASHBOARD: {
    STATS: '/dashboard/stats',
    CHARTS: (type) => `/dashboard/charts/${type}`,
    RECENT_ACTIVITY: '/dashboard/recent-activity',
  },
  NOTIFICATIONS: {
    BASE: '/notifications',
    BY_ID: (id) => `/notifications/${id}`,
    MARK_READ: (id) => `/notifications/${id}/read`,
    MARK_ALL_READ: '/notifications/mark-all-read',
    UNREAD_COUNT: '/notifications/unread-count',
  },
};

// Estados del sistema
export const STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  DRAFT: 'draft',
  PUBLISHED: 'published',
};

// Tipos de permisos
export const PERMISSION_TYPES = {
  VIEW: 'view',
  CREATE: 'create',
  EDIT: 'edit',
  DELETE: 'delete',
  MANAGE: 'manage',
};

// Tipos de módulos
export const MODULE_TYPES = {
  MENU: 'menu',
  PAGE: 'page',
  BUTTON: 'button',
  SECTION: 'section',
};

// Roles del sistema
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  EDITOR: 'editor',
  USER: 'user',
};

// Tipos de notificaciones
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
};

// Configuración de paginación
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [5, 10, 25, 50, 100],
};

// Configuración de archivos
export const FILE_CONFIG = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: {
    IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    DOCUMENTS: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    SPREADSHEETS: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  },
};

// Configuración de fechas
export const DATE_FORMATS = {
  DISPLAY: 'DD/MM/YYYY',
  DISPLAY_WITH_TIME: 'DD/MM/YYYY HH:mm',
  API: 'YYYY-MM-DD',
  API_WITH_TIME: 'YYYY-MM-DD HH:mm:ss',
};

// Mensajes del sistema
export const MESSAGES = {
  SUCCESS: {
    CREATED: 'Registro creado exitosamente',
    UPDATED: 'Registro actualizado exitosamente',
    DELETED: 'Registro eliminado exitosamente',
    SAVED: 'Cambios guardados exitosamente',
  },
  ERROR: {
    GENERIC: 'Ha ocurrido un error inesperado',
    NETWORK: 'Error de conexión. Verifique su conexión a internet',
    UNAUTHORIZED: 'No tiene permisos para realizar esta acción',
    NOT_FOUND: 'El recurso solicitado no fue encontrado',
    VALIDATION: 'Por favor, corrija los errores en el formulario',
  },
  CONFIRM: {
    DELETE: '¿Está seguro que desea eliminar este registro?',
    LOGOUT: '¿Está seguro que desea cerrar sesión?',
    DISCARD_CHANGES: '¿Está seguro que desea descartar los cambios?',
  },
};

// Configuración de colores para gráficos
export const CHART_COLORS = [
  '#673ab7',
  '#2196f3',
  '#4caf50',
  '#ff9800',
  '#f44336',
  '#9c27b0',
  '#00bcd4',
  '#8bc34a',
  '#ffc107',
  '#e91e63',
];

// Configuración de tema
export const THEME_CONFIG = {
  SIDEBAR_WIDTH: 260,
  HEADER_HEIGHT: 64,
  BORDER_RADIUS: 8,
  SPACING: 8,
};

export default {
  API_ENDPOINTS,
  STATUS,
  PERMISSION_TYPES,
  MODULE_TYPES,
  ROLES,
  NOTIFICATION_TYPES,
  PAGINATION,
  FILE_CONFIG,
  DATE_FORMATS,
  MESSAGES,
  CHART_COLORS,
  THEME_CONFIG,
};