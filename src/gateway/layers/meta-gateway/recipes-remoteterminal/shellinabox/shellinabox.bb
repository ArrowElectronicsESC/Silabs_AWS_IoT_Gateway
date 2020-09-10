DESCRIPTION = "Web-based terminal"
HOMEPAGE = "git://github.com/shellinabox/shellinabox.git"
LICENSE = "GPLv2"
LIC_FILES_CHKSUM = "file://COPYING;md5=a193d25fdef283ddce530f6d67852fa5"

SRC_URI = "git://github.com/shellinabox/shellinabox.git \
           file://shellinabox.service \
           file://0001-Enabled-softkeyboard.patch "

SRCREV = "4f0ecc31ac6f985e0dd3f5a52cbfc0e9251f6361"

inherit autotools pkgconfig

S = "${WORKDIR}/git"
B = "${WORKDIR}/git"

DEPENDS += " openssl zlib libpam"
CPPFLAGS += "${SELECTED_OPTIMIZATION}"
EXTRA_OECONF += "--disable-runtime-loading"

do_configure_prepend () {
	autoreconf -i
}

do_install_append () {
    install -d ${D}${systemd_unitdir}/system/
    install -d ${D}${sysconfdir}/shellinabox/certs
    install -m 0644 ${WORKDIR}/shellinabox.service ${D}${systemd_unitdir}/system/
}

FILES_${PN} += "${sysconfdir} \
                ${systemd_unitdir}/system/shellinabox.service"

inherit systemd

SYSTEMD_SERVICE_${PN} = "shellinabox.service"
