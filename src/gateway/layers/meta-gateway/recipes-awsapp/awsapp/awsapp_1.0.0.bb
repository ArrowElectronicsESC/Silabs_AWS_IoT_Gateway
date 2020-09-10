SUMMARY = "Simple Hello World Cmake application"
SECTION = "examples"
LICENSE = "CLOSED"

inherit systemd
inherit cmake

SRC_URI = "\
        file://include/ \
	file://CMakeLists-rapidjson.txt.in \
	file://src/ \
	file://CMakeLists.txt \
	file://awsapp.service \
	file://config.json \
	"

do_install_append() {
        install -d ${D}/opt/awsapp/
        install -m 0755 ${S}/config.json ${D}/opt/awsapp/

        install -d ${D}${sysconfdir}/systemd/system
        install -m 0644 ${S}/awsapp.service ${D}${sysconfdir}/systemd/system/
}

FILES_${PN} += "/opt/awsapp /usr/bin/"

SYSTEMD_PACKAGES = "${PN}"
SYSTEMD_SERVICE_${PN} = "awsapp.service"
SYSTEMD_AUTO_ENABLE = "enable"

DEPENDS += " mosquitto curl aws-iot-device-sdk-cpp "
RDEPENDS_${PN} = "aws-iot-device-sdk-cpp"

S = "${WORKDIR}"

EXTRA_OECMAKE = ""
