import imageCompression from "browser-image-compression";

const IMAGE_EXTENSION_BY_TYPE = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const withExtensionForType = (fileName, type) => {
  const extension = IMAGE_EXTENSION_BY_TYPE[type];
  if (!extension) return fileName;

  const baseName = fileName.replace(/\.[^/.]+$/, "") || "imagen";
  return `${baseName}.${extension}`;
};

/**
 * Comprime una imagen si es necesario.
 *
 * @param {File} imageFile archivo de imagen a comprimir
 * @param {Object} options opciones de browser-image-compression y fallbackToOriginal
 * @returns {Promise<File>}
 */
export const compressImage = async (imageFile, options = {}) => {
  if (!imageFile) return null;

  if (!imageFile.type.startsWith("image/")) {
    return imageFile;
  }

  const { fallbackToOriginal = true, ...compressionOptions } = options;
  const defaultOptions = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    initialQuality: 0.8,
    ...compressionOptions,
  };

  try {
    const compressedFile = await imageCompression(imageFile, defaultOptions);

    return new File(
      [compressedFile],
      withExtensionForType(imageFile.name, compressedFile.type),
      {
        type: compressedFile.type,
        lastModified: imageFile.lastModified || Date.now(),
      },
    );
  } catch (error) {
    console.error("Error al comprimir la imagen:", error);
    if (fallbackToOriginal) return imageFile;
    throw error;
  }
};

// Los comprobantes se ven en pantalla: 1280 px y ~400 KB mantienen el texto
// legible y permiten enviar varios sin acercarse al límite usual del servidor.
export const compressPaymentImage = async (imageFile, onProgress) => {
  if (!imageFile?.type?.startsWith("image/")) {
    throw new Error("El archivo seleccionado no es una imagen válida.");
  }

  // Evita decodificar archivos desproporcionados en teléfonos con poca memoria.
  if (imageFile.size > 20 * 1024 * 1024) {
    throw new Error("La imagen supera 20 MB. Toma una foto con menor resolución.");
  }

  // Una captura que ya es liviana no necesita decodificarse: esto ahorra tiempo y
  // el pico de memoria que más afecta a teléfonos con pocos recursos.
  const directlySupportedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (
    imageFile.size <= 350 * 1024 &&
    directlySupportedTypes.includes(imageFile.type)
  ) {
    onProgress?.(100);
    return imageFile;
  }

  const compressedFile = await compressImage(imageFile, {
    maxSizeMB: 0.4,
    maxWidthOrHeight: 1280,
    initialQuality: 0.78,
    maxIteration: 6,
    useWebWorker: true,
    preserveExif: false,
    fileType: "image/jpeg",
    onProgress,
    fallbackToOriginal: false,
  });

  // Algunos navegadores no logran cumplir exactamente maxSizeMB.
  if (compressedFile.size > 450 * 1024) {
    throw new Error("No se pudo reducir la imagen. Intenta con otra foto.");
  }

  return compressedFile;
};
