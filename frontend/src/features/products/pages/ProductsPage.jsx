import { useState } from 'react';
import {
  Search, Plus, Filter, LayoutGrid, List as ListIcon,
  Package, Image as ImageIcon, ChevronRight, ChevronLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

/* ── Mock data ── */
const mockProducts = [
  { id: 1, name: 'Sayer Lack Pro', sku: 'VIN-123', category: 'Vinílica', finish: 'Mate', use: 'Interior', stock: 24, price: 1250.00, unit: 'Cubeta', color: '#f3f4f6' },
  { id: 2, name: 'Ultra-Color Max', sku: 'ACR-456', category: 'Acrílica', finish: 'Brillante', use: 'Exterior', stock: 12, price: 480.00, unit: 'Galón', color: '#3b82f6' },
  { id: 3, name: 'Satin Sayer', sku: 'ESM-789', category: 'Esmalte', finish: 'Satinado', use: 'Interior', stock: 0, price: 185.50, unit: 'Litro', color: '#ef4444' },
  { id: 4, name: 'Impercaucho', sku: 'IMP-012', category: 'Impermeabilizante', finish: 'Mate', use: 'Exterior', stock: 8, price: 950.00, unit: 'Cubeta', color: '#a8a29e' },
  { id: 5, name: 'Fondo de Poliuretano', sku: 'POL-345', category: 'Poliuretano', finish: 'Brillante', use: 'Madera', stock: 15, price: 820.00, unit: 'Galón', color: '#fcd34d' },
  { id: 6, name: 'Sellador 5x1', sku: 'SEL-678', category: 'Preparación', finish: 'Transparente', use: 'Universal', stock: 45, price: 290.00, unit: 'Galón', color: '#ffffff' },
];

export function ProductsPage() {
  const [viewMode, setViewMode] = useState('grid');
  const [search, setSearch] = useState('');

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden animate-fade-in">
      
      {/* ── Left Sidebar Filters ─────────────────────── */}
      <div className="w-[240px] shrink-0 border-r border-border bg-surface p-5 overflow-y-auto hidden md:block">
        <h3 className="text-sm font-bold text-foreground mb-4">Filtros</h3>
        
        <div className="space-y-6">
          {/* Acabado */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acabado</h4>
            <div className="space-y-1.5">
              {['Mate', 'Brillante', 'Satinado'].map(f => (
                <label key={f} className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" className="rounded border-border text-primary focus:ring-primary/30" />
                  <span className="text-sm text-foreground group-hover:text-primary transition-colors">{f}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Uso */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Uso</h4>
            <div className="flex gap-2">
              <button className="flex-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-white transition-colors">
                Interior
              </button>
              <button className="flex-1 rounded-md border border-border bg-bg-subtle px-2 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors">
                Exterior
              </button>
            </div>
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</h4>
            <div className="space-y-1.5">
              {['Acrílica', 'Vinílica', 'Esmalte', 'Impermeabilizante', 'Maderas'].map(t => (
                <label key={t} className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" className="rounded border-border text-primary focus:ring-primary/30" />
                  <span className="text-sm text-foreground group-hover:text-primary transition-colors">{t}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-bg-subtle">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 shrink-0 bg-surface border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-foreground">Pinturas Interiores</h2>
            <p className="text-sm text-muted-foreground">Mostrando 24 resultados</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar productos, SKUs..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-subtle pl-9 pr-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
            </div>
            
            <div className="hidden sm:flex items-center rounded-lg border border-border bg-bg-subtle p-0.5">
              <button 
                onClick={() => setViewMode('grid')}
                className={cn('p-1.5 rounded-md transition-colors', viewMode === 'grid' ? 'bg-surface shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                <LayoutGrid className="size-4" />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={cn('p-1.5 rounded-md transition-colors', viewMode === 'list' ? 'bg-surface shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                <ListIcon className="size-4" />
              </button>
            </div>

            <Link
              to="/products/new"
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors shadow-sm"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">Nuevo Producto</span>
            </Link>
          </div>
        </div>

        {/* Product Grid/List */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className={cn(
            "grid gap-4",
            viewMode === 'grid' ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
          )}>
            {mockProducts.map((product) => (
              <div 
                key={product.id} 
                className={cn(
                  "group relative rounded-xl border border-border bg-surface overflow-hidden hover:border-primary/50 hover:shadow-md transition-all duration-200",
                  viewMode === 'list' && "flex items-center p-3 gap-4"
                )}
              >
                {/* Image Area */}
                <div className={cn(
                  "relative bg-muted/30 flex items-center justify-center",
                  viewMode === 'grid' ? "aspect-square w-full" : "size-24 rounded-lg shrink-0"
                )}>
                  <div className="absolute top-2 left-2 z-10 flex gap-1">
                    {product.stock > 10 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-bold text-success-600">
                        <span className="size-1.5 rounded-full bg-success-500" /> En Stock
                      </span>
                    ) : product.stock > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-bold text-warning-600">
                        <span className="size-1.5 rounded-full bg-warning-500" /> Bajo Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-danger/20 px-2 py-0.5 text-[10px] font-bold text-danger-600">
                        <span className="size-1.5 rounded-full bg-danger-500" /> Agotado
                      </span>
                    )}
                  </div>
                  
                  {/* Mock Image Placeholder */}
                  <div className="w-2/3 h-2/3 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${product.color}20` }}>
                    {product.id % 2 === 0 ? <Package className="size-10 opacity-30" /> : <ImageIcon className="size-10 opacity-30" />}
                  </div>
                </div>

                {/* Content Area */}
                <div className={cn("p-4", viewMode === 'list' && "flex-1 py-1 px-0 flex justify-between items-center")}>
                  <div className={viewMode === 'list' ? "space-y-1" : "space-y-1 mb-4"}>
                    <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                      <span>{product.category}</span>
                      <span className="size-1 rounded-full bg-border" />
                      <span>{product.use}</span>
                      {viewMode === 'grid' && (
                         <div className="ml-auto size-4 rounded-full border border-border shadow-sm" style={{ backgroundColor: product.color }} />
                      )}
                    </div>
                    <h3 className="font-bold text-foreground text-base leading-tight group-hover:text-primary transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
                  </div>

                  <div className={cn("flex items-end justify-between", viewMode === 'list' && "gap-8 items-center text-right")}>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">Precio x {product.unit}</p>
                      <p className="text-lg font-bold text-foreground">
                        ${product.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <button className={cn(
                      "flex size-8 items-center justify-center rounded-full transition-colors",
                      product.stock > 0 
                        ? "bg-primary text-white hover:bg-brand-600 shadow-sm" 
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}>
                      <Package className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">Mostrando 1 a 6 de 24 productos</p>
            <div className="flex gap-1">
              <button className="flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">
                <ChevronLeft className="size-4" />
              </button>
              <button className="flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted transition-colors">
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
