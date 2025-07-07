import * as XLSX from 'xlsx';
import { notificationSwal } from "./swal-helpers";

export const exportToExcel = (data, fileName, sheetName = "Sheet1") => {
  if (!data || data.length === 0) {
    notificationSwal(
      "Advertencia",
      "No hay datos para exportar.",
      "warning"
    );
    return;
  }

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);

  notificationSwal(
    "Exportación Completa",
    `El reporte ${fileName} ha sido descargado.`,
    "success"
  );
};
