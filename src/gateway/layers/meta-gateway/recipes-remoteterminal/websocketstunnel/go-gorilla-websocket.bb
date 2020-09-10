DESCRIPTION = "gorilla websocket "
SECTION = "websocket"
HOMEPAGE = "https://golang.org/"

LICENSE = "MIT"
LIC_FILES_CHKSUM = "file://${COMMON_LICENSE_DIR}/MIT;md5=0835ade698e0bcf8506ecda2f7b4f302"

SRC_URI = "git://${GO_IMPORT}"
SRCREV = "c3e18be99d19e6b3e8f1559eea2c161a665c4b6b"

GO_IMPORT = "github.com/gorilla/websocket"

inherit go pkgconfig
