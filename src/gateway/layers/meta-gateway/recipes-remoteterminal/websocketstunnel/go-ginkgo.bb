DESCRIPTION = "onsi/ginkgo "
SECTION = "ginkgo"
HOMEPAGE = "https://golang.org/"

LICENSE = "MIT"
LIC_FILES_CHKSUM = "file://${COMMON_LICENSE_DIR}/MIT;md5=0835ade698e0bcf8506ecda2f7b4f302"

SRC_URI = "git://${GO_IMPORT}"
SRCREV = "d90e0dcda42f29d3e7ab0bb5d52451df252bf709"

DEPENDS += "go-tail"
GO_IMPORT = "github.com/onsi/ginkgo"

inherit go pkgconfig
