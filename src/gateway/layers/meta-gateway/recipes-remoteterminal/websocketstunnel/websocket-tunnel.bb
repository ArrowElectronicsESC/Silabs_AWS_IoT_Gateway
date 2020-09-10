DESCRIPTION = "Remote terminal "
SECTION = "wstunnel"
HOMEPAGE = "https://golang.org/"

LICENSE = "MIT"
LIC_FILES_CHKSUM = "file://${COMMON_LICENSE_DIR}/MIT;md5=0835ade698e0bcf8506ecda2f7b4f302"

S = "${WORKDIR}/git"

SRC_URI = "git://${GO_IMPORT} \
	  file://0001-Adding-version.go.patch"

SRCREV = "1c92a380d04c351b203be89ba1f4264c2db1b4fc"

GO_IMPORT = "github.com/rightscale/wstunnel"
GO_INSTALL += "${GO_IMPORT}/tunnel"
GO_INSTALL += "${GO_IMPORT}/whois"
GO_INSTALL += "github.com/rightscale/wstunnel"

inherit go pkgconfig

DEPENDS += "go-gorilla-websocket go-log15 go-ginkgo go-gomega"

do_patch() {
	cd ${WORKDIR}/git/src/github.com/rightscale/wstunnel
	patch -p1 < ${WORKDIR}/0001-Adding-version.go.patch
	cd -
}

PTEST_ENABLED = "0"
