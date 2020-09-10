DESCRIPTION = "mattn/go-colorable "
SECTION = "go-colorable"
HOMEPAGE = "https://golang.org/"

LICENSE = "MIT"
LIC_FILES_CHKSUM = "file://${COMMON_LICENSE_DIR}/MIT;md5=0835ade698e0bcf8506ecda2f7b4f302"

SRC_URI = "git://${GO_IMPORT}"
SRCREV = "98ec13f34aabf44cc914c65a1cfb7b9bc815aef1"

GO_IMPORT = "github.com/mattn/go-colorable"

DEPENDS += "go-isatty"
inherit go pkgconfig

PTEST_ENABLED = "0"
