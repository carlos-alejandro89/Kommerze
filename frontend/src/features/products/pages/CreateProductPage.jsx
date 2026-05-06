import { useState } from 'react';
import { Save, ArrowLeft, Image as ImageIcon, Package, Tag, DollarSign, List as ListIcon, RefreshCw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export function CreateProductPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success('Producto creado correctamente');
      navigate('/products');
    }, 1500);
  };

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden bg-bg-subtle animate-fade-in">
      
      {/* ── Main Content ─────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 shrink-0 bg-surface border-b border-border">
          <div className="flex items-center gap-3">
            <Link to="/products" className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <ArrowLeft className="size-4" />
            </Link>
            <div>
              <h2 className="text-xl font-bold text-foreground">Nuevo Producto</h2>
              <p className="text-sm text-muted-foreground">Agrega un artículo al catálogo de tu sucursal</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="rounded-lg px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors">
              Descartar
            </button>
            <button 
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all disabled:opacity-60 shadow-sm"
            >
              {loading ? <RefreshCw className="size-4 animate-spin" /> : <Save className="size-4" />}
              Guardar Producto
            </button>
          </div>
        </div>

        {/* Form Container */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column - Main Info */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Información General */}
              <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Package className="size-5 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Información General</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Nombre del Producto *</label>
                    <input type="text" placeholder="Ej: Pintura Vinílica Blanca 19L" className="w-full rounded-lg border border-border bg-bg-subtle px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">SKU / Código Interno</label>
                      <input type="text" placeholder="SKU-0001" className="w-full rounded-lg border border-border bg-bg-subtle px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition font-mono uppercase" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Código de Barras</label>
                      <input type="text" placeholder="750123456789" className="w-full rounded-lg border border-border bg-bg-subtle px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Descripción Detallada</label>
                    <textarea rows={4} placeholder="Características principales del producto..." className="w-full rounded-lg border border-border bg-bg-subtle px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none" />
                  </div>
                </div>
              </div>

              {/* Precios e Inventario */}
              <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="size-5 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Precios e Inventario</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Precio de Venta (MXN) *</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <input type="number" placeholder="0.00" className="w-full rounded-lg border border-border bg-bg-subtle pl-9 pr-3.5 py-2.5 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Costo de Compra (Opcional)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <input type="number" placeholder="0.00" className="w-full rounded-lg border border-border bg-bg-subtle pl-9 pr-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Unidad de Medida</label>
                    <select className="w-full rounded-lg border border-border bg-bg-subtle px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition appearance-none">
                      <option>Pieza (PZA)</option>
                      <option>Cubeta 19L</option>
                      <option>Galón 4L</option>
                      <option>Litro 1L</option>
                      <option>Kilogramo (KG)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Stock Mínimo (Alerta)</label>
                    <input type="number" placeholder="Ej: 5" className="w-full rounded-lg border border-border bg-bg-subtle px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition" />
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column - Media & Categories */}
            <div className="space-y-6">
              
              {/* Imagen */}
              <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <ImageIcon className="size-5 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Imagen</h3>
                </div>
                
                <div className="border-2 border-dashed border-border rounded-xl bg-bg-subtle aspect-square flex flex-col items-center justify-center gap-2 text-center p-6 hover:bg-muted/50 transition-colors cursor-pointer group">
                  <div className="flex size-12 items-center justify-center rounded-full bg-surface shadow-sm group-hover:scale-110 transition-transform">
                    <ImageIcon className="size-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-primary">Haz clic para subir</p>
                    <p className="text-[11px] text-muted-foreground mt-1">PNG, JPG hasta 5MB</p>
                  </div>
                </div>
              </div>

              {/* Categorización */}
              <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <ListIcon className="size-5 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Categorías</h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Línea / Familia</label>
                    <select className="w-full rounded-lg border border-border bg-bg-subtle px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition appearance-none">
                      <option value="">Seleccionar línea...</option>
                      <option>Pinturas</option>
                      <option>Impermeabilizantes</option>
                      <option>Accesorios</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Marca</label>
                    <select className="w-full rounded-lg border border-border bg-bg-subtle px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition appearance-none">
                      <option value="">Seleccionar marca...</option>
                      <option>Sayer Lack</option>
                      <option>Comex</option>
                      <option>Genérica</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Etiquetas</label>
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-subtle px-3.5 py-2 text-sm focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition">
                      <Tag className="size-4 text-muted-foreground shrink-0" />
                      <input type="text" placeholder="Interior, Mate, Lavable..." className="w-full bg-transparent focus:outline-none text-foreground placeholder:text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
