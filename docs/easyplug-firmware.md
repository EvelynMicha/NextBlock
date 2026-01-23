EasyPlug custom firmware (micro:bit, USB/WebSerial + radio)
===========================================================

Overview
--------
Firmware for micro:bit matching the EasyPlug Scratch extension over USB/WebSerial **plus radio** (Bluetooth removed). It keeps pin outputs alive (no mode flip on read), turns off the LED matrix, and disables the built-in speaker to reduce P0 noise.

Protocol (each line ends with `\n`)
----------------------------------
- LED / digital write: `LED:<pin>:<0|1>` or `DW:<pin>:<0|1>`
- Digital read: `DR:<pin>?` -> reply `DR:<pin>:<0|1>`
- Analog write (PWM 0-1023): `AW:<pin>:<value>`
- Analog read: `AR:<pin>?` -> reply `AR:<pin>:<value>`
- Built-in sensor:
  - Temperature (°C): `SENSE:TEMP?` -> reply `SENSE:TEMP:<value>`
- LCD (I2C):
  - `LCDINIT:<addr>`
  - `LCDSTR:<addr>:<x>:<y>:<text>`
  - `LCDNUM:<addr>:<x>:<y>:<num>`
  - `LCDCLR:<addr>`
  - `LCDON:<addr>` / `LCDOFF:<addr>`
- TM1637 (7-seg):
  - `TMINIT:<clkPin>:<dioPin>:<brightness0-7>:<digits1-6>`
  - `TMNUM:<num>`
  - `TMHEX:<num>`
  - `TMBIT:<digit0-5>:<hexValue0-15>`
  - `TMDP:<digit0-5>:<0|1>`
  - `TMCLEAR`
  - `TMON` / `TMOFF`
- Radio:
  - `RADIOSET:<0-255>` to set group
  - `RADIOSEND:<text>` to broadcast text/number
  - Incoming packets are forwarded as `RADIO:<payload>`

MakeCode firmware (TypeScript)
------------------------------
Flash this to the micro:bit. Analog-capable pins are P0/P1/P2/P10. Add the `I2C_LCD1602` and `TM1637` extensions in MakeCode for the display commands. Radio is used for wireless messages; Bluetooth is disabled.

```ts
serial.redirectToUSB()
serial.setBaudRate(BaudRate.BaudRate115200)
radio.setGroup(1)
led.enable(false) // free shared pins
music.setBuiltInSpeakerEnabled(false) // reduce noise on P0

const NL = serial.delimiters(Delimiters.NewLine)

interface PinState { mode: "digitalOut" | "analogOut" | "input"; dval: number; aval: number }
const pinsState: {[key: string]: PinState} = {}
function ensure(pin: string) { if (!pinsState[pin]) pinsState[pin] = {mode: "input", dval: 0, aval: 0} }

function pinToDigital(pin: string): DigitalPin {
    return pin == "P0" ? DigitalPin.P0 : pin == "P1" ? DigitalPin.P1 : pin == "P2" ? DigitalPin.P2 :
           pin == "P3" ? DigitalPin.P3 : pin == "P4" ? DigitalPin.P4 : pin == "P5" ? DigitalPin.P5 :
           pin == "P6" ? DigitalPin.P6 : pin == "P7" ? DigitalPin.P7 : pin == "P8" ? DigitalPin.P8 :
           pin == "P10" ? DigitalPin.P10 : pin == "P11" ? DigitalPin.P11 : DigitalPin.P12;
}
function pinToAnalog(pin: string): AnalogPin {
    return pin == "P0" ? AnalogPin.P0 : pin == "P1" ? AnalogPin.P1 : pin == "P10" ? AnalogPin.P10 : AnalogPin.P2;
}
function isAnalogCapable(pin: string): boolean { return pin == "P0" || pin == "P1" || pin == "P2" || pin == "P10"; }

function setDigital(pin: string, value: number) {
    ensure(pin); pinsState[pin].mode = "digitalOut"; pinsState[pin].dval = value;
    pins.digitalWritePin(pinToDigital(pin), value);
}
function setAnalog(pin: string, value: number) {
    ensure(pin); pinsState[pin].mode = "analogOut"; pinsState[pin].aval = value;
    pins.analogWritePin(pinToAnalog(pin), value);
}

function readDigital(pin: string): number {
    ensure(pin);
    const s = pinsState[pin];
    if (s.mode == "digitalOut") return s.dval;
    if (s.mode == "analogOut") return s.aval > 0 ? 1 : 0;
    s.mode = "input";
    const v = pins.digitalReadPin(pinToDigital(pin));
    s.dval = v;
    return v;
}

function readAnalog(pin: string): number {
    ensure(pin);
    const s = pinsState[pin];
    if (!isAnalogCapable(pin)) return s.mode == "analogOut" ? s.aval : 0;
    if (s.mode == "analogOut") return s.aval;
    const v = pins.analogReadPin(pinToAnalog(pin));
    s.aval = v; s.mode = "input";
    return v;
}

function writeLine(msg: string) {
    const line = msg + "\n";
    serial.writeString(line);
}

// LCD: requires I2C_LCD1602 package
// TM1637: requires TM1637 package (EasyPlug shield: CLK=P2, DIO=P1)
let myTm = TM1637.create(DigitalPin.P2, DigitalPin.P1, 7, 4) // default; overwritten on TMINIT

function handleLine(line: string) {
    if (line.length <= 0) return;
    const parts = line.split(":");
    const cmd = parts[0];

    if (cmd == "LED" || cmd == "DW") {
        if (parts.length == 3) {
            const pin = parts[1];
            const val = parseInt(parts[2]);
            if (val == 0 || val == 1) setDigital(pin, val);
        }
    } else if (cmd == "DR") {
        if (parts.length >= 2) {
            const pin = parts[1].replace("?", "");
            const value = readDigital(pin);
            writeLine("DR:" + pin + ":" + value);
        }
    } else if (cmd == "AW") {
        if (parts.length == 3) {
            const pin = parts[1];
            if (!isAnalogCapable(pin)) { writeLine("AR:" + pin + ":0"); return; }
            let val = parseInt(parts[2]); if (val < 0) val = 0; if (val > 1023) val = 1023;
            setAnalog(pin, val);
        }
    } else if (cmd == "AR") {
        if (parts.length >= 2) {
            const pin = parts[1].replace("?", "");
            const value = readAnalog(pin);
            writeLine("AR:" + pin + ":" + value);
        }
    // LCD handling (requires I2C_LCD1602 extension)
    } else if (cmd == "LCDINIT" && parts.length == 2) {
        const addr = parseInt(parts[1]);
        I2C_LCD1602.LcdInit(addr);
    } else if (cmd == "LCDSTR" && parts.length >= 5) {
        const addr = parseInt(parts[1]);
        const x = parseInt(parts[2]);
        const y = parseInt(parts[3]);
        const text = parts.slice(4).join(":");
        I2C_LCD1602.ShowString(text, x, y);
    } else if (cmd == "LCDNUM" && parts.length == 5) {
        const addr = parseInt(parts[1]);
        const x = parseInt(parts[2]);
        const y = parseInt(parts[3]);
        const num = parseFloat(parts[4]);
        I2C_LCD1602.ShowNumber(num, x, y);
    } else if (cmd == "LCDCLR" && parts.length == 2) {
        I2C_LCD1602.clear();
    } else if (cmd == "LCDON" && parts.length == 2) {
        I2C_LCD1602.on();
    } else if (cmd == "LCDOFF" && parts.length == 2) {
        I2C_LCD1602.off();
    // TM1637 handling (requires TM1637 extension)
    } else if (cmd == "TMINIT" && parts.length == 5) {
        const clk = pinToDigital(parts[1]);
        const dio = pinToDigital(parts[2]);
        const brt = parseInt(parts[3]);
        const digits = parseInt(parts[4]);
        myTm = TM1637.create(clk, dio, brt, digits); myTm.clear(); myTm.on();
    } else if (cmd == "TMNUM" && parts.length == 2) {
        myTm.showNumber(parseFloat(parts[1]));
    } else if (cmd == "TMHEX" && parts.length == 2) {
        myTm.showHex(parseFloat(parts[1]));
    } else if (cmd == "TMBIT" && parts.length == 3) {
        myTm.showbit(parseInt(parts[2]), parseInt(parts[1]));
    } else if (cmd == "TMDP" && parts.length == 3) {
        myTm.showDP(parseInt(parts[1]), parseInt(parts[2]) != 0);
    } else if (cmd == "TMCLEAR") {
        myTm.clear();
    } else if (cmd == "TMON") {
        myTm.on();
    } else if (cmd == "TMOFF") {
        myTm.off();
    // Built-in sensor (temperature)
    } else if (cmd == "SENSE" && parts.length == 2) {
        const kind = parts[1].replace("?", "");
        if (kind == "TEMP") {
            const t = input.temperature();
            writeLine("SENSE:TEMP:" + t);
        }
    } else if (cmd == "RADIOSET" && parts.length == 2) {
        const grp = Math.max(0, Math.min(255, parseInt(parts[1])));
        radio.setGroup(grp);
    } else if (cmd == "RADIOSEND" && parts.length >= 2) {
        const payload = parts.slice(1).join(":");
        radio.sendString(payload);
    }
}

serial.onDataReceived(NL, function () {
    const line = serial.readUntil(NL);
    handleLine(line);
});

radio.onReceivedString(function (msg: string) {
    writeLine("RADIO:" + msg);
});
```

Usage (USB/WebSerial)
---------------------
1) Flash the sketch above to the micro:bit.  
2) In Scratch, EasyPlug -> connect (USB/WebSerial) ?a? d???e?e t? s?s?e??. Radio ?e?t????e? a?t?µata st?? ?d?a ?µ?da.  
3) Digital write/read: P0/P1/P2/P3/P4/P5/P6/P7/P8/P10/P11/P12.  
   Analog write/read: P0/P1/P2/P10 (note P0 may buzz; firmware disables speaker).  
4) LCD blocks: init once with address (default 39/0x27), then show string/number/clear/on/off.  
5) TM1637 blocks: init uses fixed CLK=P2, DIO=P1 (EasyPlug shield), brightness 7, digits 4; then show number/hex/digit/DP, clear/on/off.  
6) Built-in reporter: temperature (°C) responds via `SENSE:TEMP?`.  

Easy Plug Shield (Keystudio) pin notes
--------------------------------------
- Safer digital: P3, P4, P5, P6, P7, P8, P11, P12 (plus P0/P1/P2/P10).  
- Analog: P0, P1, P2, P10.  
- Avoid unless needed: P13/P14/P15 (SPI), P19/P20 (I2C/IMU).  
- LED matrix off (`led.enable(false)`) so shared pins are quieter; speaker off to reduce P0 noise.  
