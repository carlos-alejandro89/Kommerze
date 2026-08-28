package services

import (
	"bytes"
	"strings"
	"testing"
)

func TestFacturacionConfigSecretsEncryptAndDecrypt(t *testing.T) {
	key := bytes.Repeat([]byte{0x2a}, 32)
	for _, test := range []struct {
		field string
		value string
	}{
		{field: "facturacionClientId", value: "client-id-confidencial"},
		{field: "facturacionClientSecret", value: "secret-muy-sensible"},
	} {
		encrypted, err := encryptConfigSecret(test.value, test.field, key)
		if err != nil {
			t.Fatalf("encrypt %s: %v", test.field, err)
		}
		if !strings.HasPrefix(encrypted, encryptedSecretPrefix) {
			t.Fatalf("%s must use the encrypted format", test.field)
		}
		if strings.Contains(encrypted, test.value) {
			t.Fatalf("%s leaked plaintext into ciphertext", test.field)
		}
		decrypted, err := decryptConfigSecret(encrypted, test.field, key)
		if err != nil {
			t.Fatalf("decrypt %s: %v", test.field, err)
		}
		if decrypted != test.value {
			t.Fatalf("%s round trip mismatch: got %q", test.field, decrypted)
		}
	}
}

func TestFacturacionConfigSecretsCannotBeSwapped(t *testing.T) {
	key := bytes.Repeat([]byte{0x3b}, 32)
	encrypted, err := encryptConfigSecret("secret", "facturacionClientSecret", key)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := decryptConfigSecret(encrypted, "facturacionClientId", key); err == nil {
		t.Fatal("authenticated encryption must reject ciphertext assigned to another field")
	}
}
