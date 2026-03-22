package dto

type ResponseDto struct {
	Success bool     `json:"success"`
	Message string   `json:"message"`
	Data    any      `json:"data"`
	Errors  []string `json:"errors"`
}

func NewResponseDto(success bool, message string, data any, errors []string) *ResponseDto {
	return &ResponseDto{
		Success: success,
		Message: message,
		Data:    data,
		Errors:  errors,
	}
}
