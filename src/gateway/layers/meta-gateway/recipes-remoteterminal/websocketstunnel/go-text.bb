DESCRIPTION = "github.com/golang/text"
SECTION = "text"
HOMEPAGE = "https://golang.org/"
inherit go pkgconfig

LICENSE = "MIT"
LIC_FILES_CHKSUM = "file://${COMMON_LICENSE_DIR}/MIT;md5=0835ade698e0bcf8506ecda2f7b4f302"

SRC_URI = "git://github.com/golang/text"
SRCREV = "3d0f7978add91030e5e8976ff65ccdd828286cba"

GO_IMPORT = "golang.org/x/text"
GO_INSTALL = "${GO_IMPORT}/encoding"
GO_SRCROOT = "github.com/user/repository"

RDEPENDS_${PN} += "bash"
RDEPENDS_${PN}-dev += "bash"
