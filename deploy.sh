#!/bin/bash
#npm install
rsync * sunny5@192.168.5.123:/opt/iobroker/node_modules/iobroker.sunny5logger/ --recursive --verbose --exclude=node_modules
#iobroker upload sunny5logger
