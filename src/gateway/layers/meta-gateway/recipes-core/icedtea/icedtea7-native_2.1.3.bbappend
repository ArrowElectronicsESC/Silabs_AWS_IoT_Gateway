# Work around to build with gcc-8 host toolchain
CFLAGS_append = " -Wno-error=format-overflow "
