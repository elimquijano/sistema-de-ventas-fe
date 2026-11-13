import {
  buildGoogleMapsIntentUrl,
  buildPreferredMapsLocationUrl,
  isAppleDevice,
  openGoogleMaps,
} from "./navigationUtils";

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

describe("preferred maps navigation", () => {
  it("selects Apple Maps on iPhone", () => {
    const device = { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)", platform: "iPhone" };

    expect(isAppleDevice(device)).toBe(true);
    expect(
      buildPreferredMapsLocationUrl(
        { latitude: -12.1, longitude: -77.1, address: "Cliente de prueba" },
        device,
      ),
    ).toBe("https://maps.apple.com/?ll=-12.1%2C-77.1&q=Cliente+de+prueba");
  });

  it("detects iPadOS when it identifies as Mac", () => {
    expect(
      isAppleDevice({
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)",
        platform: "MacIntel",
        maxTouchPoints: 5,
      }),
    ).toBe(true);
  });

  it("selects Google Maps on Android", () => {
    const device = { userAgent: "Mozilla/5.0 (Linux; Android 15)", platform: "Linux armv8l" };

    expect(
      buildPreferredMapsLocationUrl(
        { latitude: -12.1, longitude: -77.1 },
        device,
      ),
    ).toBe("https://www.google.com/maps/search/?api=1&query=-12.1%2C-77.1");
  });

  it("uses the address when coordinates are unavailable", () => {
    const device = { userAgent: "Mozilla/5.0 (Windows NT 10.0)", platform: "Win32" };

    expect(
      buildPreferredMapsLocationUrl({ address: "Jr. Huánuco 123, Lima" }, device),
    ).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Jr. Huánuco 123, Lima")}`,
    );
  });
});
