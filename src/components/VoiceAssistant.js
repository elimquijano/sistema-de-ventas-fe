import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { Mic as MicIcon } from "@mui/icons-material";
import {
  assetLoansAPI,
  businessAPI,
  assetsAPI,
  cashRegisterAPI,
  categoriesAPI,
  clientsAPI,
  creditsAPI,
  dashboardAPI,
  expensesAPI,
  loansAPI,
  purchasesAPI,
  productsAPI,
  salesAPI,
  servicesAPI,
  usersAPI,
  voiceAssistantAPI,
} from "../utils/api";
import { formatCurrency } from "../utils/formatters";
import { useAuth } from "../contexts/AuthContext";
import { sanitizeChatMessages } from "../utils/voiceAssistantMessages";
import { BUSINESS_SEARCH_FIELDS, buildSearchKeywords, rowMatchesKeywords } from "../utils/voiceAssistantSearch";

const DEEPSEEK_MODEL = "deepseek-v4-flash";
const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;
const GEOAPIFY_API_KEY = process.env.REACT_APP_GEOAPIFY_API_KEY;
const SCREEN_FIELD_GUIDE = {
  Orders: ["crear pedido", "editar pedido pendiente", "agendar o quitar agenda", "cliente (nombre/telefono)", "direccion y referencia", "productos o servicios con cantidad", "motorizado", "total", "fecha/hora opcional", "descuento opcional", "notas"],
  Products: ["nombre", "descripcion", "categoria", "precio", "costo", "stock", "stock minimo", "codigo de barras", "imagen"],
  Services: ["nombre", "descripcion", "categoria", "precio", "duracion", "estado", "imagen"],
  Clients: ["nombre", "telefono", "direccion", "detalle de direccion", "coordenadas", "ruta", "tiempo estimado", "distancia aproximada"],
  Expenses: ["descripcion", "importe", "categoria", "fecha", "comprobante", "notas"],
  Purchases: ["proveedor", "fecha", "productos", "cantidades", "costo unitario", "notas"],
  CashRegisters: ["abrir caja", "cerrar caja", "reabrir caja cerrada por numero o responsable", "monto inicial", "efectivo contado al cierre", "reporte de caja (solo lectura)"],
  AssetLoans: ["bien", "beneficiario", "cantidad", "fecha prevista de devolucion", "estado de devolucion", "notas"],
  Assets: ["nombre", "descripcion", "tipo", "cantidad total", "cantidad disponible", "precio unitario", "estado"],
  Sales: ["numero de venta/pedido", "cliente", "estado", "forma de pago", "total", "detalle de items"],
  Credits: ["cliente", "fecha de vencimiento", "estado", "monto total", "monto pagado", "saldo", "historial de pagos"],
  Loans: ["descripcion", "monto", "monto pagado", "fecha del prestamo", "fecha de vencimiento", "estado"],
  Users: ["nombres", "apellidos", "correo", "telefono", "estado", "roles", "negocio", "notificaciones"],
  Payroll: ["usuario/empleado", "periodo", "sueldo", "bonificaciones", "descuentos", "estado"],
};
export const VOICE_ASSISTANT_PERMISSION = "assistant.voice.use";

const normalizeText = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const getPages = (modules = []) => {
  const pages = [];
  for (const module of modules) {
    if (module.type === "page" && module.route) {
      pages.push({
        name: module.name || module.component || "Pantalla",
        component: module.component,
        route: module.route.startsWith("/dashboard/")
          ? module.route
          : module.route.startsWith("/")
            ? `/dashboard${module.route}`
            : `/dashboard/${module.route}`,
      });
    }
    pages.push(...getPages(module.children || []));
  }
  return [...new Map(pages.map((page) => [page.route, page])).values()];
};

const unwrapRows = (response) => {
  const rows = response?.data?.data ?? response?.data ?? [];
  return Array.isArray(rows) ? rows : [];
};
const mergeRowsById = (previous = [], incoming = []) => {
  const merged = new Map((previous || []).map((row) => [String(row.id), row]));
  (incoming || []).forEach((row) => merged.set(String(row.id), { ...merged.get(String(row.id)), ...row }));
  return [...merged.values()];
};
const mergeVoiceData = (previous = {}, incoming = {}) => {
  const merged = { ...previous };
  Object.entries(incoming || {}).forEach(([key, value]) => {
    if (key === "items" && Array.isArray(value) && value.length) {
      const items = [...(Array.isArray(merged.items) ? merged.items : [])];
      value.forEach((item) => {
        const identity = item.id != null ? `${item.type || ""}:${item.id}` : normalizeText(item.name || "");
        const index = items.findIndex((existing) => (existing.id != null ? `${existing.type || ""}:${existing.id}` : normalizeText(existing.name || "")) === identity);
        if (index >= 0) items[index] = { ...items[index], ...item };
        else items.push(item);
      });
      merged.items = items;
    } else if (value !== undefined && value !== null && value !== "") {
      merged[key] = value;
    }
  });
  return merged;
};
const getRiderName = (rider) =>
  rider.full_name || `${rider.first_name || ""} ${rider.last_name || ""}`.trim();
const normalizeOrderItemType = (type) => {
  const normalized = normalizeText(type);
  if (normalized.includes("product")) return "product";
  if (normalized.includes("service")) return "service";
  return "";
};
const BUSINESS_QUERY_TOOL = {
  type: "function",
  function: {
    name: "query_business_data",
    description: "Busca datos por palabras clave cortas. El codigo aplica campos de busqueda mapeados, filtra resultados y devuelve pocas coincidencias.",
    parameters: {
      type: "object",
      properties: {
        section: { type: "string", enum: ["summary", "sales", "orders", "products", "low_stock", "services", "clients", "expenses", "purchases", "credits", "loans", "cash", "assets", "staff"] },
        query: { type: "string", description: "Genera 1-6 palabras clave, nombre o numero; evita enviar una frase larga." },
      },
      required: ["section", "query"],
      additionalProperties: false,
    },
  },
};
const EXPENSE_TOOL = {
  type: "function",
  function: {
    name: "prepare_expense",
    description: "Valida y prepara un gasto en borrador sin guardarlo. Requiere descripción, importe positivo y una categoría existente; solicita confirmación oral explícita antes de registrar.",
    parameters: {
      type: "object",
      properties: {
        description: { type: "string" }, amount: { type: "number", exclusiveMinimum: 0 },
        category_name: { type: "string" }, expense_date: { type: "string", description: "Fecha YYYY-MM-DD" }, notes: { type: "string" },
      },
      required: ["description", "amount", "category_name", "expense_date", "notes"], additionalProperties: false,
    },
  },
};
const BUSINESS_ACTION_TOOL = {
  type: "function",
  function: {
    name: "prepare_business_action",
    description: "Prepara una operación real de caja, pedido, préstamo/devolución de bienes o compra. Permite reabrir caja y editar o agendar pedidos pendientes. Siempre requiere confirmación oral antes de ejecutar.",
    parameters: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["open_cash", "close_cash", "reopen_cash", "cash_report", "cancel_order", "charge_order", "edit_order", "schedule_order", "lend_asset", "return_asset", "create_purchase"] },
        query: { type: ["string", "null"], description: "Número de pedido o nombre de producto, bien o persona." },
        amount: { type: ["number", "null"], description: "Importe de apertura, cierre, cobro o nuevo total de un pedido." },
        detail: { type: ["string", "null"], description: "Proveedor, beneficiario o notas." },
        quantity: { type: ["integer", "null"], minimum: 1 },
        date: { type: ["string", "null"], description: "Fecha YYYY-MM-DD; en préstamos puede ser fecha de devolución." },
        payment_method: { type: ["string", "null"], enum: ["cash", "yape", "plin", "card", "transfer", "credit", "discount", "vale", null] },
        status: { type: ["string", "null"], enum: ["returned", "damaged", "lost", null] },
        rider_name: { type: ["string", "null"], description: "Nombre del motorizado nuevo al editar un pedido." },
        scheduled_at: { type: ["string", "null"], description: "Fecha y hora local YYYY-MM-DDTHH:mm para agendar un pedido; null para quitar la agenda." },
        remove_schedule: { type: ["boolean", "null"], description: "true únicamente cuando la persona pide quitar la fecha programada." },
        items: { type: ["array", "null"], description: "En compras incluye costo. Al editar pedidos, cada elemento cambia la cantidad indicada; cantidad 0 quita el elemento.", items: { type: "object", properties: { name: { type: "string" }, type: { type: ["string", "null"], enum: ["product", "service", null] }, quantity: { type: "integer", minimum: 0 }, cost: { type: ["number", "null"], minimum: 0 } }, required: ["name", "type", "quantity", "cost"], additionalProperties: false } },
      },
      required: ["action", "query", "amount", "detail", "quantity", "date", "payment_method", "status", "rider_name", "scheduled_at", "remove_schedule", "items"],
      additionalProperties: false,
    },
  },
};
const VOICE_TOOLS = [
  {
    type: "function",
    function: {
      name: "search_delivery_address",
      description: "Busca por Geoapify una direccion dictada para un cliente nuevo o para cambiar la direccion. Devuelve hasta cinco opciones numeradas; el usuario elige una hablando.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "Texto de direccion reconocido por voz, por ejemplo calle, distrito y ciudad." } },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "select_delivery_address",
      description: "Selecciona una de las opciones numeradas devueltas por la busqueda de direccion. Ejecuta geocodificacion inversa y calculo de ruta con Mapbox, y guarda las coordenadas para el borrador del pedido.",
      parameters: {
        type: "object",
        properties: { choice: { type: "integer", minimum: 1, maximum: 5 } },
        required: ["choice"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_catalog",
      description: "Busca productos o servicios por palabras clave. El codigo consulta la API, filtra coincidencias y devuelve maximo 12 resultados breves.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Nombre o parte del nombre buscado." },
          type: { type: "string", enum: ["product", "service", "all"] },
        },
        required: ["query", "type"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_customer",
      description: "Busca clientes existentes por palabras clave del nombre o telefono. Envia solo nombre o numero, no la frase completa.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_riders",
      description: "Busca motorizados activos por nombre; sin consulta, devuelve una lista breve para elegir.",
      parameters: { type: "object", properties: { query: { type: "string" } }, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "prepare_order",
      description: "Guarda y valida el borrador del pedido, incluso con datos parciales. Llamala despues de cada aporte para recordar campos y obtener faltantes. No registra. Usa IDs de busquedas.",
      parameters: {
        type: "object",
        properties: {
          customer_phone: { type: "string" },
          customer_name: { type: "string" },
          address: { type: "string" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: ["string", "integer"] },
                type: { type: "string", enum: ["product", "service"] },
                quantity: { type: "integer", minimum: 1 },
              },
              required: ["id", "type", "quantity"],
              additionalProperties: false,
            },
          },
          rider_id: { type: ["string", "integer"] },
          discount: { type: "number", minimum: 0 },
          notes: { type: "string" },
          scheduled_at: { type: ["string", "null"] },
        },
        required: ["customer_phone", "customer_name", "address", "items", "rider_id", "discount", "notes", "scheduled_at"],
        additionalProperties: false,
      },
    },
  },
];

export const VoiceAssistant = ({ menuModules, navigate, currentPath = "", currency = "PEN" }) => {
  const { hasPermission, user } = useAuth();
  const canUseVoiceAssistant = hasPermission(VOICE_ASSISTANT_PERMISSION);
  const [open, setOpen] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [conversationTurns, setConversationTurns] = useState([]);
  const [message, setMessage] = useState("Pulsa el microfono y habla. Puedo consultar ventas, stock, clientes, gastos, caja y otras secciones disponibles; tambien puedo ayudarte a registrar pedidos. Di ayuda para ver ejemplos.");
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef(null);
  const requestAbortRef = useRef(null);
  const requestIdRef = useRef(0);
  const speechIdRef = useRef(0);
  const assistantSpeakingRef = useRef(false);
  const assistantSpeechTextRef = useRef("");
  const audioContextRef = useRef(null);
  const toneIdRef = useRef(0);
  const conversationScrollRef = useRef(null);
  const finalTranscriptBufferRef = useRef("");
  const speechDebounceRef = useRef(null);
  const recognitionRestartTimerRef = useRef(null);
  const sessionActiveRef = useRef(false);
  const processUtteranceRef = useRef(null);
  const processingRef = useRef(false);
  const messagesRef = useRef([]);
  const pendingOrderRef = useRef(null);
  const orderInputDraftRef = useRef(null);
  const expenseInputDraftRef = useRef(null);
  const operationInputDraftRef = useRef(null);
  const pendingExpenseRef = useRef(null);
  const pendingOperationRef = useRef(null);
  const creatingOrderRef = useRef(false);
  const pagesRef = useRef([]);
  const catalogRef = useRef({ products: null, services: null, riders: null, clients: null });
  const searchedCatalogIdsRef = useRef(new Set());
  const addressSuggestionsRef = useRef([]);

  pagesRef.current = getPages(menuModules);

  useEffect(() => {
    if (conversationScrollRef.current) conversationScrollRef.current.scrollTop = conversationScrollRef.current.scrollHeight;
  }, [conversationTurns, transcript]);

  useEffect(() => () => {
    sessionActiveRef.current = false;
    if (recognitionRestartTimerRef.current) window.clearTimeout(recognitionRestartTimerRef.current);
    if (speechDebounceRef.current) window.clearTimeout(speechDebounceRef.current);
    recognitionRef.current?.abort();
    window.speechSynthesis?.cancel();
    audioContextRef.current?.close();
  }, []);

  const playMicTone = (starting) => {
    const toneId = toneIdRef.current + 1;
    toneIdRef.current = toneId;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioContextRef.current) audioContextRef.current = new AudioContextClass();
      const context = audioContextRef.current;
      const play = () => {
        if (toneId !== toneIdRef.current || context.state !== "running") return;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = starting ? 880 : 440;
        gain.gain.setValueAtTime(0.0001, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.1, context.currentTime + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.24);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.25);
      };
      if (context.state === "suspended") context.resume().then(play).catch(() => {});
      else play();
    } catch (error) {
      console.debug("Mic tone unavailable:", error);
    }
  };
  const scheduleUtteranceDispatch = () => {
    if (speechDebounceRef.current) window.clearTimeout(speechDebounceRef.current);
    speechDebounceRef.current = window.setTimeout(() => {
      const completeUtterance = finalTranscriptBufferRef.current.trim();
      finalTranscriptBufferRef.current = "";
      speechDebounceRef.current = null;
      if (completeUtterance) processUtteranceRef.current?.(completeUtterance);
    }, 3000);
  };

  const startRecognition = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition || !sessionActiveRef.current || recognitionRef.current) return;
    if (recognitionRestartTimerRef.current) {
      window.clearTimeout(recognitionRestartTimerRef.current);
      recognitionRestartTimerRef.current = null;
    }
    const recognition = new Recognition();
    recognition.lang = "es-PE";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      if (recognitionRef.current !== recognition) return;
      setListening(true);
      if (!processingRef.current && !assistantSpeakingRef.current) setMessage("Microfono activo. Puedes hablar con naturalidad...");
    };
    recognition.onresult = (event) => {
      if (recognitionRef.current !== recognition) return;
      let finalText = "";
      let interimText = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result?.[0]?.transcript?.trim() || "";
        if (result.isFinal) finalText += `${text} `;
        else interimText += `${text} `;
      }
      const currentText = (finalText || interimText).trim();
      if (currentText) setTranscript(currentText);
      if (!finalText.trim()) {
        if (assistantSpeakingRef.current && interimText.trim()) {
          const incoming = normalizeText(interimText);
          const spoken = normalizeText(assistantSpeechTextRef.current);
          const likelyEcho = spoken.startsWith(incoming) || spoken.includes(incoming);
          if (!likelyEcho) {
            speechIdRef.current += 1;
            window.speechSynthesis?.cancel();
            assistantSpeakingRef.current = false;
            setSpeaking(false);
          }
        }
        if (finalTranscriptBufferRef.current && interimText.trim()) scheduleUtteranceDispatch();
        return;
      }
      const spokenText = finalText.trim();
      if (assistantSpeakingRef.current) {
        const incoming = normalizeText(spokenText);
        const assistantText = normalizeText(assistantSpeechTextRef.current);
        if (assistantText.includes(incoming) || incoming.includes(assistantText)) return;
        speechIdRef.current += 1;
        window.speechSynthesis?.cancel();
        assistantSpeakingRef.current = false;
        setSpeaking(false);
      }
      finalTranscriptBufferRef.current = `${finalTranscriptBufferRef.current} ${spokenText}`.trim();
      setTranscript(finalTranscriptBufferRef.current);
      scheduleUtteranceDispatch();
    };
    recognition.onerror = (event) => {
      if (recognitionRef.current !== recognition) return;
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setListening(false);
        setMessage("No se concedio permiso para usar el microfono.");
        sessionActiveRef.current = false;
        setSessionActive(false);
        playMicTone(false);
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        setMessage("Se interrumpio la escucha. Intentare reactivarla automaticamente.");
      }
    };
    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return;
      recognitionRef.current = null;
      setListening(false);
      if (sessionActiveRef.current && !assistantSpeakingRef.current) {
        recognitionRestartTimerRef.current = window.setTimeout(() => {
          recognitionRestartTimerRef.current = null;
          startRecognition();
        }, 250);
      }
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (error) {
      recognitionRef.current = null;
      setListening(false);
      if (sessionActiveRef.current) {
        setMessage("No se pudo iniciar el microfono. Reintentare automaticamente.");
        recognitionRestartTimerRef.current = window.setTimeout(startRecognition, 700);
      }
    }
  };

  const speak = (text) => {
    const responseText = String(text || "");
    if (responseText) setConversationTurns((turns) => [...turns, { role: "assistant", text: responseText }].slice(-30));
    assistantSpeechTextRef.current = responseText;
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      assistantSpeakingRef.current = false;
      setSpeaking(false);
      if (sessionActiveRef.current) startRecognition();
      return;
    }
    window.speechSynthesis.cancel();
    const speechId = speechIdRef.current + 1;
    speechIdRef.current = speechId;
    const utterance = new SpeechSynthesisUtterance(responseText);
    utterance.lang = "es-PE";
    assistantSpeakingRef.current = true;
    setSpeaking(true);
    try {
      recognitionRef.current?.stop();
    } catch {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    }
    utterance.onend = () => {
      if (speechId !== speechIdRef.current) return;
      assistantSpeakingRef.current = false;
      setSpeaking(false);
      if (sessionActiveRef.current) {
        setMessage("Sigo escuchando. Puedes continuar.");
        startRecognition();
      }
    };
    utterance.onerror = () => {
      if (speechId !== speechIdRef.current) return;
      assistantSpeakingRef.current = false;
      setSpeaking(false);
      if (sessionActiveRef.current) startRecognition();
    };
    window.speechSynthesis.speak(utterance);
  };

  const interruptAssistant = () => {
    speechIdRef.current += 1;
    assistantSpeakingRef.current = false;
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    if (sessionActiveRef.current) {
      setMessage("Te escucho. Continúa con todos los datos que quieras corregir o agregar.");
      startRecognition();
    }
  };

  const getCatalog = async (query = "", requestedType = "all") => {
    const term = buildSearchKeywords(query);
    if (!term) return catalogRef.current;
    const requests = [];
    if (requestedType === "all" || requestedType === "product") {
      requests.push((term.length >= 2 ? businessAPI.searchProducts(term) : productsAPI.getAll({ search: term, per_page: 25 }))
        .then((response) => ["products", unwrapRows(response)]));
    }
    if (requestedType === "all" || requestedType === "service") {
      requests.push(servicesAPI.getAll({ search: term, per_page: 25 }).then((response) => ["services", unwrapRows(response)]));
    }
    const results = await Promise.all(requests);
    results.forEach(([key, rows]) => {
      catalogRef.current[key] = mergeRowsById(catalogRef.current[key], rows);
    });
    return catalogRef.current;
  };

  const getRiders = async (query = "") => {
    const term = buildSearchKeywords(query);
    const response = await usersAPI.getAll({ ...(term ? { search: term } : {}), status: "active", per_page: 50 });
    const termNormalized = normalizeText(term);
    const candidates = unwrapRows(response).filter((rider) =>
      rider.status === "active" && (!termNormalized || normalizeText(getRiderName(rider)).includes(termNormalized)),
    );
    catalogRef.current.riders = mergeRowsById(catalogRef.current.riders, candidates);
    return candidates;
  };

  const executeTool = async (name, args, allowNavigation, signal) => {
    if (!hasPermission(VOICE_ASSISTANT_PERMISSION)) {
      return { ok: false, error: "No tienes permiso para usar el asistente de voz." };
    }
    if (signal?.aborted) return { ok: false, error: "La solicitud fue interrumpida." };
    const canManageOrders = pagesRef.current.some((page) => page.component === "Orders");
    if (["search_delivery_address", "select_delivery_address", "search_catalog", "search_customer", "search_riders", "prepare_order"].includes(name) && !canManageOrders) {
      return { ok: false, error: "El usuario no tiene acceso al modulo de pedidos." };
    }
    if (name === "inspect_screen") {
      const page = pagesRef.current.find((entry) => entry.route === args.route);
      if (!page) return { ok: false, error: "Esa pantalla no esta disponible para este usuario." };
      return { ok: true, page: page.name, route: page.route, isCurrent: page.route === currentPath, knownFields: SCREEN_FIELD_GUIDE[page.component] || [] };
    }
    if (name === "open_page") {
      const page = pagesRef.current.find((entry) => entry.route === args.route);
      if (!allowNavigation || !page) return { ok: false, error: "Esa pantalla no esta disponible para este usuario." };
      navigate(page.route);
      return { ok: true, opened: page.name };
    }

    if (name === "prepare_business_action") {
      const previousOperation = operationInputDraftRef.current?.action === args.action ? operationInputDraftRef.current.data : {};
      const mergedOperation = mergeVoiceData(previousOperation, args);
      operationInputDraftRef.current = { action: args.action, data: mergedOperation };
      Object.assign(args, mergedOperation);
      orderInputDraftRef.current = null;
      expenseInputDraftRef.current = null;
      const routeFor = {
        open_cash: "CashRegisters",
        close_cash: "CashRegisters",
        reopen_cash: "CashRegisters",
        cash_report: "CashRegisters",
        cancel_order: "Orders",
        charge_order: "Orders",
        edit_order: "Orders",
        schedule_order: "Orders",
        lend_asset: "AssetLoans",
        return_asset: "AssetLoans",
        create_purchase: "Purchases",
      };
      const section = args.action;
      if (!pagesRef.current.some((page) => page.component === routeFor[section])) return { ok: false, error: "No tienes acceso a esa pantalla." };
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
      const draft = (operation, label, payload) => {
        pendingOrderRef.current = null;
        pendingExpenseRef.current = null;
        pendingOperationRef.current = { operation, payload, label: `${label} Di confirmo para ejecutar o cancelar para descartarlo.` };
        return { ok: true, draft: label, instruction: "Lee el resumen exactamente y pide confirmacion oral explicita. No ejecutes aun." };
      };
      const unwrapOne = (response) => response?.data?.data || response?.data || null;
      const list = async (api, params = {}) => unwrapRows(await api.getAll({ per_page: 50, ...params }));
      if (section === "open_cash") {
        const amount = Number(args.amount);
        if (args.amount == null || !Number.isFinite(amount) || amount < 0) return { ok: false, missing: ["monto inicial de la caja"] };
        return draft(section, `Abrir caja con ${formatCurrency(amount, currency)}.`, { initial_amount: amount, currency });
      }
      if (section === "reopen_cash") {
        const query = normalizeText(args.query || "").replace(/^#/, "");
        if (!query) return { ok: false, missing: ["número o responsable de la caja cerrada"] };
        const closedRegisters = await list(cashRegisterAPI, { status: "closed" });
        const matches = closedRegisters.filter((register) =>
          String(register.id) === query ||
          normalizeText(register.opened_by?.full_name || register.opened_by_name || "").includes(query),
        );
        if (matches.length !== 1) {
          return {
            ok: false,
            matches: matches.slice(0, 6).map((register) => ({
              id: register.id,
              responsible: register.opened_by?.full_name || register.opened_by_name,
              closed_at: register.closed_at,
            })),
            error: matches.length
              ? "Hay varias cajas cerradas coincidentes; pide el número exacto."
              : "No encontré esa caja entre las cajas cerradas.",
          };
        }
        const register = matches[0];
        return draft(
          section,
          `Reabrir caja #${register.id} de ${register.opened_by?.full_name || register.opened_by_name || "su responsable"}.`,
          { id: register.id },
        );
      }
      if (section === "close_cash" || section === "cash_report") {
        const current = unwrapOne(await cashRegisterAPI.getCurrent());
        const register = Array.isArray(current) ? current[0] : current;
        if (!register?.id) return { ok: false, error: "No hay una caja abierta." };
        if (section === "cash_report") {
          const report = unwrapOne(await cashRegisterAPI.getReport(register.id));
          return { ok: true, report: { status: report.status || register.status, opened_by: report.opened_by?.full_name || register.opened_by?.full_name, opened_at: report.opened_at || register.opened_at, initial_amount: report.initial_amount ?? register.initial_amount, expected_amount: report.expected_amount, report_current_cash: report.report_current_cash, report_difference: report.report_difference, manual_inflow: report.manual_inflow, sales_count: report.sales?.length, cash_sales: (report.sales || []).filter((sale) => sale.payment_method === "cash").reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0), currency: report.currency || currency } };
        }
        const finalAmount = args.amount != null && Number.isFinite(Number(args.amount)) ? Number(args.amount) : Number(register.total_in_cash ?? register.expected_amount ?? 0);
        if (finalAmount < 0) return { ok: false, error: "El monto final no puede ser negativo." };
        return draft(section, `Cerrar caja de ${register.opened_by?.full_name || "la sesión actual"} reportando ${formatCurrency(finalAmount, register.currency || currency)} como efectivo contado.`, { id: register.id, final_amount: finalAmount });
      }
      if (section === "edit_order" || section === "schedule_order") {
        const query = normalizeText(args.query || "").replace(/^#/, "");
        if (!query) return { ok: false, missing: ["número de pedido"] };
        const records = unwrapRows(await salesAPI.getAll({ status: "pending", is_delivery: 1, search: buildSearchKeywords(args.query), per_page: 50 }));
        const exact = records.filter((sale) =>
          String(sale.id) === query ||
          normalizeText(sale.sale_number || "").replace(/^#/, "") === query,
        );
        const matches = exact.length ? exact : records.filter((sale) =>
          normalizeText(sale.sale_number || "").includes(query) ||
          normalizeText(sale.client?.name || sale.customer_name || "").includes(query),
        );
        if (matches.length !== 1) {
          return {
            ok: false,
            matches: matches.slice(0, 5).map((sale) => ({
              sale_number: sale.sale_number,
              customer: sale.client?.name || sale.customer_name,
              total: sale.total_amount,
              scheduled_at: sale.scheduled_at,
            })),
            error: matches.length
              ? "Hay varios pedidos posibles; pide un número exacto."
              : "No encontré ese pedido pendiente.",
          };
        }
        const summarySale = matches[0];
        const detailResponse = await salesAPI.getById(summarySale.id);
        const sale = detailResponse.data?.data || detailResponse.data || summarySale;

        if (section === "schedule_order") {
          const scheduledAt = args.scheduled_at;
          if (scheduledAt == null && args.remove_schedule !== true) {
            return { ok: false, missing: ["fecha y hora para agendar el pedido"] };
          }
          if (scheduledAt != null && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(scheduledAt)) {
            return { ok: false, error: "La fecha debe incluir día y hora, por ejemplo 2026-11-15T16:30." };
          }
          const scheduleLabel = scheduledAt
            ? `Agendar pedido ${sale.sale_number} para ${String(scheduledAt).replace("T", " a las ")}.`
            : `Quitar la fecha programada del pedido ${sale.sale_number} para entregarlo cuanto antes.`;
          return draft(section, scheduleLabel, { id: sale.id, scheduled_at: scheduledAt });
        }

        const payload = {};
        const changes = [];
        if (args.amount != null) {
          const totalAmount = Number(args.amount);
          if (!Number.isFinite(totalAmount) || totalAmount < 0) return { ok: false, error: "El nuevo total debe ser mayor o igual a cero." };
          payload.total_amount = totalAmount;
          changes.push(`total ${formatCurrency(totalAmount, currency)}`);
        }
        if (args.detail != null && String(args.detail).trim()) {
          payload.notes = String(args.detail).trim();
          payload.delivery_notes = payload.notes;
          changes.push("actualizar notas");
        }
        if (args.scheduled_at != null) {
          if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(args.scheduled_at)) {
            return { ok: false, error: "La fecha debe incluir día y hora, por ejemplo 2026-11-15T16:30." };
          }
          payload.scheduled_at = args.scheduled_at;
          changes.push(`agendar para ${String(args.scheduled_at).replace("T", " a las ")}`);
        }
        if (args.rider_name) {
          const riderQuery = normalizeText(args.rider_name);
          const riderMatches = (await getRiders(args.rider_name)).filter((rider) => normalizeText(getRiderName(rider)).includes(riderQuery));
          if (riderMatches.length !== 1) {
            return {
              ok: false,
              matches: riderMatches.slice(0, 6).map((rider) => ({ id: rider.id, name: getRiderName(rider) })),
              error: riderMatches.length ? "Hay varios motorizados parecidos; precisa el nombre." : "No encontré ese motorizado activo.",
            };
          }
          payload.rider_id = riderMatches[0].id;
          changes.push(`asignar a ${getRiderName(riderMatches[0])}`);
        }
        if (Array.isArray(args.items) && args.items.length) {
          const finalItems = (sale.items || []).map((item) => ({
            id: item.item_id ?? item.id,
            type: normalizeOrderItemType(item.item_type ?? item.type),
            quantity: Number(item.quantity),
            name: item.item_name || item.name,
          }));
          for (const requested of args.items) {
            const itemQuery = normalizeText(requested.name || "");
            if (!itemQuery) return { ok: false, error: "Indica el nombre del producto o servicio que deseas cambiar." };
            let itemIndex = finalItems.findIndex((item) =>
              (!requested.type || item.type === requested.type) &&
              normalizeText(item.name).includes(itemQuery),
            );
            if (itemIndex < 0 && Number(requested.quantity) > 0) {
              const requestedTypes = requested.type ? [requested.type] : ["product", "service"];
              const catalogMatches = [];
              for (const itemType of requestedTypes) {
                const response = itemType === "product"
                  ? await productsAPI.getAll({ search: buildSearchKeywords(requested.name), per_page: 20 })
                  : await servicesAPI.getAll({ search: buildSearchKeywords(requested.name), per_page: 20 });
                unwrapRows(response)
                  .filter((item) => normalizeText(item.name).includes(itemQuery))
                  .forEach((item) => catalogMatches.push({ ...item, type: itemType }));
              }
              if (catalogMatches.length !== 1) {
                return {
                  ok: false,
                  matches: catalogMatches.slice(0, 6).map((item) => ({ id: item.id, name: item.name, type: item.type })),
                  error: catalogMatches.length ? `Hay varios artículos parecidos a ${requested.name}; precisa cuál.` : `No encontré ${requested.name}.`,
                };
              }
              finalItems.push({ id: catalogMatches[0].id, type: catalogMatches[0].type, quantity: 0, name: catalogMatches[0].name });
              itemIndex = finalItems.length - 1;
            }
            if (itemIndex < 0) return { ok: false, error: `${requested.name} no está en el pedido.` };
            const quantity = Number(requested.quantity);
            if (!Number.isInteger(quantity) || quantity < 0) return { ok: false, error: `La cantidad de ${requested.name} debe ser un número entero.` };
            if (quantity === 0) finalItems.splice(itemIndex, 1);
            else finalItems[itemIndex].quantity = quantity;
          }
          if (!finalItems.length) return { ok: false, error: "El pedido debe conservar al menos un producto o servicio." };
          payload.items = finalItems.map(({ id, type, quantity }) => ({ id, type, quantity }));
          changes.push(`dejar artículos: ${finalItems.map((item) => `${item.quantity} ${item.name}`).join(", ")}`);
        }
        if (!changes.length) return { ok: false, missing: ["el cambio que deseas hacer en el pedido"] };
        return draft("edit_order", `Editar pedido ${sale.sale_number}: ${changes.join("; ")}.`, { id: sale.id, data: payload });
      }
      if (section === "cancel_order" || section === "charge_order") {
        const query = normalizeText(args.query || "");
        if (!query) return { ok: false, missing: ["número de pedido"] };
        const records = unwrapRows(await salesAPI.getAll({ status: "pending", is_delivery: 1, search: buildSearchKeywords(args.query), per_page: 50 }));
        const found = records.filter((sale) => normalizeText(sale.sale_number || "").includes(query) || normalizeText(sale.client?.name || sale.customer_name || "").includes(query));
        if (found.length !== 1) return { ok: false, matches: found.slice(0, 5).map((sale) => ({ sale_number: sale.sale_number, customer: sale.client?.name || sale.customer_name, status: sale.status, total: sale.total_amount })), error: found.length ? "Hay varios pedidos posibles; pide un número exacto." : "No encontré ese pedido entre los últimos registros consultados." };
        const sale = found[0];
        if (section === "cancel_order") return draft(section, `Cancelar pedido ${sale.sale_number} de ${sale.client?.name || sale.customer_name || "cliente"}. Se liberará el stock.`, { id: sale.id });
        const remaining = Math.max(0, Number(sale.total_amount || 0));
        const method = args.payment_method;
        const amount = args.amount != null && Number.isFinite(Number(args.amount)) ? Number(args.amount) : remaining;
        if (!method) return { ok: false, missing: ["medio de pago (efectivo, Yape, Plin, tarjeta o transferencia)"] };
        if (Math.abs(amount - remaining) > 0.01) return { ok: false, error: `El saldo pendiente es ${formatCurrency(remaining, currency)}. El pago debe cubrir exactamente ese saldo.` };
        const paymentMethods = ["cash", "yape", "plin", "card", "transfer", "credit", "discount", "vale"];
        if (!paymentMethods.includes(method)) return { ok: false, error: "Medio de pago no válido." };
        return draft(section, `Registrar el cobro pendiente de ${formatCurrency(amount, currency)} del pedido ${sale.sale_number} mediante ${method}.`, { id: sale.id, amount, method });
      }
      if (section === "lend_asset") {
        const query = normalizeText(args.query || "");
        const borrower = String(args.detail || "").trim();
        const quantity = Number(args.quantity);
        if (!query || !borrower || !Number.isInteger(quantity) || quantity < 1) return { ok: false, missing: [!query ? "nombre del bien" : !borrower ? "nombre de quien recibe el bien" : "cantidad entera a prestar"] };
        const matches = (await list(assetsAPI, { status: "active", search: args.query })).filter((asset) => normalizeText(asset.name).includes(query));
        if (matches.length !== 1) return { ok: false, matches: matches.slice(0, 6).map((asset) => ({ id: asset.id, name: asset.name, available_quantity: asset.available_quantity })), error: matches.length ? "Hay varios bienes parecidos; precisa el nombre." : "No encontré un bien activo con ese nombre." };
        const asset = matches[0];
        if (quantity > Number(asset.available_quantity || 0)) return { ok: false, error: `Solo hay ${asset.available_quantity || 0} unidades disponibles de ${asset.name}.` };
        const dueDate = args.date || "";
        const payload = { asset_id: asset.id, borrower_name: borrower, quantity, loan_date: today, due_date: dueDate, notes: "" };
        return draft("lend_asset", `Prestar ${quantity} unidad(es) de ${asset.name} a ${borrower}${dueDate ? `, con devolución prevista el ${dueDate}` : ""}.`, payload);
      }
      if (section === "return_asset") {
        const query = normalizeText(args.query || "");
        const quantity = Number(args.quantity);
        const status = args.status || "returned";
        if (!query || !Number.isInteger(quantity) || quantity < 1) return { ok: false, missing: [!query ? "nombre del bien o beneficiario" : "cantidad a devolver"] };
        const loans = await list(assetLoansAPI, { status: "loaned", search: buildSearchKeywords(args.query), per_page: 50 });
        const matches = loans.filter((loan) => normalizeText(loan.asset?.name || "").includes(query) || normalizeText(loan.borrower_name || "").includes(query));
        if (matches.length !== 1) return { ok: false, matches: matches.slice(0, 6).map((loan) => ({ id: loan.id, asset: loan.asset?.name, borrower: loan.borrower_name, pending_quantity: loan.pending_quantity })), error: matches.length ? "Hay varios préstamos coincidentes; precisa bien o beneficiario." : "No encontré un préstamo activo coincidente." };
        const loan = matches[0];
        if (quantity > Number(loan.pending_quantity || loan.quantity)) return { ok: false, error: `La cantidad pendiente es ${loan.pending_quantity || loan.quantity}.` };
        if (!["returned", "damaged", "lost"].includes(status)) return { ok: false, error: "Estado de devolución no válido." };
        return draft("return_asset", `Registrar devolución de ${quantity} unidad(es) de ${loan.asset?.name} prestadas a ${loan.borrower_name}; estado: ${status}.`, { id: loan.id, status, quantity, notes: "" });
      }
      if (section === "create_purchase") {
        const supplier = String(args.detail || "").trim();
        if (!supplier || !Array.isArray(args.items) || !args.items.length) return { ok: false, missing: [!supplier ? "nombre del proveedor" : "al menos un producto, cantidad y costo unitario"] };
        const normalizedItems = [];
        for (const requested of args.items) {
          const response = await productsAPI.getAll({ search: buildSearchKeywords(requested.name), per_page: 20 });
          const products = unwrapRows(response);
          const name = normalizeText(requested.name || "");
          const matches = products.filter((product) => normalizeText(product.name).includes(name));
          if (!Number.isInteger(Number(requested.quantity)) || Number(requested.quantity) < 1 || requested.cost == null || !Number.isFinite(Number(requested.cost)) || Number(requested.cost) < 0) return { ok: false, error: `Revisa cantidad y costo de ${requested.name || "un producto"}.` };
          if (matches.length !== 1) return { ok: false, matches: matches.slice(0, 5).map((product) => ({ name: product.name, id: product.id })), error: matches.length ? `Hay varios productos parecidos a ${requested.name}; especifica cuál.` : `No encontré el producto ${requested.name}.` };
          normalizedItems.push({ id: matches[0].id, name: matches[0].name, quantity: Number(requested.quantity), cost: Number(requested.cost) });
        }
        const purchaseDate = args.date || today;
        const [purchaseYear, purchaseMonth, purchaseDay] = purchaseDate.split("-").map(Number);
        const parsedPurchaseDate = new Date(purchaseYear, purchaseMonth - 1, purchaseDay);
        if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(purchaseDate) || parsedPurchaseDate.getFullYear() !== purchaseYear || parsedPurchaseDate.getMonth() !== purchaseMonth - 1 || parsedPurchaseDate.getDate() !== purchaseDay) return { ok: false, error: "La fecha de compra no es válida." };
        const total = normalizedItems.reduce((sum, item) => sum + item.quantity * item.cost, 0);
        return draft("create_purchase", `Registrar compra al proveedor ${supplier}: ${normalizedItems.map((item) => `${item.quantity} ${item.name} a ${formatCurrency(item.cost, currency)} cada uno`).join(", ")}. Total ${formatCurrency(total, currency)}. Fecha ${purchaseDate}.`, { supplier, date: purchaseDate, items: normalizedItems });
      }
      return { ok: false, error: "Operación no disponible." };
    }
    if (name === "query_business_data") {
      const routeComponents = {
        summary: ["BusinessDashboard", "Dashboard"], sales: ["Sales"], orders: ["Orders"], products: ["Products"],
        low_stock: ["Products"], services: ["Services"], clients: ["Clients"], expenses: ["Expenses"],
        purchases: ["Purchases"], credits: ["Credits"], loans: ["Loans"], cash: ["CashRegisters"],
        assets: ["Assets"], staff: ["Users", "Payroll"],
      };
      if (!pagesRef.current.some((page) => routeComponents[args.section]?.includes(page.component))) {
        return { ok: false, error: "No tienes acceso a esa seccion." };
      }
      const searchTerm = buildSearchKeywords(args.query || "");
      const getRows = async (api) => unwrapRows(await api.getAll({ ...(searchTerm ? { search: searchTerm } : {}), per_page: 50 }));
      const summarize = (data, section, limit = 8) => {
        const mapping = BUSINESS_SEARCH_FIELDS[section];
        return (Array.isArray(data) ? data : []).filter((row) => rowMatchesKeywords(row, mapping.search, searchTerm)).slice(0, limit).map((row) => {
          const result = { id: row.id };
          mapping.output.forEach((key) => {
            if (row?.[key] != null && typeof row[key] !== "object") result[key] = row[key];
          });
          return result;
        });
      };
      switch (args.section) {
        case "summary": { const response = await dashboardAPI.getStats(); return { data: response.data?.data || response.data }; }
        case "sales": return { results: summarize(await getRows(salesAPI), "sales", 10) };
        case "orders": return { results: summarize(unwrapRows(await salesAPI.getAll({ status: "pending", is_delivery: 1, ...(searchTerm ? { search: searchTerm } : {}), per_page: 50 })), "orders", 10) };
        case "products": return { results: summarize(await getRows(productsAPI), "products") };
        case "low_stock": return { results: summarize(unwrapRows(await productsAPI.getLowStock()), "low_stock", 15) };
        case "services": return { results: summarize(await getRows(servicesAPI), "services") };
        case "clients": return { results: summarize(await getRows(clientsAPI), "clients", 10) };
        case "expenses": return { results: summarize(await getRows(expensesAPI), "expenses", 10) };
        case "purchases": return { results: summarize(await getRows(purchasesAPI), "purchases", 10) };
        case "credits": return { results: summarize(await getRows(creditsAPI), "credits", 10) };
        case "loans": return { results: summarize(await getRows(loansAPI), "loans", 10) };
        case "cash": { const response = await cashRegisterAPI.getCurrent(); return { data: response.data?.data || response.data }; }
        case "assets": return { results: summarize(await getRows(assetsAPI), "assets", 10) };
        case "staff": return { results: summarize(await getRows(usersAPI), "staff", 10) };
        default: return { ok: false, error: "Consulta no disponible." };
      }
    }
    if (name === "prepare_expense") {
      const mergedExpense = mergeVoiceData(expenseInputDraftRef.current, args);
      expenseInputDraftRef.current = mergedExpense;
      orderInputDraftRef.current = null;
      operationInputDraftRef.current = null;
      Object.assign(args, mergedExpense);
      if (!pagesRef.current.some((page) => page.component === "Expenses")) return { ok: false, error: "No tienes acceso al modulo de gastos." };
      const description = String(args.description || "").trim();
      const amount = Number(args.amount);
      if (!description || !Number.isFinite(amount) || amount <= 0) return { ok: false, missing: [!description ? "descripcion del gasto" : "importe positivo"] };
      const date = String(args.expense_date || "");
      const [year, month, day] = date.split("-").map(Number);
      const parsedDate = new Date(year, month - 1, day);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || parsedDate.getFullYear() !== year || parsedDate.getMonth() !== month - 1 || parsedDate.getDate() !== day) return { ok: false, missing: ["fecha valida en formato año-mes-dia"] };
      const categories = unwrapRows(await categoriesAPI.getAll({ type: "expense", search: buildSearchKeywords(args.category_name), per_page: 25 }));
      const categoryQuery = normalizeText(args.category_name);
      const matches = categories.filter((category) => normalizeText(category.name).includes(categoryQuery) || categoryQuery.includes(normalizeText(category.name)));
      if (matches.length !== 1) return { ok: false, categories: matches.slice(0, 8).map(({ id, name }) => ({ id, name })), error: matches.length ? "La categoria es ambigua; pregunta cual quiso decir." : "No existe esa categoria de gasto; informa las categorias disponibles." };
      if (signal?.aborted) return { ok: false, error: "La solicitud fue interrumpida." };
      pendingExpenseRef.current = { description, amount, category_id: matches[0].id, category_name: matches[0].name, expense_date: date, notes: String(args.notes || "").trim() };
      return { ok: true, draft: pendingExpenseRef.current, instruction: "Resume descripcion, importe, categoria y fecha y pide confirmacion oral. No lo guardes aun." };
    }

    if (name === "search_delivery_address") {
      const query = String(args.query || "").trim().slice(0, 240);
      if (query.length < 3) return { ok: false, error: "Dime una direccion un poco mas completa para buscarla." };
      if (!GEOAPIFY_API_KEY) return { ok: false, error: "La busqueda de direcciones no esta configurada en este frontend." };
      const params = new URLSearchParams({ text: query, lang: "es", limit: "5", format: "geojson", apiKey: GEOAPIFY_API_KEY });
      const businessLat = Number.parseFloat(user?.business?.latitude);
      const businessLng = Number.parseFloat(user?.business?.longitude);
      if (Number.isFinite(businessLat) && Number.isFinite(businessLng)) params.set("bias", `proximity:${businessLng},${businessLat}`);
      const response = await fetch(`https://api.geoapify.com/v1/geocode/search?${params}`, { signal });
      if (!response.ok) throw new Error(`Geoapify respondio ${response.status}.`);
      const data = await response.json();
      addressSuggestionsRef.current = (data.features || []).filter((feature) =>
        Number.isFinite(Number(feature?.properties?.lat)) && Number.isFinite(Number(feature?.properties?.lon)),
      ).slice(0, 5);
      const results = addressSuggestionsRef.current.map((feature, index) => ({
        choice: index + 1,
        address: feature.properties.formatted || feature.properties.address_line1 || "Direccion sin descripcion",
        city: feature.properties.city || feature.properties.county || feature.properties.state || "",
      }));
      return results.length
        ? { ok: true, results, instruction: "Lee las opciones numeradas y pregunta cual elige. No selecciones una por tu cuenta." }
        : { ok: true, results: [], instruction: "Informa que no hubo coincidencias y pide otra referencia o distrito." };
    }

    if (name === "select_delivery_address") {
      const index = Number(args.choice) - 1;
      const feature = addressSuggestionsRef.current[index];
      if (!feature) return { ok: false, error: "Esa opcion ya no esta disponible. Vuelve a buscar la direccion." };
      const lat = Number(feature.properties.lat);
      const lng = Number(feature.properties.lon);
      let resolvedAddress = feature.properties.formatted || feature.properties.address_line1 || "";
      if (MAPBOX_TOKEN) {
        const reverseUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&language=es`;
        const reverseResponse = await fetch(reverseUrl, { signal });
        if (reverseResponse.ok) {
          const reverseData = await reverseResponse.json();
          resolvedAddress = reverseData.features?.[0]?.place_name || resolvedAddress;
        }
      }
      let routeInfo = "";
      const originLat = Number.parseFloat(user?.business?.latitude);
      const originLng = Number.parseFloat(user?.business?.longitude);
      if (MAPBOX_TOKEN && Number.isFinite(originLat) && Number.isFinite(originLng)) {
        const routeUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${originLng},${originLat};${lng},${lat}?access_token=${MAPBOX_TOKEN}&geometries=geojson`;
        const routeResponse = await fetch(routeUrl, { signal });
        if (routeResponse.ok) {
          const routeData = await routeResponse.json();
          const route = routeData.routes?.[0];
          if (route) routeInfo = `Distancia: ${(route.distance / 1000).toFixed(2)} km | Tiempo aprox: ${Math.round(route.duration / 60)} min`;
        }
      }
      if (signal?.aborted) return { ok: false, error: "La solicitud fue interrumpida." };
      const addressNameHint = String(feature.properties.formatted || "").split(",")[0].trim();
      const existingCustomerName = String(orderInputDraftRef.current?.customer_name || "").trim();
      orderInputDraftRef.current = mergeVoiceData(orderInputDraftRef.current, {
        ...(!existingCustomerName && addressNameHint ? { customer_name: addressNameHint } : {}),
        address: resolvedAddress,
        geo_address: resolvedAddress,
        latitude: lat,
        longitude: lng,
        route_info: routeInfo,
      });
      addressSuggestionsRef.current = [];
      return { ok: true, selected: { address: resolvedAddress, latitude: lat, longitude: lng, route: routeInfo || undefined, customer_name_prefilled: !existingCustomerName ? addressNameHint || undefined : undefined }, instruction: "Confirma la direccion seleccionada por voz y continua completando los datos del pedido." };
    }

    if (name === "search_catalog") {
      const catalog = await getCatalog(args.query, args.type);
      const queryTerms = buildSearchKeywords(args.query).split(/\s+/).filter(Boolean);
      const types = args.type === "all" ? ["product", "service"] : [args.type];
      const matches = types.flatMap((type) => {
        const items = (type === "product" ? catalog.products : catalog.services) || [];
        return items
          .filter((item) => type !== "product" || Number(item.stock) > 0)
          .filter((item) => rowMatchesKeywords(item, ["name", "sku", "barcode", "description"], queryTerms.join(" ")))
          .map((item) => ({
            id: item.id,
            type,
            name: item.name,
            price: Number(item.price || 0),
            ...(type === "product" ? { stock: Number(item.stock || 0) } : {}),
          }));
      }).slice(0, 12);
      matches.forEach((item) => searchedCatalogIdsRef.current.add(`${item.type}:${item.id}`));
      return { results: matches };
    }

    if (name === "search_customer") {
      const rawQuery = String(args.query || "").trim().slice(0, 160);
      const keywords = buildSearchKeywords(rawQuery);
      if (!keywords) return { results: [], error: "Indica un nombre o telefono para buscar al cliente." };
      const response = await clientsAPI.getAll({ search: keywords, per_page: 20 });
      const candidates = unwrapRows(response);
      catalogRef.current.clients = mergeRowsById(catalogRef.current.clients, candidates);
      const rawDigits = rawQuery.replace(/\D/g, "");
      const queryDigits = rawDigits.length === 11 && rawDigits.startsWith("51") ? rawDigits.slice(2) : rawDigits;
      const results = candidates
        .filter((client) => rowMatchesKeywords(client, ["name", "phone", "address"], keywords) || (queryDigits.length >= 3 && String(client.phone || "").replace(/\D/g, "").includes(queryDigits)))
        .slice(0, 5)
        .map((client) => ({
          id: client.id,
          name: client.name,
          phone: client.phone,
          address: client.address,
          latitude: client.latitude,
          longitude: client.longitude,
        }));
      if (queryDigits.length === 9) orderInputDraftRef.current = mergeVoiceData(orderInputDraftRef.current, { customer_phone: queryDigits });
      if (results.length === 1) orderInputDraftRef.current = mergeVoiceData(orderInputDraftRef.current, { customer_phone: results[0].phone, customer_name: results[0].name, address: results[0].address });
      return { results };
    }

    if (name === "search_riders") {
      const riders = await getRiders(args.query || "");
      return {
        results: riders.slice(0, 12).map((rider) => ({ id: rider.id, name: getRiderName(rider) })),
      };
    }

    if (name === "prepare_order") {
      const mergedOrder = mergeVoiceData(orderInputDraftRef.current, args);
      orderInputDraftRef.current = mergedOrder;
      expenseInputDraftRef.current = null;
      operationInputDraftRef.current = null;
      Object.assign(args, mergedOrder);
      const catalog = catalogRef.current;
      const riders = catalogRef.current.riders || [];
      const rawPhone = String(args.customer_phone || "").replace(/\D/g, "");
      const phone = rawPhone.length === 11 && rawPhone.startsWith("51") ? rawPhone.slice(2) : rawPhone;
      const clientResponse = phone ? await clientsAPI.getAll({ search: buildSearchKeywords(phone), per_page: 20 }) : null;
      if (clientResponse) catalogRef.current.clients = mergeRowsById(catalogRef.current.clients, unwrapRows(clientResponse));
      const matchedClient = catalogRef.current.clients.find(
        (client) => String(client.phone || "").replace(/\D/g, "") === phone,
      );
      const customerName = String(args.customer_name || matchedClient?.name || "").trim();
      const address = String(args.address || matchedClient?.address || "").trim();
      const itemsInput = Array.isArray(args.items) ? args.items : [];
      const missing = [];
      if (phone.length !== 9) missing.push("un telefono peruano de 9 digitos");
      if (!customerName) missing.push("el nombre del cliente");
      if (!address) missing.push("la direccion de entrega");
      if (itemsInput.length === 0) missing.push("al menos un producto o servicio");

      const rider = riders.find((candidate) => String(candidate.id) === String(args.rider_id));
      if (!rider) missing.push("un motorizado activo");

      const normalizedItems = [];
      const validationErrors = [];
      for (const requestedItem of itemsInput) {
        const itemType = requestedItem.type;
        const source = (itemType === "product" ? catalog.products : itemType === "service" ? catalog.services : []) || [];
        const item = source.find((candidate) => String(candidate.id) === String(requestedItem.id));
        const quantity = Number(requestedItem.quantity);
        if (!item || !searchedCatalogIdsRef.current.has(`${itemType}:${requestedItem.id}`)) {
          validationErrors.push("No pude validar uno de los productos o servicios. Buscalo de nuevo por nombre.");
          continue;
        }
        if (!Number.isInteger(quantity) || quantity < 1) {
          validationErrors.push(`Indica una cantidad entera para ${item.name}.`);
          continue;
        }
        if (itemType === "product" && quantity > Number(item.stock || 0)) {
          validationErrors.push(`Solo hay ${Number(item.stock || 0)} unidades de ${item.name} disponibles.`);
          continue;
        }
        const existing = normalizedItems.find((entry) => String(entry.id) === String(item.id) && entry.type === itemType);
        if (existing) existing.quantity += quantity;
        else normalizedItems.push({ id: item.id, type: itemType, quantity, name: item.name, price: Number(item.price || 0), stock: itemType === "product" ? Number(item.stock || 0) : null });
      }
      normalizedItems.forEach((item) => {
        if (item.type === "product" && item.quantity > item.stock) {
          validationErrors.push(`Solo hay ${item.stock} unidades de ${item.name} disponibles.`);
        }
      });

      if (validationErrors.length) return { ok: false, errors: validationErrors };
      if (missing.length) return { ok: false, missing };

      const subtotal = normalizedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const discount = Number(args.discount || 0);
      if (!Number.isFinite(discount) || discount < 0 || discount > subtotal) {
        return { ok: false, errors: ["El descuento debe estar entre cero y el subtotal del pedido."] };
      }
      const scheduledAt = args.scheduled_at ? String(args.scheduled_at) : null;
      if (scheduledAt && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(scheduledAt)) {
        return { ok: false, errors: ["La fecha programada debe tener formato YYYY-MM-DDTHH:mm. Indica fecha y hora exactas."] };
      }
      if (scheduledAt) {
        const [datePart, timePart] = scheduledAt.split("T");
        const [year, month, day] = datePart.split("-").map(Number);
        const [hour, minute] = timePart.split(":").map(Number);
        const parsedDate = new Date(year, month - 1, day, hour, minute);
        if (parsedDate.getFullYear() !== year || parsedDate.getMonth() !== month - 1 || parsedDate.getDate() !== day || parsedDate.getHours() !== hour || parsedDate.getMinutes() !== minute) {
          return { ok: false, errors: ["La fecha programada no existe. Confirma una fecha y hora validas."] };
        }
      }

      if (signal?.aborted) return { ok: false, error: "La solicitud fue interrumpida." };
      const usesVoiceGeocode = normalizeText(address) === normalizeText(mergedOrder.geo_address);
      const routeInfo = usesVoiceGeocode ? String(mergedOrder.route_info || "").trim() : "";
      const userNotes = String(args.notes || "").trim();
      const orderNotes = [userNotes, routeInfo].filter(Boolean).join("\n");
      const hasMatchedClientAddress = normalizeText(address) === normalizeText(matchedClient?.address || "");
      pendingOrderRef.current = {
        phone,
        customer_name: customerName,
        address,
        latitude: usesVoiceGeocode ? Number(mergedOrder.latitude) : hasMatchedClientAddress && matchedClient?.latitude != null ? Number(matchedClient.latitude) : undefined,
        longitude: usesVoiceGeocode ? Number(mergedOrder.longitude) : hasMatchedClientAddress && matchedClient?.longitude != null ? Number(matchedClient.longitude) : undefined,
        items: normalizedItems.map(({ id, type, quantity }) => ({ id, type, quantity })),
        total_amount: Math.max(0, subtotal - discount),
        discount,
        rider_id: rider.id,
        notes: orderNotes,
        delivery_notes: orderNotes,
        scheduled_at: scheduledAt,
        summary: {
          customerName,
          phone,
          address,
          items: normalizedItems.map(({ name, quantity, price }) => ({ name, quantity, price })),
          rider: getRiderName(rider),
          subtotal,
          discount,
          total: Math.max(0, subtotal - discount),
          scheduledAt,
        },
      };
      return {
        ok: true,
        prepared: pendingOrderRef.current.summary,
        instruction: "Lee los datos principales y pregunta claramente si confirma el registro. No registres el pedido todavia.",
      };
    }

    return { ok: false, error: "Herramienta no disponible." };
  };

  const requestDeepSeek = async (allowNavigation, signal) => {
    const pages = pagesRef.current;
    const availableComponents = new Set(pages.map((page) => page.component));
    const querySections = [
      ["summary", ["BusinessDashboard", "Dashboard"]], ["sales", ["Sales"]],
      ["orders", ["Orders"]], ["products", ["Products"]], ["low_stock", ["Products"]],
      ["services", ["Services"]], ["clients", ["Clients"]], ["expenses", ["Expenses"]],
      ["purchases", ["Purchases"]], ["credits", ["Credits"]], ["loans", ["Loans"]],
      ["cash", ["CashRegisters"]], ["assets", ["Assets"]], ["staff", ["Users", "Payroll"]],
    ];
    const authorizedSections = querySections.filter(([, components]) => components.some((component) => availableComponents.has(component)));
    const actionComponents = {
      open_cash: "CashRegisters", close_cash: "CashRegisters", reopen_cash: "CashRegisters", cash_report: "CashRegisters",
      cancel_order: "Orders", charge_order: "Orders", edit_order: "Orders", schedule_order: "Orders", lend_asset: "AssetLoans",
      return_asset: "AssetLoans", create_purchase: "Purchases",
    };
    const availableActions = Object.keys(actionComponents).filter((action) => availableComponents.has(actionComponents[action]));
    const tools = [];
    if (availableComponents.has("Orders")) tools.push(...VOICE_TOOLS);
    if (availableComponents.has("Expenses")) tools.push(EXPENSE_TOOL);
    if (authorizedSections.length) {
      tools.push({
        ...BUSINESS_QUERY_TOOL,
        function: {
          ...BUSINESS_QUERY_TOOL.function,
          parameters: {
            ...BUSINESS_QUERY_TOOL.function.parameters,
            properties: {
              ...BUSINESS_QUERY_TOOL.function.parameters.properties,
              section: { ...BUSINESS_QUERY_TOOL.function.parameters.properties.section, enum: authorizedSections.map(([section]) => section) },
            },
          },
        },
      });
    }
    if (availableActions.length) {
      tools.push({
        ...BUSINESS_ACTION_TOOL,
        function: {
          ...BUSINESS_ACTION_TOOL.function,
          parameters: {
            ...BUSINESS_ACTION_TOOL.function.parameters,
            properties: {
              ...BUSINESS_ACTION_TOOL.function.parameters.properties,
              action: { ...BUSINESS_ACTION_TOOL.function.parameters.properties.action, enum: availableActions },
            },
          },
        },
      });
    }
    if (pages.length) {
      tools.push({
        type: "function",
        function: {
          name: "inspect_screen",
          description: "Consulta desde codigo el nombre y los campos conocidos de una pantalla autorizada.",
          parameters: { type: "object", properties: { route: { type: "string", enum: pages.map((page) => page.route) } }, required: ["route"], additionalProperties: false },
        },
      });
    }
    if (allowNavigation && pages.length) {
      tools.push({
        type: "function",
        function: {
          name: "open_page",
          description: "Navega a una pantalla autorizada para el usuario actual cuando lo solicite.",
          parameters: {
            type: "object",
            properties: { route: { type: "string", enum: pages.map((page) => page.route) } },
            required: ["route"],
            additionalProperties: false,
          },
        },
      });
    }
    const fullHistory = sanitizeChatMessages(messagesRef.current);
    messagesRef.current = fullHistory;
    const baseSystem = fullHistory.find((message) => message.role === "system");
    const recentTurns = fullHistory.filter((message) => message.role !== "system").slice(-12);
    const taskMemory = {
      order: pendingOrderRef.current?.summary || orderInputDraftRef.current || null,
      expense: pendingExpenseRef.current || expenseInputDraftRef.current || null,
      operation: pendingOperationRef.current?.label || operationInputDraftRef.current || null,
    };
    const hasTaskMemory = Object.values(taskMemory).some(Boolean);
    let messages = sanitizeChatMessages([
      ...(baseSystem ? [baseSystem] : []),
      ...(hasTaskMemory ? [{ role: "system", content: `Datos persistidos por las herramientas para continuar la tarea: ${JSON.stringify(taskMemory)}. Estos datos son autoritativos; no vuelvas a pedirlos.` }] : []),
      ...recentTurns,
    ]);
    for (let round = 0; round < 5; round += 1) {
      let response;
      try {
        response = await voiceAssistantAPI.completeChat({
          model: DEEPSEEK_MODEL,
          messages,
          tools,
          tool_choice: tools.length ? "auto" : "none",
          parallel_tool_calls: false,
          stream: false,
        }, { signal });
      } catch (error) {
        if (signal?.aborted || error.code === "ERR_CANCELED") return "";
        const message = error.response?.data?.error?.message || error.response?.data?.message;
        throw new Error(message || error.message || "No se pudo conectar con el servicio de IA.");
      }
      const data = response.data;
      if (signal?.aborted) return "";
      const assistantMessage = data.choices?.[0]?.message;
      if (!assistantMessage) throw new Error("DeepSeek no devolvio una respuesta.");
      messages = [...messages, assistantMessage];

      if (!assistantMessage.tool_calls?.length) {
        messagesRef.current = messages;
        return assistantMessage.content || "No pude interpretar esa instruccion.";
      }

      const toolMessages = [];
      for (const toolCall of assistantMessage.tool_calls) {
        let args = {};
        try {
          args = JSON.parse(toolCall.function?.arguments || "{}");
        } catch {
          toolMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ ok: false, error: "No entendi los parametros. Pregunta los datos faltantes." }) });
          continue;
        }
        if (signal?.aborted) return "";
        let result;
        try {
          result = await executeTool(toolCall.function?.name, args, allowNavigation, signal);
        } catch (error) {
          console.error(`Voice assistant tool failed (${toolCall.function?.name}):`, error);
          result = { ok: false, error: "No pude consultar ese dato en el sistema. Informa al usuario y no inventes un resultado." };
        }
        if (signal?.aborted) return "";
        toolMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }
      messages = [...messages, ...toolMessages];
      messagesRef.current = messages;
    }
    return "Ya hice varias consultas. Dime que quieres hacer ahora.";
  };

  const createPreparedExpense = async () => {
    const expense = pendingExpenseRef.current;
    if (!expense || creatingOrderRef.current) return;
    creatingOrderRef.current = true;
    processingRef.current = true;
    setProcessing(true);
    setMessage("Registrando el gasto confirmado...");
    try {
      await expensesAPI.create({ description: expense.description, amount: expense.amount, category_id: expense.category_id, expense_date: expense.expense_date, receipt_path: "", notes: expense.notes });
      pendingExpenseRef.current = null;
      expenseInputDraftRef.current = null;
      const reply = "Gasto registrado correctamente.";
      messagesRef.current = [...messagesRef.current, { role: "assistant", content: reply }];
      setMessage(reply);
      speak(reply);
    } catch (error) {
      console.error("Voice expense creation failed:", error);
      const status = error.response?.status;
      const reply = status && status < 500 ? error.response?.data?.message || "El servidor rechazo el gasto. Corrige el dato y preparalo de nuevo." : "No pude confirmar el resultado del servidor. Revisa gastos antes de volver a registrarlo para evitar duplicados.";
      if (!status || status >= 500) pendingExpenseRef.current = null;
      setMessage(reply);
      speak(reply);
    } finally {
      creatingOrderRef.current = false;
      processingRef.current = false;
      setProcessing(false);
    }
  };

  const createPreparedOperation = async () => {
    const pending = pendingOperationRef.current;
    if (!pending || creatingOrderRef.current) return;
    creatingOrderRef.current = true;
    processingRef.current = true;
    setProcessing(true);
    setMessage("Ejecutando la operación confirmada...");
    try {
      const { operation, payload } = pending;
      let response;
      if (operation === "open_cash") response = await cashRegisterAPI.create(payload);
      else if (operation === "close_cash") response = await cashRegisterAPI.close(payload.id, { final_amount: payload.final_amount });
      else if (operation === "reopen_cash") response = await cashRegisterAPI.reopen(payload.id);
      else if (operation === "edit_order") response = await salesAPI.updateQuickOrder(payload.id, payload.data);
      else if (operation === "schedule_order") response = await salesAPI.updateQuickOrder(payload.id, { scheduled_at: payload.scheduled_at });
      else if (operation === "cancel_order") await salesAPI.cancelOrder(payload.id);
      else if (operation === "charge_order") {
        const formData = new FormData();
        formData.append("payments[0][payment_method]", payload.method);
        formData.append("payments[0][amount]", String(payload.amount));
        await salesAPI.confirmDelivery(payload.id, formData);
      } else if (operation === "lend_asset") await assetLoansAPI.create(payload);
      else if (operation === "return_asset") await assetLoansAPI.returnLoan(payload.id, { status: payload.status, quantity: payload.quantity, notes: payload.notes });
      else if (operation === "create_purchase") {
        const formData = new FormData();
        formData.append("supplier_name", payload.supplier);
        formData.append("purchase_date", payload.date);
        formData.append("notes", "Registrado mediante asistente de voz");
        payload.items.forEach((item, index) => {
          formData.append(`items[${index}][id]`, item.id);
          formData.append(`items[${index}][name]`, item.name);
          formData.append(`items[${index}][quantity]`, item.quantity);
          formData.append(`items[${index}][cost]`, item.cost);
        });
        await purchasesAPI.create(formData);
      }
      pendingOperationRef.current = null;
      operationInputDraftRef.current = null;
      const reply = response?.data?.message || "Operación realizada correctamente.";
      messagesRef.current = [...messagesRef.current, { role: "assistant", content: reply }];
      setMessage(reply);
      speak(reply);
    } catch (error) {
      console.error("Voice operation failed:", error);
      const status = error.response?.status;
      const conflictId = error.response?.data?.conflicting_cash_register_id;
      const serverMessage = error.response?.data?.message;
      const reply = status && status < 500
        ? `${serverMessage || "El servidor rechazó la operación. Revisa los datos e inténtalo de nuevo."}${conflictId ? ` La caja abierta que genera el conflicto es la #${conflictId}.` : ""}`
        : "No pude confirmar el resultado del servidor. Revisa esa pantalla antes de repetir la operación.";
      if (!status || status >= 500) pendingOperationRef.current = null;
      setMessage(reply);
      speak(reply);
    } finally {
      creatingOrderRef.current = false;
      processingRef.current = false;
      setProcessing(false);
    }
  };
  const createPreparedOrder = async () => {
    if (!pendingOrderRef.current || creatingOrderRef.current) return;
    creatingOrderRef.current = true;
    processingRef.current = true;
    setProcessing(true);
    setMessage("Registrando el pedido confirmado...");
    try {
      const order = pendingOrderRef.current;
      const response = await salesAPI.quickOrder({
        phone: order.phone,
        customer_name: order.customer_name,
        address: order.address,
        latitude: order.latitude,
        longitude: order.longitude,
        items: order.items,
        total_amount: order.total_amount,
        discount: order.discount,
        rider_id: order.rider_id,
        notes: order.notes,
        delivery_notes: order.delivery_notes,
        scheduled_at: order.scheduled_at,
      });
      pendingOrderRef.current = null;
      orderInputDraftRef.current = null;
      const result = response.data?.data || response.data || {};
      const saleNumber = result.sale_number || result.sale?.sale_number || result.order?.sale_number;
      const reply = saleNumber
        ? `Pedido numero ${saleNumber} registrado correctamente.`
        : "Pedido registrado correctamente.";
      messagesRef.current = [...messagesRef.current, { role: "assistant", content: reply }];
      setMessage(reply);
      speak(reply);
      const ordersPage = pagesRef.current.find((page) => page.component === "Orders");
      if (ordersPage) navigate(ordersPage.route);
    } catch (error) {
      console.error("Voice order creation failed:", error);
      const status = error.response?.status;
      const reply = status && status < 500
        ? error.response?.data?.message || "El servidor rechazo el pedido. Corrige el dato indicado y vuelve a prepararlo."
        : "No pude confirmar el resultado del servidor. Revisa la lista de pedidos antes de volver a registrarlo para evitar duplicados.";
      if (!status || status >= 500) pendingOrderRef.current = null;
      setMessage(reply);
      speak(reply);
    } finally {
      creatingOrderRef.current = false;
      processingRef.current = false;
      setProcessing(false);
    }
  };

  const buildExpenseConfirmation = (expense) => `Gasto: ${expense.description}. Importe: ${formatCurrency(expense.amount, currency)}. Categoria: ${expense.category_name}. Fecha: ${expense.expense_date}. Di confirmo para registrarlo o cancelar para descartarlo.`;

  const buildOrderConfirmation = (summary) => {
    const items = summary.items.map((item) => `${item.quantity} de ${item.name}`).join(", ");
    const schedule = summary.scheduledAt ? ` Programado para ${summary.scheduledAt.replace("T", " a las ")}.` : "";
    const discount = summary.discount > 0 ? ` Descuento: ${formatCurrency(summary.discount, currency)}.` : "";
    return `Pedido para ${summary.customerName}, telefono ${summary.phone}. ${items}. Direccion: ${summary.address}. Motorizado: ${summary.rider}. Total ${formatCurrency(summary.total, currency)}.${discount}${schedule} Di confirmo para registrarlo o cancelar para descartarlo.`;
  };

  const processUtterance = async (spokenText) => {
    if (!hasPermission(VOICE_ASSISTANT_PERMISSION)) {
      stopSession();
      return;
    }
    requestAbortRef.current?.abort();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const controller = new AbortController();
    requestAbortRef.current = controller;
    setConversationTurns((turns) => [...turns, { role: "user", text: spokenText }].slice(-30));
    const normalized = normalizeText(spokenText).replace(/[.!?,]/g, " ").replace(/\s+/g, " ").trim();
    const isExplicitConfirmation = /^(si( por favor| esta bien)?|confirmo|confirmar( pedido)?|si (confirmo|confirmar)( pedido)?|registrar|registralo|hazlo|dale|de acuerdo|adelante|procede)$/.test(normalized);
    const isCancellation = /^(no|cancelar|cancela|descartar|olvidalo|mejor no)$/.test(normalized);

    if (pendingOperationRef.current && isExplicitConfirmation) {
      messagesRef.current = [...messagesRef.current, { role: "user", content: spokenText }];
      await createPreparedOperation();
      return;
    }
    if (pendingExpenseRef.current && isExplicitConfirmation) {
      messagesRef.current = [...messagesRef.current, { role: "user", content: spokenText }];
      await createPreparedExpense();
      return;
    }
    if (pendingOrderRef.current && isExplicitConfirmation) {
      messagesRef.current = [...messagesRef.current, { role: "user", content: spokenText }];
      await createPreparedOrder();
      return;
    }
    if ((pendingOrderRef.current || pendingExpenseRef.current || pendingOperationRef.current) && isCancellation) {
      const canceledType = pendingOrderRef.current ? "pedido" : pendingExpenseRef.current ? "gasto" : "operación";
      pendingOrderRef.current = null;
      pendingExpenseRef.current = null;
      pendingOperationRef.current = null;
      orderInputDraftRef.current = null;
      expenseInputDraftRef.current = null;
      operationInputDraftRef.current = null;
      const reply = `De acuerdo, descarte el ${canceledType}. No se realizó nada.`;
      messagesRef.current = [...messagesRef.current, { role: "user", content: spokenText }, { role: "assistant", content: reply }];
      setMessage(reply);
      speak(reply);
      return;
    }
    if (pendingOrderRef.current || pendingExpenseRef.current || pendingOperationRef.current) { pendingOrderRef.current = null; pendingExpenseRef.current = null; pendingOperationRef.current = null; }

    processingRef.current = true;
    setProcessing(true);
    setMessage("Revisando lo que necesitas...");
    const now = new Intl.DateTimeFormat("es-PE", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "America/Lima",
    }).format(new Date());
    if (!messagesRef.current.length) {
      messagesRef.current = [{
        role: "system",
        content: `Eres un asistente de voz para un sistema de ventas. Actua como agente: entiende la intencion natural, elige las herramientas apropiadas, ejecutalas y continua con sus resultados. No hagas que el usuario siga un guion ni pida datos que el sistema puede buscar. Responde en espanol con frases breves y naturales. Fecha y hora local de Peru: ${now}. Pantalla actual: ${pagesRef.current.find((page) => page.route === currentPath)?.name || currentPath}. Pantallas autorizadas: ${JSON.stringify(pagesRef.current.map(({ name, route }) => ({ name, route })))}.

Conserva el objetivo y todos los datos que el usuario ya proporciono en turnos anteriores. Para buscar, genera pocas palabras clave utiles (nombre, numero o producto); la API y el codigo aplican los filtros por campos y solo te devuelven coincidencias acotadas. Mientras completas un pedido, guarda cada aporte parcial llamando prepare_order para que los datos queden persistidos en codigo. Acepta respuestas que incluyan varios campos y combinalas con lo ya conocido. Si falta algo, pregunta solo lo que falta, en una sola pregunta clara. No inventes datos, resultados, nombres, precios, productos ni estados. Usa las herramientas y resultados reales; cuando la persona pide una accion o una consulta que tenga herramienta, ejecutala en vez de decir que no puedes o que falta una herramienta. Para saber que campos tiene una vista, usa inspect_screen. Para abrirla, usa open_page con la pantalla autorizada correspondiente.

PEDIDOS: Si dan nombre o telefono, busca primero el cliente registrado con search_customer y reutiliza su nombre, direccion y datos encontrados. No vuelvas a pedir datos que ya esten en el registro. Si el telefono se dio en otro turno, usalo. Busca productos/servicios con search_catalog y motorizados activos con search_riders. Si es cliente nuevo o indica una direccion nueva, busca el texto dictado con search_delivery_address; ofrece las opciones numeradas y espera que la persona elija por voz, luego llama select_delivery_address con ese numero. Esa herramienta usa las coordenadas de Geoapify para completar direccion, distancia y tiempo con Mapbox y guarda las coordenadas en el borrador. Si el nombre del cliente aun falta, completa el campo con el texto de Geoapify anterior a la primera coma y no vuelvas a pedirlo. No intentes mover ni seleccionar el mapa por voz. Si no hay coincidencias, pide otra referencia o distrito. Acepta referencias utiles sin exigir calle y numero. Para un cliente registrado conserva su direccion guardada salvo que indique cambiarla. Antes de preparar verifica nombre y telefono peruano de 9 digitos, direccion, al menos un producto/servicio con cantidad valida y motorizado activo. La fecha programada y descuento son opcionales. Si prepare_order indica faltantes, conserva el borrador y pregunta solo esos datos; luego vuelve a prepararlo con todos los datos recopilados. La preparacion es solo un borrador: resume cliente, direccion, articulos/cantidades, motorizado y total; espera un si explicito antes de registrar. Si corrigen algo, actualiza el borrador y solicita confirmacion nueva. Solo afirma que se registro despues de una respuesta exitosa del sistema.

CONSULTAS: Usa query_business_data para resumen, ventas, pedidos, productos/stock, servicios, clientes, gastos, compras, creditos, prestamos, caja, bienes o personal, segun las secciones autorizadas. Busca con el filtro indicado y resume resultados reales con claridad. Para caja, reporta efectivo esperado/contado, diferencia, ingresos manuales, ventas en efectivo y cantidad de ventas cuando existan. Un reporte es de solo lectura y no requiere confirmacion.

OPERACIONES: Puedes abrir, cerrar o reabrir una caja; editar o agendar pedidos pendientes; cancelar o cobrar pedidos; prestar/devolver bienes y registrar compras con prepare_business_action; preparar gastos con prepare_expense. Para reabrir una caja pide su numero o responsable. Para editar un pedido pide su numero y el cambio: total, notas, motorizado, fecha o articulos. En articulos, quantity es la cantidad final deseada y cero significa quitarlo; el sistema conserva los demas articulos. Para agendar usa fecha y hora local YYYY-MM-DDTHH:mm. Usa remove_schedule true y scheduled_at null solo cuando la persona pide quitar la agenda; si quiere agendar y falta la fecha, preguntala antes de preparar. Verifica datos y permisos con las herramientas. Para gastos valida descripcion, importe positivo, categoria existente y fecha; nunca inventes categorias. Toda escritura se prepara, se resume y espera confirmacion oral explicita antes de ejecutarse. No digas que se completo hasta que el sistema lo confirme. Si una herramienta indica que falta un dato, pregunta por ese dato y continua. Para saludos o preguntas generales responde directamente.` ,
      }];
    }
    messagesRef.current = [...messagesRef.current, { role: "user", content: spokenText }];

    try {
      const modelReply = await requestDeepSeek(true, controller.signal);
      if (requestId !== requestIdRef.current) return;
      const reply = pendingOrderRef.current
        ? buildOrderConfirmation(pendingOrderRef.current.summary)
        : pendingExpenseRef.current
          ? buildExpenseConfirmation(pendingExpenseRef.current)
          : pendingOperationRef.current
            ? pendingOperationRef.current.label
            : modelReply;
      setMessage(reply);
      speak(reply);
    } catch (error) {
      if (error.name === "AbortError" || requestId !== requestIdRef.current) return;
      console.error("Voice assistant request failed:", error);
      const reply = error.message || "No pude conectarme con DeepSeek. Revisa el servidor local y la conexion.";
      setMessage(reply);
      speak(reply);
    } finally {
      if (requestId === requestIdRef.current) {
        processingRef.current = false;
        setProcessing(false);
      }
    }
  };
  processUtteranceRef.current = processUtterance;

  const startSession = () => {
    if (!canUseVoiceAssistant) return;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setSupported(false);
      setMessage("El reconocimiento de voz no esta disponible en este navegador.");
      setOpen(true);
      return;
    }
    requestAbortRef.current?.abort();
    requestIdRef.current += 1;
    playMicTone(true);
    finalTranscriptBufferRef.current = "";
    if (speechDebounceRef.current) window.clearTimeout(speechDebounceRef.current);
    messagesRef.current = [];
    setConversationTurns([]);
    orderInputDraftRef.current = null;
    expenseInputDraftRef.current = null;
    operationInputDraftRef.current = null;
    pendingOrderRef.current = null;
    pendingExpenseRef.current = null;
    pendingOperationRef.current = null;
    searchedCatalogIdsRef.current = new Set();
    catalogRef.current = { products: null, services: null, riders: null, clients: null };
    addressSuggestionsRef.current = [];
    sessionActiveRef.current = true;
    processingRef.current = false;
    setSessionActive(true);
    setSupported(true);
    setOpen(true);
    startRecognition();
  };

  const stopSession = () => {
    sessionActiveRef.current = false;
    processingRef.current = false;
    requestAbortRef.current?.abort();
    requestIdRef.current += 1;
    if (speechDebounceRef.current) window.clearTimeout(speechDebounceRef.current);
    speechDebounceRef.current = null;
    finalTranscriptBufferRef.current = "";
    assistantSpeakingRef.current = false;
    speechIdRef.current += 1;
    setSpeaking(false);
    setSessionActive(false);
    if (recognitionRestartTimerRef.current) {
      window.clearTimeout(recognitionRestartTimerRef.current);
      recognitionRestartTimerRef.current = null;
    }
    try {
      try {
      recognitionRef.current?.stop();
    } catch {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    }
    } catch {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    }
    window.speechSynthesis?.cancel();
    playMicTone(false);
    setListening(false);
    setMessage("Pausado. Pulsa el microfono para iniciar una nueva conversacion.");
  };

  const close = () => {
    stopSession();
    setOpen(false);
  };

  if (!canUseVoiceAssistant) return null;

  return (
    <>
      <Tooltip title={sessionActive ? "Pausar asistente de voz" : "Iniciar asistente de voz"}>
        <IconButton
          color={sessionActive ? "error" : "inherit"}
          aria-label={sessionActive ? "Pausar asistente de voz" : "Iniciar asistente de voz"}
          onClick={sessionActive ? stopSession : startSession}
        >
          <MicIcon sx={sessionActive ? { animation: "voiceMicPulse 1.2s ease-in-out infinite", "@keyframes voiceMicPulse": { "0%, 100%": { opacity: 1, transform: "scale(1)" }, "50%": { opacity: 0.55, transform: "scale(1.12)" } } } : {}} />
        </IconButton>
      </Tooltip>
      <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: !sessionActive ? "text.disabled" : listening ? "success.main" : "warning.main", boxShadow: sessionActive && listening ? "0 0 0 5px rgba(46, 125, 50, 0.14)" : "none", animation: sessionActive && listening ? "voiceListeningPulse 1.4s ease-out infinite" : "none", "@keyframes voiceListeningPulse": { "0%": { boxShadow: "0 0 0 0 rgba(46, 125, 50, 0.32)" }, "100%": { boxShadow: "0 0 0 10px rgba(46, 125, 50, 0)" } } }} />
            <span>Asistente por voz</span>
            <Typography variant="caption" color={speaking || processing ? "primary.main" : listening ? "success.main" : "text.secondary"}>
              {!sessionActive ? "Pausado" : speaking ? "Respondiendo · puedes interrumpir" : processing ? "Procesando · sigue hablando" : listening ? "Micrófono escuchando" : "Reconectando micrófono"}
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography color={speaking || processing ? "primary.main" : listening ? "success.main" : "text.secondary"}>
              {message}
            </Typography>
            {(conversationTurns.length > 0 || transcript) && (
              <Box ref={conversationScrollRef} sx={{ maxHeight: 260, overflowY: "auto", p: 1.25, bgcolor: "action.hover", borderRadius: 1 }}>
                <Stack spacing={1}>
                  {conversationTurns.map((turn, index) => (
                    <Box key={`${turn.role}-${index}`} sx={{ alignSelf: turn.role === "user" ? "flex-end" : "flex-start", maxWidth: "90%", px: 1.25, py: 0.75, borderRadius: 1.5, bgcolor: turn.role === "user" ? "primary.main" : "background.paper", color: turn.role === "user" ? "primary.contrastText" : "text.primary" }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.8 }}>{turn.role === "user" ? "Tú" : "Asistente"}</Typography>
                      <Typography variant="body2">{turn.text}</Typography>
                    </Box>
                  ))}
                  {listening && transcript && (conversationTurns[conversationTurns.length - 1]?.role !== "user" || conversationTurns[conversationTurns.length - 1]?.text !== transcript) && (
                    <Box sx={{ alignSelf: "flex-end", maxWidth: "90%", px: 1.25, py: 0.75, borderRadius: 1.5, bgcolor: "action.selected" }}>
                      <Typography variant="caption" color="text.secondary">Te escucho</Typography>
                      <Typography variant="body2">{transcript}</Typography>
                    </Box>
                  )}
                </Stack>
              </Box>
            )}
            {pendingOrderRef.current && (
              <Box sx={{ p: 1.5, bgcolor: "success.50", border: 1, borderColor: "success.light", borderRadius: 1 }}>
                <Typography variant="body2" fontWeight={700}>Pedido listo para confirmar</Typography>
                <Typography variant="body2">{pendingOrderRef.current.summary.customerName} - {pendingOrderRef.current.summary.items.map((item) => `${item.quantity} ${item.name}`).join(", ")}</Typography>
                <Typography variant="body2">Total: {formatCurrency(pendingOrderRef.current.summary.total, currency)}</Typography>
                <Typography variant="caption" color="text.secondary">Di "confirmo" para registrar o "cancelar" para descartarlo.</Typography>
              </Box>
            )}
            {pendingExpenseRef.current && (
              <Box sx={{ p: 1.5, bgcolor: "success.50", border: 1, borderColor: "success.light", borderRadius: 1 }}>
                <Typography variant="body2" fontWeight={700}>Gasto listo para confirmar</Typography>
                <Typography variant="body2">{pendingExpenseRef.current.description} - {pendingExpenseRef.current.category_name}</Typography>
                <Typography variant="body2">Importe: {formatCurrency(pendingExpenseRef.current.amount, currency)} · Fecha: {pendingExpenseRef.current.expense_date}</Typography>
                <Typography variant="caption" color="text.secondary">Di confirmo para registrar o cancelar para descartarlo.</Typography>
              </Box>
            )}
            {pendingOperationRef.current && (
              <Box sx={{ p: 1.5, bgcolor: "warning.50", border: 1, borderColor: "warning.light", borderRadius: 1 }}>
                <Typography variant="body2" fontWeight={700}>Operación lista para confirmar</Typography>
                <Typography variant="body2">{pendingOperationRef.current.label}</Typography>
                <Typography variant="caption" color="text.secondary">Di confirmo para ejecutar o cancelar para descartarla.</Typography>
              </Box>
            )}
            {!supported && (
              <Typography variant="body2" color="warning.main">
                Prueba con Chrome o Edge y permite el acceso al microfono.
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              Habla con naturalidad y entrega todos los datos juntos; no necesitas esperar a que te pregunte campo por campo. Puedes interrumpir al asistente mientras habla. El indicador muestra cuando el microfono esta activo. Las instrucciones y los datos necesarios se envian a DeepSeek para procesarlos; las operaciones de escritura requieren tu confirmacion hablada.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>Cerrar</Button>
          {speaking && <Button onClick={interruptAssistant} variant="outlined">Interrumpir y hablar</Button>}
          <Button
            onClick={sessionActive ? stopSession : startSession}
            variant="contained"
            color={sessionActive ? "warning" : "primary"}
            startIcon={sessionActive ? <MicIcon /> : <MicIcon />}
          >
            {sessionActive ? "Pausar" : "Continuar hablando"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
