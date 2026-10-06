package models

// DefinicionModuloPermiso describe el catalogo funcional compartido con Cloud.
// No es una entidad persistente; se utiliza para sembrar, sincronizar o mostrar
// la matriz de permisos manteniendo claves estables entre aplicaciones.
type DefinicionModuloPermiso struct {
	Clave       string                     `json:"clave"`
	Nombre      string                     `json:"nombre"`
	Descripcion string                     `json:"descripcion"`
	Orden       int                        `json:"orden"`
	Permisos    []DefinicionPermisoSistema `json:"permisos"`
}

type DefinicionPermisoSistema struct {
	Clave       string `json:"clave"`
	Nombre      string `json:"nombre"`
	Descripcion string `json:"descripcion,omitempty"`
	Orden       int    `json:"orden"`
}

// CatalogoPermisosSistema devuelve una copia nueva del mapa de capacidades de
// la aplicacion. Filtros, paginacion y navegacion no se consideran permisos;
// solo se incluyen accesos a modulos y acciones de negocio.
func CatalogoPermisosSistema() []DefinicionModuloPermiso {
	return []DefinicionModuloPermiso{
		modulo("ventas", "Ventas", "Registro y operacion de ventas.", 10,
			permiso("ventas.acceder", "Acceder a ventas"),
			permiso("ventas.crear", "Crear venta"),
			permiso("ventas.crear_cotizacion", "Crear cotizacion"),
			permiso("ventas.seleccionar_cliente", "Asignar cliente"),
			permiso("ventas.modificar_precio", "Modificar precio"),
			permiso("ventas.aplicar_descuento", "Aplicar descuento"),
			permiso("ventas.solicitar_descuento", "Solicitar autorizacion de descuento"),
			permiso("ventas.cobrar", "Registrar cobro"),
			permiso("ventas.vender_credito", "Registrar venta a credito"),
			permiso("ventas.imprimir_ticket", "Imprimir ticket"),
			permiso("ventas.enviar_comprobante", "Enviar comprobante"),
			permiso("ventas.facturar", "Facturar venta"),
		),
		modulo("historial_ventas", "Historial de ventas", "Consulta y gestion de ventas y cotizaciones.", 20,
			permiso("historial_ventas.acceder", "Consultar historial"),
			permiso("historial_ventas.ver_detalle", "Ver detalle"),
			permiso("historial_ventas.ver_documento", "Ver documento"),
			permiso("historial_ventas.imprimir", "Imprimir o reimprimir"),
			permiso("historial_ventas.enviar_comprobante", "Enviar comprobante"),
			permiso("historial_ventas.facturar", "Facturar venta"),
			permiso("historial_ventas.ver_factura", "Ver factura"),
			permiso("historial_ventas.ver_acuse", "Ver acuse de cancelacion"),
			permiso("historial_ventas.cancelar", "Cancelar venta"),
		),
		modulo("facturacion", "Facturacion", "Emision y administracion de CFDI.", 30,
			permiso("facturacion.acceder", "Acceder a facturacion"),
			permiso("facturacion.emitir", "Emitir CFDI"),
			permiso("facturacion.ver_pdf", "Ver PDF"),
			permiso("facturacion.ver_xml", "Ver XML"),
			permiso("facturacion.enviar", "Enviar factura"),
			permiso("facturacion.cancelar", "Cancelar CFDI y venta"),
		),
		modulo("clientes", "Clientes", "Gestion de clientes, entidades fiscales y credito.", 40,
			permiso("clientes.acceder", "Consultar clientes"),
			permiso("clientes.ver_detalle", "Ver detalle"),
			permiso("clientes.crear", "Crear cliente"),
			permiso("clientes.editar", "Editar cliente"),
			permiso("clientes.gestionar_entidades_fiscales", "Gestionar entidades fiscales"),
			permiso("clientes.consultar_credito", "Consultar credito"),
			permiso("clientes.modificar_credito", "Modificar credito"),
			permiso("clientes.ver_movimientos_credito", "Ver movimientos de credito"),
		),
		modulo("productos", "Productos", "Catalogo de productos, existencias y solicitudes.", 50,
			permiso("productos.acceder", "Consultar productos"),
			permiso("productos.ver_detalle", "Ver detalle"),
			permiso("productos.crear", "Crear producto"),
			permiso("productos.editar", "Editar producto"),
			permiso("productos.modificar_precio", "Modificar precio"),
			permiso("productos.consultar_existencias", "Consultar existencias"),
			permiso("productos.modificar_existencia", "Modificar existencia"),
			permiso("productos.gestionar_empaques", "Gestionar empaques"),
			permiso("productos.crear_solicitud", "Crear solicitud de productos"),
			permiso("productos.consultar_solicitudes", "Consultar solicitudes"),
		),
		modulo("compras", "Compras", "Registro y gestion de compras.", 60,
			permiso("compras.acceder", "Consultar compras"),
			permiso("compras.crear", "Crear compra"),
			permiso("compras.capturar_manual", "Capturar compra manual"),
			permiso("compras.importar_xml", "Importar compra desde XML"),
			permiso("compras.ver_detalle", "Ver detalle"),
			permiso("compras.ver_reporte", "Ver reporte"),
			permiso("compras.cancelar", "Cancelar compra"),
		),
		modulo("transferencias", "Transferencias", "Transferencias de productos entre sucursales.", 70,
			permiso("transferencias.acceder", "Consultar transferencias"),
			permiso("transferencias.crear", "Crear transferencia"),
			permiso("transferencias.ver_detalle", "Ver detalle"),
			permiso("transferencias.ver_documento", "Ver documento"),
			permiso("transferencias.aceptar", "Aceptar transferencia"),
			permiso("transferencias.rechazar", "Rechazar transferencia"),
			permiso("transferencias.cancelar", "Cancelar transferencia"),
		),
		modulo("conversiones", "Conversiones", "Transformacion entre presentaciones de producto.", 80,
			permiso("conversiones.acceder", "Consultar conversiones"),
			permiso("conversiones.crear", "Crear conversion"),
			permiso("conversiones.ver_detalle", "Ver detalle"),
			permiso("conversiones.imprimir", "Imprimir reporte"),
			permiso("conversiones.cancelar", "Cancelar conversion"),
		),
		modulo("auditorias", "Auditorias", "Auditorias y conciliacion de inventario.", 90,
			permiso("auditorias.acceder", "Consultar auditorias"),
			permiso("auditorias.crear", "Crear auditoria"),
			permiso("auditorias.iniciar", "Iniciar auditoria"),
			permiso("auditorias.capturar_conteo", "Capturar conteo"),
			permiso("auditorias.pausar", "Pausar conteo"),
			permiso("auditorias.conciliar", "Finalizar y conciliar"),
			permiso("auditorias.autorizar", "Autorizar y cerrar auditoria"),
		),
		modulo("cajas", "Cajas", "Apertura, cierre y movimientos de caja.", 100,
			permiso("cajas.acceder", "Consultar cajas y turnos"),
			permiso("cajas.abrir", "Abrir caja"),
			permiso("cajas.cerrar", "Cerrar caja"),
			permiso("cajas.ver_reporte_cierre", "Ver reporte de cierre"),
		),
		modulo("proveedores", "Proveedores", "Gestion de proveedores.", 110,
			permiso("proveedores.acceder", "Consultar proveedores"),
			permiso("proveedores.ver_detalle", "Ver detalle"),
			permiso("proveedores.crear", "Crear proveedor"),
			permiso("proveedores.editar", "Editar proveedor"),
		),
		modulo("operacion_sucursal", "Operacion de sucursal", "Inicio, seguimiento y cierre de operaciones.", 120,
			permiso("operacion_sucursal.acceder", "Consultar operacion"),
			permiso("operacion_sucursal.ver_financiero", "Consultar resumen financiero"),
			permiso("operacion_sucursal.ver_jornada", "Consultar jornada"),
			permiso("operacion_sucursal.ver_turnos", "Consultar turnos"),
			permiso("operacion_sucursal.iniciar", "Iniciar jornada"),
			permiso("operacion_sucursal.cerrar", "Cerrar jornada"),
			permiso("operacion_sucursal.abrir_reportes", "Abrir reportes de cierre"),
		),
		modulo("reportes", "Reportes", "Reportes y analisis del negocio.", 130,
			permiso("reportes.acceder", "Consultar reportes"),
		),
		modulo("configuracion", "Configuracion", "Parametros, sincronizacion e importacion de datos.", 140,
			permiso("configuracion.acceder", "Acceder a configuracion"),
			permiso("configuracion.editar_empresa", "Editar empresa"),
			permiso("configuracion.editar_sucursal", "Editar sucursal"),
			permiso("configuracion.editar_dispositivo", "Editar dispositivo"),
			permiso("configuracion.editar_ticket", "Configurar ticket"),
			permiso("configuracion.editar_facturacion", "Configurar facturacion"),
			permiso("configuracion.editar_correo", "Configurar correo"),
			permiso("configuracion.editar_terminal_cobro", "Configurar terminal de cobro"),
			permiso("configuracion.sincronizar", "Sincronizar con Cloud"),
			permiso("configuracion.importar_inventario", "Importar inventario"),
		),
	}
}

func modulo(clave, nombre, descripcion string, orden int, permisos ...DefinicionPermisoSistema) DefinicionModuloPermiso {
	for i := range permisos {
		permisos[i].Orden = (i + 1) * 10
	}
	return DefinicionModuloPermiso{
		Clave:       clave,
		Nombre:      nombre,
		Descripcion: descripcion,
		Orden:       orden,
		Permisos:    permisos,
	}
}

func permiso(clave, nombre string) DefinicionPermisoSistema {
	return DefinicionPermisoSistema{Clave: clave, Nombre: nombre}
}
