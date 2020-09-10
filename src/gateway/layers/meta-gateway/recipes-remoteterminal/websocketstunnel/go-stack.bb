DESCRIPTION = "go-stack/stack "
SECTION = "stack"
HOMEPAGE = "https://golang.org/"

LICENSE = "MIT"
LIC_FILES_CHKSUM = "file://${COMMON_LICENSE_DIR}/MIT;md5=0835ade698e0bcf8506ecda2f7b4f302"

SRC_URI = "git://${GO_IMPORT}"
SRCREV = "2fee6af1a9795aafbe0253a0cfbdf668e1fb8a9a"

GO_IMPORT = "github.com/go-stack/stack"

inherit go pkgconfig
