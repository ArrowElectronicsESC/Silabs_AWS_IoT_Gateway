1. Install the host dependencies.

   ```
   $ sudo apt-get install gawk wget git-core diffstat unzip texinfo gcc-multilib \
     build-essential chrpath socat cpio python python3 python3-pip python3-pexpect \
     xz-utils debianutils iputils-ping python3-git python3-jinja2 libegl1-mesa \
     libsdl1.2-dev pylint3 xterm
   ```

   https://github.com/96boards/oe-rpb-manifest

   `$ sudo apt-get install whiptail`

   

2. Clone source code.

   `$ git clone https://git.einfochips.com:8080/a/efr32-gateway`

    Edit the file `layers/meta-gateway/recipes-awsapp/awsapp/files/include/aws-iot-core-class.hpp` on Line 36 to change the API endpoint to your AWS account.

3. Go to the root directory and run the build script.

   `$ cd efr32-gateway`
   `$ ./build-image.sh`

   

4. Image artifacts will be located at below directory.

   `$ cd build-rpb/Image_artifacts`
    Image files :
	- boot-dragonboard-410c.img
	- rpb-console-image-dragonboard-410c.ext4.gz
