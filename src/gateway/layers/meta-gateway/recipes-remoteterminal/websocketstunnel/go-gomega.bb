DESCRIPTION = "onsi/gomegai"
SECTION = "gomega"
HOMEPAGE = "https://golang.org/"

LICENSE = "MIT"
LIC_FILES_CHKSUM = "file://${COMMON_LICENSE_DIR}/MIT;md5=0835ade698e0bcf8506ecda2f7b4f302"

SRC_URI = "git://${GO_IMPORT}"
SRCREV = "95e431e96917c9a2ddad71e82b4771b38bfe83ce"

DEPENDS += "go-net go-yaml go-proto"
GO_IMPORT = "github.com/onsi/gomega"

inherit go pkgconfig
