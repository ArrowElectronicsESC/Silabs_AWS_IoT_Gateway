# Work around to build with gcc-8 host toolchain
TARGET_CFLAGS_append = " -Wno-format-overflow "
