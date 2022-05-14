'use strict';

/*
 * Created with @iobroker/create-adapter v1.33.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');
const mqtt = require('mqtt');
var modbus = require("modbus-stream");
const Parser = require("binary-parser-encoder").Parser;
const schedule = require('node-schedule');
var me;

var  div10 = function(i) {
        return i / 10
}

var div100 = function(i) {
        return i / 100
}

const Solis4GParser = {
    InputRegister() {  return new Parser()
        .uint16be("acPower")
        .seek(2)
        .uint16be("dcPower")
        .uint32be("totalEnergy")
        .seek(2)
        .uint16be("monthEnergy")
        .uint16be("lastmonthEnergy")
        .seek(2)
        .uint16be("todayEnergy", { formatter: div10 })
        .uint16be("yesterdayEnergy", { formatter: div10 })
        .uint32be("yearEnergy")
        .uint32be("lastyearEnergy")
        .seek(2)
        .uint16be("dcVoltage1", { formatter: div10 })
        .uint16be("dcCurrent1", { formatter: div10 })
        .uint16be("dcVoltage2", { formatter: div10 })
        .uint16be("dcCurrent2", { formatter: div10 })
        .seek(20)
        .uint16be("acVoltage", { formatter: div10 })
        .uint16be("acCurrent", { formatter: div10 })
        .seek(8)
        .uint16be("inverterTemperature", { formatter: div10 })
        .uint16be("acFrequency", { formatter: div100 })
   }
}


class Sunny5Logger extends utils.Adapter {

	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		super({
			...options,
			name: 'sunny5logger',
		});
		this.on('ready', this.onReady.bind(this));
		this.on('stateChange', this.onStateChange.bind(this));
		// this.on('objectChange', this.onObjectChange.bind(this));
		// this.on('message', this.onMessage.bind(this));
		this.on('unload', this.onUnload.bind(this));

		this.states = {
			mqttConnected: 'false',
			modbusConnected: 'false',
			soc: 0,
			acPower: 0,
			dcPower: 0,
			totalEnergy: 0,
			monthEnergy: 0,
			lastmonthEnergy: 0,
			todayEnergy: 0,
			yesterdayEnergy: 0,
			yearEnergy: 0,
			lastyearEnergy: 0,
			dcVoltage1: 0,
			dcCurrent1: 0,
			dcVoltage2: 0,
			dcCurrent2: 0,
			acVoltage: 0,
			acCurrent: 0,
			inverterTemperature: 0,
			acFrequency: 0,
			gridMeter: 0,
			acConsumption: 0,
			updated: 0
		}

		this.modbusFailCounter = 0;
	}

	initMqtt(mqttServer) {
		this.mqttClient  = mqtt.connect('mqtt://' + mqttServer)

		this.mqttClient.on('error', err => {
			this.log.error('Error connecting to MQTT broker');
			this.mqttConnected = false;
			this.setState('info.connection', false, true);
			this.setState('mqttConnected', 'false', true);
			this.mqttClient.publish(this.name + '/' + this.instance + '/mqttConnected', 'false', { retain:true, qos:1});
		})

		this.mqttClient.on('connect', () => {
			//init with zero default values
			Object.keys(this.states).forEach(async key => {
				await this.setObjectNotExistsAsync(key, {
					type: 'state',
					common: {
						type: 'mixed',
						read: true,
						write: false,
					},
					native: {},
				});
				this.mqttClient.publish(this.name + '/' + this.instance + '/' + key, this.states[key] + '', { retain:true, qos:1});
			});

			this.log.info('Connected to MQTT broker: ' + mqttServer);
			this.mqttConnected = true;
			this.setState('info.connection', true, true);
			this.setState('mqttConnected', 'true', true);
			this.mqttClient.publish(this.name + '/' + this.instance + '/mqttConnected', 'true', { retain:true, qos:1});
			//set default values
			this.mqttClient.publish(this.name + '/' + this.instance + '/inverter', this.config.inverter, { retain:true, qos:1});
			this.mqttClient.publish(this.name + '/' + this.instance + '/updated', Date.now() + '', { retain:true, qos:1});

			if (this.config.inverter === 'sunny5') this.initSunny5Inverter();
			if (this.config.inverter === 'solis4g') this.initSolis4GInverter(this.config.ModbusDevice, true);
		})
	}


	initSunny5Inverter() {
		this.mqttClient.subscribe('sunny5/#', {qos:1});

		//handle incoming mqtt messages (set)
		this.mqttClient.on('message', (topic, message) => {
			// message is Buffer
			let msg = message.toString();
			let newtopic = topic.replace('sunny5/','');

			switch (newtopic) {
				case 'pv_energy':
					//this.log.info('MQTT message ' + newtopic + ' ' + msg);
					this.mqttClient.publish(this.name + '/' + this.instance + '/acPower', msg, { retain:true, qos:1});
					this.mqttClient.publish(this.name + '/' + this.instance + '/dcPower', msg, { retain:true, qos:1});
					this.setState('acPower', msg, true);
					this.setState('dcPower', msg, true);
					break;
				case 'consumption':
					this.mqttClient.publish(this.name + '/' + this.instance + '/acConsumption', msg, { retain:true, qos:1});
					this.setState('acConsumption', msg, true);
					break;
				case 'soc':
						this.mqttClient.publish(this.name + '/' + this.instance + '/soc', msg, { retain:true, qos:1});
						this.setState('soc', msg, true);
						break
				case 'grid':
					this.mqttClient.publish(this.name + '/' + this.instance + '/gridMeter', msg, { retain:true, qos:1});
					this.setState('gridMeter', msg, true);
					break;
			}

			this.setState('updated', Date.now(), true);
			this.mqttClient.publish(this.name + '/' + this.instance + '/updated', Date.now() + '', { retain:true, qos:1});
		})
	}

	initSolis4GInverter(modbusDevice, initCron) {
		//this.mqttClient.subscribe('sunny5logger/#', {qos:1});

		modbus.serial.connect(modbusDevice, {
			baudRate : 9600,
			dataBits : 8,
			stopBits : 1,
			parity   : "even",
			debug    : "sunny5logger"
		}, (err, connection) => {
			this.modbusClient = connection;

			if (!err) {
				this.modbusConnected = true;
				this.setState('modbusConnected', 'true', true);
				this.mqttClient.publish(this.name + '/' + this.instance + '/modbusConnected', 'true', { retain:true, qos:1});
				this.log.info('Connected to serial modbus device: ' + modbusDevice);

				if (initCron) this.schedule1S = schedule.scheduleJob('*/2 * * * * *', this.onSolisTicker.bind(this));
			}
			else {
				this.modbusConnected = false;
				this.setState('modbusConnected', 'false', true);
				this.mqttClient.publish(this.name + '/' + this.instance + '/modbusConnected', 'false', { retain:true, qos:1});
				this.log.error('Error opening a serial modbus connection: ' + modbusDevice + ' ### ' + err.message);
				
				if (initCron) this.schedule1S = schedule.scheduleJob('*/2 * * * * *', this.onSolisTicker.bind(this));
				return;
			}

			connection.on("close", () => {
				this.modbusConnected = false;
				this.setState('modbusConnected', 'false', true);
				this.mqttClient.publish(this.name + '/' + this.instance + '/modbusConnected', 'false', { retain:true, qos:1});
				this.log.info('Serial modbus connection closed: ' + modbusDevice);
				modbus = null;
				modbus = require("modbus-stream");
				setTimeout(() => { this.initSolis4GInverter(this.config.ModbusDevice, false) }, 5000);
			});

			connection.on("error", () => {
				this.modbusConnected = false;
				this.setState('modbusConnected', 'false', true);
				this.mqttClient.publish(this.name + '/' + this.instance + '/modbusConnected', 'false', { retain:true, qos:1});
				this.log.info('Serial modbus connection error: ' + modbusDevice);
				connection.close((msg) => {});
			});
		});
	}

	onSolisTicker() {
		this.readSolis4GInverter(this.modbusClient, this.modbusConnected);
	}

	readSolis4GInverter(connection,  modbusConnected) {
		if (!modbusConnected) {
			this.modbusFailCounter++;

			this.mqttClient.publish(this.name + '/' + this.instance + '/acPower', '0', { retain:true, qos:1});
			this.mqttClient.publish(this.name + '/' + this.instance + '/dcPower', '0', { retain:true, qos:1});
			this.mqttClient.publish(this.name + '/' + this.instance + '/updated', Date.now() + '', { retain:true, qos:1});

			if (this.modbusFailCounter > 12) {
				this.modbusFailCounter = 0;
				this.initSolis4GInverter(this.config.ModbusDevice, false);
			}

			return;
		}

		connection.readInputRegisters({ address: 3005, quantity: 50, extra: { unitId: this.config.ModbusAddress } }, (err, res) => {
			if (err) {
				//this.log.info('Error reading serial modbus input registers: ' + err);
				this.mqttClient.publish(this.name + '/' + this.instance + '/acPower', '0', { retain:true, qos:1});
				this.mqttClient.publish(this.name + '/' + this.instance + '/dcPower', '0', { retain:true, qos:1});
				this.mqttClient.publish(this.name + '/' + this.instance + '/updated', Date.now() + '', { retain:true, qos:1});
				this.setState('updated', Date.now(), true);
				return;
			}
 
			let buf = Buffer.concat(res.response.data)
			let registers = Solis4GParser.InputRegister().parse(buf);
 
			Object.keys(registers).forEach(key => {
				let mqttValue = String(registers[key]);
				this.mqttClient.publish(this.name + '/' + this.instance + '/' + String(key), mqttValue, { retain:true, qos:1});
				this.setState(key, registers[key], true);
			});
			this.setState('updated', Date.now(), true);
			this.mqttClient.publish(this.name + '/' + this.instance + '/updated', Date.now() + '', { retain:true, qos:1});
		})
 
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		/*
		For every state in the system there has to be also an object of type state
		Here a simple template for a boolean variable named "testVariable"
		Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
		*/
		  
		Object.keys(this.states).forEach(async key => {
			await this.setObjectNotExistsAsync(key, {
				type: 'state',
				common: {
					type: 'mixed',
					read: true,
					write: false,
				},
				native: {},
			});
			this.setState(key, this.states[key], true);
		});

		this.mqttConnected = false;
		this.modbusConnected = false;
		this.setState('info.connection', false, true);

		this.initMqtt(this.config.MqttServer);

		// In order to get state updates, you need to subscribe to them. The following line adds a subscription for our variable we have created above.
		// this.subscribeStates('lights.*');
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			// Here you must clear all timeouts or intervals that may still be active
			// clearTimeout(timeout1);
			// clearTimeout(timeout2);
			// ...
			// clearInterval(interval1);

			callback();
		} catch (e) {
			callback();
		}
	}

	// If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
	// You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
	// /**
	//  * Is called if a subscribed object changes
	//  * @param {string} id
	//  * @param {ioBroker.Object | null | undefined} obj
	//  */
	// onObjectChange(id, obj) {
	// 	if (obj) {
	// 		// The object was changed
	// 		this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
	// 	} else {
	// 		// The object was deleted
	// 		this.log.info(`object ${id} deleted`);
	// 	}
	// }

	/**
	 * Is called if a subscribed state changes
	 * @param {string} id
	 * @param {ioBroker.State | null | undefined} state
	 */
	onStateChange(id, state) {
		if (state) {
			// The state was changed
			//this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
		} else {
			// The state was deleted
			//this.log.info(`state ${id} deleted`);
		}
	}

	// If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
	// /**
	//  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	//  * Using this method requires "common.messagebox" property to be set to true in io-package.json
	//  * @param {ioBroker.Message} obj
	//  */
	// onMessage(obj) {
	// 	if (typeof obj === 'object' && obj.message) {
	// 		if (obj.command === 'send') {
	// 			// e.g. send email or pushover or whatever
	// 			this.log.info('send command');

	// 			// Send response in callback if required
	// 			if (obj.callback) this.sendTo(obj.from, obj.command, 'Message received', obj.callback);
	// 		}
	// 	}
	// }

}

if (require.main !== module) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new Sunny5Logger(options);
} else {
	// otherwise start the instance directly
	new Sunny5Logger();
}