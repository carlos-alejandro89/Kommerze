import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';

// UI Components
import { Button, ButtonArrow } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandCheck,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

// Zod Schema for Validation
const FormSchema = z.object({
  prefijo: z.string().optional(),
  descripcion: z.string().min(1, 'La descripción es obligatoria'),
  objetoImpuesto: z.string().min(1, 'Seleccione el objeto de impuesto'),
  fraccionable: z.boolean().default(false),
  linea: z.string().min(1, 'Seleccione la línea'),
  marca: z.string().min(1, 'Seleccione la marca'),
  productoSAT: z.string().min(1, 'Seleccione el producto SAT'),
});

// Mock data (You can replace this with data from your API)
const mockObjetoImpuesto = [
  { value: '01', label: '01 - No objeto de impuesto' },
  { value: '02', label: '02 - Sí objeto de impuesto' },
  { value: '03', label: '03 - Sí objeto del impuesto y no obligado al desglose' },
];

const mockLineas = [
  { value: 'l1', label: 'Línea de Electrónicos' },
  { value: 'l2', label: 'Línea Blanca' },
];

const mockMarcas = [
  { value: 'm1', label: 'Marca Genérica' },
  { value: 'm2', label: 'Marca Premium' },
];

const mockProductoSAT = [
  { value: '01010101', label: '01010101 - No existe en el catálogo' },
  { value: '43211500', label: '43211500 - Computadoras' },
];

export function TabGeneral() {
  const form = useForm({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      prefijo: '',
      descripcion: '',
      objetoImpuesto: '',
      fraccionable: false,
      linea: '',
      marca: '',
      productoSAT: '',
    },
  });

  // States for combobox popovers
  const [openImpuesto, setOpenImpuesto] = useState(false);
  const [openLinea, setOpenLinea] = useState(false);
  const [openMarca, setOpenMarca] = useState(false);
  const [openSAT, setOpenSAT] = useState(false);

  const onSubmit = (data) => {
    console.log('Form Submitted Data:', data);
    // Add toast or API submission logic here
  };

  return (
    <div className="py-4 max-w-4xl mx-auto pb-12">
      <Form {...form}>
        <form id="product-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            
            {/* Prefijo */}
            <FormField
              control={form.control}
              name="prefijo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prefijo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej. PRD" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Objeto de Impuesto */}
            <FormField
              control={form.control}
              name="objetoImpuesto"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="mb-1.5">Objeto de impuesto</FormLabel>
                  <Popover open={openImpuesto} onOpenChange={setOpenImpuesto}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between items-center text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <span className="truncate pr-2">
                            {field.value
                              ? mockObjetoImpuesto.find(
                                  (item) => item.value === field.value
                                )?.label
                              : "Seleccionar objeto..."}
                          </span>
                          <ButtonArrow />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar..." />
                        <CommandList>
                          <CommandEmpty>No se encontraron resultados.</CommandEmpty>
                          <CommandGroup>
                            {mockObjetoImpuesto.map((item) => (
                              <CommandItem
                                value={item.label}
                                key={item.value}
                                onSelect={() => {
                                  form.setValue("objetoImpuesto", item.value);
                                  setOpenImpuesto(false);
                                }}
                              >
                                <span className="truncate pr-4">{item.label}</span>
                                {item.value === field.value && <CommandCheck className="ml-auto" />}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Descripción */}
            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descripción del producto" 
                      className="resize-none" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fraccionable */}
            <FormField
              control={form.control}
              name="fraccionable"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm md:col-span-2">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base font-semibold text-foreground">Fraccionable</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Permite venta en cantidades decimales (ej. venta a granel)
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Linea */}
            <FormField
              control={form.control}
              name="linea"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="mb-1.5">Línea</FormLabel>
                  <Popover open={openLinea} onOpenChange={setOpenLinea}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <span className="truncate pr-2">
                            {field.value
                              ? mockLineas.find(
                                  (item) => item.value === field.value
                                )?.label
                              : "Seleccionar línea..."}
                          </span>
                          <ButtonArrow />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar línea..." />
                        <CommandList>
                          <CommandEmpty>No se encontró la línea.</CommandEmpty>
                          <CommandGroup>
                            {mockLineas.map((item) => (
                              <CommandItem
                                value={item.label}
                                key={item.value}
                                onSelect={() => {
                                  form.setValue("linea", item.value);
                                  setOpenLinea(false);
                                }}
                              >
                                {item.label}
                                {item.value === field.value && <CommandCheck className="ml-auto" />}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Marca */}
            <FormField
              control={form.control}
              name="marca"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="mb-1.5">Marca</FormLabel>
                  <Popover open={openMarca} onOpenChange={setOpenMarca}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <span className="truncate pr-2">
                             {field.value
                              ? mockMarcas.find(
                                  (item) => item.value === field.value
                                )?.label
                              : "Seleccionar marca..."}
                          </span>
                          <ButtonArrow />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar marca..." />
                        <CommandList>
                          <CommandEmpty>No se encontró la marca.</CommandEmpty>
                          <CommandGroup>
                            {mockMarcas.map((item) => (
                              <CommandItem
                                value={item.label}
                                key={item.value}
                                onSelect={() => {
                                  form.setValue("marca", item.value);
                                  setOpenMarca(false);
                                }}
                              >
                                {item.label}
                                {item.value === field.value && <CommandCheck className="ml-auto" />}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Producto SAT */}
            <FormField
              control={form.control}
              name="productoSAT"
              render={({ field }) => (
                <FormItem className="flex flex-col md:col-span-2">
                  <FormLabel className="mb-1.5">Producto SAT</FormLabel>
                  <Popover open={openSAT} onOpenChange={setOpenSAT}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <span className="truncate pr-2">
                            {field.value
                              ? mockProductoSAT.find(
                                  (item) => item.value === field.value
                                )?.label
                              : "Seleccionar producto SAT..."}
                          </span>
                          <ButtonArrow />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[450px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar producto SAT..." />
                        <CommandList>
                          <CommandEmpty>No se encontró el producto.</CommandEmpty>
                          <CommandGroup>
                            {mockProductoSAT.map((item) => (
                              <CommandItem
                                value={item.label}
                                key={item.value}
                                onSelect={() => {
                                  form.setValue("productoSAT", item.value);
                                  setOpenSAT(false);
                                }}
                              >
                                {item.label}
                                {item.value === field.value && <CommandCheck className="ml-auto" />}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </form>
      </Form>
    </div>
  );
}