// Validadores de formularios
export const validators = {
  required: (value) => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return 'Este campo es requerido';
    }
    return null;
  },

  email: (value) => {
    if (!value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Ingrese un email válido';
    }
    return null;
  },

  minLength: (min) => (value) => {
    if (!value) return null;
    if (value.length < min) {
      return `Debe tener al menos ${min} caracteres`;
    }
    return null;
  },

  maxLength: (max) => (value) => {
    if (!value) return null;
    if (value.length > max) {
      return `No debe exceder ${max} caracteres`;
    }
    return null;
  },

  password: (value) => {
    if (!value) return null;
    
    const errors = [];
    if (value.length < 8) errors.push('al menos 8 caracteres');
    if (!/[a-z]/.test(value)) errors.push('una letra minúscula');
    if (!/[A-Z]/.test(value)) errors.push('una letra mayúscula');
    if (!/[0-9]/.test(value)) errors.push('un número');
    
    if (errors.length > 0) {
      return `La contraseña debe contener ${errors.join(', ')}`;
    }
    return null;
  },

  confirmPassword: (password) => (value) => {
    if (!value) return null;
    if (value !== password) {
      return 'Las contraseñas no coinciden';
    }
    return null;
  },

  phone: (value) => {
    if (!value) return null;
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(value.replace(/\s/g, ''))) {
      return 'Ingrese un número de teléfono válido';
    }
    return null;
  },

  url: (value) => {
    if (!value) return null;
    try {
      new URL(value);
      return null;
    } catch {
      return 'Ingrese una URL válida';
    }
  },

  number: (value) => {
    if (!value) return null;
    if (isNaN(value)) {
      return 'Debe ser un número válido';
    }
    return null;
  },

  min: (min) => (value) => {
    if (!value) return null;
    if (Number(value) < min) {
      return `El valor mínimo es ${min}`;
    }
    return null;
  },

  max: (max) => (value) => {
    if (!value) return null;
    if (Number(value) > max) {
      return `El valor máximo es ${max}`;
    }
    return null;
  },
};

// Función para validar un objeto con múltiples reglas
export const validateForm = (data, rules) => {
  const errors = {};
  
  Object.keys(rules).forEach(field => {
    const fieldRules = Array.isArray(rules[field]) ? rules[field] : [rules[field]];
    const value = data[field];
    
    for (const rule of fieldRules) {
      const error = rule(value);
      if (error) {
        errors[field] = error;
        break;
      }
    }
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// Hook personalizado para validación de formularios
export const useFormValidation = (initialData, rules) => {
  const [data, setData] = React.useState(initialData);
  const [errors, setErrors] = React.useState({});
  const [touched, setTouched] = React.useState({});

  const validateField = (field, value) => {
    const fieldRules = Array.isArray(rules[field]) ? rules[field] : [rules[field]];
    
    for (const rule of fieldRules) {
      const error = rule(value);
      if (error) {
        return error;
      }
    }
    return null;
  };

  const handleChange = (field, value) => {
    setData(prev => ({ ...prev, [field]: value }));
    
    if (touched[field]) {
      const error = validateField(field, value);
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, data[field]);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const validate = () => {
    const newErrors = {};
    let isValid = true;

    Object.keys(rules).forEach(field => {
      const error = validateField(field, data[field]);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    setTouched(Object.keys(rules).reduce((acc, field) => ({ ...acc, [field]: true }), {}));
    
    return isValid;
  };

  return {
    data,
    errors,
    touched,
    handleChange,
    handleBlur,
    validate,
    setData,
    setErrors,
  };
};