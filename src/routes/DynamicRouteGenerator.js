import React from "react";
import { Route, Routes, Navigate, Outlet } from "react-router-dom";
import { getComponent } from "../config/moduleConfig";
import { ProtectedRoute } from "./ProtectedRoute";
import { Box, Typography } from "@mui/material";

/**
 * Paso 1: Aplanar la estructura de navegación del backend en una lista simple de rutas.
 * Esta función es recursiva y extrae todas las páginas con una ruta y un componente.
 */
const flattenRoutes = (items) => {
  let allRoutes = [];
  for (const item of items) {
    if (item.type === "page" && item.route && item.component) {
      const relativePath = item.route.startsWith("/dashboard/")
        ? item.route.substring("/dashboard/".length)
        : item.route;

      allRoutes.push({
        key: item.slug,
        path: relativePath,
        componentName: item.component,
        permission: item.permission,
      });
    }
    if (item.children && item.children.length > 0) {
      allRoutes = [...allRoutes, ...flattenRoutes(item.children)];
    }
  }
  return allRoutes;
};

/**
 * Paso 2: Agrupar las rutas aplanadas por su URL base.
 * Esto nos permite identificar qué rutas son "hermanas" (ej: 'geozonas' y 'geozonas/:id').
 */
const groupRoutesByBasePath = (routes) => {
  const grouped = {};
  routes.forEach((route) => {
    // La "base" es la parte de la URL antes de cualquier parámetro dinámico.
    const basePath = route.path.split("/:")[0];
    if (!grouped[basePath]) {
      grouped[basePath] = [];
    }
    grouped[basePath].push(route);
  });
  return grouped;
};

/**
 * Componente que renderiza un mensaje de 404 para rutas no encontradas dentro del dashboard.
 */
const PageNotFoundWithinDashboard = () => (
  <Box sx={{ p: 3, textAlign: "center" }}>
    <Typography variant="h4" gutterBottom>
      404 - Página no encontrada
    </Typography>
    <Typography color="text.secondary">
      La página que buscas no existe. Serás redirigido a la página principal.
    </Typography>
    <Navigate to="/dashboard" replace />
  </Box>
);

/**
 * Paso 3: Componente principal que genera las <Routes> dinámicamente.
 */
export const DynamicRoutes = ({ navConfig }) => {
  // Usamos useMemo para evitar recalcular en cada render, por eficiencia.
  const flatRoutes = React.useMemo(() => flattenRoutes(navConfig), [navConfig]);
  const groupedRoutes = React.useMemo(
    () => groupRoutesByBasePath(flatRoutes),
    [flatRoutes]
  );

  return (
    <Routes>
      {Object.entries(groupedRoutes).map(([basePath, routesInGroup]) => {
        // --- Caso A: Ruta simple (no tiene variantes como :id) ---
        if (routesInGroup.length === 1) {
          const route = routesInGroup[0];
          const PageComponent = getComponent(route.componentName);
          if (!PageComponent) {
            console.error(`Componente no encontrado: ${route.componentName}`);
            return null;
          }
          return (
            <Route
              key={route.key}
              path={route.path}
              element={
                <ProtectedRoute permission={route.permission}>
                  <PageComponent />
                </ProtectedRoute>
              }
            />
          );
        }

        // --- Caso B: Rutas agrupadas (ej: una lista y su detalle) ---
        // Se crea una ruta "layout" virtual usando <Outlet />.
        return (
          <Route key={basePath} path={basePath} element={<Outlet />}>
            {routesInGroup.map((route) => {
              const PageComponent = getComponent(route.componentName);
              if (!PageComponent) {
                console.error(
                  `Componente no encontrado: ${route.componentName}`
                );
                return null;
              }

              const routeElement = (
                <ProtectedRoute permission={route.permission}>
                  <PageComponent />
                </ProtectedRoute>
              );

              // ¿Es la ruta de índice (la que no tiene parámetros)?
              const isIndexRoute = route.path === basePath;
              if (isIndexRoute) {
                return <Route key={route.key} index element={routeElement} />;
              }

              // Es una ruta de detalle (la que tiene parámetros)
              // Extraemos solo el parámetro, ej: ":id"
              const detailPath = route.path.substring(basePath.length + 1); // +1 para quitar el '/'
              return (
                <Route
                  key={route.key}
                  path={detailPath}
                  element={routeElement}
                />
              );
            })}
          </Route>
        );
      })}

      {/* Fallback general para cualquier ruta no coincidente dentro del dashboard */}
      <Route path="*" element={<PageNotFoundWithinDashboard />} />
    </Routes>
  );
};
