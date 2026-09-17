package renders

import "strings"

const receiptAutoFacturaConditions = "Realice su solicitud el mismo día de compra. Al finalizar el día, los tickets no facturados se integran a la factura global y no podrán facturarse de forma individual."

const receiptAutoFacturaFontSize = 6.5
const receiptAutoFacturaLineHeight = 3.2

func receiptAutoFacturaIntro(url string) string {
	if strings.TrimSpace(url) != "" {
		return "Solicite su factura en:"
	}
	return "Solicite su factura."
}
