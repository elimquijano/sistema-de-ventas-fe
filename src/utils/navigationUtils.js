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

export const isAppleDevice = (deviceNavigator = navigator) => {
  const userAgent = deviceNavigator?.userAgent || "";
  const platform =
    deviceNavigator?.userAgentData?.platform ||
    deviceNavigator?.platform ||
    "";

  return (
    /iPad|iPhone|iPod|Mac/i.test(`${userAgent} ${platform}`) ||
    (platform === "MacIntel" && Number(deviceNavigator?.maxTouchPoints) > 1)
  );
};

export const buildPreferredMapsLocationUrl = (
  { latitude, longitude, address },
  deviceNavigator = navigator,
) => {
  const hasCoordinates =
    Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));
  const query = hasCoordinates
    ? `${Number(latitude)},${Number(longitude)}`
    : String(address || "").trim();

  if (!query) return "";

  if (isAppleDevice(deviceNavigator)) {
    const params = new URLSearchParams();
    if (hasCoordinates) {
      params.set("ll", query);
      params.set("q", String(address || "Ubicación"));
    } else {
      params.set("q", query);
    }
    return `https://maps.apple.com/?${params.toString()}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};

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


export const openPreferredMapsLocation = (location) => {
  const mapsUrl = buildPreferredMapsLocationUrl(location);
  if (!mapsUrl) return false;

  const androidBridge = window.Android?.openExternalUrl;
  if (typeof androidBridge === "function") {
    androidBridge.call(window.Android, mapsUrl);
  } else if (/Android/i.test(navigator.userAgent)) {
    window.location.assign(buildGoogleMapsIntentUrl(mapsUrl));
  } else {
    window.open(mapsUrl, "_blank", "noopener,noreferrer");
  }

  return true;
};
