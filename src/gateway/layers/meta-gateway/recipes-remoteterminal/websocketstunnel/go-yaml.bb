DESCRIPTION = "go-yaml/yaml"
SECTION = "yaml"
HOMEPAGE = "https://golang.org/"

LICENSE = "MIT"
LIC_FILES_CHKSUM = "file://${COMMON_LICENSE_DIR}/MIT;md5=0835ade698e0bcf8506ecda2f7b4f302"

SRC_URI = "git://github.com/go-yaml/yaml;branch=v2"
SRCREV = "970885f01c8bc1fecb7ab1c8ce8e7609bda45530"

GO_IMPORT = "gopkg.in/yaml.v2"

inherit go pkgconfig
