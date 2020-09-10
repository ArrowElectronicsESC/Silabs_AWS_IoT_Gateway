DESCRIPTION = "golang/net"
SECTION = "net"
HOMEPAGE = "https://golang.org/"

LICENSE = "MIT"
LIC_FILES_CHKSUM = "file://${COMMON_LICENSE_DIR}/MIT;md5=0835ade698e0bcf8506ecda2f7b4f302"

SRC_URI = "git://github.com/golang/net"
SRCREV = "fe3aa8a4527195a6057b3fad46619d7d090e99b5"

GO_IMPORT = "golang.org/x/net"
GO_INSTALL = "${GO_IMPORT}/html/charset"

DEPENDS += "go-text"
RDEPENDS_${PN} += "bash"
RDEPENDS_${PN}-dev += "bash"

inherit go pkgconfig
PTEST_ENABLED = "0"
