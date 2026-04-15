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
	export class PagosAplicadosDto {
	    ID: number;
	    Nombre: string;
	    // Go type: decimal
	    Monto: any;
	    Referencia: string;
	
	    static createFrom(source: any = {}) {
	        return new PagosAplicadosDto(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ID = source["ID"];
	        this.Nombre = source["Nombre"];
	        this.Monto = this.convertValues(source["Monto"], null);
	        this.Referencia = source["Referencia"];
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
	export class PedidoProductoDto {
	    ID: string;
	    Sku: string;
	    Name: string;
	    // Go type: decimal
	    Price: any;
	    // Go type: decimal
	    Quantity: any;
	    Empaque: string;
	    // Go type: decimal
	    Discount: any;
	    Fraccionable: boolean;
	    ProductoBaseGuid: string;
	    GuidBase: string;
	    Existencia: string;
	    CantidadBase: number;
	
	    static createFrom(source: any = {}) {
	        return new PedidoProductoDto(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ID = source["ID"];
	        this.Sku = source["Sku"];
	        this.Name = source["Name"];
	        this.Price = this.convertValues(source["Price"], null);
	        this.Quantity = this.convertValues(source["Quantity"], null);
	        this.Empaque = source["Empaque"];
	        this.Discount = this.convertValues(source["Discount"], null);
	        this.Fraccionable = source["Fraccionable"];
	        this.ProductoBaseGuid = source["ProductoBaseGuid"];
	        this.GuidBase = source["GuidBase"];
	        this.Existencia = source["Existencia"];
	        this.CantidadBase = source["CantidadBase"];
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
	export class ResponseDto {
	    success: boolean;
	    message: string;
	    data: any;
	    errors: string[];
	
	    static createFrom(source: any = {}) {
	        return new ResponseDto(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.message = source["message"];
	        this.data = source["data"];
	        this.errors = source["errors"];
	    }
	}
	export class SucursalInicioOperacionesDto {
	    Usuario: number;
	    Sucursal: number;
	    FechaInicio: string;
	    ValorInventarioInicial: number;
	    FondoCaja: number;
	
	    static createFrom(source: any = {}) {
	        return new SucursalInicioOperacionesDto(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.Usuario = source["Usuario"];
	        this.Sucursal = source["Sucursal"];
	        this.FechaInicio = source["FechaInicio"];
	        this.ValorInventarioInicial = source["ValorInventarioInicial"];
	        this.FondoCaja = source["FondoCaja"];
	    }
	}

}

export namespace models {
	
	export class Perfil {
	    ID: number;
	    Guid: number[];
	    // Go type: time
	    CreatedAt: any;
	    // Go type: time
	    UpdatedAt: any;
	    // Go type: gorm
	    DeletedAt: any;
	    NombrePerfil: string;
	
	    static createFrom(source: any = {}) {
	        return new Perfil(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ID = source["ID"];
	        this.Guid = source["Guid"];
	        this.CreatedAt = this.convertValues(source["CreatedAt"], null);
	        this.UpdatedAt = this.convertValues(source["UpdatedAt"], null);
	        this.DeletedAt = this.convertValues(source["DeletedAt"], null);
	        this.NombrePerfil = source["NombrePerfil"];
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
	export class Usuario {
	    ID: number;
	    Guid: number[];
	    // Go type: time
	    CreatedAt: any;
	    // Go type: time
	    UpdatedAt: any;
	    // Go type: gorm
	    DeletedAt: any;
	    Nombre: string;
	    CorreoElectronico: string;
	    Password: string;
	    CorreoConfirmado: boolean;
	    Telefono: string;
	    PerfilID: number;
	    Perfil: Perfil;
	
	    static createFrom(source: any = {}) {
	        return new Usuario(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ID = source["ID"];
	        this.Guid = source["Guid"];
	        this.CreatedAt = this.convertValues(source["CreatedAt"], null);
	        this.UpdatedAt = this.convertValues(source["UpdatedAt"], null);
	        this.DeletedAt = this.convertValues(source["DeletedAt"], null);
	        this.Nombre = source["Nombre"];
	        this.CorreoElectronico = source["CorreoElectronico"];
	        this.Password = source["Password"];
	        this.CorreoConfirmado = source["CorreoConfirmado"];
	        this.Telefono = source["Telefono"];
	        this.PerfilID = source["PerfilID"];
	        this.Perfil = this.convertValues(source["Perfil"], Perfil);
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

export namespace requestdto {
	
	export class ActivateLicenseRequest {
	    licenseKey: string;
	    deviceName: string;
	    machineId: string;
	
	    static createFrom(source: any = {}) {
	        return new ActivateLicenseRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.licenseKey = source["licenseKey"];
	        this.deviceName = source["deviceName"];
	        this.machineId = source["machineId"];
	    }
	}
	export class Atributo {
	    clave: string;
	    valor: string;
	
	    static createFrom(source: any = {}) {
	        return new Atributo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.clave = source["clave"];
	        this.valor = source["valor"];
	    }
	}
	export class NivelEmpaque {
	    empaqueGuid: string;
	    Codigo: string;
	    CodigoBarras: string;
	    contenido: number;
	    Imagen: string;
	    sync: boolean;
	
	    static createFrom(source: any = {}) {
	        return new NivelEmpaque(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.empaqueGuid = source["empaqueGuid"];
	        this.Codigo = source["Codigo"];
	        this.CodigoBarras = source["CodigoBarras"];
	        this.contenido = source["contenido"];
	        this.Imagen = source["Imagen"];
	        this.sync = source["sync"];
	    }
	}
	export class ProductoCreate {
	    marcaGuid: string;
	    lineaGuid: string;
	    productoSatGuid: string;
	    prefijo: string;
	    descripcion: string;
	    objetoImpuesto: string;
	    fraccionable: boolean;
	    nivelesEmpaque: NivelEmpaque[];
	    atributos: Atributo[];
	
	    static createFrom(source: any = {}) {
	        return new ProductoCreate(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.marcaGuid = source["marcaGuid"];
	        this.lineaGuid = source["lineaGuid"];
	        this.productoSatGuid = source["productoSatGuid"];
	        this.prefijo = source["prefijo"];
	        this.descripcion = source["descripcion"];
	        this.objetoImpuesto = source["objetoImpuesto"];
	        this.fraccionable = source["fraccionable"];
	        this.nivelesEmpaque = this.convertValues(source["nivelesEmpaque"], NivelEmpaque);
	        this.atributos = this.convertValues(source["atributos"], Atributo);
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

