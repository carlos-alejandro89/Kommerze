import { Fragment } from 'react/jsx-runtime';
import { Captions, CreditCard, ArrowLeftRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  { id: 0, title: 'Capturar productos', short: 'Productos',    icon: Captions },
  { id: 1, title: 'Tipo de Transacción', short: 'Transacción', icon: ArrowLeftRight },
  { id: 2, title: 'Pago',               short: 'Pago',         icon: CreditCard },
  { id: 3, title: 'Listo',              short: 'Listo',        icon: Check },
];

/**
 * Steps — Indicador de progreso del flujo de venta del POS.
 *
 * Layout:
 *   Fila 1: [○]──────[○]──────[○]──────[○]   ← círculos + conectores
 *   Fila 2:  Label   Label    Label    Label  ← etiquetas alineadas
 */
export function Steps({ currentStep }) {
  return (
    <div className="flex flex-col items-center w-full px-6 py-2 gap-1.5 max-w-md mx-auto">

      {/* ── Fila 1: Círculos + conectores ─────────────────────────────────── */}
      <div className="flex items-center w-full">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentStep;
          const isActive    = index === currentStep;
          const isPending   = index > currentStep;
          const Icon        = step.icon;

          return (
            <Fragment key={step.id}>
              {/* Círculo */}
              <div className="relative shrink-0 flex items-center justify-center">
                <div
                  className={cn(
                    'flex items-center justify-center rounded-full size-9 transition-all duration-300',
                    isCompleted && 'bg-primary shadow-md shadow-primary/30',
                    isActive    && 'bg-primary shadow-lg shadow-primary/40 ring-4 ring-primary/20',
                    isPending   && 'bg-muted border-2 border-border',
                  )}
                >
                  {isCompleted ? (
                    <Check className="size-4 text-primary-foreground" strokeWidth={2.5} />
                  ) : (
                    <Icon
                      className={cn(
                        'size-4',
                        isActive  ? 'text-primary-foreground' : 'text-muted-foreground',
                      )}
                      strokeWidth={isActive ? 2.2 : 1.8}
                    />
                  )}
                </div>

                {/* Pulse en el step activo */}
                {isActive && (
                  <span className="absolute inset-0 rounded-full ring-2 ring-primary animate-ping opacity-20 pointer-events-none" />
                )}
              </div>

              {/* Conector entre steps */}
              {index < STEPS.length - 1 && (
                <div className="flex-1 mx-2 h-0.5 relative overflow-hidden rounded-full">
                  <div className="absolute inset-0 bg-border" />
                  <div
                    className={cn(
                      'absolute inset-0 bg-primary origin-left transition-transform duration-500 ease-out',
                      isCompleted ? 'scale-x-100' : 'scale-x-0',
                    )}
                  />
                </div>
              )}
            </Fragment>
          );
        })}
      </div>

      {/* ── Fila 2: Etiquetas alineadas bajo cada círculo ─────────────────── */}
      <div className="flex items-start w-full">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentStep;
          const isActive    = index === currentStep;
          const isPending   = index > currentStep;
          const isLast      = index === STEPS.length - 1;

          return (
            <Fragment key={`label-${step.id}`}>
              {/* Label centrado bajo el círculo (w-9 = mismo ancho que el círculo) */}
              <div className="flex w-9 shrink-0 justify-center">
                <span
                  className={cn(
                    'text-[9px] font-semibold leading-tight text-center whitespace-nowrap transition-colors',
                    isActive    && 'text-primary',
                    isCompleted && 'text-primary/60',
                    isPending   && 'text-muted-foreground',
                  )}
                >
                  <span className="hidden sm:inline">{step.title}</span>
                  <span className="sm:hidden">{step.short}</span>
                </span>
              </div>

              {/* Espaciador proporcional al conector */}
              {!isLast && <div className="flex-1 mx-2" />}
            </Fragment>
          );
        })}
      </div>

    </div>
  );
}
