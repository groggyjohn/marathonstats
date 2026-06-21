#!/usr/bin/bash

# source this file directly, or in mise, on directory entry

# For removing matplotlib / qt6 / wayland plot warning in Chromebook
# Debian
if [[ "$(lsb_release -i 2>/dev/null)" == *"Debian"* ]]; then
  export QT_QPA_PLATFORM=xcb
fi
export PYTHONPATH=$(pwd)/jupyter
