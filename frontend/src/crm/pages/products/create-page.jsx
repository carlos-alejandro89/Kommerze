import { useState, useEffect } from 'react';
import { Content } from '@/crm/layout/components/content';
import { Button } from '@/components/ui/button';
import { FileText, Boxes, ListChecks } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PageHeader } from './page-header';
import { TabGeneral } from './components/tab-general';
import { TabNiveles } from './components/tab-niveles';
import { TabCaracteristicas } from './components/tab-caracteristicas';
import { DialogAlert } from '../../../components/common/dialog-alert';
import { ServiceGetMarcas, ServiceGetEmpaques, ServiceGetLineas, ServiceGetSatProductos, ServiceApiCrearProducto } from '../../../../wailsjs/go/main/App';

export function CreateProductPage() {
    const [activeTab, setActiveTab] = useState('general');
    const tabsOrder = ['general', 'niveles', 'caracteristicas'];
    const currentTabIndex = tabsOrder.indexOf(activeTab);
    const isFirstTab = currentTabIndex === 0;
    const isLastTab = currentTabIndex === tabsOrder.length - 1;

    const [marcas, setMarcas] = useState([]);
    const [empaques, setEmpaques] = useState([]);
    const [productosSat, setProductosSat] = useState([]);
    const [lineas, setLineas] = useState([]);
    const [showAlert, setShowAlert] = useState(false);
    const [response, setResponse] = useState(null);

    const [product, setProduct] = useState(null);

    const loadMarcas = async () => {
        const marcas = await ServiceGetMarcas();
        if (marcas.success) {
            setMarcas(marcas.data);
        }
    }

    const loadEmpaques = async () => {
        const dataEmpaques = await ServiceGetEmpaques();

        if (dataEmpaques.success) {
            setEmpaques(dataEmpaques.data);
        }
    }

    const loadLineas = async () => {
        const lineas = await ServiceGetLineas();
        if (lineas.success) {
            setLineas(lineas.data);
        }
    }

    const loadProductosSat = async () => {
        const catProductosSat = await ServiceGetSatProductos();

        if (catProductosSat.success) {
            setProductosSat(catProductosSat.data);
        }
    }

    useEffect(() => {
        loadMarcas();
        loadEmpaques();
        loadLineas();
        loadProductosSat();

        if (localStorage.getItem('product')) {
            setProduct(JSON.parse(localStorage.getItem('product')));
        }

    }, []);

    useEffect(() => {
        if (localStorage.getItem('product')) {
            setProduct(JSON.parse(localStorage.getItem('product')));
        }
    }, [activeTab]);

    const handleNext = () => {
        if (!isLastTab) {
            setActiveTab(tabsOrder[currentTabIndex + 1]);
        }
    };

    const handlePrevious = () => {
        if (!isFirstTab) {
            setActiveTab(tabsOrder[currentTabIndex - 1]);
        }
    };

    const setLocalStorage = () => {
        localStorage.removeItem('product');
        localStorage.removeItem("niveles")
    }

    const updateResponse = async (response) => {
        setResponse(response);

    }

    const handleSave = async (product) => {
        const result = await ServiceApiCrearProducto(product);
        console.log(result)
        await updateResponse(result);
        // toast.success(result.mensaje);
        if (result.success) {
            localStorage.removeItem('product');
            localStorage.removeItem("niveles")
            setActiveTab("general");
            setProduct(null);

        }
        setShowAlert(true);
    };

    return (
        <>
            <DialogAlert open={showAlert}
                title={response?.success ? "Producto creado" : "Error al crear producto"}
                description={response?.message}
                onOpenChange={setShowAlert}
                onConfirm={() => setShowAlert(false)}
                type={response?.success ? 'success' : 'warning'}

            />

            <PageHeader />
            <Content className="flex flex-col pt-4 pb-0 h-full overflow-hidden">
                <h1 className="text-sm font-semibold ps-5 mb-2 shrink-0">Crear Producto</h1>

                <div className="flex flex-col grow min-h-0">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col grow text-sm h-full">
                        <TabsList
                            variant="line"
                            className="px-5 gap-6 bg-transparent [&_button]:border-b [&_button_svg]:size-4 [&_button]:text-secondary-foreground"
                        >
                            <TabsTrigger value="general" className="pointer-events-none">
                                <FileText /> Datos generales
                            </TabsTrigger>
                            <TabsTrigger value="niveles" className="pointer-events-none">
                                <Boxes /> Niveles de empaque
                            </TabsTrigger>
                            <TabsTrigger value="caracteristicas" className="pointer-events-none">
                                <ListChecks />
                                Características e instrucciones
                            </TabsTrigger>
                        </TabsList>
                        <ScrollArea className="flex-1 w-full">
                            <TabsContent value="general" className="mt-0 px-5" forceMount>
                                {activeTab === 'general' && (
                                    <TabGeneral onValid={handleNext} product={product} marcas={marcas} lineas={lineas} productosSat={productosSat} />
                                )}
                            </TabsContent>
                            <TabsContent value="niveles" className="px-5 mt-0" forceMount>
                                {activeTab === 'niveles' && (
                                    <TabNiveles empaques={empaques} />
                                )}
                            </TabsContent>
                            <TabsContent value="caracteristicas" className="px-5 mt-0" forceMount>
                                {activeTab === 'caracteristicas' && (
                                    <TabCaracteristicas onValid={handleSave} />
                                )}
                            </TabsContent>
                        </ScrollArea>
                    </Tabs>
                </div>

                {/* Footer flotante sin divider */}
                <div className="shrink-0 bg-background py-4">
                    <div className="flex justify-end gap-3 max-w-4xl mx-auto px-5 lg:px-0">
                        {isFirstTab ? (
                            <Button variant="outline" type="button" className="h-10 px-6">Cancelar</Button>
                        ) : (
                            <Button variant="outline" type="button" onClick={handlePrevious} className="h-10 px-6">Anterior</Button>
                        )}

                        {isLastTab ? (
                            <Button type="submit" form="form-caracteristicas" className="h-10 px-6 bg-gradient-to-br from-[#002366] to-[#001233] text-white hover:from-[#001233] hover:to-[#00113a] shadow-[0_4px_14px_rgba(0,35,102,0.2)] border-none font-bold transition-all active:scale-[0.98]">
                                Guardar
                            </Button>
                        ) : activeTab === 'niveles' ? (
                            <Button type="button" onClick={handleNext} className="h-10 px-6 bg-gradient-to-br from-[#002366] to-[#001233] text-white hover:from-[#001233] hover:to-[#00113a] shadow-[0_4px_14px_rgba(0,35,102,0.2)] border-none font-bold transition-all active:scale-[0.98]">
                                Siguiente
                            </Button>
                        ) : (
                            <Button type="submit" form={`form-${activeTab}`} className="h-10 px-6 bg-gradient-to-br from-[#002366] to-[#001233] text-white hover:from-[#001233] hover:to-[#00113a] shadow-[0_4px_14px_rgba(0,35,102,0.2)] border-none font-bold transition-all active:scale-[0.98]">
                                Siguiente
                            </Button>
                        )}
                    </div>
                </div>
            </Content>
        </>
    );
}
