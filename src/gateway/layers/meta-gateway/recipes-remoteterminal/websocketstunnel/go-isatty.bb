DESCRIPTION = " mattn/go-isatty "
SECTION = "go-isatty"
HOMEPAGE = "https://golang.org/"

LICENSE = "MIT"
LIC_FILES_CHKSUM = "file://${COMMON_LICENSE_DIR}/MIT;md5=0835ade698e0bcf8506ecda2f7b4f302"

SRC_URI = "git://${GO_IMPORT}"
SRCREV = "0e9ddb7c0c0aef74fa25eaba4141e6b5ab7aca2a"

GO_IMPORT = "github.com/mattn/go-isatty"

DEPENDS += "go-sys"

inherit go pkgconfig

PTEST_ENABLED = "0"
