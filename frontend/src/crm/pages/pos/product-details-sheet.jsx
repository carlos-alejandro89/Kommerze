import { ShoppingCart, Lock, User, Settings, BadgeCheck } from 'lucide-react';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';



export function ProductDetailsSheet({
  open,
  onOpenChange,
  productId,
  itemSelected,
  addToCart,
}) {

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:w-[520px] sm:max-w-none inset-5 start-auto h-auto rounded-lg p-0 [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="border-b py-3.5 px-5 border-border">
          <SheetTitle>Detalles del Producto</SheetTitle>
        </SheetHeader>
        <SheetBody className="px-5 py-0">
          <ScrollArea className="h-[calc(100dvh-11.75rem)] pe-3 -me-3">
            <CardContent className="flex flex-col space-y-3 p-5 p-0">
              <Card className="relative items-center justify-center bg-accent/50 mb-6.5 h-[280px]">
                <Badge
                  size="sm"
                  variant="destructive"
                  className="absolute top-4 right-4 uppercase"
                >
                  -{itemSelected.discount}% descuento
                </Badge>
                <img
                  src={toAbsoluteUrl('https://bitcontrol.tiendasayer.com/public/img/productos/sayer-generic-product.jpg')}
                  className="w-full h-full object-contain p-4"
                  alt="image"
                />

                <Card className="absolute items-center justify-center bg-light w-[75px] h-[45px] overflow-hidden rounded-sm bottom-4 right-4">
                  <img
                    src={toAbsoluteUrl('/media/brand-logos/nike-light.svg')}
                    className="dark:hidden"
                    alt="image"
                  />

                  <img
                    src={toAbsoluteUrl('/media/brand-logos/nike-dark.svg')}
                    className="hidden dark:block"
                    alt="image"
                  />
                </Card>
              </Card>

              <span className="text-base font-medium text-mono">
                {itemSelected.sku}
              </span>
              <span className="text-sm font-normal text-foreground block mb-7">
                {itemSelected.name}
              </span>

              <div className="flex flex-col gap-2.5 lg:mb-11">
                <Tabs defaultValue="account">
                  <TabsList className="w-full">
                    <TabsTrigger value="settings">
                      <Settings />
                      General
                    </TabsTrigger>
                    <TabsTrigger value="caracteristicas">
                      <User />
                      Caracteristicas
                    </TabsTrigger>
                    <TabsTrigger value="password">
                      <Lock />
                      Técnica de aplicación
                    </TabsTrigger>

                  </TabsList>
                  <TabsContent value="settings">

                    <p className="text-sm text-gray-600 leading-relaxed bg-blue-50/30 p-4 rounded-xl border border-blue-50 mb-4">
                      {itemSelected.informacionProducto && itemSelected.informacionProducto.Descripcion}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {itemSelected.informacionProducto && itemSelected.informacionProducto.Caracteristicas.map((caracteristica) =>

                        <div className="flex items-center gap-2 p-3 bg-white border border-gray-100 rounded-lg ">
                          <span><BadgeCheck size={16} className="text-green-500" /></span>
                          <span className="text-sm text-gray-700">{caracteristica.caracteristica}</span>
                        </div>


                      )}
                    </div>



                  </TabsContent>
                  <TabsContent value="caracteristicas">
                    {itemSelected.caracteristicas && itemSelected.caracteristicas.map((caracteristica) =>
                      <>
                        <p className="text-[13px] font-black uppercase text-slate-500 tracking-tighter">{caracteristica.Titulo}</p>
                        {caracteristica.Items.map((item) =>
                          <div className="flex items-center gap-2 mb-3 p-3 bg-white border border-gray-100 rounded-lg ">
                            <span>{item.colNombre}</span>
                            <span className="text-sm text-gray-700">{item.valor}</span>
                          </div>

                        )}

                      </>
                    )}


                  </TabsContent>
                  <TabsContent value="password">
                    <Card>
                      <CardContent>
                        <p>{itemSelected.tecnica_aplicacion}</p>
                      </CardContent>
                    </Card>
                  </TabsContent>

                </Tabs>
              </div>

              <div className="flex items-center justify-end gap-2">
                <span className="text-base font-normal text-secondary-foreground line-through">
                  {itemSelected.precioVenta}
                </span>

                <span className="text-lg font-medium text-mono">$99.00</span>
              </div>
            </CardContent>
          </ScrollArea>
        </SheetBody>
        <SheetFooter className="border-t py-3.5 px-5 border-border">
          <Button
            onClick={() => {
              if (productId) {
                addToCart({ productId });
              }
            }}
            disabled={!productId}
            className="grow"
          >
            <ShoppingCart />
            Add to Cart
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
