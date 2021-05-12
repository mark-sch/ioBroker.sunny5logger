#!/bin/bash
rsync * /opt/iobroker/node_modules/iobroker.sunny5-logger/ --recursive --verbose
iobroker upload sunny5-logger