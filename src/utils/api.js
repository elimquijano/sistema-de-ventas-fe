import axios from "axios";
import Swal from "sweetalert2";
import { loaderEvents } from "./loaderEvents";

// Configuración base de la API
const API_BASE_HOST =
  process.env.REACT_APP_API_HOST || "http://localhost:8000";
export const API_BASE_URL = API_BASE_HOST + "/api"
export const API_STORAGE_URL = API_BASE_HOST + "/storage";

// Crear instancia de axios
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true, // Para enviar cookies si usas sesiones
});

// Interceptor para agregar token de autenticación
api.interceptors.request.use(
  (config) => {
    // Mostrar loader automáticamente a menos que se indique lo contrario
    if (!config.silent) {
      loaderEvents.emit("show", config.loaderMessage || "Cargando...");
    }

    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    loaderEvents.emit("hide");
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas y errores
api.interceptors.response.use(
  (response) => {
    if (!response.config.silent) {
      loaderEvents.emit("hide");
    }
    return response;
  },
  async (error) => {
    if (!error.config?.silent) {
      loaderEvents.emit("hide");
    }

    const originalRequest = error.config;

    // Evitar loop infinito si el refresh falla
    if (originalRequest.url.includes("/auth/refresh")) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      window.location.href = "/login";
      return Promise.reject(error);
    }

    // Si el token ha expirado (401) y no hemos excedido los reintentos (max 3)
    if (error.response?.status === 401 && (originalRequest._retryCount || 0) < 3) {
      originalRequest._retry = true;
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

      try {
        // Intentar refrescar el token
        const refreshResponse = await api.post("/auth/refresh");
        const newToken = refreshResponse.data.token;

        // Actualizar el token en localStorage
        localStorage.setItem("auth_token", newToken);

        // Reintentar la petición original con el nuevo token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Si el refresh falla, limpiar sesión y redirigir
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    // Para otros errores 401 (después del retry) o si no hay token
    if (error.response?.status === 401) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }

    // Manejo de errores 403 (Forbidden)
    if (error.response?.status === 403) {
      Swal.fire({
        title: "Access Denied",
        text: "You do not have permission to perform this action.",
        icon: "error",
        confirmButtonColor: "#673ab7",
      });
    }

    // Manejo de errores de red
    if (!error.response) {
      Swal.fire({
        title: "Network Error",
        text: "Please check your internet connection and try again.",
        icon: "error",
        confirmButtonColor: "#673ab7",
      });
    }

    return Promise.reject(error);
  }
);

// Funciones de API para autenticación
export const authAPI = {
  login: (credentials) => api.post("/auth/login", credentials, { loaderMessage: "Iniciando sesión..." }),
  register: (userData) => api.post("/auth/register", userData, { loaderMessage: "Creando cuenta..." }),
  logout: () => api.post("/auth/logout", {}, { loaderMessage: "Cerrando sesión..." }),
  forgotPassword: (email) => api.post("/auth/forgot-password", { email }, { loaderMessage: "Enviando correo de recuperación..." }),
  resetPassword: (data) => api.post("/auth/reset-password", data, { loaderMessage: "Restableciendo contraseña..." }),
  refreshToken: () => api.post("/auth/refresh", {}, { silent: true }),
  me: () => api.get("/auth/me", { loaderMessage: "Verificando identidad..." }), 
};

// Funciones de API para usuarios
export const usersAPI = {
  getAll: (params = {}) => api.get("/users", { params, loaderMessage: "Cargando usuarios..." }),
  getById: (id) => api.get(`/users/${id}`, { loaderMessage: "Obteniendo detalles de usuario..." }),
  create: (userData) => api.post("/users", userData, { loaderMessage: "Creando usuario..." }),
  update: (id, userData) => api.put(`/users/${id}`, userData, { loaderMessage: "Actualizando usuario..." }),
  delete: (id) => api.delete(`/users/${id}`, { loaderMessage: "Eliminando usuario..." }),
  updateStatus: (id, status) => api.patch(`/users/${id}/status`, { status }, { loaderMessage: "Cambiando estado..." }),
  assignRoles: (id, roleIds) =>
    api.post(`/users/${id}/roles`, { role_ids: roleIds }, { loaderMessage: "Asignando roles..." }),
};

// Funciones de API para roles
export const rolesAPI = {
  getAll: (params = {}) => api.get("/roles", { params, loaderMessage: "Cargando roles..." }),
  getById: (id) => api.get(`/roles/${id}`, { loaderMessage: "Obteniendo detalles de rol..." }),
  create: (roleData) => api.post("/roles", roleData, { loaderMessage: "Creando rol..." }),
  update: (id, roleData) => api.put(`/roles/${id}`, roleData, { loaderMessage: "Actualizando rol..." }),
  delete: (id) => api.delete(`/roles/${id}`, { loaderMessage: "Eliminando rol..." }),
  assignPermissions: (id, permissionIds) =>
    api.post(`/roles/${id}/permissions`, { permission_ids: permissionIds }, { loaderMessage: "Asignando permisos..." }),
};

// Funciones de API para permisos
export const permissionsAPI = {
  getAll: (params = {}) => api.get("/permissions", { params, loaderMessage: "Cargando permisos..." }),
  getById: (id) => api.get(`/permissions/${id}`, { loaderMessage: "Obteniendo detalles de permiso..." }),
  create: (permissionData) => api.post("/permissions", permissionData, { loaderMessage: "Creando permiso..." }),
  update: (id, permissionData) => api.put(`/permissions/${id}`, permissionData, { loaderMessage: "Actualizando permiso..." }),
  delete: (id) => api.delete(`/permissions/${id}`, { loaderMessage: "Eliminando permiso..." }),
  getByModule: (moduleId) => api.get(`/permissions/module/${moduleId}`, { loaderMessage: "Cargando permisos del módulo..." }),
};

// Funciones de API para módulos - ACTUALIZADAS
export const modulesAPI = {
  getAll: (params = {}) => api.get("/modules", { params, loaderMessage: "Cargando módulos..." }),
  getById: (id) => api.get(`/modules/${id}`, { loaderMessage: "Obteniendo detalles del módulo..." }),
  create: (moduleData) => api.post("/modules", moduleData, { loaderMessage: "Creando módulo..." }),
  update: (id, moduleData) => api.put(`/modules/${id}`, moduleData, { loaderMessage: "Actualizando módulo..." }),
  delete: (id) => api.delete(`/modules/${id}`, { loaderMessage: "Eliminando módulo..." }),
  getTree: () => api.get("/modules/tree", { loaderMessage: "Cargando estructura..." }),
  menu: () => api.get("/modules/menu", { silent: true }), // Menú dinámico filtrado por permisos
  getRouteConfig: () => api.get("/modules/route-config", { silent: true }), // Configuración de rutas
};

// Funciones de API para dashboard
export const dashboardAPI = {
  getStats: () => api.get("/dashboard/stats", { loaderMessage: "Cargando estadísticas del dashboard..." }),
  getChartData: (type) => api.get(`/dashboard/charts/${type}`, { loaderMessage: "Cargando datos de gráficos..." }),
  getRecentActivity: () => api.get("/dashboard/recent-activity", { loaderMessage: "Cargando actividad reciente..." }),
};

// Funciones de API para notificaciones
export const notificationsAPI = {
  getAll: (params = {}) => api.get("/notifications", { params }),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch("/notifications/mark-all-read"),
  delete: (id) => api.delete(`/notifications/${id}`),
  getUnreadCount: () => api.get("/notifications/unread-count"),
};

// NUEVAS APIs para el sistema de ventas
export const businessAPI = {
  getAll: (params = {}) => api.get("/businesses", { params, loaderMessage: "Cargando negocios..." }),
  getById: (id) => api.get(`/businesses/${id}`, { loaderMessage: "Obteniendo detalles del negocio..." }),
  create: (businessData) => api.post("/businesses", businessData, { loaderMessage: "Registrando negocio..." }),
  update: (id, businessData) => api.put(`/businesses/${id}`, businessData, { loaderMessage: "Actualizando negocio..." }),
  delete: (id) => api.delete(`/businesses/${id}`, { loaderMessage: "Eliminando negocio..." }),
  getStats: (id, period) =>
    api.get(`/businesses/${id}/dashboard`, { params: { period }, loaderMessage: "Cargando estadísticas..." }),
  searchProducts: (term) => api.get(`/products/search?term=${term}`, { silent: true }),
};

export const purchasesAPI = {
  getAll: (params = {}) => api.get("/purchases", { params, loaderMessage: "Cargando compras..." }),
  getById: (id) => api.get(`/purchases/${id}`, { loaderMessage: "Obteniendo detalles de la compra..." }),
  create: (purchaseData) =>
    api.post("/purchases", purchaseData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      loaderMessage: "Registrando compra..."
    }),
  update: (id, purchaseData) => api.put(`/purchases/${id}`, purchaseData, { loaderMessage: "Actualizando compra..." }),
  delete: (id) => api.delete(`/purchases/${id}`, { loaderMessage: "Eliminando compra..." }),
};

export const productsAPI = {
  getAll: (params = {}) => api.get("/products", { params, loaderMessage: "Cargando productos..." }),
  getById: (id) => api.get(`/products/${id}`, { loaderMessage: "Obteniendo detalles del producto..." }),
  create: (productData) =>
    api.post("/products", productData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      loaderMessage: "Creando producto..."
    }),
  update: (id, productData) => {
    // FormData should be sent with a POST request, but we can spoof the method
    productData.append("_method", "PUT");
    return api.post(`/products/${id}`, productData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      loaderMessage: "Actualizando producto..."
    });
  },
  delete: (id) => api.delete(`/products/${id}`, { loaderMessage: "Eliminando producto..." }),
  updateStock: (id, stock) => api.patch(`/products/${id}/stock`, { stock }, { loaderMessage: "Actualizando stock..." }),
  getLowStock: () => api.get("/products/low-stock", { silent: true }),
};

export const servicesAPI = {
  getAll: (params = {}) => api.get("/services", { params, loaderMessage: "Cargando servicios..." }),
  getById: (id) => api.get(`/services/${id}`, { loaderMessage: "Obteniendo detalles del servicio..." }),
  create: (serviceData) =>
    api.post("/services", serviceData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      loaderMessage: "Creando servicio..."
    }),
  update: (id, serviceData) => {
    serviceData.append("_method", "PUT");
    return api.post(`/services/${id}`, serviceData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      loaderMessage: "Actualizando servicio..."
    });
  },
  delete: (id) => api.delete(`/services/${id}`, { loaderMessage: "Eliminando servicio..." }),
};

export const salesAPI = {
  getAll: (params = {}) => api.get("/sales", { params, loaderMessage: "Cargando ventas..." }),
  getById: (id) => api.get(`/sales/${id}`, { loaderMessage: "Obteniendo detalles de la venta..." }),
  create: (saleData) => api.post("/sales", saleData, { loaderMessage: "Procesando venta..." }),
  update: (id, saleData) => api.put(`/sales/${id}`, saleData, { loaderMessage: "Actualizando venta..." }),
  delete: (id) => api.delete(`/sales/${id}`, { loaderMessage: "Anulando venta..." }),
  getDaily: (date) => api.get(`/sales/daily?date=${date}`, { loaderMessage: "Cargando reporte diario..." }),
  getMonthlySales: (month, year) => api.get(`/sales/monthly/${year}/${month}`, { loaderMessage: "Cargando reporte mensual..." }),
  getSaleReceipt: (saleId) =>
    api.get(`/sales/${saleId}/receipt`, { responseType: "blob", loaderMessage: "Generando recibo..." }),
  whatsappResend: (saleId, data = {}) => api.post(`/sales/${saleId}/whatsapp-resend`, data, { loaderMessage: "Reenviando WhatsApp..." }),
  quickOrder: (orderData) => api.post("/sales/quick-order", orderData, { loaderMessage: "Registrando pedido..." }),
  confirmDelivery: (id, paymentData) => api.post(`/sales/${id}/confirm-delivery`, paymentData, { loaderMessage: "Confirmando entrega..." }),
  cancelOrder: (id) => api.post(`/sales/${id}/cancel`, {}, { loaderMessage: "Cancelando pedido..." }),
};

export const expensesAPI = {
  getAll: (params = {}) => api.get("/expenses", { params, loaderMessage: "Cargando gastos..." }),
  getById: (id) => api.get(`/expenses/${id}`, { loaderMessage: "Obteniendo detalles del gasto..." }),
  create: (expenseData) => api.post("/expenses", expenseData, { loaderMessage: "Registrando gasto..." }),
  update: (id, expenseData) => api.put(`/expenses/${id}`, expenseData, { loaderMessage: "Actualizando gasto..." }),
  delete: (id) => api.delete(`/expenses/${id}`, { loaderMessage: "Eliminando gasto..." }),
  getByCategory: (categoryId) => api.get(`/expenses/category/${categoryId}`, { loaderMessage: "Cargando gastos por categoría..." }),
};

export const creditsAPI = {
  getAll: (params = {}) => api.get("/credits", { params, loaderMessage: "Cargando créditos..." }),
  getById: (id) => api.get(`/credits/${id}`, { loaderMessage: "Obteniendo detalles del crédito..." }),
  update: (id, creditData) => api.put(`/credits/${id}`, creditData, { loaderMessage: "Actualizando crédito..." }),
  processPayment: (id, paymentData) =>
    api.post(`/credits/${id}/payment`, paymentData, { loaderMessage: "Procesando pago de crédito..." }),
  getPending: () => api.get("/credits/pending", { loaderMessage: "Cargando créditos pendientes..." }),
};

export const loansAPI = {
  getAll: (params = {}) => api.get("/loans", { params, loaderMessage: "Cargando préstamos..." }),
  getById: (id) => api.get(`/loans/${id}`, { loaderMessage: "Obteniendo detalles del préstamo..." }),
  create: (loanData) => api.post("/loans", loanData, { loaderMessage: "Registrando préstamo..." }),
  update: (id, loanData) => api.put(`/loans/${id}`, loanData, { loaderMessage: "Actualizando préstamo..." }),
  delete: (id) => api.delete(`/loans/${id}`, { loaderMessage: "Eliminando préstamo..." }),
  addPayment: (id, paymentData) =>
    api.post(`/loans/${id}/payment`, paymentData, { loaderMessage: "Registrando pago de préstamo..." }),
  getPending: () => api.get("/loans/pending", { loaderMessage: "Cargando préstamos pendientes..." }),
};

export const categoriesAPI = {
  getAll: (params = {}) => api.get("/categories", { params, loaderMessage: "Cargando categorías..." }),
  getById: (id) => api.get(`/categories/${id}`, { loaderMessage: "Obteniendo detalles de categoría..." }),
  create: (categoryData) => api.post("/categories", categoryData, { loaderMessage: "Creando categoría..." }),
  update: (id, categoryData) => api.put(`/categories/${id}`, categoryData, { loaderMessage: "Actualizando categoría..." }),
  delete: (id) => api.delete(`/categories/${id}`, { loaderMessage: "Eliminando categoría..." }),
};

export const clientsAPI = {
  getAll: (params = {}) => api.get("/clients", { params, loaderMessage: "Cargando clientes..." }),
  getById: (id) => api.get(`/clients/${id}`, { loaderMessage: "Obteniendo detalles del cliente..." }),
  create: (clientData) =>
    api.post("/clients", clientData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      loaderMessage: "Creando cliente..."
    }),
  update: (id, clientData) => {
    // Para Laravel multipart PUT, usamos POST con _method=PUT
    if (clientData instanceof FormData) {
      if (!clientData.has("_method")) {
        clientData.append("_method", "PUT");
      }
      return api.post(`/clients/${id}`, clientData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        loaderMessage: "Actualizando cliente..."
      });
    }
    return api.put(`/clients/${id}`, clientData, { loaderMessage: "Actualizando cliente..." });
  },
  delete: (id) => api.delete(`/clients/${id}`, { loaderMessage: "Eliminando cliente..." }),
};

export const cashRegisterAPI = {
  getAll: (params = {}) => api.get("/cash-registers", { params, loaderMessage: "Cargando cajas..." }),
  getCurrent: (params = {}) => api.get("/cash-registers/current", { params, loaderMessage: "Verificando caja abierta..." }),
  create: (data) => api.post("/cash-registers", data, { loaderMessage: "Abriendo caja..." }),
  close: (id, data) => api.post(`/cash-registers/${id}/close`, data, { loaderMessage: "Cerrando caja..." }),
  getReport: (id) => api.get(`/cash-registers/${id}/report`, { loaderMessage: "Generando reporte de caja..." }),
};

export default api;
