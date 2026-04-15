package requestdto

type ProductoCreate struct {
	MarcaGuid       string         `json:"marcaGuid"`
	LineaGuid       string         `json:"lineaGuid"`
	ProductoSatGuid string         `json:"productoSatGuid"`
	Prefijo         string         `json:"prefijo"`
	Descripcion     string         `json:"descripcion"`
	ObjetoImpuesto  string         `json:"objetoImpuesto"`
	Fraccionable    bool           `json:"fraccionable"`
	NivelesEmpaque  []NivelEmpaque `json:"nivelesEmpaque"`
	Atributos       []Atributo     `json:"atributos"`
}

type NivelEmpaque struct {
	EmpaqueGuid  string `json:"empaqueGuid"`
	Codigo       string
	CodigoBarras string
	Contenido    float64 `json:"contenido"`
	Imagen       string
	Sync         bool `json:"sync"`
}

type Atributo struct {
	Clave string `json:"clave"`
	Valor string `json:"valor"`
}
