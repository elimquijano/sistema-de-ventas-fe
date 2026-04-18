import imageCompression from "browser-image-compression";

/**
 * Comprime una imagen si es necesario.
 * 
 * @param {File} imageFile - El archivo de imagen a comprimir.
 * @param {Object} options - Opciones de compresión personalizadas.
 * @returns {Promise<File>} - El archivo de imagen comprimido.
 */
export const compressImage = async (imageFile, options = {}) => {
  if (!imageFile) return null;

  // Si no es una imagen, devolver tal cual
  if (!imageFile.type.startsWith("image/")) {
    return imageFile;
  }

  const defaultOptions = {
    maxSizeMB: 1, // Tamaño máximo de 1MB
    maxWidthOrHeight: 1920, // Resolución máxima Full HD
    useWebWorker: true,
    initialQuality: 0.8, // Calidad inicial del 80%
    ...options
  };

  try {
    console.log(`Comprimiendo imagen: ${imageFile.name} (${(imageFile.size / 1024 / 1024).toFixed(2)} MB)`);
    const compressedFile = await imageCompression(imageFile, defaultOptions);
    console.log(`Imagen comprimida: ${compressedFile.name} (${(compressedFile.size / 1024 / 1024).toFixed(2)} MB)`);
    
    // Mantener el nombre original
    return new File([compressedFile], imageFile.name, {
      type: compressedFile.type,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error("Error al comprimir la imagen:", error);
    return imageFile; // En caso de error, devolver la imagen original
  }
};
