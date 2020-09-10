DESCRIPTION = "Client for PPP+SSL VPN tunnel services"
HOMEPAGE = "https://github.com/adrienverge/openfortivpn"
LICENSE = "GPL-3.0"
LIC_FILES_CHKSUM = "file://LICENSE;md5=1d58d8f3da4c52035c4ad376ffabb44a"

SRC_URI = "git://github.com/adrienverge/openfortivpn.git"

# tag: v1.6.0
SRCREV = "c50ed60c7b405bd3c8da4bf61db42e85caaf4407"

inherit autotools pkgconfig

S = "${WORKDIR}/git"
B = "${WORKDIR}/git"

DEPENDS += " openssl"

inherit autotools pkgconfig
