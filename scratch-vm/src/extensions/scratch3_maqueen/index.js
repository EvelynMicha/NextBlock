/* global navigator */
const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const formatMessage = require('format-message');
const log = require('../../util/log');

const UART_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const UART_RX_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // write
const UART_TX_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // notify

const isGreek = () => {
    const setup = formatMessage.setup && formatMessage.setup();
    const lang = (setup && setup.locale ? setup.locale : '').toLowerCase();
    return lang.startsWith('el');
};
const L = (en, el) => (isGreek() ? el : en);

class Scratch3Maqueen {
    constructor (runtime) {
        this.runtime = runtime;
        this._connected = false;
        this._device = null;
        this._server = null;
        this._rx = null;
        this._tx = null;
        this._encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
        this._decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder() : null;
        this._readBuffer = '';
        this._lastValues = Object.create(null); // key -> {value, seq}
        this._seq = 1;
        this._lastIr = 0;
        this._lastVersion = '';
        this._onTxValueChanged = this._handleTxValue.bind(this);
    }

    getInfo () {
        return {
            id: 'maqueen',
            name: L('Maqueen Plus', 'Maqueen Plus'),
            color1: '#00b5d6',
            color2: '#009bb8',
            color3: '#009bb8',
            blocks: [
                {
                    opcode: 'connect',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.maqueen.connect',
                        default: L('connect (Bluetooth)', 'σύνδεση (Bluetooth)'),
                        description: 'Connect block label'
                    })
                },
                {
                    opcode: 'isConnected',
                    blockType: BlockType.BOOLEAN,
                    text: formatMessage({
                        id: 'extension.maqueen.connected',
                        default: L('maqueen connected?', 'το maqueen συνδέθηκε;'),
                        description: 'Connection status reporter'
                    })
                },
                {
                    opcode: 'drive',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.maqueen.drive',
                        default: L('set [MOTOR] [DIR] speed (SPEED)', 'ρύθμισε [MOTOR] [DIR] ταχύτητα (SPEED)'),
                        description: 'Drive motor(s)'
                    }),
                    arguments: {
                        MOTOR: {
                            type: ArgumentType.STRING,
                            menu: 'motorMenu',
                            defaultValue: 'B'
                        },
                        DIR: {
                            type: ArgumentType.STRING,
                            menu: 'dirMenu',
                            defaultValue: 'F'
                        },
                        SPEED: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 120
                        }
                    }
                },
                {
                    opcode: 'stop',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.maqueen.stop',
                        default: L('stop [MOTOR]', 'σταμάτα [MOTOR]'),
                        description: 'Stop motor(s)'
                    }),
                    arguments: {
                        MOTOR: {
                            type: ArgumentType.STRING,
                            menu: 'motorMenu',
                            defaultValue: 'B'
                        }
                    }
                },
                {
                    opcode: 'setLed',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.maqueen.led',
                        default: L('front LED [SIDE] [STATE]', 'μπροστινό LED [SIDE] [STATE]'),
                        description: 'Set LEDs'
                    }),
                    arguments: {
                        SIDE: {
                            type: ArgumentType.STRING,
                            menu: 'ledSideMenu',
                            defaultValue: 'L'
                        },
                        STATE: {
                            type: ArgumentType.STRING,
                            menu: 'onOffMenu',
                            defaultValue: 'on'
                        }
                    }
                },
                {
                    opcode: 'lineState',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.maqueen.line',
                        default: L('line sensor [SENSOR] state', 'αισθητήρας γραμμής [SENSOR] κατάσταση'),
                        description: 'Digital line sensor'
                    }),
                    arguments: {
                        SENSOR: {
                            type: ArgumentType.STRING,
                            menu: 'lineMenu',
                            defaultValue: 'L2'
                        }
                    }
                },
                {
                    opcode: 'lineAnalog',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.maqueen.lineAnalog',
                        default: L('line sensor [SENSOR] analog', 'αισθητήρας γραμμής [SENSOR] αναλογικό'),
                        description: 'Analog line sensor'
                    }),
                    arguments: {
                        SENSOR: {
                            type: ArgumentType.STRING,
                            menu: 'lineMenu',
                            defaultValue: 'L2'
                        }
                    }
                },
                {
                    opcode: 'ultrasonic',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.maqueen.ultra',
                        default: L('distance (cm)', 'απόσταση (cm)'),
                        description: 'Ultrasonic distance in cm'
                    })
                },
                {
                    opcode: 'version',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.maqueen.version',
                        default: L('firmware version', 'έκδοση firmware'),
                        description: 'Firmware version reporter'
                    })
                },
                {
                    opcode: 'lastIr',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.maqueen.ir',
                        default: L('last IR code', 'τελευταίος κωδικός IR'),
                        description: 'Last IR code received'
                    })
                }
            ],
            menus: {
                motorMenu: [
                    {text: L('left', 'αριστερό'), value: 'L'},
                    {text: L('right', 'δεξί'), value: 'R'},
                    {text: L('both', 'και τα δύο'), value: 'B'}
                ],
                dirMenu: [
                    {text: L('forward', 'μπροστά'), value: 'F'},
                    {text: L('backward', 'πίσω'), value: 'B'}
                ],
                ledSideMenu: [
                    {text: L('left', 'αριστερό'), value: 'L'},
                    {text: L('right', 'δεξί'), value: 'R'},
                    {text: L('both', 'και τα δύο'), value: 'B'}
                ],
                onOffMenu: [
                    {text: L('on', 'on'), value: 'on'},
                    {text: L('off', 'off'), value: 'off'}
                ],
                lineMenu: [
                    {text: 'L1', value: 'L1'},
                    {text: 'L2', value: 'L2'},
                    {text: 'M', value: 'M'},
                    {text: 'R1', value: 'R1'},
                    {text: 'R2', value: 'R2'}
                ]
            }
        };
    }

    _hasBle () {
        return typeof navigator !== 'undefined' && !!navigator.bluetooth;
    }

    _encode (str) {
        if (this._encoder) return this._encoder.encode(str);
        const buf = new Uint8Array(str.length);
        for (let i = 0; i < str.length; i++) buf[i] = str.charCodeAt(i) & 0xff;
        return buf;
    }

    _decode (dataView) {
        if (this._decoder) return this._decoder.decode(dataView);
        let out = '';
        for (let i = 0; i < dataView.byteLength; i++) {
            out += String.fromCharCode(dataView.getUint8(i));
        }
        return out;
    }

    async _sendLine (line) {
        if (!this._rx) throw new Error('Not connected (BLE)');
        const bytes = this._encode(`${line}\n`);
        await this._rx.writeValue(bytes);
    }

    _handleTxValue (event) {
        const value = event.target && event.target.value;
        if (!value) return;
        const chunk = this._decode(value);
        this._readBuffer += chunk;
        let idx;
        while ((idx = this._readBuffer.indexOf('\n')) >= 0) {
            const line = this._readBuffer.slice(0, idx).trim();
            this._readBuffer = this._readBuffer.slice(idx + 1);
            if (line) this._handleLine(line);
        }
    }

    _handleLine (line) {
        if (line === 'PONG') {
            this._connected = true;
            return;
        }
        const parts = line.split(':');
        if (parts.length === 3 && parts[0] === 'LINE') {
            const key = `LINE:${parts[1]}`;
        const val = Number(parts[2]);
        this._lastValues[key] = {value: isNaN(val) ? 0 : val, seq: this._seq++};
    } else if (parts.length === 3 && parts[0] === 'LINEDATA') {
        const key = `LINEDATA:${parts[1]}`;
        const val = Number(parts[2]);
            this._lastValues[key] = {value: isNaN(val) ? 0 : val, seq: this._seq++};
        } else if (parts.length === 2 && parts[0] === 'ULTRA') {
            const val = Number(parts[1]);
            this._lastValues.ULTRA = {value: isNaN(val) ? 0 : val, seq: this._seq++};
        } else if (parts.length === 2 && parts[0] === 'VER') {
            this._lastVersion = parts[1] || '';
            this._lastValues.VER = {value: this._lastVersion, seq: this._seq++};
        } else if (parts.length === 2 && parts[0] === 'IR') {
            const val = Number(parts[1]);
            if (!isNaN(val)) {
                this._lastIr = val;
                this._lastValues.IR = {value: val, seq: this._seq++};
            }
        }
    }

    async _awaitValue (key, prevSeq) {
        const timeout = 400;
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const entry = this._lastValues[key];
            if (entry && entry.seq && entry.seq !== prevSeq) return entry.value;
            await new Promise(resolve => setTimeout(resolve, 15));
        }
        const entry = this._lastValues[key];
        return entry ? entry.value : 0;
    }

    async connect () {
        if (!this._hasBle()) {
            throw new Error('WebBluetooth not available');
        }
        await this.disconnect();
        try {
            const device = await navigator.bluetooth.requestDevice({
                filters: [{services: [UART_SERVICE_UUID]}],
                optionalServices: [UART_SERVICE_UUID]
            });
            device.addEventListener('gattserverdisconnected', () => {
                this._connected = false;
                this._rx = null;
                this._tx = null;
            });
            this._device = device;
            this._server = await device.gatt.connect();
            const service = await this._server.getPrimaryService(UART_SERVICE_UUID);
            this._rx = await service.getCharacteristic(UART_RX_UUID);
            this._tx = await service.getCharacteristic(UART_TX_UUID);
            await this._tx.startNotifications();
            this._tx.addEventListener('characteristicvaluechanged', this._onTxValueChanged);
            await this._sendLine('PING?');
            // Mark as provisionally connected; will flip true when PONG arrives.
            this._connected = true;
        } catch (e) {
            this._connected = false;
            this._rx = null;
            this._tx = null;
            throw e;
        }
    }

    async disconnect () {
        if (this._tx) {
            try {
                this._tx.removeEventListener('characteristicvaluechanged', this._onTxValueChanged);
                await this._tx.stopNotifications();
            } catch (e) {
                // ignore
            }
        }
        this._tx = null;
        this._rx = null;
        if (this._device && this._device.gatt && this._device.gatt.connected) {
            try {
                this._device.gatt.disconnect();
            } catch (e) {
                // ignore
            }
        }
        this._device = null;
        this._server = null;
        this._connected = false;
    }

    isConnected () {
        return !!(this._connected && this._rx);
    }

    _clamp (val, min, max) {
        const n = Number(val);
        if (isNaN(n)) return min;
        return Math.max(min, Math.min(max, n));
    }

    async drive (args) {
        const motor = (args.MOTOR || 'B').toUpperCase();
        const dir = (args.DIR || 'F').toUpperCase() === 'B' ? 'B' : 'F';
        const speed = this._clamp(args.SPEED, 0, 255);
        await this._sendLine(`MOTOR:${motor}:${dir}:${speed}`);
        return null;
    }

    async stop (args) {
        const motor = (args.MOTOR || 'B').toUpperCase();
        await this._sendLine(`STOP:${motor}`);
        return null;
    }

    async setLed (args) {
        const side = (args.SIDE || 'L').toUpperCase();
        const state = (args.STATE || '').toLowerCase() === 'on' ? 1 : 0;
        await this._sendLine(`LED:${side}:${state}`);
        return null;
    }

    async lineState (args) {
        const sensor = (args.SENSOR || 'L2').toUpperCase();
        const key = `LINE:${sensor}`;
        const prev = this._lastValues[key] ? this._lastValues[key].seq : 0;
        await this._sendLine(`LINE?:${sensor}`);
        return await this._awaitValue(key, prev);
    }

    async lineAnalog (args) {
        const sensor = (args.SENSOR || 'L2').toUpperCase();
        const key = `LINEDATA:${sensor}`;
        const prev = this._lastValues[key] ? this._lastValues[key].seq : 0;
        await this._sendLine(`LINEDATA?:${sensor}`);
        return await this._awaitValue(key, prev);
    }

    async ultrasonic () {
        const key = 'ULTRA';
        const prev = this._lastValues[key] ? this._lastValues[key].seq : 0;
        await this._sendLine('ULTRA?');
        const mm = await this._awaitValue(key, prev);
        return Math.round(Number(mm || 0) / 10); // convert to cm
    }

    async version () {
        const key = 'VER';
        const prev = this._lastValues[key] ? this._lastValues[key].seq : 0;
        await this._sendLine('VERSION?');
        const v = await this._awaitValue(key, prev);
        if (typeof v === 'string') return v;
        return this._lastVersion || '';
    }

    lastIr () {
        return this._lastIr || 0;
    }
}

module.exports = Scratch3Maqueen;
