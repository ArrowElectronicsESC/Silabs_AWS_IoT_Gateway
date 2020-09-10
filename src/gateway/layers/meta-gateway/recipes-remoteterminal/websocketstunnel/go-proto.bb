DESCRIPTION = "golang/protobuf"
SECTION = "protobuf"
HOMEPAGE = "https://golang.org/"

LICENSE = "MIT"
LIC_FILES_CHKSUM = "file://${COMMON_LICENSE_DIR}/MIT;md5=0835ade698e0bcf8506ecda2f7b4f302"

SRC_URI = "git://github.com/golang/protobuf"
SRCREV = "ed6926b37a637426117ccab59282c3839528a700"

GO_IMPORT = "github.com/golang/protobuf"
GO_INSTALL = "${GO_IMPORT}/proto"

RDEPENDS_${PN} += "bash"
RDEPENDS_${PN}-dev += "bash"

inherit go pkgconfig
