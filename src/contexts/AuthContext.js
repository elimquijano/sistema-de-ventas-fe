import React, { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "../utils/api";
import { notificationSwal } from "../utils/swal-helpers";
import { loaderEvents } from "../utils/loaderEvents";

const AuthContext = createContext(undefined);

const getSafeUserForStorage = (user) => {
  const safeUser = { ...user };
  [
    "fcm_token",
    "firebase_token",
    "push_token",
    "notification_token",
    "device_token",
  ].forEach((field) => delete safeUser[field]);

  if (safeUser.notification_settings) {
    safeUser.notification_settings = { ...safeUser.notification_settings };
    delete safeUser.notification_settings.token;
  }

  if (safeUser.notification_setting) {
    safeUser.notification_setting = { ...safeUser.notification_setting };
    delete safeUser.notification_setting.token;
  }

  return safeUser;
};

const storeUser = (user) => {
  localStorage.setItem("user", JSON.stringify(getSafeUserForStorage(user)));
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Inicialmente true para verificar sesión
  const [isInitialized, setIsInitialized] = useState(false);

  // Función para verificar si hay una sesión válida
  const checkAuthStatus = async () => {
    const token = localStorage.getItem("auth_token");
    const savedUser = localStorage.getItem("user");

    if (!token || !savedUser) {
      setLoading(false);
      setIsInitialized(true);
      return;
    }

    loaderEvents.emit("show", "Verificando sesión...");
    try {
      // Verificar si el token es válido consultando al servidor
      const response = await authAPI.me();

      // CÓDIGO CORRECTO - Estructura de datos del API
      const responseData = response.data;

      // Creamos un nuevo objeto 'user' para el estado que combina los datos del usuario
      // con la lista de permisos del nivel superior.
      const userForState = {
        ...responseData.user, // Copia todas las propiedades del usuario
        permissions: responseData.permissions, // Sobrescribe/añade la propiedad 'permissions' con el array correcto
      };

      setUser(userForState);
      storeUser(userForState);
    } catch (error) {
      console.error("Token validation failed:", error);

      // Si el token no es válido, intentar con datos guardados localmente
      try {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser && parsedUser.permissions) {
          setUser(parsedUser);
          storeUser(parsedUser);
        } else {
          // Limpiar datos inválidos
          localStorage.removeItem("auth_token");
          localStorage.removeItem("user");
        }
      } catch (parseError) {
        console.error("Error parsing saved user:", parseError);
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user");
      }
    } finally {
      setLoading(false);
      setIsInitialized(true);
      loaderEvents.emit("hide");
    }
  };

  // Verificar sesión al cargar la aplicación
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      // Intentar login con API
      const response = await authAPI.login({ email, password });

      // CÓDIGO CORRECTO - Estructura de datos del API
      const responseData = response.data;

      // Creamos un nuevo objeto 'user' para el estado que combina los datos del usuario
      // con la lista de permisos del nivel superior.
      const userForState = {
        ...responseData.user, // Copia todas las propiedades del usuario
        permissions: responseData.permissions, // Sobrescribe/añade la propiedad 'permissions' con el array correcto
      };

      setUser(userForState);
      localStorage.setItem("auth_token", responseData.token);
      storeUser(userForState);

      return true;
    } catch (error) {
      console.error("API login failed, trying mock data:", error);
      notificationSwal(
        "Inicio de sesión fallido",
        error?.message || "Error al iniciar sesión.",
        "error"
      );

      return false;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (userData) => {
    setLoading(true);
    try {
      // Intentar registro con API
      const response = await authAPI.register(userData);

      // CÓDIGO CORRECTO - Estructura de datos del API
      const responseData = response.data;

      // Creamos un nuevo objeto 'user' para el estado que combine los datos del usuario
      // con la lista de permisos del nivel superior.
      const userForState = {
        ...responseData.user, // Copia todas las propiedades del usuario
        permissions: responseData.permissions, // Sobrescribe/añade la propiedad 'permissions' con el array correcto
      };

      setUser(userForState);
      localStorage.setItem("auth_token", responseData.token);
      storeUser(userForState);

      notificationSwal(
        "Éxito",
        `Bienvenido ${userData.first_name}! Tu cuenta ha sido creada.`,
        "success"
      );

      return true;
    } catch (error) {
      console.error("API signup failed, using mock data:", error);
      notificationSwal(
        "Error",
        error?.message || "Error al crear la cuenta.",
        "error"
      );
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Intentar logout desde API
      await authAPI.logout();
    } catch (error) {
      console.error("API logout failed:", error);
      notificationSwal(
          "Error",
          "No se pudo cerrar sesión desde el servidor.",
          "error"
      );
    }

    // Limpiar estado local
    setUser(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");

    notificationSwal(
        "Sesión cerrada",
        "Has cerrado sesión exitosamente.",
        "success"
    );
  };

  const hasPermission = (permission) => {
    return user?.permissions?.includes(permission) || false;
  };

  const refreshToken = async () => {
    try {
      const response = await authAPI.refreshToken();
      localStorage.setItem("auth_token", response.data.token);
      return true;
    } catch (error) {
      console.error("Token refresh failed:", error);
      // Limpiar estado local y almacenamiento si el refresh falla
      setUser(null);
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      notificationSwal(
        "Sesión Expirada",
        "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.",
        "error"
      );
      return false;
    }
  };

  const refreshUser = async ({ silent = true } = {}) => {
    const response = await authAPI.me({ silent });
    const responseData = response.data;
    const refreshedUser = {
      ...responseData.user,
      permissions: responseData.permissions,
    };

    setUser(refreshedUser);
    storeUser(refreshedUser);
    return refreshedUser;
  };

  // Función para actualizar el usuario (útil para actualizaciones de perfil)
  const updateUser = (updatedUserData) => {
    const updatedUser = { ...user, ...updatedUserData };
    setUser(updatedUser);
    storeUser(updatedUser);
  };

  const value = {
    user,
    login,
    signup,
    logout,
    loading,
    isInitialized,
    isAuthenticated: !!user,
    hasPermission,
    refreshToken,
    refreshUser,
    updateUser,
    checkAuthStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
