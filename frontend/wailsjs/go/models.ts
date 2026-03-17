export namespace dto {
	
	export class ProductoDto {
	    ID: number;
	    Codigo: string;
	    Descripcion: string;
	    Empaque: string;
	    Contenido: number;
	    Fraccionable: boolean;
	    CodigoBarra: string;
	    ImgReferencia: string;
	    NivelId: number;
	    PrecioCompra: number;
	    PrecioVenta: number;
	    Descuento: number;
	    // Go type: decimal
	    Existencia: any;
	    Guid: string;
	    InformacionProducto: number[];
	    Caracteristicas: number[];
	    InstruccionesUso: number[];
	
	    static createFrom(source: any = {}) {
	        return new ProductoDto(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ID = source["ID"];
	        this.Codigo = source["Codigo"];
	        this.Descripcion = source["Descripcion"];
	        this.Empaque = source["Empaque"];
	        this.Contenido = source["Contenido"];
	        this.Fraccionable = source["Fraccionable"];
	        this.CodigoBarra = source["CodigoBarra"];
	        this.ImgReferencia = source["ImgReferencia"];
	        this.NivelId = source["NivelId"];
	        this.PrecioCompra = source["PrecioCompra"];
	        this.PrecioVenta = source["PrecioVenta"];
	        this.Descuento = source["Descuento"];
	        this.Existencia = this.convertValues(source["Existencia"], null);
	        this.Guid = source["Guid"];
	        this.InformacionProducto = source["InformacionProducto"];
	        this.Caracteristicas = source["Caracteristicas"];
	        this.InstruccionesUso = source["InstruccionesUso"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace models {
	
	export class Empaque {
	    ID: number;
	    Guid: number[];
	    // Go type: time
	    CreatedAt: any;
	    // Go type: time
	    UpdatedAt: any;
	    // Go type: gorm
	    DeletedAt: any;
	    CodigoEmpaque: string;
	    NombreEmpaque: string;
	    Contenido: number;
	    Sync: boolean;
	    UnidadID?: number;
	
	    static createFrom(source: any = {}) {
	        return new Empaque(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ID = source["ID"];
	        this.Guid = source["Guid"];
	        this.CreatedAt = this.convertValues(source["CreatedAt"], null);
	        this.UpdatedAt = this.convertValues(source["UpdatedAt"], null);
	        this.DeletedAt = this.convertValues(source["DeletedAt"], null);
	        this.CodigoEmpaque = source["CodigoEmpaque"];
	        this.NombreEmpaque = source["NombreEmpaque"];
	        this.Contenido = source["Contenido"];
	        this.Sync = source["Sync"];
	        this.UnidadID = source["UnidadID"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Linea {
	    ID: number;
	    Guid: number[];
	    // Go type: time
	    CreatedAt: any;
	    // Go type: time
	    UpdatedAt: any;
	    // Go type: gorm
	    DeletedAt: any;
	    NombreLinea: string;
	
	    static createFrom(source: any = {}) {
	        return new Linea(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ID = source["ID"];
	        this.Guid = source["Guid"];
	        this.CreatedAt = this.convertValues(source["CreatedAt"], null);
	        this.UpdatedAt = this.convertValues(source["UpdatedAt"], null);
	        this.DeletedAt = this.convertValues(source["DeletedAt"], null);
	        this.NombreLinea = source["NombreLinea"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Marca {
	    ID: number;
	    Guid: number[];
	    // Go type: time
	    CreatedAt: any;
	    // Go type: time
	    UpdatedAt: any;
	    // Go type: gorm
	    DeletedAt: any;
	    NombreMarca: string;
	
	    static createFrom(source: any = {}) {
	        return new Marca(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ID = source["ID"];
	        this.Guid = source["Guid"];
	        this.CreatedAt = this.convertValues(source["CreatedAt"], null);
	        this.UpdatedAt = this.convertValues(source["UpdatedAt"], null);
	        this.DeletedAt = this.convertValues(source["DeletedAt"], null);
	        this.NombreMarca = source["NombreMarca"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class SATProducto {
	    ID: number;
	    Guid: number[];
	    // Go type: time
	    CreatedAt: any;
	    // Go type: time
	    UpdatedAt: any;
	    // Go type: gorm
	    DeletedAt: any;
	    Clave: string;
	    Descripcion: string;
	    Activo: boolean;
	
	    static createFrom(source: any = {}) {
	        return new SATProducto(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ID = source["ID"];
	        this.Guid = source["Guid"];
	        this.CreatedAt = this.convertValues(source["CreatedAt"], null);
	        this.UpdatedAt = this.convertValues(source["UpdatedAt"], null);
	        this.DeletedAt = this.convertValues(source["DeletedAt"], null);
	        this.Clave = source["Clave"];
	        this.Descripcion = source["Descripcion"];
	        this.Activo = source["Activo"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Producto {
	    ID: number;
	    Guid: number[];
	    // Go type: time
	    CreatedAt: any;
	    // Go type: time
	    UpdatedAt: any;
	    // Go type: gorm
	    DeletedAt: any;
	    ProductoBaseId: number;
	    SatProductoID?: number;
	    SatProducto: SATProducto;
	    Prefijo: string;
	    Descripcion: string;
	    ObjetoImpuesto: string;
	    Fraccionable: boolean;
	    InformacionProducto: number[];
	    Caracteristicas: number[];
	    InstruccionesUso: number[];
	    LineaID?: number;
	    Linea: Linea;
	    MarcaID?: number;
	    Marca: Marca;
	
	    static createFrom(source: any = {}) {
	        return new Producto(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ID = source["ID"];
	        this.Guid = source["Guid"];
	        this.CreatedAt = this.convertValues(source["CreatedAt"], null);
	        this.UpdatedAt = this.convertValues(source["UpdatedAt"], null);
	        this.DeletedAt = this.convertValues(source["DeletedAt"], null);
	        this.ProductoBaseId = source["ProductoBaseId"];
	        this.SatProductoID = source["SatProductoID"];
	        this.SatProducto = this.convertValues(source["SatProducto"], SATProducto);
	        this.Prefijo = source["Prefijo"];
	        this.Descripcion = source["Descripcion"];
	        this.ObjetoImpuesto = source["ObjetoImpuesto"];
	        this.Fraccionable = source["Fraccionable"];
	        this.InformacionProducto = source["InformacionProducto"];
	        this.Caracteristicas = source["Caracteristicas"];
	        this.InstruccionesUso = source["InstruccionesUso"];
	        this.LineaID = source["LineaID"];
	        this.Linea = this.convertValues(source["Linea"], Linea);
	        this.MarcaID = source["MarcaID"];
	        this.Marca = this.convertValues(source["Marca"], Marca);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class NivelEmpaque {
	    ID: number;
	    Guid: number[];
	    // Go type: time
	    CreatedAt: any;
	    // Go type: time
	    UpdatedAt: any;
	    // Go type: gorm
	    DeletedAt: any;
	    ProductoID: number;
	    EmpaqueID: number;
	    Codigo: string;
	    CodigoBarra: string;
	    ImgReferencia: string;
	    Activo: boolean;
	    Producto: Producto;
	    Empaque: Empaque;
	
	    static createFrom(source: any = {}) {
	        return new NivelEmpaque(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ID = source["ID"];
	        this.Guid = source["Guid"];
	        this.CreatedAt = this.convertValues(source["CreatedAt"], null);
	        this.UpdatedAt = this.convertValues(source["UpdatedAt"], null);
	        this.DeletedAt = this.convertValues(source["DeletedAt"], null);
	        this.ProductoID = source["ProductoID"];
	        this.EmpaqueID = source["EmpaqueID"];
	        this.Codigo = source["Codigo"];
	        this.CodigoBarra = source["CodigoBarra"];
	        this.ImgReferencia = source["ImgReferencia"];
	        this.Activo = source["Activo"];
	        this.Producto = this.convertValues(source["Producto"], Producto);
	        this.Empaque = this.convertValues(source["Empaque"], Empaque);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	
	export class SucursalProducto {
	    ID: number;
	    Guid: number[];
	    // Go type: time
	    CreatedAt: any;
	    // Go type: time
	    UpdatedAt: any;
	    // Go type: gorm
	    DeletedAt: any;
	    NivelID: number;
	    Nivel: NivelEmpaque;
	    // Go type: decimal
	    PrecioCompra: any;
	    // Go type: decimal
	    PrecioVenta: any;
	    // Go type: decimal
	    PrecioVenta2: any;
	    // Go type: decimal
	    PrecioVenta3: any;
	    // Go type: decimal
	    Descuento: any;
	    // Go type: decimal
	    Existencia: any;
	    // Go type: decimal
	    Minimo: any;
	    // Go type: decimal
	    Maximo: any;
	    Sync: boolean;
	
	    static createFrom(source: any = {}) {
	        return new SucursalProducto(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ID = source["ID"];
	        this.Guid = source["Guid"];
	        this.CreatedAt = this.convertValues(source["CreatedAt"], null);
	        this.UpdatedAt = this.convertValues(source["UpdatedAt"], null);
	        this.DeletedAt = this.convertValues(source["DeletedAt"], null);
	        this.NivelID = source["NivelID"];
	        this.Nivel = this.convertValues(source["Nivel"], NivelEmpaque);
	        this.PrecioCompra = this.convertValues(source["PrecioCompra"], null);
	        this.PrecioVenta = this.convertValues(source["PrecioVenta"], null);
	        this.PrecioVenta2 = this.convertValues(source["PrecioVenta2"], null);
	        this.PrecioVenta3 = this.convertValues(source["PrecioVenta3"], null);
	        this.Descuento = this.convertValues(source["Descuento"], null);
	        this.Existencia = this.convertValues(source["Existencia"], null);
	        this.Minimo = this.convertValues(source["Minimo"], null);
	        this.Maximo = this.convertValues(source["Maximo"], null);
	        this.Sync = source["Sync"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class TipoPedido {
	    ID: number;
	    Guid: number[];
	    // Go type: time
	    CreatedAt: any;
	    // Go type: time
	    UpdatedAt: any;
	    // Go type: gorm
	    DeletedAt: any;
	    Nombre: string;
	    Descripcion: string;
	    Icon: string;
	
	    static createFrom(source: any = {}) {
	        return new TipoPedido(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ID = source["ID"];
	        this.Guid = source["Guid"];
	        this.CreatedAt = this.convertValues(source["CreatedAt"], null);
	        this.UpdatedAt = this.convertValues(source["UpdatedAt"], null);
	        this.DeletedAt = this.convertValues(source["DeletedAt"], null);
	        this.Nombre = source["Nombre"];
	        this.Descripcion = source["Descripcion"];
	        this.Icon = source["Icon"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

