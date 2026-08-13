import { buildGoogleMapsIntentUrl, openGoogleMaps } from "./navigationUtils";

describe("Google Maps navigation", () => {
  const mapsUrl = "https://www.google.com/maps/search/?api=1&query=-12.1,-77.1";

  afterEach(() => {
    delete window.Android;
    jest.restoreAllMocks();
  });

  it("builds an intent addressed only to the Android Google Maps package", () => {
    expect(buildGoogleMapsIntentUrl(mapsUrl)).toBe(
      `intent://www.google.com/maps/search/?api=1&query=-12.1,-77.1#Intent;scheme=https;package=com.google.android.apps.maps;S.browser_fallback_url=${encodeURIComponent(mapsUrl)};end`,
    );
  });

  it("uses the native WebView bridge when it is available", () => {
    const openExternalUrl = jest.fn();
    window.Android = { openExternalUrl };

    openGoogleMaps(mapsUrl);

    expect(openExternalUrl).toHaveBeenCalledWith(mapsUrl);
  });

  it("keeps new-tab navigation for regular web browsers", () => {
    const open = jest.spyOn(window, "open").mockImplementation(() => null);

    openGoogleMaps(mapsUrl);

    expect(open).toHaveBeenCalledWith(mapsUrl, "_blank", "noopener,noreferrer");
  });
});
