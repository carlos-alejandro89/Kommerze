import { useMemo } from "react";
import { SpecialZoomLevel, Viewer, Worker } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.js?url";

import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";

interface PdfViewerProps {
  fileUrl?: string;
  fileName?: string;
  className?: string;
}

export function PdfViewer({
  fileUrl,
  fileName = "documento.pdf",
  className = "",
}: PdfViewerProps) {
  // Instanciación dentro del componente pero memorizada correctamente
  const defaultLayoutPluginInstance = useMemo(() => defaultLayoutPlugin(), []);

  if (!fileUrl) return null;

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-slate-200/80 bg-[#f1f5f9] shadow-inner ${className}`}
      aria-label={`Visor de ${fileName}`}
    >
      <Worker workerUrl={pdfWorkerUrl}>
        <Viewer
          fileUrl={fileUrl}
          defaultScale={SpecialZoomLevel.PageWidth}
          plugins={[defaultLayoutPluginInstance]}
          renderError={() => (
            <div className="grid h-full min-h-96 place-items-center px-6 text-center text-sm text-slate-500">
              No se pudo mostrar el PDF de la factura.
            </div>
          )}
        />
      </Worker>
    </div>
  );
}