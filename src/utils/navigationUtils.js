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

const GOOGLE_MAPS_ANDROID_PACKAGE = "com.google.android.apps.maps";

/**
 * Builds an Android intent that targets the Google Maps application directly.
 * The browser fallback keeps the link useful when Maps is not installed.
 */
export const buildGoogleMapsIntentUrl = (googleMapsUrl) => {
  const intentTarget = googleMapsUrl.replace(/^https:/, "intent:");
  const fallbackUrl = encodeURIComponent(googleMapsUrl);

  return `${intentTarget}#Intent;scheme=https;package=${GOOGLE_MAPS_ANDROID_PACKAGE};S.browser_fallback_url=${fallbackUrl};end`;
};

/**
 * Opens Maps without creating a second page inside an Android WebView.
 *
 * Native containers can expose `window.Android.openExternalUrl(url)` for full
 * control. Otherwise Android's intent URL is used. Regular browsers retain the
 * expected new-tab behaviour.
 */
export const openGoogleMaps = (googleMapsUrl) => {
  const androidBridge = window.Android?.openExternalUrl;

  if (typeof androidBridge === "function") {
    androidBridge.call(window.Android, googleMapsUrl);
    return;
  }

  if (/Android/i.test(navigator.userAgent)) {
    window.location.assign(buildGoogleMapsIntentUrl(googleMapsUrl));
    return;
  }

  window.open(googleMapsUrl, "_blank", "noopener,noreferrer");
};
