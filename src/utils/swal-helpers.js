import Swal from "sweetalert2";
// O si usas react-sweetalert2
// import withReactContent from 'sweetalert2-react-content';
// const MySwal = withReactContent(Swal);

// --- Configuración de Estilos Centralizada (Opcional pero recomendado) ---
// Define tus colores y estilos base en un solo lugar.
const theme = {
  confirmButtonColor: "#673ab7", // Tu color principal
  cancelButtonColor: "#d33", // Un color para acciones destructivas o de cancelación
  // Puedes añadir más estilos por defecto aquí
};

/**
 * Muestra una notificación simple (éxito, error, info, etc.).
 * @param {string} title - El título de la alerta.
 * @param {string} message - El texto o mensaje principal de la alerta.
 * @param {'success'|'error'|'warning'|'info'|'question'} type - El icono que se mostrará.
 */
export const notificationSwal = (title, message, type) => {
  Swal.fire({
    title: title,
    text: message,
    icon: type,
    confirmButtonColor: theme.confirmButtonColor,
  });
};

/**
 * Muestra una ventana de confirmación y devuelve una promesa que se resuelve con la decisión del usuario.
 * Es una función `async` para que puedas usar `await` fácilmente.
 * @param {string} title - El título de la pregunta de confirmación.
 * @param {string} text - El texto explicativo de la acción.
 * @param {object} [options] - Opciones adicionales para personalizar la alerta.
 * @param {string} [options.confirmButtonText='Sí, continuar'] - Texto para el botón de confirmación.
 * @param {string} [options.cancelButtonText='Cancelar'] - Texto para el botón de cancelación.
 * @param {'question'|'warning'} [options.icon='question'] - Icono de la alerta.
 * @returns {Promise<boolean>} - Devuelve `true` si el usuario confirma, `false` si cancela.
 */
export const confirmSwal = async (title, text, options = {}) => {
  // Opciones por defecto que pueden ser sobreescritas
  const defaultOptions = {
    confirmButtonText: "Sí, continuar",
    cancelButtonText: "Cancelar",
    icon: "question",
  };

  const finalOptions = { ...defaultOptions, ...options };

  const result = await Swal.fire({
    title: title,
    text: text,
    icon: finalOptions.icon,
    showCancelButton: true,
    confirmButtonColor: theme.confirmButtonColor,
    cancelButtonColor: theme.cancelButtonColor,
    confirmButtonText: finalOptions.confirmButtonText,
    cancelButtonText: finalOptions.cancelButtonText,
  });

  return result.isConfirmed;
};
