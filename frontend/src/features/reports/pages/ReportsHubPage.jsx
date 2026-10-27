import { ArrowRight, BarChart3, ClipboardCheck, PackageCheck, TrendingUp } from 'lucide-react';
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
  {
    title: 'Utilidad de ventas',
    description: 'Venta, costo y utilidad de las ventas confirmadas por periodo.',
    icon: TrendingUp,
    color: '#7c55e8',
    path: '/reports/profit',
    tag: 'Finanzas',
  },
];

export function ReportsHubPage() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6 p-6 animate-fade-in">
      <header className="rounded-[24px] border border-[#dce7f5] bg-[linear-gradient(115deg,#f4f8ff_0%,#eef5ff_58%,#f8fbff_100%)] px-6 py-5 shadow-[0_12px_34px_-30px_rgba(28,70,133,.5)] dark:border-white/10 dark:bg-white/[.045]">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#5579ad] dark:text-blue-300">
          <BarChart3 className="size-4" strokeWidth={1.8} /> Centro de reportes
        </div>
        <h1 className="mt-2 text-[24px] font-bold tracking-[-0.025em] text-[#101c35] dark:text-slate-100">Reportes de la operación</h1>
        <p className="mt-1 text-[12px] text-[#7185a7] dark:text-slate-400">Selecciona el reporte que deseas consultar, preparar o exportar.</p>
      </header>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[14px] font-bold text-[#101c35] dark:text-slate-100">Reportes disponibles</h2>
          <span className="text-[10px] font-semibold text-[#7890b4]">{REPORTS.length} opciones</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {REPORTS.map((report) => {
            const Icon = report.icon;
            return (
              <button
                key={report.path}
                type="button"
                onClick={() => navigate(report.path)}
                className="group relative flex min-h-[88px] items-center overflow-hidden rounded-2xl border border-[#e2eaf5] bg-white/80 px-4 py-3.5 text-left shadow-[0_8px_24px_-22px_rgba(28,70,133,.45)] transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow-[0_14px_30px_-22px_rgba(28,70,133,.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 dark:border-white/10 dark:bg-white/[.055] dark:hover:border-white/15 dark:hover:bg-white/[.08]"
              >
                <span
                  className="flex size-12 shrink-0 items-center justify-center rounded-[14px] text-white shadow-[0_10px_20px_-13px_var(--report-color)] ring-1 ring-white/40"
                  style={{ '--report-color': report.color, background: `linear-gradient(145deg, ${report.color}c7, ${report.color})` }}
                >
                  <Icon className="size-[23px]" strokeWidth={1.8} />
                </span>
                <span className="ml-3 min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-[12px] font-bold text-[#101c35] dark:text-slate-100">{report.title}</span>
                    <span className="rounded-full bg-[#f1f5fb] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[#7890b4] dark:bg-white/[.07]">{report.tag}</span>
                  </span>
                  <span className="mt-1 block max-w-md text-[10px] leading-[1.4] text-[#7185a7] dark:text-slate-400">{report.description}</span>
                </span>
                <ArrowRight className="ml-3 size-4 shrink-0 text-[#7890b4] transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
