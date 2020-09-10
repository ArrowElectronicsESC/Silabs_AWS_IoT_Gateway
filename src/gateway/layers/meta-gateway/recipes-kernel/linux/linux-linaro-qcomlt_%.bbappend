FILESEXTRAPATHS_prepend := "${THISDIR}/files:"

SRC_URI += "\
            file://0001-Gateway-DB410C-Added-support-of-CYUSB3610-chip.patch \
            file://0001-Gateway-DB410C-CYUSB3610-reset-pin.patch \
            file://linux-kernel-aws-greengrass.cfg \
           "

# Backport required WiFi fixes from the Linaro WIP branch.
# https://git.linaro.org/people/loic.poulain/linux.git/log/?h=qcomlt-5.7-wifi
SRC_URI += "\
            file://0001-mac80211-add-ieee80211_is_any_nullfunc.patch \
            file://0001-wcn36xx-disable-HW_CONNECTION_MONITOR.patch \
            file://0001-wcn36xx-Add-ieee80211-rx-status-rate-information.patch \
            file://0001-wcn36xx-Fix-multiple-AMPDU-sessions-support.patch \
            file://0001-wcn36xx-Advertise-beacon-filtering-support-in-bmps.patch \
            file://0001-wcn36xx-Fix-software-driven-scan.patch \
            file://0001-wcn36xx-Add-TX-ack-support.patch \
            file://0001-wcn36xx-Fix-TX-data-path.patch \
            file://0001-wcn36xx-Fix-power-saving-with-some-APs.patch \
            file://0001-wcn36xx-Use-sequence-number-allocated-by-mac80211.patch \
           "

KERNEL_CONFIG_FRAGMENTS_append = " ${WORKDIR}/linux-kernel-aws-greengrass.cfg "

KERNEL_MODULE_AUTOLOAD += "g_serial cyusb3610"

#SRC_URI += "\
#        file://0002-Gateway-DB410C-Added-support-of-CYUSB3610-chip.patch \
#        file://0003-Gateway-DB410C-Support-for-Factory-reset-gpio.patch \
#        file://0004-Gateway-DB410C-CYUSB3610-reset-pin.patch \
#        file://0005-Gateway-DB410C-Added-cyusb-MAC-address-support.patch \
#        file://0006-Gateway-DB410C-Removed-wifi-support-from-DB410C.patch \
#        file://0007-Gateway-DB410C-SDC-clocks-runtime-enable-disable.patch \
#        file://0008-Gateway-DB410C-Removed-unused-interfaces-support.patch \
#        file://0009-Watchdog-Enable-pimic-watchdog.patch \
#        "
