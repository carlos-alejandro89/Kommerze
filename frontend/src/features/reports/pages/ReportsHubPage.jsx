import { ArrowRight, Boxes, ClipboardCheck, PackageCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const REPORTS = [
  {
    title: 'Productos vendidos',
    description: 'Sumatoria de productos vendidos dentro de un rango de fechas.',
    icon: PackageCheck,
    color: '#2575f5',
    path: '/reports/products-sold',
    tag: 'Ventas',
  },
  {
    title: 'Formato de auditoría',
    description: 'Inventario agrupado por línea con un espacio para el conteo físico.',
    icon: ClipboardCheck,
    color: '#12a66a',
    path: '/reports/audit-format',
    tag: 'Inventario',
  },
];

export function ReportsHubPage() {
  const navigate = useNavigate();
  return (
    <div className="p-5 space-y-6 animate-fade-in">
      <header>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          <Boxes className="size-4" /> Centro de reportes
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Selecciona un reporte</h1>
        <p className="mt-1 text-sm text-muted-foreground">Consulta, prepara y exporta la información de tu operación.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map((report) => {
          const Icon = report.icon;
          return (
            <button
              key={report.path}
              type="button"
              onClick={() => navigate(report.path)}
              className="group relative min-h-48 overflow-hidden rounded-2xl border border-border bg-surface p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
            >
              <span className="absolute -right-8 -top-8 size-28 rounded-full opacity-[.08]" style={{ backgroundColor: report.color }} />
              <span className="relative flex items-start justify-between">
                <span className="flex size-12 items-center justify-center rounded-2xl text-white shadow-lg" style={{ backgroundColor: report.color }}>
                  <Icon className="size-6" />
                </span>
                <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{report.tag}</span>
              </span>
              <h2 className="relative mt-6 text-base font-bold text-foreground">{report.title}</h2>
              <p className="relative mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{report.description}</p>
              <span className="relative mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                Abrir reporte <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
              </span>
            </button>
          );
        })}
      </section>
    </div>
  );
}
