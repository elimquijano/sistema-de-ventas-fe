/**
 * Recorre recursivamente la configuración de navegación para encontrar la primera ruta de tipo 'page'.
 * @param {Array} items - El array de módulos/grupos/páginas (tu `menuModules`).
 * @returns {string|null} - La primera URL encontrada (ej: '/dashboard/users') o null si no hay ninguna.
 */
export const findFirstValidRoute = (items) => {
  for (const item of items) {
    // Caso base: si es una página con una ruta, la hemos encontrado.
    if (item.type === "page" && item.route) {
      return item.route;
    }
    // Caso recursivo: si tiene hijos, buscar dentro de ellos.
    if (item.children && item.children.length > 0) {
      const firstChildRoute = findFirstValidRoute(item.children);
      if (firstChildRoute) {
        return firstChildRoute; // Si se encontró en los hijos, la devolvemos.
      }
    }
  }
  // Si se recorrió todo y no se encontró nada.
  return null;
};
