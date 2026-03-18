export namespace dto {
	
	export class InventarioDto {
	    Codigo: string;
	    CodigoBarra?: string;
	    CodigoBase?: string;
	    Descripcion: string;
	    Empaque: string;
	    Contenido: number;
	    Fraccionable: boolean;
	    ImgReferencia?: string;
	    NivelID: number;
	    InformacionProducto?: string;
	    Caracteristicas?: string;
	    InstruccionesUso?: string;
	    // Go type: decimal
	    PrecioCompra: any;
	    // Go type: decimal
	    PrecioVenta: any;
	    // Go type: decimal
	    PrecioVenta2: any;
	    // Go type: decimal
	    Descuento: any;
	    // Go type: decimal
	    Existencia: any;
	    // Go type: decimal
	    ExistenciaBase?: any;
	    // Go type: decimal
	    ExistenciaFraccion?: any;
	    Guid: string;
	    GuidBase?: string;
	    ProductoBaseGuid?: string;
	    ProductoGuid: string;
	
	    static createFrom(source: any = {}) {
	        return new InventarioDto(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.Codigo = source["Codigo"];
	        this.CodigoBarra = source["CodigoBarra"];
	        this.CodigoBase = source["CodigoBase"];
	        this.Descripcion = source["Descripcion"];
	        this.Empaque = source["Empaque"];
	        this.Contenido = source["Contenido"];
	        this.Fraccionable = source["Fraccionable"];
	        this.ImgReferencia = source["ImgReferencia"];
	        this.NivelID = source["NivelID"];
	        this.InformacionProducto = source["InformacionProducto"];
	        this.Caracteristicas = source["Caracteristicas"];
	        this.InstruccionesUso = source["InstruccionesUso"];
	        this.PrecioCompra = this.convertValues(source["PrecioCompra"], null);
	        this.PrecioVenta = this.convertValues(source["PrecioVenta"], null);
	        this.PrecioVenta2 = this.convertValues(source["PrecioVenta2"], null);
	        this.Descuento = this.convertValues(source["Descuento"], null);
	        this.Existencia = this.convertValues(source["Existencia"], null);
	        this.ExistenciaBase = this.convertValues(source["ExistenciaBase"], null);
	        this.ExistenciaFraccion = this.convertValues(source["ExistenciaFraccion"], null);
	        this.Guid = source["Guid"];
	        this.GuidBase = source["GuidBase"];
	        this.ProductoBaseGuid = source["ProductoBaseGuid"];
	        this.ProductoGuid = source["ProductoGuid"];
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
	    ProductoBaseGuid: string;
	    ProductoGuid: string;
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
	        this.ProductoBaseGuid = source["ProductoBaseGuid"];
	        this.ProductoGuid = source["ProductoGuid"];
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

