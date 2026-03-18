CREATE TABLE perfiles (
    id SERIAL PRIMARY KEY,
    perfil VARCHAR(255) NOT NULL,
    guid UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);
CREATE UNIQUE INDEX idx_perfiles_guid ON perfiles(guid);
CREATE INDEX idx_perfiles_deleted_at ON perfiles(deleted_at);
