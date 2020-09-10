DESCRIPTION = "golang/sys "
SECTION = "sys"
HOMEPAGE = "https://golang.org/"

LICENSE = "MIT"
LIC_FILES_CHKSUM = "file://${COMMON_LICENSE_DIR}/MIT;md5=0835ade698e0bcf8506ecda2f7b4f302"

SRC_URI = "git://github.com/golang/sys"
SRCREV = "b09406accb4736d857a32bf9444cd7edae2ffa79"

GO_IMPORT = "golang.org/x/sys"

RDEPENDS_${PN} += "bash"
RDEPENDS_${PN}-dev += "bash"

inherit go pkgconfig
