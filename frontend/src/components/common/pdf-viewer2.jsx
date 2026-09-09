import { useMemo } from "react";
import { SpecialZoomLevel, Viewer, Worker } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.js?url";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";

export function PdfViewer({
  fileUrl,
  fileName = "documento.pdf",
  className = "",
}) {
  const layoutPlugin = useMemo(() => defaultLayoutPlugin(), []);

  if (!fileUrl) return null;

  return (
    <div
      className={`overflow-hidden bg-[#e9edf3] ${className}`}
      aria-label={`Visor de ${fileName}`}
    >
      <Worker workerUrl={pdfWorkerUrl}>
        <Viewer
          fileUrl={fileUrl}
          defaultScale={SpecialZoomLevel.PageWidth}
          plugins={[layoutPlugin]}
          renderError={() => (
            <div className="grid h-full min-h-96 place-items-center px-6 text-center text-sm text-muted-foreground">
              No se pudo mostrar el PDF de la factura.
            </div>
          )}
        />
      </Worker>
    </div>
  );
}
