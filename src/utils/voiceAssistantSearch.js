export const BUSINESS_SEARCH_FIELDS = {
  sales: { search: ["sale_number", "customer_name", "phone", "status", "payment_status"], output: ["sale_number", "customer_name", "phone", "status", "payment_status", "total_amount", "created_at"] },
  orders: { search: ["sale_number", "customer_name", "phone", "address", "status"], output: ["sale_number", "customer_name", "phone", "address", "status", "total_amount"] },
  products: { search: ["name", "sku", "barcode"], output: ["name", "sku", "barcode", "stock", "price", "status"] },
  low_stock: { search: ["name", "sku", "barcode"], output: ["name", "stock", "min_stock"] },
  services: { search: ["name", "description"], output: ["name", "price", "duration", "status"] },
  clients: { search: ["name", "phone", "address"], output: ["name", "phone", "address"] },
  expenses: { search: ["description", "notes"], output: ["description", "amount", "expense_date", "category_id", "notes"] },
  purchases: { search: ["invoice_number", "supplier_name"], output: ["invoice_number", "supplier_name", "total_amount", "status"] },
  credits: { search: ["client_name", "customer_name", "phone", "status"], output: ["client_name", "customer_name", "phone", "total_amount", "paid_amount", "status"] },
  loans: { search: ["description", "client_name", "customer_name", "status"], output: ["description", "amount", "paid_amount", "status", "due_date"] },
  assets: { search: ["name", "description", "status"], output: ["name", "description", "status"] },
  staff: { search: ["full_name", "first_name", "last_name", "email", "role"], output: ["full_name", "first_name", "last_name", "email", "status", "role"] },
};

const SEARCH_STOP_WORDS = new Set("busca buscar encuentra encontrar dime ayudame ayudarme registrar registra registrados registrado registrada cliente clientes pedido pedidos venta ventas producto productos servicio servicios gasto gastos pago pagos cobrar cobro caja reporte informacion datos de del la el los las un una para por favor quiero necesito dame muestreme muestra consultar consulta sobre en su mi mis tu tus al desde con que cual cuales quien tiene tienen hay esta estan cuantos cuantas cuanto cuanta son fueron fue ayer hoy ultimo ultimos actual actualmente prestamo prestamos credito creditos compra compras proveedor activo activos bien bienes usuario usuarios empleado empleados sku barcode codigo codigos barras".split(" "));

const normalizeSearchText = (value = "") =>
  String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export const buildSearchKeywords = (value = "") => {
  const raw = String(value || "").trim().slice(0, 160);
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 6 && !/[a-zA-Z]/.test(raw)) return digits.length === 11 && digits.startsWith("51") ? digits.slice(2) : digits;
  return normalizeSearchText(raw).replace(/[^a-z0-9]+/g, " ").split(/\s+/)
    .filter((token) => token.length > 1 && !SEARCH_STOP_WORDS.has(token)).slice(0, 8).join(" ");
};

export const rowMatchesKeywords = (row, fields = [], keywords = "") => {
  const terms = buildSearchKeywords(keywords).split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const values = fields.map((field) => String(row?.[field] ?? ""));
  return terms.every((term) => values.some((value) => {
    if (/^\d{4,}$/.test(term)) return value.replace(/\D/g, "").includes(term);
    return normalizeSearchText(value).includes(term);
  }));
};
