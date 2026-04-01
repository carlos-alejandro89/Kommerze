package requestdto

type ActivateLicenseRequest struct {
	LicenseKey  string `json:"licenseKey"`
	DeviceName  string `json:"deviceName"`
	MachineId   string `json:"machineId"`
}
