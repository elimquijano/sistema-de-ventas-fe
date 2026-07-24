export const getApiErrorMessage = (error, fallback = "Ocurrió un error inesperado.") => {
  const data = error?.response?.data;
  if (data?.errors) {
    const details = Object.values(data.errors).flat().filter(Boolean);
    if (details.length) return details.join(" · ");
  }
  return data?.message || data?.error || fallback;
};
