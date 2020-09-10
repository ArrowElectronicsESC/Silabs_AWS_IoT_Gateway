RDEPENDS_packagegroup-rpb_remove = "networkmanager networkmanager-nmtui \
    ${@bb.utils.contains("TARGET_ARCH", "arm", "", "docker", d)} \
    "
RDEPENDS_packagegroup-rpb_append = "connman connman-client"
