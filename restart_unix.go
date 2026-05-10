//go:build !windows

package main

import (
	"os/exec"
	"syscall"
)

// setSysProcAttr desacopla el proceso hijo en sistemas Unix (Linux/macOS).
// Setsid crea una nueva sesión para que el hijo no sea terminado
// cuando el proceso padre cierra.
func setSysProcAttr(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{
		Setsid: true,
	}
}
