import axios from 'axios';
import Swal from 'sweetalert2';

// Configuración base de la API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Crear instancia de axios
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // Para enviar cookies si usas sesiones
});

// Interceptor para agregar token de autenticación
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas y errores
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Si el token ha expirado (401) y no hemos intentado refrescar
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Intentar refrescar el token
        const refreshResponse = await api.post('/auth/refresh');
        const newToken = refreshResponse.data.token;
        
        // Actualizar el token en localStorage
        localStorage.setItem('auth_token', newToken);
        
        // Reintentar la petición original con el nuevo token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
        
      } catch (refreshError) {
        // Si el refresh falla, limpiar sesión y redirigir
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Para otros errores 401 (después del retry) o si no hay token
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    // Manejo de errores 403 (Forbidden)
    if (error.response?.status === 403) {
      Swal.fire({
        title: 'Access Denied',
        text: 'You do not have permission to perform this action.',
        icon: 'error',
        confirmButtonColor: '#673ab7',
      });
    }

    // Manejo de errores de red
    if (!error.response) {
      Swal.fire({
        title: 'Network Error',
        text: 'Please check your internet connection and try again.',
        icon: 'error',
        confirmButtonColor: '#673ab7',
      });
    }
    
    return Promise.reject(error);
  }
);

// Funciones de API para autenticación
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  refreshToken: () => api.post('/auth/refresh'),
  me: () => api.get('/auth/me'), // Para verificar el estado de la sesión
};

// Funciones de API para usuarios
export const usersAPI = {
  getAll: (params = {}) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (userData) => api.post('/users', userData),
  update: (id, userData) => api.put(`/users/${id}`, userData),
  delete: (id) => api.delete(`/users/${id}`),
  updateStatus: (id, status) => api.patch(`/users/${id}/status`, { status }),
  assignRoles: (id, roleIds) => api.post(`/users/${id}/roles`, { role_ids: roleIds }),
};

// Funciones de API para roles
export const rolesAPI = {
  getAll: (params = {}) => api.get('/roles', { params }),
  getById: (id) => api.get(`/roles/${id}`),
  create: (roleData) => api.post('/roles', roleData),
  update: (id, roleData) => api.put(`/roles/${id}`, roleData),
  delete: (id) => api.delete(`/roles/${id}`),
  assignPermissions: (id, permissionIds) => api.post(`/roles/${id}/permissions`, { permission_ids: permissionIds }),
};

// Funciones de API para permisos
export const permissionsAPI = {
  getAll: (params = {}) => api.get('/permissions', { params }),
  getById: (id) => api.get(`/permissions/${id}`),
  create: (permissionData) => api.post('/permissions', permissionData),
  update: (id, permissionData) => api.put(`/permissions/${id}`, permissionData),
  delete: (id) => api.delete(`/permissions/${id}`),
  getByModule: (moduleId) => api.get(`/permissions/module/${moduleId}`),
};

// Funciones de API para módulos - ACTUALIZADAS
export const modulesAPI = {
  getAll: (params = {}) => api.get('/modules', { params }),
  getById: (id) => api.get(`/modules/${id}`),
  create: (moduleData) => api.post('/modules', moduleData),
  update: (id, moduleData) => api.put(`/modules/${id}`, moduleData),
  delete: (id) => api.delete(`/modules/${id}`),
  getTree: () => api.get('/modules/tree'),
  menu: () => api.get('/modules/menu'), // Menú dinámico filtrado por permisos
  getRouteConfig: () => api.get('/modules/route-config'), // Configuración de rutas
};

// Funciones de API para dashboard
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getChartData: (type) => api.get(`/dashboard/charts/${type}`),
  getRecentActivity: () => api.get('/dashboard/recent-activity'),
};

// Funciones de API para notificaciones
export const notificationsAPI = {
  getAll: (params = {}) => api.get('/notifications', { params }),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/mark-all-read'),
  delete: (id) => api.delete(`/notifications/${id}`),
  getUnreadCount: () => api.get('/notifications/unread-count'),
};

// NUEVAS APIs para el sistema de ventas
export const businessAPI = {
  getAll: (params = {}) => api.get('/businesses', { params }),
  getById: (id) => api.get(`/businesses/${id}`),
  create: (businessData) => api.post('/businesses', businessData),
  update: (id, businessData) => api.put(`/businesses/${id}`, businessData),
  delete: (id) => api.delete(`/businesses/${id}`),
  getStats: (id) => api.get(`/businesses/${id}/dashboard`),
};

export const productsAPI = {
  getAll: (params = {}) => api.get("/products", { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (productData) =>
    api.post("/products", productData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),
  update: (id, productData) => {
    // FormData should be sent with a POST request, but we can spoof the method
    productData.append("_method", "PUT");
    return api.post(`/products/${id}`, productData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
  delete: (id) => api.delete(`/products/${id}`),
  updateStock: (id, stock) => api.patch(`/products/${id}/stock`, { stock }),
  getLowStock: () => api.get("/products/low-stock"),
};

export const servicesAPI = {
  getAll: (params = {}) => api.get("/services", { params }),
  getById: (id) => api.get(`/services/${id}`),
  create: (serviceData) =>
    api.post("/services", serviceData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),
  update: (id, serviceData) => {
    serviceData.append("_method", "PUT");
    return api.post(`/services/${id}`, serviceData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
  delete: (id) => api.delete(`/services/${id}`),
};

export const salesAPI = {
  getAll: (params = {}) => api.get('/sales', { params }),
  getById: (id) => api.get(`/sales/${id}`),
  create: (saleData) => api.post('/sales', saleData),
  update: (id, saleData) => api.put(`/sales/${id}`, saleData),
  delete: (id) => api.delete(`/sales/${id}`),
  getDaily: (date) => api.get(`/sales/daily?date=${date}`),
  getMonthlySales: (month, year) => api.get(`/sales/monthly/${year}/${month}`),
};

export const expensesAPI = {
  getAll: (params = {}) => api.get('/expenses', { params }),
  getById: (id) => api.get(`/expenses/${id}`),
  create: (expenseData) => api.post('/expenses', expenseData),
  update: (id, expenseData) => api.put(`/expenses/${id}`, expenseData),
  delete: (id) => api.delete(`/expenses/${id}`),
  getByCategory: (categoryId) => api.get(`/expenses/category/${categoryId}`),
};

export const creditsAPI = {
  getAll: (params = {}) => api.get('/credits', { params }),
  getById: (id) => api.get(`/credits/${id}`),
  update: (id, creditData) => api.put(`/credits/${id}`, creditData),
  processPayment: (id, paymentData) => api.post(`/credits/${id}/payment`, paymentData),
  getPending: () => api.get('/credits/pending'),
};

export const loansAPI = {
  getAll: (params = {}) => api.get('/loans', { params }),
  getById: (id) => api.get(`/loans/${id}`),
  create: (loanData) => api.post('/loans', loanData),
  update: (id, loanData) => api.put(`/loans/${id}`, loanData),
  delete: (id) => api.delete(`/loans/${id}`),
  addPayment: (id, paymentData) => api.post(`/loans/${id}/payment`, paymentData),
  getPending: () => api.get('/loans/pending'),
};

export const categoriesAPI = {
  getAll: (params = {}) => api.get('/categories', { params }),
  getById: (id) => api.get(`/categories/${id}`),
  create: (categoryData) => api.post('/categories', categoryData),
  update: (id, categoryData) => api.put(`/categories/${id}`, categoryData),
  delete: (id) => api.delete(`/categories/${id}`),
};

export const cashRegisterAPI = {
  getCurrent: () => api.get('/cash-registers/current'),
  create: (data) => api.post('/cash-registers', data),
  close: (id, data) => api.post(`/cash-registers/${id}/close`, data),
  getReport: (id) => api.get(`/cash-registers/${id}/report`),
};

export default api;