export const getApiErrorMessage = (error, fallback = "Ocurrió un error inesperado.") => {
  if (error?.response?.status === 413) {
    return "El servidor rechazó el tamaño total de los archivos. Las imágenes ya fueron optimizadas; el límite del servidor o proxy debe ampliarse.";
  }

  const data = error?.response?.data;
  if (data?.errors) {
    const details = Object.values(data.errors).flat().filter(Boolean);
    if (details.length) return details.join(" · ");
  }
  return data?.message || data?.error || fallback;
};
