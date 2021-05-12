#!/bin/bash
npm install
rsync * /opt/iobroker/node_modules/iobroker.sunny5-logger/ --recursive --verbose
iobroker upload sunny5-logger
