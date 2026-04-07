import { Content } from '@/crm/layout/components/content';
import { Button } from '@/components/ui/button';
import { CalendarCheck, CalendarDays, CalendarRange } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PageHeader } from './page-header';
import { TabGeneral } from './components/tab-general';
import { TabNiveles } from './components/tab-niveles';
import { TabCaracteristicas } from './components/tab-caracteristicas';

export function CreateProductPage() {
    return (
        <>
            <PageHeader />
            <Content className="flex flex-col pt-4 pb-0 h-full overflow-hidden">
                <h1 className="text-sm font-semibold ps-5 mb-2 shrink-0">Crear Producto</h1>

                <div className="flex flex-col grow min-h-0">
                    <Tabs defaultValue="general" className="flex flex-col grow text-sm h-full">
                        <TabsList
                            variant="line"
                            className="px-5 gap-6 bg-transparent [&_button]:border-b [&_button_svg]:size-4 [&_button]:text-secondary-foreground"
                        >
                            <TabsTrigger value="general">
                                <CalendarCheck /> Datos generales
                            </TabsTrigger>
                            <TabsTrigger value="niveles">
                                <CalendarRange /> Niveles de empaque
                            </TabsTrigger>
                            <TabsTrigger value="caracteristicas">
                                <CalendarDays />
                                Caracteristicas e instrucciones
                            </TabsTrigger>
                        </TabsList>
                        <ScrollArea className="flex-1 w-full">
                            <TabsContent value="general" className="mt-0 px-5">
                                <TabGeneral />
                            </TabsContent>
                            <TabsContent value="niveles" className="px-5 mt-0">
                                <TabNiveles />
                            </TabsContent>
                            <TabsContent value="caracteristicas" className="px-5 mt-0">
                                <TabCaracteristicas />
                            </TabsContent>
                        </ScrollArea>
                    </Tabs>
                </div>

                {/* Footer flotante sin divider */}
                <div className="shrink-0 bg-background py-4">
                    <div className="flex justify-end gap-3 max-w-4xl mx-auto px-5 lg:px-0">
                        <Button variant="outline" type="button" className="h-10 px-6">Cancelar</Button>
                        <Button type="submit" form="product-form" className="h-10 px-6 bg-gradient-to-br from-[#002366] to-[#001233] text-white hover:from-[#001233] hover:to-[#00113a] shadow-[0_4px_14px_rgba(0,35,102,0.2)] border-none font-bold transition-all active:scale-[0.98]">
                            Guardar Cambios
                        </Button>
                    </div>
                </div>
            </Content>
        </>
    );
}
