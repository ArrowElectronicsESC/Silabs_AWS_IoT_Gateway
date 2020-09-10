#!/bin/bash

MACHINE=dragonboard-410c DISTRO=rpb source ./setup-environment

bitbake rpb-console-image

mkdir Image_artifacts
cp tmp-rpb-glibc/deploy/images/dragonboard-410c/boot-dragonboard-410c.img Image_artifacts
cp tmp-rpb-glibc/deploy/images/dragonboard-410c/rpb-console-image-dragonboard-410c.ext4.gz Image_artifacts
