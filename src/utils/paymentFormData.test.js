import {
  buildPaymentsFormData,
  hasPaymentImageErrors,
  hasPaymentImagesInProgress,
} from "./paymentFormData";

describe("paymentFormData", () => {
  it("solo adjunta archivos ya procesados", () => {
    const receipt = new File(["receipt"], "receipt.jpg", { type: "image/jpeg" });
    const formData = buildPaymentsFormData([
      { payment_method: "yape", amount: "19", payment_image: receipt },
    ]);

    expect(formData.get("payments[0][payment_method]")).toBe("yape");
    expect(formData.get("payments[0][amount]")).toBe("19");
    expect(formData.get("payments[0][payment_image]")).toBe(receipt);
  });

  it("detecta procesamiento y errores para bloquear el envío", () => {
    expect(
      hasPaymentImagesInProgress([{ payment_image_status: "processing" }]),
    ).toBe(true);
    expect(hasPaymentImageErrors([{ payment_image_status: "error" }])).toBe(true);
    expect(hasPaymentImagesInProgress([{ payment_image_status: "ready" }])).toBe(false);
  });
});
