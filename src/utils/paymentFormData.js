export const appendPaymentsToFormData = (formData, payments) => {
  payments.forEach((payment, index) => {
    formData.append(`payments[${index}][payment_method]`, payment.payment_method);
    formData.append(`payments[${index}][amount]`, String(payment.amount));

    if (payment.reference) {
      formData.append(`payments[${index}][reference]`, payment.reference);
    }

    if (typeof File !== "undefined" && payment.payment_image instanceof File) {
      formData.append(`payments[${index}][payment_image]`, payment.payment_image);
    }
  });

  return formData;
};

export const buildPaymentsFormData = (payments) =>
  appendPaymentsToFormData(new FormData(), payments);
