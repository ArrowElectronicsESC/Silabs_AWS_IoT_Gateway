DESCRIPTION = "inconshreveable log15 "
SECTION = "log15"
HOMEPAGE = "https://golang.org/"

LICENSE = "MIT"
LIC_FILES_CHKSUM = "file://${COMMON_LICENSE_DIR}/MIT;md5=0835ade698e0bcf8506ecda2f7b4f302"

SRC_URI = "git://github.com/inconshreveable/log15"
SRCREV = "67afb5ed74ec82fd7ac8f49d27c509ac6f991970"

#GO_IMPORT = "github.com/inconshreveable/log15"
GO_IMPORT = "gopkg.in/inconshreveable/log15.v2"
GO_INSTALL = "gopkg.in/inconshreveable/log15.v2"

DEPENDS = "go-colorable go-stack"
inherit go pkgconfig

PTEST_ENABLED = "0"
