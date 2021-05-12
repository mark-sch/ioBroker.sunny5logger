# ioBroker.sunny5-logger

[![NPM version](https://img.shields.io/npm/v/iobroker.sunny5-logger.svg)](https://www.npmjs.com/package/iobroker.sunny5-logger)
[![Downloads](https://img.shields.io/npm/dm/iobroker.sunny5-logger.svg)](https://www.npmjs.com/package/iobroker.sunny5-logger)
![Number of Installations (latest)](https://iobroker.live/badges/sunny5-logger-installed.svg)
![Number of Installations (stable)](https://iobroker.live/badges/sunny5-logger-stable.svg)
[![Dependency Status](https://img.shields.io/david/mark-sch/iobroker.sunny5-logger.svg)](https://david-dm.org/mark-sch/iobroker.sunny5-logger)

[![NPM](https://nodei.co/npm/iobroker.sunny5-logger.png?downloads=true)](https://nodei.co/npm/iobroker.sunny5-logger/)

**Tests:** ![Test and Release](https://github.com/mark-sch/ioBroker.sunny5-logger/workflows/Test%20and%20Release/badge.svg)

## sunny5-logger adapter for ioBroker

Connect to photovotaic inverters, read data, publish to mqtt and store solar data to json file.

Sunny5/Luxpower is connected by mqtt
Solis 4G is connected by modbus rs485
SMA Tripower is connected by modbus tcp
PowerOne/ABB is connected by modbus rs485

### Test the adapter manually on a local ioBroker installation
In order to install the adapter locally without publishing, the following steps are recommended:
1. Create a tarball from your dev directory:  
	```bash
	npm pack
	```
1. Upload the resulting file to your ioBroker host
1. Install it locally (The paths are different on Windows):
	```bash
	cd /opt/iobroker
	npm i /path/to/tarball.tgz
	```

For later updates, the above procedure is not necessary. Just do the following:
1. Overwrite the changed files in the adapter directory (`/opt/iobroker/node_modules/iobroker.sunny5-logger`)
1. Execute `iobroker upload sunny5-logger` on the ioBroker host

## Changelog

### 0.0.1
* (mark-sch) initial release

## License
MIT License

Copyright (c) 2021 Think5 GmbH

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
