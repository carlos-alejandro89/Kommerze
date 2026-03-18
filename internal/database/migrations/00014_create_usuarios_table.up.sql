CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    correo_electronico VARCHAR(150),
    password VARCHAR(255) NOT NULL,
    correo_confirmado BOOLEAN DEFAULT FALSE,
    telefono VARCHAR(255),
    perfil_id INT NOT NULL,
    guid UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    CONSTRAINT fk_usuarios_perfil FOREIGN KEY (perfil_id) REFERENCES perfiles(id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX idx_usuarios_guid ON usuarios(guid);
CREATE UNIQUE INDEX idx_usuarios_correo_electronico ON usuarios(correo_electronico);
CREATE INDEX idx_usuarios_deleted_at ON usuarios(deleted_at);
