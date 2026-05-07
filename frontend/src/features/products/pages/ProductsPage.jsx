import { useState, useEffect } from 'react';
import {
  Search, Plus, Filter, LayoutGrid, List as ListIcon,
  Package, Image as ImageIcon, ChevronRight, ChevronLeft,
  Loader2, ChevronDown, ChevronUp, X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ServiceConsultaProductos, ServiceGetLineas, ServiceGetMarcas } from '../../../../wailsjs/go/main/App';

export function ProductsPage() {
  const [viewMode, setViewMode] = useState('grid');
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [dbLineas, setDbLineas] = useState([]);
  const [dbMarcas, setDbMarcas] = useState([]);
  const [selectedLineas, setSelectedLineas] = useState(new Set());
  const [selectedMarcas, setSelectedMarcas] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 24;

  const [lineaSearch, setLineaSearch] = useState('');
  const [marcaSearch, setMarcaSearch] = useState('');
  const [expandedFilters, setExpandedFilters] = useState({ linea: true, marca: true });

  const toggleFilterSection = (section) => {
    setExpandedFilters(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const clearAllFilters = () => {
    setSelectedLineas(new Set());
    setSelectedMarcas(new Set());
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedLineas, selectedMarcas]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [data, lineasRes, marcasRes] = await Promise.all([
        ServiceConsultaProductos(''),
        ServiceGetLineas(),
        ServiceGetMarcas()
      ]);
      setProducts(data || []);
      if (lineasRes?.success) setDbLineas(lineasRes.data || []);
      if (marcasRes?.success) setDbMarcas(marcasRes.data || []);
    } catch (err) {
      console.error("Failed to fetch products:", err);
      setError("Error al cargar los productos o filtros. Por favor intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.Descripcion?.toLowerCase().includes(search.toLowerCase()) || 
                          p.Codigo?.toLowerCase().includes(search.toLowerCase());
    
    const pLinea = p.Linea || 'SIN LINEA';
    const pMarca = p.Marca || 'SIN MARCA';

    const matchesLinea = selectedLineas.size === 0 || selectedLineas.has(pLinea);
    const matchesMarca = selectedMarcas.size === 0 || selectedMarcas.has(pMarca);

    return matchesSearch && matchesLinea && matchesMarca;
  });

  const lineasCounts = products.reduce((acc, p) => {
    const linea = p.Linea || 'SIN LINEA';
    acc[linea] = (acc[linea] || 0) + 1;
    return acc;
  }, {});

  const marcasCounts = products.reduce((acc, p) => {
    const marca = p.Marca || 'SIN MARCA';
    acc[marca] = (acc[marca] || 0) + 1;
    return acc;
  }, {});

  const allLineas = dbLineas.slice();
  if (lineasCounts['SIN LINEA'] && !allLineas.some(l => l.NombreLinea?.toUpperCase() === 'SIN LINEA')) {
    allLineas.unshift({ NombreLinea: 'SIN LINEA' });
  }
  const displayedLineas = allLineas.filter(l => l.NombreLinea?.toLowerCase().includes(lineaSearch.toLowerCase()));

  const allMarcas = dbMarcas.slice();
  if (marcasCounts['SIN MARCA'] && !allMarcas.some(m => m.NombreMarca?.toUpperCase() === 'SIN MARCA')) {
    allMarcas.unshift({ NombreMarca: 'SIN MARCA' });
  }
  const displayedMarcas = allMarcas.filter(m => m.NombreMarca?.toLowerCase().includes(marcaSearch.toLowerCase()));

  const toggleLinea = (lineaName) => {
    const newSet = new Set(selectedLineas);
    if (newSet.has(lineaName)) newSet.delete(lineaName);
    else newSet.add(lineaName);
    setSelectedLineas(newSet);
  };

  const toggleMarca = (marcaName) => {
    const newSet = new Set(selectedMarcas);
    if (newSet.has(marcaName)) newSet.delete(marcaName);
    else newSet.add(marcaName);
    setSelectedMarcas(newSet);
  };

  const totalItems = filteredProducts.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden animate-fade-in">
      
      {/* ── Left Sidebar Filters ─────────────────────── */}
      <div className="w-[280px] shrink-0 border-r border-border bg-surface flex flex-col overflow-hidden hidden md:block">
        <div className="p-5 flex items-center justify-between border-b border-border">
          <h3 className="text-[11px] font-bold text-foreground uppercase tracking-wider">FILTROS</h3>
          {(selectedLineas.size > 0 || selectedMarcas.size > 0) && (
            <button onClick={clearAllFilters} className="text-xs font-medium text-primary hover:text-brand-600 transition-colors">
              Limpiar
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Líneas */}
          {allLineas.length > 0 && (
            <div className="space-y-3">
              <button 
                onClick={() => toggleFilterSection('linea')}
                className="flex items-center justify-between w-full text-left"
              >
                <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Línea</h4>
                {expandedFilters.linea ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
              </button>
              
              {expandedFilters.linea && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Buscar linea..."
                      value={lineaSearch}
                      onChange={e => setLineaSearch(e.target.value)}
                      className="w-full rounded-md border border-border bg-bg-subtle pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition"
                    />
                  </div>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                    {displayedLineas.map(l => {
                      const count = lineasCounts[l.NombreLinea] || 0;
                      return (
                        <label key={l.Guid || l.NombreLinea} className="flex items-center justify-between cursor-pointer group py-0.5">
                          <div className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              className="rounded border-border text-primary focus:ring-primary/30 size-3.5" 
                              checked={selectedLineas.has(l.NombreLinea)}
                              onChange={() => toggleLinea(l.NombreLinea)}
                            />
                            <span className="text-xs text-foreground group-hover:text-primary transition-colors uppercase">{l.NombreLinea}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono">({count})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Marcas */}
          {allMarcas.length > 0 && (
            <div className="space-y-3">
              <button 
                onClick={() => toggleFilterSection('marca')}
                className="flex items-center justify-between w-full text-left"
              >
                <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Marca</h4>
                {expandedFilters.marca ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
              </button>
              
              {expandedFilters.marca && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Buscar marca..."
                      value={marcaSearch}
                      onChange={e => setMarcaSearch(e.target.value)}
                      className="w-full rounded-md border border-border bg-bg-subtle pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition"
                    />
                  </div>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                    {displayedMarcas.map(m => {
                      const count = marcasCounts[m.NombreMarca] || 0;
                      return (
                        <label key={m.Guid || m.NombreMarca} className="flex items-center justify-between cursor-pointer group py-0.5">
                          <div className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              className="rounded border-border text-primary focus:ring-primary/30 size-3.5" 
                              checked={selectedMarcas.has(m.NombreMarca)}
                              onChange={() => toggleMarca(m.NombreMarca)}
                            />
                            <span className="text-xs text-foreground group-hover:text-primary transition-colors uppercase">{m.NombreMarca}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono">({count})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-bg-subtle">
        
        {/* Header */}
        <div className="flex flex-col gap-4 p-5 shrink-0 bg-surface border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">Catálogo de Productos</h2>
              <p className="text-sm text-muted-foreground">Mostrando {filteredProducts.length} resultados</p>
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

          {/* Active Filters Bar */}
          {(selectedLineas.size > 0 || selectedMarcas.size > 0) && (
            <div className="flex items-center gap-3 pt-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Filtros Activos:</span>
              <div className="flex flex-wrap gap-2">
                {Array.from(selectedLineas).map(linea => (
                  <span key={linea} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20 uppercase tracking-wide">
                    {linea}
                    <button onClick={() => toggleLinea(linea)} className="hover:text-primary-600 transition-colors">
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
                {Array.from(selectedMarcas).map(marca => (
                  <span key={marca} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20 uppercase tracking-wide">
                    {marca}
                    <button onClick={() => toggleMarca(marca)} className="hover:text-primary-600 transition-colors">
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
                <button onClick={clearAllFilters} className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline underline-offset-2 ml-1">
                  Borrar todo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Product Grid/List */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4 text-muted-foreground">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p>Cargando productos...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4 text-danger-500">
              <Package className="size-12 opacity-50" />
              <p>{error}</p>
              <button onClick={fetchProducts} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                Reintentar
              </button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4 text-muted-foreground">
              <Package className="size-12 opacity-50" />
              <p>No se encontraron productos{search ? ' que coincidan con tu búsqueda.' : '.'}</p>
            </div>
          ) : (
            <>
              <div className={cn(
                "grid gap-4",
                viewMode === 'grid' ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
              )}>
                {paginatedProducts.map((product) => {
                  const stock = Number(product.Existencia || 0);
                  const price = Number(product.PrecioVenta || 0);
                  const color = '#e2e8f0'; 
                  const category = product.Linea || 'General';
                  const use = product.Marca || 'Estándar';

                  return (
                    <div 
                      key={product.Guid || product.Codigo} 
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
                          {stock > 10 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-bold text-success-600">
                              <span className="size-1.5 rounded-full bg-success-500" /> En Stock
                            </span>
                          ) : stock > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-bold text-warning-600">
                              <span className="size-1.5 rounded-full bg-warning-500" /> Bajo Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-danger/20 px-2 py-0.5 text-[10px] font-bold text-danger-600">
                              <span className="size-1.5 rounded-full bg-danger-500" /> Agotado
                            </span>
                          )}
                        </div>
                        
                        {/* Image Placeholder */}
                        <div className="w-2/3 h-2/3 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                          {product.ImgReferencia ? (
                            <img src={product.ImgReferencia} alt={product.Descripcion} className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <ImageIcon className="size-10 opacity-30 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      {/* Content Area */}
                      <div className={cn("p-4", viewMode === 'list' && "flex-1 py-1 px-0 flex justify-between items-center")}>
                        <div className={viewMode === 'list' ? "space-y-1" : "space-y-1 mb-4"}>
                          <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                            <span>{category}</span>
                            <span className="size-1 rounded-full bg-border" />
                            <span>{use}</span>
                            {viewMode === 'grid' && (
                               <div className="ml-auto size-4 rounded-full border border-border shadow-sm" style={{ backgroundColor: color }} />
                            )}
                          </div>
                          <h3 className="font-bold text-foreground text-base leading-tight group-hover:text-primary transition-colors line-clamp-2">
                            {product.Descripcion}
                          </h3>
                          <p className="text-xs text-muted-foreground font-mono">{product.Codigo}</p>
                        </div>

                        <div className={cn("flex items-end justify-between", viewMode === 'list' && "gap-8 items-center text-right")}>
                          <div>
                            <p className="text-[10px] text-muted-foreground mb-0.5">Precio x {product.Empaque || 'Unidad'}</p>
                            <p className="text-lg font-bold text-foreground">
                              ${price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <button className={cn(
                            "flex size-8 items-center justify-center rounded-full transition-colors",
                            stock > 0 
                              ? "bg-primary text-white hover:bg-brand-600 shadow-sm" 
                              : "bg-muted text-muted-foreground cursor-not-allowed"
                          )}>
                            <Package className="size-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                <p className="text-sm text-muted-foreground">
                  Mostrando {totalItems > 0 ? startIndex + 1 : 0} a {Math.min(endIndex, totalItems)} de {totalItems} productos
                </p>
                <div className="flex gap-1">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
