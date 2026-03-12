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

