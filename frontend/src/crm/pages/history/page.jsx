import { Content } from '@/crm/layout/components/content';
import { HistoryList } from "./history";
import { PageHeader } from './page-header';
import { ResumenVentas } from './resumen-ventas';


const mockPagos = [
    { ID: 1, Nombre: 'Tarjeta de Crédito', Referencia: 'Terminación 4567', Monto: 2300.00 },
    { ID: 2, Nombre: 'Efectivo', Referencia: 'Pago en caja', Monto: 1500.50 },
    { ID: 3, Nombre: 'Transferencia SPEI', Referencia: 'Ref: 123456789', Monto: 120.00 },
    { ID: 4, Nombre: 'Tarjeta de Débito', Referencia: 'Terminación 8901', Monto: 850.75 },
];

export function HistoryPage() {
    return (
        <div className="flex flex-col h-[calc(100vh-70px)] md:h-[calc(100vh-10px)] w-full relative">
            <PageHeader />

            <Content className="flex-1 overflow-hidden p-0">
                <div className="flex flex-col h-full w-full overflow-hidden">
                    <div className="flex flex-1 w-full h-full overflow-hidden">
                        {/* Left Section: History Items */}
                        <div className="flex-1 flex flex-col p-4 overflow-hidden border-r bg-background/40">
                            <HistoryList />
                        </div>

                        {/* Right Section: Details */}
                        <div className="w-[340px] flex flex-col bg-gradient-to-b from-white/50 to-blue-50/50 dark:from-zinc-950 dark:to-blue-900/20 shrink-0 border-l border-border/40 overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                <ResumenVentas
                                    totalVentas={4771.25}
                                    efectivo={1500.50}
                                    tarjetaCredito={2300.00}
                                    tarjetaDebito={850.75}
                                    spei={120.00}
                                />


                            </div>
                        </div>
                    </div>
                </div>
            </Content>
        </div>
    );
}