DESCRIPTION = "hpcloud/tail "
SECTION = "tail"
HOMEPAGE = "https://golang.org/"

LICENSE = "MIT"
LIC_FILES_CHKSUM = "file://${COMMON_LICENSE_DIR}/MIT;md5=0835ade698e0bcf8506ecda2f7b4f302"

SRC_URI = "git://${GO_IMPORT}"
SRCREV = "a1dbeea552b7c8df4b542c66073e393de198a800"

GO_IMPORT = "github.com/hpcloud/tail"

inherit go pkgconfig
