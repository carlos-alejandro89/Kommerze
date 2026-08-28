package services

import (
	"fmt"
	"sort"
	"time"

	"github.com/shopspring/decimal"
)

const facturacionTimezone = "America/Mexico_City"

const (
	satConceptDecimals  = int32(6)
	satCurrencyDecimals = int32(2)
)

var (
	satHalfUnit6 = decimal.New(5, -7)  // 0.0000005
	satEpsilon12 = decimal.New(1, -12) // 0.000000000001
)

type satLineCalculation struct {
	Quantity     decimal.Decimal
	UnitValue    decimal.Decimal
	Amount       decimal.Decimal
	Discount     decimal.Decimal
	TaxBase      decimal.Decimal
	TaxRate      decimal.Decimal
	TaxAmount    decimal.Decimal
	TotalWithTax decimal.Decimal
	AmountLower  decimal.Decimal
	AmountUpper  decimal.Decimal
	TaxLower     decimal.Decimal
	TaxUpper     decimal.Decimal
}

type satSaleLineInput struct {
	Quantity, GrossUnit, DiscountPercent, TaxRate decimal.Decimal
}

type satInvoiceCalculation struct {
	Lines                        []satLineCalculation
	Subtotal, Discounts, Taxes   decimal.Decimal
	Total, CommercialTargetTotal decimal.Decimal
}

// satNumericBounds implementa las fórmulas de límites del Anexo 20. Los
// operandos se transmiten con seis decimales, por lo que su incertidumbre es
// media unidad del último decimal. El límite inferior se trunca y el superior
// se redondea hacia arriba a los decimales del campo validado.
func satNumericBounds(left, right decimal.Decimal, fieldDecimals int32) (decimal.Decimal, decimal.Decimal) {
	lowerExact := left.Sub(satHalfUnit6).Mul(right.Sub(satHalfUnit6))
	upperExact := left.Add(satHalfUnit6).Sub(satEpsilon12).
		Mul(right.Add(satHalfUnit6).Sub(satEpsilon12))
	return lowerExact.Truncate(fieldDecimals), upperExact.Shift(fieldDecimals).Ceil().Shift(-fieldDecimals)
}

// Para impuestos, TasaOCuota es un valor fijo del catálogo SAT; la tolerancia
// se aplica únicamente a Base, tal como establece la matriz de validaciones.
func satTaxBounds(base, rate decimal.Decimal, fieldDecimals int32) (decimal.Decimal, decimal.Decimal) {
	lowerExact := base.Sub(satHalfUnit6).Mul(rate)
	upperExact := base.Add(satHalfUnit6).Sub(satEpsilon12).Mul(rate)
	return lowerExact.Truncate(fieldDecimals), upperExact.Shift(fieldDecimals).Ceil().Shift(-fieldDecimals)
}

func satInRange(value, lower, upper decimal.Decimal) bool {
	return !value.LessThan(lower) && !value.GreaterThan(upper)
}

// calculateSATLine parte del precio con IVA incluido almacenado en el POS.
// Primero fija los valores de concepto a seis decimales y después calcula
// importe, descuento, base e impuesto usando exactamente esos valores.
func calculateSATLine(quantity, grossUnit, discountPercent, storedTaxRate decimal.Decimal) (satLineCalculation, error) {
	rate, err := normalizeSATTaxRate(storedTaxRate)
	if err != nil {
		return satLineCalculation{}, err
	}
	netUnit := grossUnit.Div(decimal.NewFromInt(1).Add(rate)).Round(satConceptDecimals)
	return calculateSATLineWithNetUnit(quantity, discountPercent, rate, netUnit)
}

func normalizeSATTaxRate(storedTaxRate decimal.Decimal) (decimal.Decimal, error) {
	rate := storedTaxRate
	if rate.GreaterThan(decimal.NewFromInt(1)) {
		rate = rate.Div(decimal.NewFromInt(100))
	}
	rate = rate.Round(satConceptDecimals)
	if rate.IsNegative() {
		return decimal.Zero, fmt.Errorf("la tasa de impuesto no puede ser negativa")
	}
	return rate, nil
}

func calculateSATLineWithNetUnit(quantity, discountPercent, rate, netUnit decimal.Decimal) (satLineCalculation, error) {
	if quantity.LessThanOrEqual(decimal.Zero) {
		return satLineCalculation{}, fmt.Errorf("la cantidad debe ser mayor que cero")
	}
	qty := quantity.Round(satConceptDecimals)
	netUnit = netUnit.Round(satConceptDecimals)
	amount := qty.Mul(netUnit).Round(satConceptDecimals)
	discount := amount.Mul(discountPercent).Div(decimal.NewFromInt(100)).Round(satConceptDecimals)
	return calculateSATLineWithDiscount(qty, rate, netUnit, amount, discount)
}

func calculateSATLineWithDiscount(qty, rate, netUnit, amount, discount decimal.Decimal) (satLineCalculation, error) {
	if discount.IsNegative() || discount.GreaterThan(amount) {
		return satLineCalculation{}, fmt.Errorf("el descuento debe encontrarse entre cero y el importe")
	}
	base := amount.Sub(discount).Round(satConceptDecimals)
	tax := base.Mul(rate).Round(satConceptDecimals)

	amountLower, amountUpper := satNumericBounds(qty, netUnit, satConceptDecimals)
	taxLower, taxUpper := satTaxBounds(base, rate, satConceptDecimals)
	if !satInRange(amount, amountLower, amountUpper) {
		return satLineCalculation{}, fmt.Errorf("importe %s fuera del rango SAT [%s, %s]", amount, amountLower, amountUpper)
	}
	if rate.GreaterThan(decimal.Zero) && !satInRange(tax, taxLower, taxUpper) {
		return satLineCalculation{}, fmt.Errorf("impuesto %s fuera del rango SAT [%s, %s]", tax, taxLower, taxUpper)
	}

	return satLineCalculation{
		Quantity: qty, UnitValue: netUnit, Amount: amount, Discount: discount,
		TaxBase: base, TaxRate: rate, TaxAmount: tax,
		TotalWithTax: base.Add(tax), AmountLower: amountLower, AmountUpper: amountUpper,
		TaxLower: taxLower, TaxUpper: taxUpper,
	}, nil
}

// calculateSATInvoice keeps the fiscal decomposition tied to the amount
// actually charged by the POS. Different valid six-decimal representations of
// the net unit price are evaluated because rounding subtotal and tax
// independently can otherwise create or remove one cent at document level.
func calculateSATInvoice(inputs []satSaleLineInput) (satInvoiceCalculation, error) {
	if len(inputs) == 0 {
		return satInvoiceCalculation{}, fmt.Errorf("la venta no contiene conceptos")
	}
	target := decimal.Zero
	candidates := make([][]satLineCalculation, len(inputs))
	for index, input := range inputs {
		rate, err := normalizeSATTaxRate(input.TaxRate)
		if err != nil {
			return satInvoiceCalculation{}, err
		}
		commercialLine := input.Quantity.Mul(input.GrossUnit).
			Mul(decimal.NewFromInt(1).Sub(input.DiscountPercent.Div(decimal.NewFromInt(100))))
		target = target.Add(commercialLine)

		exactUnit := input.GrossUnit.Div(decimal.NewFromInt(1).Add(rate))
		units := []decimal.Decimal{
			exactUnit.Truncate(satConceptDecimals),
			exactUnit.Round(satConceptDecimals),
			exactUnit.Shift(satConceptDecimals).Ceil().Shift(-satConceptDecimals),
		}
		// A price stored with tax represents an interval when expressed at two
		// currency decimals. Sample that interval at six decimals without
		// changing quantity, discount percentage, tax rate or final line total.
		factor := input.Quantity.
			Mul(decimal.NewFromInt(1).Sub(input.DiscountPercent.Div(decimal.NewFromInt(100)))).
			Mul(decimal.NewFromInt(1).Add(rate))
		commercialRounded := satCurrency(commercialLine)
		if factor.GreaterThan(decimal.Zero) {
			lower := commercialRounded.Sub(decimal.New(5, -3)).Div(factor)
			upper := commercialRounded.Add(decimal.New(5, -3)).Sub(satEpsilon12).Div(factor)
			for sample := int64(0); sample <= 8; sample++ {
				unit := lower.Add(upper.Sub(lower).Mul(decimal.NewFromInt(sample)).Div(decimal.NewFromInt(8))).Round(satConceptDecimals)
				units = append(units, unit)
			}
		}
		seen := map[string]bool{}
		for _, unit := range units {
			key := unit.StringFixed(satConceptDecimals)
			if seen[key] {
				continue
			}
			seen[key] = true
			line, lineErr := calculateSATLineWithNetUnit(input.Quantity, input.DiscountPercent, rate, unit)
			if lineErr != nil {
				return satInvoiceCalculation{}, lineErr
			}
			if !satCurrency(line.TotalWithTax).Equal(commercialRounded) {
				continue
			}
			candidates[index] = append(candidates[index], line)
		}
		if len(candidates[index]) == 0 {
			return satInvoiceCalculation{}, fmt.Errorf("no existe una representación fiscal válida para el concepto %d", index+1)
		}
	}
	target = satCurrency(target)

	// Begin with the nearest representation and improve it one concept at a
	// time. Sorting makes the result deterministic regardless of input order.
	selected := make([]satLineCalculation, len(inputs))
	for index := range candidates {
		selected[index] = candidates[index][0]
	}
	for iteration := 0; iteration < len(inputs)*3; iteration++ {
		current := summarizeSATInvoice(selected, target)
		if current.Total.Equal(target) {
			return current, nil
		}
		type option struct {
			index, candidate int
			distance         decimal.Decimal
			total            decimal.Decimal
		}
		options := make([]option, 0, len(inputs)*3)
		for index := range candidates {
			for candidate := range candidates[index] {
				trial := append([]satLineCalculation(nil), selected...)
				trial[index] = candidates[index][candidate]
				total := summarizeSATInvoice(trial, target).Total
				options = append(options, option{index: index, candidate: candidate, distance: total.Sub(target).Abs(), total: total})
			}
		}
		sort.SliceStable(options, func(i, j int) bool {
			if options[i].distance.Equal(options[j].distance) {
				return options[i].total.LessThan(options[j].total)
			}
			return options[i].distance.LessThan(options[j].distance)
		})
		if len(options) == 0 || !options[0].distance.LessThan(current.Total.Sub(target).Abs()) {
			break
		}
		selected[options[0].index] = candidates[options[0].index][options[0].candidate]
	}
	result := summarizeSATInvoice(selected, target)
	if !result.Total.Equal(target) {
		return satInvoiceCalculation{}, fmt.Errorf("no fue posible conciliar el total fiscal %s con el total de la venta %s", result.Total.StringFixed(2), target.StringFixed(2))
	}
	return result, nil
}

func summarizeSATInvoice(lines []satLineCalculation, target decimal.Decimal) satInvoiceCalculation {
	result := satInvoiceCalculation{Lines: append([]satLineCalculation(nil), lines...), CommercialTargetTotal: target}
	for _, line := range lines {
		result.Subtotal = result.Subtotal.Add(line.Amount)
		result.Discounts = result.Discounts.Add(line.Discount)
		result.Taxes = result.Taxes.Add(line.TaxAmount)
	}
	result.Subtotal = satCurrency(result.Subtotal)
	result.Discounts = satCurrency(result.Discounts)
	result.Taxes = satCurrency(result.Taxes)
	result.Total = result.Subtotal.Sub(result.Discounts).Add(result.Taxes).Round(satCurrencyDecimals)
	return result
}

func satCurrency(value decimal.Decimal) decimal.Decimal {
	return value.Round(satCurrencyDecimals)
}

func satNumber(value decimal.Decimal) float64 {
	return value.InexactFloat64()
}

func fechaFacturacion(fechaVenta time.Time) (string, error) {
	location, err := time.LoadLocation(facturacionTimezone)
	if err != nil {
		return "", fmt.Errorf("no se pudo cargar la zona horaria %s: %w", facturacionTimezone, err)
	}
	return fechaVenta.In(location).Add(-time.Minute).Format(time.RFC3339), nil
}
