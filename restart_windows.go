//go:build windows

package main

import (
	"os/exec"
	"syscall"
)

// setSysProcAttr desacopla el proceso hijo en Windows.
// CREATE_NEW_PROCESS_GROUP evita que el hijo reciba señales del padre,
// y HideWindow evita que aparezca una ventana de consola extra.
func setSysProcAttr(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{
		CreationFlags: syscall.CREATE_NEW_PROCESS_GROUP,
		HideWindow:    true,
	}
}
