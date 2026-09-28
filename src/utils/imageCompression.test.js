import imageCompression from "browser-image-compression";
import { compressPaymentImage } from "./imageCompression";

jest.mock("browser-image-compression", () => jest.fn());

describe("compressPaymentImage", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    imageCompression.mockReset();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("convierte el comprobante a JPEG pequeño y conserva un nombre coherente", async () => {
    const input = new File([new Uint8Array(400 * 1024)], "captura.png", {
      type: "image/png",
    });
    const output = new File([new Uint8Array(300)], "captura.png", {
      type: "image/jpeg",
    });
    imageCompression.mockResolvedValue(output);

    const result = await compressPaymentImage(input, jest.fn());

    expect(result.name).toBe("captura.jpg");
    expect(result.type).toBe("image/jpeg");
    expect(imageCompression).toHaveBeenCalledWith(
      input,
      expect.objectContaining({
        maxSizeMB: 0.4,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
        fileType: "image/jpeg",
      }),
    );
  });

  it("devuelve de inmediato una captura que ya es liviana", async () => {
    const input = new File([new Uint8Array(100 * 1024)], "captura.png", {
      type: "image/png",
    });
    const onProgress = jest.fn();

    await expect(compressPaymentImage(input, onProgress)).resolves.toBe(input);
    expect(onProgress).toHaveBeenCalledWith(100);
    expect(imageCompression).not.toHaveBeenCalled();
  });

  it("no envía silenciosamente el original cuando la compresión falla", async () => {
    const input = new File([new Uint8Array(400 * 1024)], "captura.jpg", {
      type: "image/jpeg",
    });
    imageCompression.mockRejectedValue(new Error("fallo de compresión"));

    await expect(compressPaymentImage(input)).rejects.toThrow("fallo de compresión");
  });

  it("rechaza un archivo demasiado grande antes de intentar decodificarlo", async () => {
    const input = new File([new Uint8Array(20 * 1024 * 1024 + 1)], "enorme.jpg", {
      type: "image/jpeg",
    });

    await expect(compressPaymentImage(input)).rejects.toThrow("supera 20 MB");
    expect(imageCompression).not.toHaveBeenCalled();
  });
});
