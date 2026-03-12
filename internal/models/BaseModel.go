package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type BaseModel struct {
	ID        uint           `gorm:"primaryKey"`
	Guid      uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();uniqueIndex"`
	CreatedAt time.Time      `gorm:"type:timestamp;not null;default:now()"`
	UpdatedAt time.Time      `gorm:"type:timestamp;not null;default:now()"`
	DeletedAt gorm.DeletedAt `gorm:"index"`
}

func (b *BaseModel) BeforeCreate(tx *gorm.DB) error {
	if b.Guid == uuid.Nil {
		b.Guid = uuid.New()
	}
	return nil
}