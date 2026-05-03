#!/bin/bash
LD_PRELOAD=/usr/lib/x86_64-linux-gnu/libpthread.so.0 \
LD_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu \
wails dev -tags webkit2_41