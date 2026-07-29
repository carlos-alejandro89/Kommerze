export namespace dto {
	
	export class AbrirCajaDto {
	    OperacionSucursalID: number;
	    ResponsableCajaID: number;
	    CajaNombre: string;
	    FondoCajaApertura: number;
	
	    static createFrom(source: any = {}) {
	        return new AbrirCajaDto(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.OperacionSucursalID = source["OperacionSucursalID"];
	        this.ResponsableCajaID = source["ResponsableCajaID"];
	        this.CajaNombre = source["CajaNombre"];
	        this.FondoCajaApertura = source["FondoCajaApertura"];
	    }
	}
	export class CerrarCajaDto {
	    OperacionCajeroID: number;
	    FondoCajaCierre: number;
	    RetirosEfectivo: number;
	    IngresoEfectivo: number;
	    IngresoTarjetas: number;
	    IngresoCheques: number;
	    IngresoTransferencia: number;
	    IngresoOtros: number;
	    Bloqueada: boolean;
	
	    static createFrom(source: any = {}) {
	        return new CerrarCajaDto(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.OperacionCajeroID = source["OperacionCajeroID"];
	        this.FondoCajaCierre = source["FondoCajaCierre"];
	        this.RetirosEfectivo = source["RetirosEfectivo"];
	        this.IngresoEfectivo = source["IngresoEfectivo"];
	        this.IngresoTarjetas = source["IngresoTarjetas"];
	        this.IngresoCheques = source["IngresoCheques"];
	        this.IngresoTransferencia = source["IngresoTransferencia"];
	        this.IngresoOtros = source["IngresoOtros"];
	        this.Bloqueada = source["Bloqueada"];
	    }
	}
	export class CerrarOperacionSucursalDto {
	    OperacionID: number;
	    UsuarioCierreID: number;
	    // Go type: decimal
	    ValorFinalInventario: any;
	    // Go type: decimal
	    ValorVentas: any;
	    // Go type: decimal
	    DescuentosAplicados: any;
	    // Go type: decimal
	    AjusteInventario: any;
	    // Go type: decimal
	    IngresoEfectivo: any;
	    // Go type: decimal
	    IngresoTarjetas: any;
	    // Go type: decimal
	    IngresoCheques: any;
	    // Go type: decimal
	    IngresoTransferencia: any;
	    // Go type: decimal
	    IngresoOtros: any;
	    // Go type: decimal
	    Creditos: any;
	    // Go type: decimal
	    ValesSalida: any;
	    // Go type: decimal
	    ValesEntrantes: any;
	    CFDIEfectivo: number;
	    CFDITarjetas: number;
	    CFDICheques: number;
	    CFDITransferencia: number;
	    CFDIOtros: number;
	    // Go type: decimal
	    BajasMercancia: any;
	
	    static createFrom(source: any = {}) {
	        return new CerrarOperacionSucursalDto(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.OperacionID = source["OperacionID"];
	        this.UsuarioCierreID = source["UsuarioCierreID"];
	        this.ValorFinalInventario = this.convertValues(source["ValorFinalInventario"], null);
	        this.ValorVentas = this.convertValues(source["ValorVentas"], null);
	        this.DescuentosAplicados = this.convertValues(source["DescuentosAplicados"], null);
	        this.AjusteInventario = this.convertValues(source["AjusteInventario"], null);
	        this.IngresoEfectivo = this.convertValues(source["IngresoEfectivo"], null);
	        this.IngresoTarjetas = this.convertValues(source["IngresoTarjetas"], null);
	        this.IngresoCheques = this.convertValues(source["IngresoCheques"], null);
	        this.IngresoTransferencia = this.convertValues(source["IngresoTransferencia"], null);
	        this.IngresoOtros = this.convertValues(source["IngresoOtros"], null);
	        this.Creditos = this.convertValues(source["Creditos"], null);
	        this.ValesSalida = this.convertValues(source["ValesSalida"], null);
	        this.ValesEntrantes = this.convertValues(source["ValesEntrantes"], null);
	        this.CFDIEfectivo = source["CFDIEfectivo"];
	        this.CFDITarjetas = source["CFDITarjetas"];
	        this.CFDICheques = source["CFDICheques"];
	        this.CFDITransferencia = source["CFDITransferencia"];
	        this.CFDIOtros = source["CFDIOtros"];
	        this.BajasMercancia = this.convertValues(source["BajasMercancia"], null);
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
	export class ClienteDto {
	    ID: number;
	    Guid: string;
	    RazonSocial: string;
	    RFC: string;
	    Correo: string;
	    Telefono: string;
	    CreditoMaximo: number;
	    DiasCredito: number;
	
	    static createFrom(source: any = {}) {
	        return new ClienteDto(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ID = source["ID"];
	        this.Guid = source["Guid"];
	        this.RazonSocial = source["RazonSocial"];
	        this.RFC = source["RFC"];
	        this.Correo = source["Correo"];
	        this.Telefono = source["Telefono"];
	        this.CreditoMaximo = source["CreditoMaximo"];
	        this.DiasCredito = source["DiasCredito"];
	    }
	}
	export class CotizacionItemDto {
	    nivelGuid: string;
	    nivelCodigo: string;
	    producto: string;
	    cantidad: number;
	    precioVenta: number;
	    descuento: number;
	    subtotal: number;
	
	    static createFrom(source: any = {}) {
	        return new CotizacionItemDto(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.nivelGuid = source["nivelGuid"];
	        this.nivelCodigo = source["nivelCodigo"];
	        this.producto = source["producto"];
	        this.cantidad = source["cantidad"];
	        this.precioVenta = source["precioVenta"];
	        this.descuento = source["descuento"];
	        this.subtotal = source["subtotal"];
	    }
	}
	export class ItemDescuentoDto {
	    nivelGuid: string;
	    cantidad: number;
	    precioVenta: number;
	    descuentoSolicitado: number;
	    descuentoAutorizado: number;
	
	    static createFrom(source: any = {}) {
	        return new ItemDescuentoDto(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.nivelGuid = source["nivelGuid"];
	        this.cantidad = source["cantidad"];
	        this.precioVenta = source["precioVenta"];
	        this.descuentoSolicitado = source["descuentoSolicitado"];
	        this.descuentoAutorizado = source["descuentoAutorizado"];
	    }
	}
	export class CotizacionDetalleDto {
	    ID: number;
	    PedidoGuid: string;
	    Folio: number;
	    Fecha: string;
	    RazonSocial: string;
	    EstatusAutorizacion: string;
	    DescuentosSolicitados: ItemDescuentoDto[];
	    DescuentosAutorizados: ItemDescuentoDto[];
	    AutorizadoPor: string;
	    ObsAutorizacion: string;
	    Items: CotizacionItemDto[];
	    Subtotal: number;
	    TotalDescuento: number;
	    Total: number;
	
	    static createFrom(source: any = {}) {
	        return new CotizacionDetalleDto(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ID = source["ID"];
	        this.PedidoGuid = source["PedidoGuid"];
	        this.Folio = source["Folio"];
	        this.Fecha = source["Fecha"];
	        this.RazonSocial = source["RazonSocial"];
	        this.EstatusAutorizacion = source["EstatusAutorizacion"];
	        this.DescuentosSolicitados = this.convertValues(source["DescuentosSolicitados"], ItemDescuentoDto);
	        this.DescuentosAutorizados = this.convertValues(source["DescuentosAutorizados"], ItemDescuentoDto);
	        this.AutorizadoPor = source["AutorizadoPor"];
	        this.ObsAutorizacion = source["ObsAutorizacion"];
	        this.Items = this.convertValues(source["Items"], CotizacionItemDto);
	        this.Subtotal = source["Subtotal"];
	        this.TotalDescuento = source["TotalDescuento"];
	        this.Total = source["Total"];
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
	    // Go type: decimal
	    Existencia: any;
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
	        this.Existencia = this.convertValues(source["Existencia"], null);
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
	    Linea: string;
	    Marca: string;
	
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
	        this.Linea = source["Linea"];
	        this.Marca = source["Marca"];
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
	export class TipoAutorizacionDto {
	    ID: number;
	    Guid: string;
	    Descripcion: string;
	
	    static createFrom(source: any = {}) {
	        return new TipoAutorizacionDto(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ID = source["ID"];
	        this.Guid = source["Guid"];
	        this.Descripcion = source["Descripcion"];
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

export namespace services {
	
	export class CloudCredentials {
	    email: string;
	    password: string;
	
	    static createFrom(source: any = {}) {
	        return new CloudCredentials(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.email = source["email"];
	        this.password = source["password"];
	    }
	}
	export class ReceiptLegendGroup {
	    text: string;
	    bold: boolean;
	
	    static createFrom(source: any = {}) {
	        return new ReceiptLegendGroup(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.text = source["text"];
	        this.bold = source["bold"];
	    }
	}
	export class ReceiptConfig {
	    businessName?: string;
	    legendGroups?: ReceiptLegendGroup[];
	    legends?: string[];
	    printerAddress?: string;
	    printerPaperWidthMm?: number;
	    printerPaperCut?: boolean;
	    printerOpenDrawer?: boolean;
	    smtpHost?: string;
	    smtpPort?: string;
	    smtpUser?: string;
	    smtpPassword?: string;
	    smtpFrom?: string;
	
	    static createFrom(source: any = {}) {
	        return new ReceiptConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.businessName = source["businessName"];
	        this.legendGroups = this.convertValues(source["legendGroups"], ReceiptLegendGroup);
	        this.legends = source["legends"];
	        this.printerAddress = source["printerAddress"];
	        this.printerPaperWidthMm = source["printerPaperWidthMm"];
	        this.printerPaperCut = source["printerPaperCut"];
	        this.printerOpenDrawer = source["printerOpenDrawer"];
	        this.smtpHost = source["smtpHost"];
	        this.smtpPort = source["smtpPort"];
	        this.smtpUser = source["smtpUser"];
	        this.smtpPassword = source["smtpPassword"];
	        this.smtpFrom = source["smtpFrom"];
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
	export class LicenciaInfo {
	    guid: string;
	    licenciaKey: string;
	    machineId: string;
	    fechaExpiracion: string;
	
	    static createFrom(source: any = {}) {
	        return new LicenciaInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.guid = source["guid"];
	        this.licenciaKey = source["licenciaKey"];
	        this.machineId = source["machineId"];
	        this.fechaExpiracion = source["fechaExpiracion"];
	    }
	}
	export class SucursalInfo {
	    guid: string;
	    nombreSucursal: string;
	    licencia: LicenciaInfo;
	
	    static createFrom(source: any = {}) {
	        return new SucursalInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.guid = source["guid"];
	        this.nombreSucursal = source["nombreSucursal"];
	        this.licencia = this.convertValues(source["licencia"], LicenciaInfo);
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
	export class LicenseData {
	    sucursal: SucursalInfo;
	    signature: string;
	
	    static createFrom(source: any = {}) {
	        return new LicenseData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.sucursal = this.convertValues(source["sucursal"], SucursalInfo);
	        this.signature = source["signature"];
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
	export class KommerzConfig {
	    role: string;
	    localServerUrl?: string;
	    cloudEmail?: string;
	    cloudPassword?: string;
	    netPayUser?: string;
	    netPayPassword?: string;
	    netPayStoreId?: string;
	    netPayDeviceSerial?: string;
	    license?: LicenseData;
	    dbHost?: string;
	    dbPort?: string;
	    dbUser?: string;
	    dbPassword?: string;
	    dbName?: string;
	    dbSslMode?: string;
	    timeZone?: string;
	    receipt?: ReceiptConfig;
	
	    static createFrom(source: any = {}) {
	        return new KommerzConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.role = source["role"];
	        this.localServerUrl = source["localServerUrl"];
	        this.cloudEmail = source["cloudEmail"];
	        this.cloudPassword = source["cloudPassword"];
	        this.netPayUser = source["netPayUser"];
	        this.netPayPassword = source["netPayPassword"];
	        this.netPayStoreId = source["netPayStoreId"];
	        this.netPayDeviceSerial = source["netPayDeviceSerial"];
	        this.license = this.convertValues(source["license"], LicenseData);
	        this.dbHost = source["dbHost"];
	        this.dbPort = source["dbPort"];
	        this.dbUser = source["dbUser"];
	        this.dbPassword = source["dbPassword"];
	        this.dbName = source["dbName"];
	        this.dbSslMode = source["dbSslMode"];
	        this.timeZone = source["timeZone"];
	        this.receipt = this.convertValues(source["receipt"], ReceiptConfig);
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
	
	
	export class NetPaySaleRequest {
	    serialNumber: string;
	    amount: string;
	    storeId: string;
	    folioNumber: string;
	    msi: string;
	    traceability: Record<string, string>;
	
	    static createFrom(source: any = {}) {
	        return new NetPaySaleRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.serialNumber = source["serialNumber"];
	        this.amount = source["amount"];
	        this.storeId = source["storeId"];
	        this.folioNumber = source["folioNumber"];
	        this.msi = source["msi"];
	        this.traceability = source["traceability"];
	    }
	}
	
	

}

