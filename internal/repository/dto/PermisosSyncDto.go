package dto

type PermisosSyncDto struct {
	RolGuid     string                  `json:"rolGuid"`
	Rol         string                  `json:"rol"`
	Descripcion string                  `json:"descripcion"`
	Activo      bool                    `json:"activo"`
	Modulos     []ModuloPermisosSyncDto `json:"modulos"`
}

type ModuloPermisosSyncDto struct {
	Guid              string              `json:"guid"`
	Clave             string              `json:"clave"`
	Nombre            string              `json:"nombre"`
	Descripcion       string              `json:"descripcion"`
	Orden             int                 `json:"orden"`
	PermitidoCompleto bool                `json:"permitidoCompleto"`
	Permisos          []PermisoRolSyncDto `json:"permisos"`
}

type PermisoRolSyncDto struct {
	Guid        string `json:"guid"`
	Clave       string `json:"clave"`
	Nombre      string `json:"nombre"`
	Descripcion string `json:"descripcion"`
	Orden       int    `json:"orden"`
	Permitido   bool   `json:"permitido"`
}
