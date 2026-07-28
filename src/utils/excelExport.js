import * as XLSX from "xlsx-js-style";
import { notificationSwal } from "./swal-helpers";

const xmlEscape = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&apos;");

const safeSheetName = (name) => String(name || "Reporte")
  .replace(/[\\/?*:[\]]/g, " ")
  .slice(0, 31);

const dataCell = (value, type = "text", style) => {
  const styleId = style || (type === "currency" ? "Currency" : type === "number" ? "Number" : "Data");
  const isNumeric = type === "currency" || type === "number";
  const normalized = isNumeric ? Number(value || 0) : (value ?? "");
  return `<Cell ss:StyleID="${styleId}"><Data ss:Type="${isNumeric ? "Number" : "String"}">${xmlEscape(normalized)}</Data></Cell>`;
};

const STYLES = `
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Font ss:FontName="Aptos" ss:Size="10"/><Borders/><Interior/><NumberFormat/><Protection/></Style>
  <Style ss:ID="Brand"><Alignment ss:Vertical="Center"/><Font ss:FontName="Aptos Display" ss:Size="16" ss:Bold="1" ss:Color="#123B5D"/><Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Title"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Aptos Display" ss:Size="18" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#123B5D" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Subtitle"><Alignment ss:Horizontal="Center"/><Font ss:FontName="Aptos" ss:Size="10" ss:Color="#D9EAF5"/><Interior ss:Color="#123B5D" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Section"><Font ss:Bold="1" ss:Size="11" ss:Color="#123B5D"/><Interior ss:Color="#DCEAF3" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#2C7DA0"/></Borders></Style>
  <Style ss:ID="MetaLabel"><Font ss:Bold="1" ss:Color="#52616B"/><Interior ss:Color="#F1F5F7" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D8E0E5"/></Borders></Style>
  <Style ss:ID="MetaValue"><Font ss:Color="#172B3A"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D8E0E5"/></Borders></Style>
  <Style ss:ID="KpiLabel"><Alignment ss:Horizontal="Center"/><Font ss:Bold="1" ss:Color="#52616B"/><Interior ss:Color="#EAF5F1" ss:Pattern="Solid"/><Borders><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A9D6C5"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A9D6C5"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A9D6C5"/></Borders></Style>
  <Style ss:ID="KpiValue"><Alignment ss:Horizontal="Center"/><Font ss:Bold="1" ss:Size="14" ss:Color="#087F5B"/><Interior ss:Color="#EAF5F1" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A9D6C5"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A9D6C5"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A9D6C5"/></Borders></Style>
  <Style ss:ID="KpiCurrency" ss:Parent="KpiValue"><NumberFormat ss:Format="&quot;S/ &quot;#,##0.00;[Red]-&quot;S/ &quot;#,##0.00"/></Style>
  <Style ss:ID="Header"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#2C7DA0" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#123B5D"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#DCEAF3"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#DCEAF3"/></Borders></Style>
  <Style ss:ID="Data"><Alignment ss:Vertical="Center" ss:WrapText="1"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E3E8EB"/></Borders></Style>
  <Style ss:ID="Number" ss:Parent="Data"><Alignment ss:Horizontal="Right"/><NumberFormat ss:Format="#,##0.00"/></Style>
  <Style ss:ID="Currency" ss:Parent="Data"><Alignment ss:Horizontal="Right"/><NumberFormat ss:Format="&quot;S/ &quot;#,##0.00;[Red]-&quot;S/ &quot;#,##0.00"/></Style>
  <Style ss:ID="TotalLabel"><Alignment ss:Horizontal="Right"/><Font ss:Bold="1" ss:Color="#123B5D"/><Interior ss:Color="#DCEAF3" ss:Pattern="Solid"/><Borders><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#2C7DA0"/></Borders></Style>
  <Style ss:ID="TotalCurrency" ss:Parent="Currency"><Font ss:Bold="1" ss:Color="#087F5B"/><Interior ss:Color="#DCEAF3" ss:Pattern="Solid"/><Borders><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#2C7DA0"/></Borders></Style>
  <Style ss:ID="Note"><Font ss:Italic="1" ss:Color="#6C7880"/><Interior ss:Color="#FFF7DB" ss:Pattern="Solid"/></Style>
 </Styles>`;

const buildSheet = ({ name, title, subtitle, metadata = [], kpis = [], columns = [], rows = [], note }) => {
  const colCount = Math.max(columns.length, 4);
  const columnXml = columns.length
    ? columns.map((column) => `<Column ss:AutoFitWidth="0" ss:Width="${column.width || 100}"/>`).join("")
    : Array.from({ length: colCount }, () => '<Column ss:AutoFitWidth="0" ss:Width="120"/>').join("");
  let body = `<Row ss:Height="32"><Cell ss:StyleID="Title" ss:MergeAcross="${colCount - 1}"><Data ss:Type="String">${xmlEscape(title)}</Data></Cell></Row>`;
  body += `<Row ss:Height="20"><Cell ss:StyleID="Subtitle" ss:MergeAcross="${colCount - 1}"><Data ss:Type="String">${xmlEscape(subtitle)}</Data></Cell></Row><Row/>`;

  if (metadata.length) {
    body += `<Row><Cell ss:StyleID="Section" ss:MergeAcross="${colCount - 1}"><Data ss:Type="String">INFORMACIÓN DEL REPORTE</Data></Cell></Row>`;
    for (let index = 0; index < metadata.length; index += 2) {
      const first = metadata[index];
      const second = metadata[index + 1];
      body += `<Row>${dataCell(first.label, "text", "MetaLabel")}${dataCell(first.value, "text", "MetaValue")}`;
      body += second ? `${dataCell(second.label, "text", "MetaLabel")}${dataCell(second.value, "text", "MetaValue")}` : `${dataCell("", "text", "MetaLabel")}${dataCell("", "text", "MetaValue")}`;
      body += `</Row>`;
    }
    body += `<Row/>`;
  }

  if (kpis.length) {
    body += `<Row><Cell ss:StyleID="Section" ss:MergeAcross="${colCount - 1}"><Data ss:Type="String">INDICADORES PRINCIPALES</Data></Cell></Row>`;
    for (let index = 0; index < kpis.length; index += colCount) {
      const group = kpis.slice(index, index + colCount);
      body += `<Row ss:Height="22">${group.map((kpi) => dataCell(kpi.label, "text", "KpiLabel")).join("")}</Row>`;
      body += `<Row ss:Height="28">${group.map((kpi) => dataCell(kpi.value, kpi.type, kpi.type === "currency" ? "KpiCurrency" : "KpiValue")).join("")}</Row>`;
    }
    body += `<Row/>`;
  }

  if (columns.length) {
    body += `<Row><Cell ss:StyleID="Section" ss:MergeAcross="${colCount - 1}"><Data ss:Type="String">DETALLE</Data></Cell></Row>`;
    body += `<Row ss:Height="30">${columns.map((column) => dataCell(column.title, "text", "Header")).join("")}</Row>`;
    const firstDataRow = 6 + Math.ceil(metadata.length / 2) + (metadata.length ? 2 : 0) + (kpis.length ? Math.ceil(kpis.length / colCount) * 2 + 2 : 0);
    rows.forEach((row) => {
      body += `<Row>${columns.map((column) => dataCell(row[column.key], column.type)).join("")}</Row>`;
    });
    if (rows.length && columns.some((column) => column.total)) {
      body += `<Row>${columns.map((column, index) => {
        if (index === 0) return dataCell("TOTALES", "text", "TotalLabel");
        if (!column.total) return dataCell("", "text", "TotalLabel");
        return `<Cell ss:StyleID="TotalCurrency" ss:Formula="=SUM(R${firstDataRow}C${index + 1}:R${firstDataRow + rows.length - 1}C${index + 1})"><Data ss:Type="Number">0</Data></Cell>`;
      }).join("")}</Row>`;
    }
  }

  if (note) body += `<Row/><Row><Cell ss:StyleID="Note" ss:MergeAcross="${colCount - 1}"><Data ss:Type="String">${xmlEscape(note)}</Data></Cell></Row>`;
  return `<Worksheet ss:Name="${xmlEscape(safeSheetName(name))}"><Table>${columnXml}${body}</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>2</SplitHorizontal><TopRowBottomPane>2</TopRowBottomPane><ProtectObjects>False</ProtectObjects><ProtectScenarios>False</ProtectScenarios><PageSetup><Layout x:Orientation="Landscape"/><Header x:Margin="0.3"/><Footer x:Margin="0.3"/><PageMargins x:Bottom="0.5" x:Left="0.25" x:Right="0.25" x:Top="0.5"/></PageSetup><FitToPage/></WorksheetOptions></Worksheet>`;
};

const excelColors = {
  navy: "123B5D",
  blue: "2C7DA0",
  paleBlue: "DCEAF3",
  paleGreen: "EAF5F1",
  green: "087F5B",
  gray: "52616B",
  lightGray: "F1F5F7",
  border: "D8E0E5",
  white: "FFFFFF",
};

const thinBorder = (color = excelColors.border) => ({
  top: { style: "thin", color: { rgb: color } },
  bottom: { style: "thin", color: { rgb: color } },
  left: { style: "thin", color: { rgb: color } },
  right: { style: "thin", color: { rgb: color } },
});

const setExcelCell = (sheet, row, column, value, style = {}, type) => {
  const address = XLSX.utils.encode_cell({ r: row, c: column });
  sheet[address] = {
    v: value ?? "",
    t: type || (typeof value === "number" ? "n" : "s"),
    s: style,
  };
};

const buildStyledSheet = ({ title, subtitle, metadata = [], kpis = [], columns = [], rows = [], note }) => {
  const colCount = Math.max(columns.length, 4);
  const sheet = {};
  const merges = [];
  const rowHeights = [];
  let row = 0;
  const mergeAcross = (startRow, startColumn = 0, endColumn = colCount - 1) => {
    if (endColumn > startColumn) merges.push({ s: { r: startRow, c: startColumn }, e: { r: startRow, c: endColumn } });
  };
  const titleStyle = {
    fill: { fgColor: { rgb: excelColors.navy } },
    font: { name: "Aptos Display", sz: 18, bold: true, color: { rgb: excelColors.white } },
    alignment: { horizontal: "center", vertical: "center" },
  };
  const subtitleStyle = {
    fill: { fgColor: { rgb: excelColors.navy } },
    font: { name: "Aptos", sz: 10, color: { rgb: "D9EAF5" } },
    alignment: { horizontal: "center", vertical: "center" },
  };
  const sectionStyle = {
    fill: { fgColor: { rgb: excelColors.paleBlue } },
    font: { bold: true, color: { rgb: excelColors.navy } },
    border: { bottom: { style: "medium", color: { rgb: excelColors.blue } } },
    alignment: { vertical: "center" },
  };

  setExcelCell(sheet, row, 0, title, titleStyle);
  mergeAcross(row);
  rowHeights[row] = { hpt: 27 };
  row += 1;
  setExcelCell(sheet, row, 0, subtitle, subtitleStyle);
  mergeAcross(row);
  rowHeights[row] = { hpt: 19 };
  row += 2;

  if (metadata.length) {
    setExcelCell(sheet, row, 0, "INFORMACIÓN DEL REPORTE", sectionStyle);
    mergeAcross(row);
    row += 1;
    for (let index = 0; index < metadata.length; index += 2) {
      const pair = [metadata[index], metadata[index + 1]].filter(Boolean);
      pair.forEach((item, pairIndex) => {
        const startColumn = pairIndex * 2;
        setExcelCell(sheet, row, startColumn, item.label, {
          fill: { fgColor: { rgb: excelColors.lightGray } },
          font: { bold: true, color: { rgb: excelColors.gray } },
          border: thinBorder(),
        });
        setExcelCell(sheet, row, startColumn + 1, item.value, {
          font: { color: { rgb: "172B3A" } },
          border: thinBorder(),
        });
      });
      row += 1;
    }
    row += 1;
  }

  if (kpis.length) {
    setExcelCell(sheet, row, 0, "INDICADORES PRINCIPALES", sectionStyle);
    mergeAcross(row);
    row += 1;
    for (let index = 0; index < kpis.length; index += colCount) {
      const group = kpis.slice(index, index + colCount);
      group.forEach((kpi, column) => setExcelCell(sheet, row, column, kpi.label, {
        fill: { fgColor: { rgb: excelColors.paleGreen } },
        font: { bold: true, color: { rgb: excelColors.gray } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: thinBorder("A9D6C5"),
      }));
      rowHeights[row] = { hpt: 24 };
      row += 1;
      group.forEach((kpi, column) => setExcelCell(sheet, row, column, Number(kpi.value || 0), {
        fill: { fgColor: { rgb: excelColors.paleGreen } },
        font: { bold: true, sz: 14, color: { rgb: excelColors.green } },
        alignment: { horizontal: "center", vertical: "center" },
        border: thinBorder("A9D6C5"),
        numFmt: kpi.type === "currency" ? '"S/ "#,##0.00;[Red]-"S/ "#,##0.00' : "#,##0.00",
      }, "n"));
      rowHeights[row] = { hpt: 28 };
      row += 1;
    }
    row += 1;
  }

  if (columns.length) {
    setExcelCell(sheet, row, 0, "DETALLE", sectionStyle);
    mergeAcross(row);
    row += 1;
    columns.forEach((column, index) => setExcelCell(sheet, row, index, column.title, {
      fill: { fgColor: { rgb: excelColors.blue } },
      font: { bold: true, color: { rgb: excelColors.white } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: thinBorder("DCEAF3"),
    }));
    rowHeights[row] = { hpt: 29 };
    row += 1;
    const firstDataRow = row + 1;
    rows.forEach((item) => {
      columns.forEach((column, index) => {
        const numeric = column.type === "currency" || column.type === "number";
        setExcelCell(sheet, row, index, numeric ? Number(item[column.key] || 0) : item[column.key], {
          alignment: { horizontal: numeric ? "right" : "left", vertical: "center", wrapText: true },
          border: { bottom: { style: "thin", color: { rgb: "E3E8EB" } } },
          numFmt: column.type === "currency" ? '"S/ "#,##0.00;[Red]-"S/ "#,##0.00' : column.type === "number" ? "#,##0.00" : undefined,
        }, numeric ? "n" : "s");
      });
      row += 1;
    });
    if (rows.length && columns.some((column) => column.total)) {
      columns.forEach((column, index) => {
        const baseStyle = {
          fill: { fgColor: { rgb: excelColors.paleBlue } },
          font: { bold: true, color: { rgb: index === 0 ? excelColors.navy : excelColors.green } },
          alignment: { horizontal: index === 0 ? "right" : "right", vertical: "center" },
          border: { top: { style: "medium", color: { rgb: excelColors.blue } } },
          numFmt: column.type === "currency" ? '"S/ "#,##0.00;[Red]-"S/ "#,##0.00' : undefined,
        };
        if (index === 0) setExcelCell(sheet, row, index, "TOTALES", baseStyle);
        else if (column.total) {
          const address = XLSX.utils.encode_cell({ r: row, c: index });
          const total = rows.reduce((sum, item) => sum + Number(item[column.key] || 0), 0);
          sheet[address] = { f: `SUM(${XLSX.utils.encode_col(index)}${firstDataRow}:${XLSX.utils.encode_col(index)}${row})`, t: "n", v: total, s: baseStyle };
        } else setExcelCell(sheet, row, index, "", baseStyle);
      });
      row += 1;
    }
  }

  if (note) {
    row += 1;
    setExcelCell(sheet, row, 0, note, {
      fill: { fgColor: { rgb: "FFF7DB" } },
      font: { italic: true, color: { rgb: "6C7880" } },
      alignment: { wrapText: true },
    });
    mergeAcross(row);
  }

  sheet["!ref"] = `A1:${XLSX.utils.encode_cell({ r: Math.max(row, 1), c: colCount - 1 })}`;
  sheet["!cols"] = Array.from({ length: colCount }, (_, index) => ({ wpx: columns[index]?.width || 120 }));
  sheet["!rows"] = rowHeights;
  sheet["!merges"] = merges;
  sheet["!sheetViews"] = [{ state: "frozen", ySplit: 2 }];
  return sheet;
};

/**
 * Plantilla reutilizable para reportes corporativos XLSX con estilos reales.
 */
export const exportProfessionalReport = ({ fileName, sheets }) => {
  if (!sheets?.some((sheet) => sheet.rows?.length || sheet.kpis?.length)) {
    notificationSwal("Advertencia", "No hay datos para exportar.", "warning");
    return;
  }
  const generatedAt = new Date().toLocaleString("es-PE");
  const workbook = XLSX.utils.book_new();
  sheets.forEach((sheet) => {
    XLSX.utils.book_append_sheet(
      workbook,
      buildStyledSheet({ ...sheet, subtitle: sheet.subtitle || `Generado el ${generatedAt}` }),
      safeSheetName(sheet.name)
    );
  });
  XLSX.writeFile(workbook, `${fileName}.xlsx`, { bookType: "xlsx", compression: true });
  notificationSwal("Exportación completa", `El reporte ${fileName} fue descargado.`, "success");
};

export const exportCashRegisterReport = (reportData, currentUser) => {
  if (!reportData) return;
  const sales = reportData.sales || [];
  const number = (value) => Number(value || 0);
  const dateParts = (value) => {
    if (!value) return { date: "—", time: "—" };
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return { date: String(value), time: "—" };
    return {
      date: date.toLocaleDateString("es-PE"),
      time: date.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    };
  };
  const paymentLabels = { cash: "Efectivo", yape: "Yape", plin: "Plin", card: "Tarjeta", transfer: "Transferencia", credit: "Crédito", discount: "Descuento", vale: "Vale" };
  const opened = dateParts(reportData.opened_at || reportData.created_at || reportData.start_date);
  const closed = dateParts(reportData.closed_at || reportData.end_date);
  const metadata = [
    { label: "Moneda", value: reportData.currency || "PEN" },
    { label: "Apertura", value: `${opened.date} · ${opened.time}` },
    { label: "Cierre", value: reportData.closed_at || reportData.end_date ? `${closed.date} · ${closed.time}` : "Caja aún abierta" },
    { label: "Estado", value: reportData.status === "closed" ? "Cerrada" : "Abierta" },
    { label: "Generado por", value: currentUser?.full_name || currentUser?.email || "Usuario del sistema" },
  ];
  const saleRows = sales.map((sale) => {
    const created = dateParts(sale.created_at);
    return {
      number: sale.sale_number || sale.id,
      date: created.date,
      time: created.time,
      customer: sale.customer_name || "Cliente general",
      products: (sale.items || []).map((item) => `${number(item.quantity)}x ${item.item_name || "Producto o servicio"}`).join(" · ") || "Sin detalle",
      payments: (sale.payments || []).map((payment) => `${paymentLabels[payment.payment_method] || payment.payment_method}: ${number(payment.amount).toFixed(2)}`).join(" · ") || paymentLabels[sale.payment_method] || sale.payment_method || "—",
      total: number(sale.total_amount),
    };
  });
  const paymentRows = sales.flatMap((sale) => (sale.payments?.length ? sale.payments : [{ payment_method: sale.payment_method, amount: sale.total_amount }]).map((payment) => ({
    method: paymentLabels[payment.payment_method] || payment.payment_method || "No especificado",
    amount: number(payment.amount),
  })));
  const paymentSummary = paymentRows.reduce((summary, payment) => {
    summary[payment.method] = (summary[payment.method] || 0) + payment.amount;
    return summary;
  }, {});
  const paymentSummaryRows = Object.entries(paymentSummary).map(([method, amount]) => ({ method, operations: paymentRows.filter((row) => row.method === method).length, amount }));
  const breakdown = reportData.breakdown || {};
  const productCount = sales.flatMap((sale) => sale.items || []).reduce((sum, item) => sum + number(item.quantity), 0);

  exportProfessionalReport({
    fileName: `reporte_caja_${new Date().toISOString().slice(0, 10)}`,
    sheets: [
      {
        name: "Resumen ejecutivo", title: "REPORTE DE CAJA", metadata,
        kpis: [
          { label: "Ventas realizadas", value: sales.length, type: "number" },
          { label: "Monto inicial", value: number(breakdown.initial_amount ?? reportData.initial_amount), type: "currency" },
          { label: "Total en ventas", value: number(reportData.report_total_sales ?? sales.reduce((sum, sale) => sum + number(sale.total_amount), 0)), type: "currency" },
          { label: "Efectivo esperado", value: number(breakdown.total_physical_cash ?? reportData.report_cash_to_deliver ?? reportData.expected_amount), type: "currency" },
          { label: "Ingresos manuales", value: number(breakdown.manual_inflow ?? reportData.manual_inflow), type: "currency" },
          { label: "Cobros de créditos", value: number(breakdown.credit_debt_collections ?? reportData.credit_collections), type: "currency" },
          { label: "Diferencia de caja", value: number(reportData.report_difference ?? reportData.difference), type: "currency" },
          { label: "Productos vendidos", value: productCount, type: "number" },
        ],
        columns: [{ key: "method", title: "Medio de pago", width: 160 }, { key: "operations", title: "Operaciones", type: "number", width: 90 }, { key: "amount", title: "Monto", type: "currency", total: true, width: 120 }],
        rows: paymentSummaryRows,
        note: "Los totales se calculan automáticamente. Verifique la diferencia de caja antes de entregar el turno.",
      },
      {
        name: "Detalle de ventas", title: "DETALLE DE VENTAS", metadata,
        columns: [
          { key: "number", title: "N.º venta", width: 90 }, { key: "date", title: "Fecha", width: 80 }, { key: "time", title: "Hora", width: 70 },
          { key: "customer", title: "Cliente", width: 150 }, { key: "products", title: "Producto o servicio", width: 220 }, { key: "payments", title: "Medios de pago", width: 230 },
          { key: "total", title: "Total", type: "currency", total: true, width: 95 },
        ], rows: saleRows,
      },
    ],
  });
};

// Compatibilidad para módulos existentes: convierte cualquier arreglo plano en
// un reporte con la misma plantilla visual sin exigir cambios en cada pantalla.
export const exportToExcel = (data, fileName, sheetName = "Sheet1") => {
  if (!data || data.length === 0) {
    notificationSwal("Advertencia", "No hay datos para exportar.", "warning");
    return;
  }
  const keys = Array.from(new Set(data.flatMap((row) => Object.keys(row))));
  const columns = keys.map((key) => {
    const values = data.map((row) => row[key]).filter((value) => value !== null && value !== undefined && value !== "");
    const numeric = values.length > 0 && values.every((value) => typeof value === "number" || (!Number.isNaN(Number(value)) && String(value).trim() !== ""));
    const currency = numeric && /(total|monto|precio|importe|saldo|costo)/i.test(key);
    return {
      key,
      title: key,
      type: currency ? "currency" : numeric ? "number" : "text",
      total: currency,
      width: Math.min(240, Math.max(80, String(key).length * 8 + 30)),
    };
  });
  exportProfessionalReport({
    fileName,
    sheets: [{
      name: sheetName,
      title: String(sheetName).toUpperCase(),
      columns,
      rows: data,
    }],
  });
};
