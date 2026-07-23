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

const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

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

/**
 * Plantilla reutilizable para reportes corporativos. Cada hoja acepta metadata,
 * indicadores, columnas tipadas, detalle y columnas totalizables con fórmulas.
 */
export const exportProfessionalReport = ({ fileName, sheets }) => {
  if (!sheets?.some((sheet) => sheet.rows?.length || sheet.kpis?.length)) {
    notificationSwal("Advertencia", "No hay datos para exportar.", "warning");
    return;
  }
  const generatedAt = new Date().toLocaleString("es-PE");
  const workbook = `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40"><DocumentProperties xmlns="urn:schemas-microsoft-com:office:office"><Author>MIS Gestión Comercial</Author><Created>${new Date().toISOString()}</Created><Company>MIS</Company></DocumentProperties>${STYLES}${sheets.map((sheet) => buildSheet({ ...sheet, subtitle: sheet.subtitle || `Generado el ${generatedAt}` })).join("")}</Workbook>`;
  downloadBlob(new Blob(["\ufeff", workbook], { type: "application/vnd.ms-excel;charset=utf-8" }), `${fileName}.xls`);
  notificationSwal("Exportación completa", `El reporte ${fileName} fue descargado.`, "success");
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
