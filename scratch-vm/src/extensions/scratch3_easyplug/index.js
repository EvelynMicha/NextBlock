/* global navigator */
const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const formatMessage = require('format-message');
const log = require('../../util/log');

const isGreek = () => {
    const setup = formatMessage.setup && formatMessage.setup();
    const lang = (setup && setup.locale ? setup.locale : '').toLowerCase();
        return lang.startsWith('el');
};
const L = (en, el) => (isGreek() ? el : en);

class Scratch3Easyplug {
    constructor (runtime) {
        /**
         * The runtime instantiating this extension.
         * @type {Runtime}
         */
        this.runtime = runtime;
        this._connected = false;
        this._transport = 'serial';
        this._ledOn = false;
        this._port = null;
        this._writer = null;
        this._encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
        this._decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder() : null;
        this._reader = null;
        this._readBuffer = '';
        this._lastValues = Object.create(null); // key -> {value, seq}
        this._seq = 1;
        this._lcdAddress = 39;
    }

    getInfo () {
        return {
            id: 'easyplug',
            name: 'EasyPlug Super',
            color1: '#0FBD8C',
            color2: '#0E9F78',
            color3: '#0E9F78',
            blocks: [
                {
                    opcode: 'connect',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.easyplug.connect',
                        default: L('connect (USB)', 'σύνδεση (USB)'),
                        description: 'Connect block label'
                    })
                },
                {
                    opcode: 'isConnected',
                    blockType: BlockType.BOOLEAN,
                    text: formatMessage({
                        id: 'extension.easyplug.connected',
                        default: L('easyplug connected?', 'το easyplug συνδέθηκε;'),
                        description: 'Reporter for connection state'
                    })
                },
                {
                    opcode: 'getTemperature',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.easyplug.temperature',
                        default: L('temperature (°C)', 'θερμοκρασία (°C)'),
                        description: 'Temperature reporter label'
                    })
                },
                {
                    opcode: 'digitalWrite',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.easyplug.digitalWrite',
                        default: L('digital write [PIN] to [LEVEL]', 'ψηφιακή έξοδος [PIN] σε [LEVEL]'),
                        description: 'Digital write block'
                    }),
                    arguments: {
                        PIN: {
                            type: ArgumentType.STRING,
                            menu: 'pinMenu',
                            defaultValue: 'P0'
                        },
                        LEVEL: {
                            type: ArgumentType.STRING,
                            menu: 'digitalLevelMenu',
                            defaultValue: '1'
                        }
                    }
                },
                {
                    opcode: 'digitalRead',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.easyplug.digitalRead',
                        default: L('digital read [PIN]', 'ανάγνωση ψηφιακού [PIN]'),
                        description: 'Digital read block'
                    }),
                    arguments: {
                        PIN: {
                            type: ArgumentType.STRING,
                            menu: 'pinMenu',
                            defaultValue: 'P0'
                        }
                    }
                },
                {
                    opcode: 'analogWrite',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.easyplug.analogWrite',
                        default: L('analog write [PIN] to [VALUE]', 'αναλογική έξοδος [PIN] σε [VALUE]'),
                        description: 'Analog write block'
                    }),
                    arguments: {
                        PIN: {
                            type: ArgumentType.STRING,
                            menu: 'analogPinMenu',
                            defaultValue: 'P1'
                        },
                        VALUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 512
                        }
                    }
                },
                {
                    opcode: 'analogRead',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.easyplug.analogRead',
                        default: L('analog read [PIN]', 'ανάγνωση αναλογικού [PIN]'),
                        description: 'Analog read block'
                    }),
                    arguments: {
                        PIN: {
                            type: ArgumentType.STRING,
                            menu: 'analogPinMenu',
                            defaultValue: 'P1'
                        }
                    }
                },
                {
                    opcode: 'lcdInit',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.easyplug.lcdInit',
                        default: L('LCD init address [ADDRESS]', 'LCD αρχικοποίηση διεύθυνσης [ADDRESS]'),
                        description: 'Initialize I2C LCD'
                    }),
                    arguments: {
                        ADDRESS: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 39 // 0x27
                        }
                    }
                },
                {
                    opcode: 'lcdShowString',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.easyplug.lcdShowString',
                        default: L('LCD show [TEXT] at x [X] y [Y]', 'LCD εμφάνισε [TEXT] στο x [X] y [Y]'),
                        description: 'Show string on LCD'
                    }),
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: 'Hello'
                        },
                        X: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        },
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        }
                    }
                },
                {
                    opcode: 'lcdShowNumber',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.easyplug.lcdShowNumber',
                        default: L('LCD show number [NUM] at x [X] y [Y]', 'LCD εμφάνισε αριθμό [NUM] στο x [X] y [Y]'),
                        description: 'Show number on LCD'
                    }),
                    arguments: {
                        NUM: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        },
                        X: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        },
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        }
                    }
                },
                {
                    opcode: 'lcdClear',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.easyplug.lcdClear',
                        default: L('LCD clear', 'LCD καθάρισε'),
                        description: 'Clear LCD'
                    })
                },
                {
                    opcode: 'lcdOn',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.easyplug.lcdOn',
                        default: 'LCD on',
                        description: 'Turn on LCD'
                    })
                },
                {
                    opcode: 'lcdOff',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.easyplug.lcdOff',
                        default: 'LCD off',
                        description: 'Turn off LCD'
                    })
                },
                {
                    opcode: 'tmInit',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.easyplug.tmInit',
                        default: L('TM1637 init', 'TM1637 αρχικοποίηση'),
                        description: 'Initialize TM1637 display'
                    })
                },
                {
                    opcode: 'tmShowNumber',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.easyplug.tmShowNumber',
                        default: L('TM1637 show number [NUM]', 'TM1637 εμφάνισε αριθμό [NUM]'),
                        description: 'Show number on TM1637'
                    }),
                    arguments: {
                        NUM: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        }
                    }
                },
                {
                    opcode: 'tmShowHex',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.easyplug.tmShowHex',
                        default: L('TM1637 show hex [NUM]', 'TM1637 εμφάνισε hex [NUM]'),
                        description: 'Show hex on TM1637'
                    }),
                    arguments: {
                        NUM: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        }
                    }
                },
                {
                    opcode: 'tmShowBit',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.easyplug.tmShowBit',
                        default: L('TM1637 digit [DIGIT] value [VALUE]', 'TM1637 ψηφίο [DIGIT] τιμή [VALUE]'),
                        description: 'Show digit value on TM1637'
                    }),
                    arguments: {
                        DIGIT: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        },
                        VALUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        }
                    }
                },
                {
                    opcode: 'tmShowDp',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.easyplug.tmShowDp',
                        default: L('TM1637 decimal point [STATE]', 'TM1637 δεκαδικό σημείο [STATE]'),
                        description: 'Show/hide decimal point'
                    }),
                    arguments: {
                        STATE: {
                            type: ArgumentType.STRING,
                            menu: 'ledStates',
                            defaultValue: 'on'
                        }
                    }
                },
                {
                    opcode: 'tmClear',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.easyplug.tmClear',
                        default: L('TM1637 clear', 'TM1637 καθάρισε'),
                        description: 'Clear TM1637 display'
                    })
                },
                {
                    opcode: 'tmOn',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.easyplug.tmOn',
                        default: 'TM1637 on',
                        description: 'Turn on TM1637'
                    })
                },
                {
                    opcode: 'tmOff',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.easyplug.tmOff',
                        default: L('TM1637 off', 'TM1637 off'),
                        description: 'Turn off TM1637'
                    })
                },
                {
                    opcode: 'setLed',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.easyplug.led',
                        default: L('set LED [STATE] on pin [PIN]', 'ρύθμισε LED [STATE] στο pin [PIN]'),
                        description: 'Set LED on/off on a pin'
                    }),
                    arguments: {
                        STATE: {
                            type: ArgumentType.STRING,
                            menu: 'ledStates',
                            defaultValue: 'on'
                        },
                        PIN: {
                            type: ArgumentType.STRING,
                            menu: 'pinMenu',
                            defaultValue: 'P0'
                        }
                    }
                }
            ],
            menus: {
                ledStates: [
                    {
                        text: formatMessage({
                            id: 'extension.easyplug.led.on',
                            default: 'on',
                            description: 'LED on'
                        }),
                        value: 'on'
                    },
                    {
                        text: formatMessage({
                            id: 'extension.easyplug.led.off',
                            default: 'off',
                            description: 'LED off'
                        }),
                        value: 'off'
                    }
                ],
                pinMenu: [
                    {text: 'P0', value: 'P0'},
                    {text: 'P1', value: 'P1'},
                    {text: 'P2', value: 'P2'},
                    {text: 'P3', value: 'P3'},
                    {text: 'P4', value: 'P4'},
                    {text: 'P5', value: 'P5'},
                    {text: 'P6', value: 'P6'},
                    {text: 'P7', value: 'P7'},
                    {text: 'P8', value: 'P8'},
                    {text: 'P10', value: 'P10'},
                    {text: 'P11', value: 'P11'},
                    {text: 'P12', value: 'P12'}
                ],
                digitalLevelMenu: [
                    {text: '1', value: '1'},
                    {text: '0', value: '0'}
                ],
                analogPinMenu: [
                    {text: 'P1', value: 'P1'},
                    {text: 'P2', value: 'P2'},
                    {text: 'P10', value: 'P10'}
                ]
            }
        };
    }

    _hasSerial () {
        return typeof navigator !== 'undefined' && !!navigator.serial;
    }

    async connect () {
        if (!this._hasSerial()) {
            log.warn('WebSerial not available in this browser/context.');
            throw new Error('WebSerial not available');
        }
        // Close previous port if any.
        await this._cleanupSerial();

        try {
            const port = await navigator.serial.requestPort();
            await port.open({baudRate: 115200});
            this._port = port;
            this._writer = port.writable.getWriter();
            this._transport = 'serial';
            this._connected = true;
            this._startReader();
        } catch (e) {
            if (e && e.name === 'NotFoundError') {
                // User cancelled device picker.
                log.info('EasyPlug serial connect cancelled');
                return null;
            }
            throw e;
        }
        return null;
    }

    disconnect () {
        this._cleanupSerial();
        this._transport = 'serial';
    }

    isConnected () {
        return !!(this._connected && this._writer);
    }

    _encode (str) {
        if (this._encoder) return this._encoder.encode(str);
        const buf = new Uint8Array(str.length);
        for (let i = 0; i < str.length; i++) buf[i] = str.charCodeAt(i) & 0xff;
        return buf;
    }

    async _sendSerial (line) {
        if (!this._connected || !this._writer) throw new Error('Not connected (serial)');
        const bytes = this._encode(`${line}\n`);
        await this._writer.write(bytes);
    }

    async _sendLine (line) {
        try {
            await this._sendSerial(line);
        } catch (e) {
            log.warn('EasyPlug write failed', e);
            throw e;
        }
    }

    _sanitizeText (text) {
        const str = String(text || '');
        return str.replace(/[:\n\r]/g, ' ').slice(0, 32);
    }

    _sleep (ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    _startReader () {
        if (!this._port || !this._port.readable) return;
        this._reader = this._port.readable.getReader();
        const loop = async () => {
            try {
                while (true) {
                    const {value, done} = await this._reader.read();
                    if (done) break;
                    if (!value) continue;
                    const chunk = this._decoder ? this._decoder.decode(value) : String.fromCharCode.apply(null, value);
                    this._readBuffer += chunk;
                    let idx;
                    while ((idx = this._readBuffer.indexOf('\n')) >= 0) {
                        const line = this._readBuffer.slice(0, idx).trim();
                        this._readBuffer = this._readBuffer.slice(idx + 1);
                        if (line) this._handleLine(line);
                    }
                }
            } catch (e) {
                log.warn('EasyPlug read error', e);
                this._connected = false;
            } finally {
                this._releaseReader();
            }
        };
        loop();
    }

    _releaseReader () {
        if (this._reader) {
            try {
                this._reader.cancel();
            } catch (e) {
                // ignore
            }
            try {
                this._reader.releaseLock();
            } catch (e) {
                // ignore
            }
        }
        this._reader = null;
    }

    async _cleanupSerial () {
        this._releaseReader();
        if (this._writer) {
            try {
                this._writer.releaseLock();
            } catch (e) {
                // ignore
            }
        }
        this._writer = null;

        if (this._port) {
            try {
                await this._port.close();
            } catch (e) {
                log.warn('Error closing existing port', e);
            }
        }
        this._port = null;
        this._connected = false;
    }

    async _cleanupBle () {
        // No BLE support; just ensure serial is cleaned up.
        await this._cleanupSerial();
        this._connected = false;
        this._transport = 'serial';
    }

    _handleBleValue (event) {
        const dv = event.target && event.target.value;
        if (!dv) return;
        const bytes = new Uint8Array(dv.buffer ? dv.buffer : dv);
        const chunk = this._decoder ? this._decoder.decode(bytes) : String.fromCharCode.apply(null, bytes);
        this._readBuffer += chunk;
        let idx;
        while ((idx = this._readBuffer.indexOf('\n')) >= 0) {
            const line = this._readBuffer.slice(0, idx).trim();
            this._readBuffer = this._readBuffer.slice(idx + 1);
            if (line) this._handleLine(line);
        }
    }


    _handleLine (line) {
        const parts = line.split(':');
        if (parts.length === 3 && parts[0] === 'DR') {
            const pin = parts[1];
            const val = Number(parts[2]);
            this._lastValues[`DR:${pin}`] = {
                value: isNaN(val) ? 0 : val,
                seq: this._seq++
            };
        } else if (parts.length === 3 && parts[0] === 'AR') {
            const pin = parts[1];
            const val = Number(parts[2]);
            this._lastValues[`AR:${pin}`] = {
                value: isNaN(val) ? 0 : val,
                seq: this._seq++
            };
        } else if (parts.length === 3 && parts[0] === 'SENSE') {
            const sensor = parts[1];
            const val = Number(parts[2]);
            this._lastValues[`SENSE:${sensor}`] = {
                value: isNaN(val) ? 0 : val,
                seq: this._seq++
            };
        }
    }

    async digitalWrite (args) {
        const pin = args.PIN || 'P0';
        const level = (args.LEVEL || '0') === '1' ? 1 : 0;
        await this._sendLine(`DW:${pin}:${level}`);
        return null;
    }

    async analogWrite (args) {
        const pin = args.PIN || 'P0';
        const raw = Number(args.VALUE);
        const value = Math.max(0, Math.min(1023, isNaN(raw) ? 0 : raw));
        await this._sendLine(`AW:${pin}:${value}`);
        return null;
    }

    async _awaitValue (key, prevSeq) {
        const timeout = 200;
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const entry = this._lastValues[key];
            if (entry && entry.seq && entry.seq !== prevSeq) return entry.value;
            await this._sleep(10);
        }
        const entry = this._lastValues[key];
        return entry ? entry.value : 0;
    }

    async digitalRead (args) {
        const pin = args.PIN || 'P0';
        const key = `DR:${pin}`;
        const prevSeq = this._lastValues[key] ? this._lastValues[key].seq : 0;
        await this._sendLine(`DR:${pin}?`);
        return await this._awaitValue(key, prevSeq);
    }

    async analogRead (args) {
        const pin = args.PIN || 'P0';
        const key = `AR:${pin}`;
        const prevSeq = this._lastValues[key] ? this._lastValues[key].seq : 0;
        await this._sendLine(`AR:${pin}?`);
        return await this._awaitValue(key, prevSeq);
    }

    async lcdInit (args) {
        const addr = Number(args.ADDRESS);
        const val = isNaN(addr) ? 39 : addr;
        this._lcdAddress = val;
        await this._sendLine(`LCDINIT:${val}`);
        return null;
    }

    async lcdShowString (args) {
        const val = this._lcdAddress;
        const x = Math.max(0, Number(args.X) || 0);
        const y = Math.max(0, Number(args.Y) || 0);
        const text = this._sanitizeText(args.TEXT);
        await this._sendLine(`LCDSTR:${val}:${x}:${y}:${text}`);
        return null;
    }

    async lcdShowNumber (args) {
        const val = this._lcdAddress;
        const x = Math.max(0, Number(args.X) || 0);
        const y = Math.max(0, Number(args.Y) || 0);
        const num = Number(args.NUM);
        await this._sendLine(`LCDNUM:${val}:${x}:${y}:${isNaN(num) ? 0 : num}`);
        return null;
    }

    async lcdClear () {
        const val = this._lcdAddress;
        await this._sendLine(`LCDCLR:${val}`);
        return null;
    }

    async lcdOn () {
        const val = this._lcdAddress;
        await this._sendLine(`LCDON:${val}`);
        return null;
    }

    async lcdOff () {
        const val = this._lcdAddress;
        await this._sendLine(`LCDOFF:${val}`);
        return null;
    }

    async tmInit () {
        const clk = 'P2';
        const dio = 'P1';
        const brt = 7;
        const digits = 4;
        await this._sendLine(`TMINIT:${clk}:${dio}:${brt}:${digits}`);
        return null;
    }

    async tmShowNumber (args) {
        const num = Number(args.NUM);
        await this._sendLine(`TMNUM:${isNaN(num) ? 0 : num}`);
        return null;
    }

    async tmShowHex (args) {
        const num = Number(args.NUM);
        await this._sendLine(`TMHEX:${isNaN(num) ? 0 : num}`);
        return null;
    }

    async tmShowBit (args) {
        const digitRaw = Number(args.DIGIT);
        const valueRaw = Number(args.VALUE);
        const digit = Math.max(0, Math.min(5, isNaN(digitRaw) ? 0 : digitRaw));
        const value = Math.max(0, Math.min(15, isNaN(valueRaw) ? 0 : valueRaw));
        await this._sendLine(`TMBIT:${digit}:${value}`);
        return null;
    }

    async tmShowDp (args) {
        const digit = 1; // center colon
        const state = (args.STATE || '').toLowerCase() === 'on' ? 1 : 0;
        await this._sendLine(`TMDP:${digit}:${state}`);
        return null;
    }

    async tmClear () {
        await this._sendLine('TMCLEAR');
        return null;
    }

    async tmOn () {
        await this._sendLine('TMON');
        return null;
    }

    async tmOff () {
        await this._sendLine('TMOFF');
        return null;
    }

    async _sense (kind) {
        const key = `SENSE:${kind}`;
        const prevSeq = this._lastValues[key] ? this._lastValues[key].seq : 0;
        await this._sendLine(`SENSE:${kind}?`);
        return await this._awaitValue(key, prevSeq);
    }

    /**
     * Send LED toggle to firmware over WebSerial or BLE (UART).
     * Protocol: LED:<pin>:<0|1>\n (e.g., LED:P0:1)
     * @param {{STATE: string, PIN: string}} args
     */
    async setLed (args) {
        const state = (args.STATE || '').toLowerCase() === 'on' ? 1 : 0;
        const pin = args.PIN || 'P0';
        this._ledOn = state === 1;
        await this._sendLine(`LED:${pin}:${state}`);
        return null;
    }

    async getTemperature () {
        return await this._sense('TEMP');
    }

    // Light / compass removed (matrix off makes readings unstable)

}

module.exports = Scratch3Easyplug;

