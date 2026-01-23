const ArgumentType = require('../extension-support/argument-type');
const BlockType = require('../extension-support/block-type');
const formatMessage = require('format-message');
const {fetchWithTimeout} = require('../util/fetch-with-timeout');
const log = require('../util/log');

const isGreek = () => {
    const setup = formatMessage.setup && formatMessage.setup();
    const lang = (setup && setup.locale ? setup.locale : '').toLowerCase();
    return lang.startsWith('el');
};
const L = (en, el) => (isGreek() ? el : en);

class Scratch3Weather {
    constructor (runtime) {
        this.runtime = runtime;
        this._location = {name: '', lat: null, lon: null};
        this._last = {};
    }

    getInfo () {
        return {
            id: 'weather',
            name: formatMessage({
                id: 'extension.weather.name',
                default: L('Weather', 'Καιρός'),
                description: 'Weather data'
            }),
            color1: '#2E95FF',
            color2: '#2E95FF',
            blocks: [
                {
                    opcode: 'setLocation',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.weather.setLocation',
                        default: L('set location [PLACE]', 'όρισε τοποθεσία [PLACE]'),
                        description: 'Set city/location'
                    }),
                    arguments: {
                        PLACE: {
                            type: ArgumentType.STRING,
                            defaultValue: 'Athens'
                        }
                    }
                },
                {
                    opcode: 'updateNow',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.weather.update',
                        default: L('update weather', 'ενημέρωσε καιρό'),
                        description: 'Fetch latest weather'
                    })
                },
                {
                    opcode: 'temperature',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.weather.temp',
                        default: L('temperature °C', 'θερμοκρασία °C'),
                        description: 'Temperature'
                    })
                },
                {
                    opcode: 'apparent',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.weather.apparent',
                        default: L('feels like °C', 'αισθητή °C'),
                        description: 'Apparent temperature'
                    })
                },
                {
                    opcode: 'windspeed',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.weather.wind',
                        default: L('wind speed km/h', 'ταχύτητα ανέμου km/h'),
                        description: 'Wind speed'
                    })
                },
                {
                    opcode: 'winddir',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.weather.winddir',
                        default: L('wind direction °', 'διεύθυνση ανέμου °'),
                        description: 'Wind direction degrees'
                    })
                },
                {
                    opcode: 'condition',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.weather.condition',
                        default: L('condition', 'καιρική συνθήκη'),
                        description: 'Weather condition text'
                    })
                },
                {
                    opcode: 'humidity',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.weather.humidity',
                        default: L('humidity %', 'υγρασία %'),
                        description: 'Relative humidity'
                    })
                },
                {
                    opcode: 'cloudcover',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.weather.cloud',
                        default: L('cloud cover %', 'νεφοκάλυψη %'),
                        description: 'Cloud cover percent'
                    })
                },
                {
                    opcode: 'precip',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.weather.precip',
                        default: L('precip mm', 'υετός mm'),
                        description: 'Total precipitation (rain+snow)'
                    })
                },
                {
                    opcode: 'rain',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.weather.rain',
                        default: L('rain mm', 'βροχή mm'),
                        description: 'Rain amount'
                    })
                },
                {
                    opcode: 'weathercode',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.weather.code',
                        default: L('weather code', 'κωδικός καιρού'),
                        description: 'Raw weather code'
                    })
                },
                {
                    opcode: 'lastUpdate',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.weather.time',
                        default: L('last update', 'τελευταία ενημέρωση'),
                        description: 'Timestamp of last fetch'
                    })
                }
            ]
        };
    }

    async setLocation (args) {
        const place = (args.PLACE || '').trim();
        if (!place) throw new Error('Place is required');
        const url = `https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&name=${encodeURIComponent(place)}`;
        try {
            const res = await fetchWithTimeout(url, {}, 8000);
            const data = await res.json();
            if (!data || !data.results || !data.results[0]) throw new Error('Location not found');
            const loc = data.results[0];
            this._location = {name: loc.name, lat: loc.latitude, lon: loc.longitude};
            await this.updateNow();
        } catch (e) {
            log.warn('Weather geocode failed', e);
            throw e;
        }
        return null;
    }

    async updateNow () {
        if (this._location.lat == null || this._location.lon == null) {
            throw new Error('Set location first');
        }
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${this._location.lat}&longitude=${this._location.lon}&current_weather=true&hourly=relativehumidity_2m,apparent_temperature,precipitation,rain,cloudcover`;
        try {
            const res = await fetchWithTimeout(url, {}, 8000);
            const data = await res.json();
            if (!data || !data.current_weather) throw new Error('No weather data');

            const cw = data.current_weather;
            this._last.temp = cw.temperature;
            this._last.wind = cw.windspeed;
            this._last.winddir = cw.winddirection;
            this._last.code = cw.weathercode;
            this._last.time = cw.time;

            const pickHourly = key => {
                if (!data.hourly || !Array.isArray(data.hourly[key])) return null;
                // Try to align with current_weather time
                if (data.hourly.time && Array.isArray(data.hourly.time)) {
                    const idx = data.hourly.time.indexOf(cw.time);
                    if (idx >= 0 && data.hourly[key][idx] != null) return data.hourly[key][idx];
                }
                return data.hourly[key][0];
            };

            this._last.humidity = pickHourly('relativehumidity_2m') || 0;
            this._last.apparent = pickHourly('apparent_temperature') || cw.temperature;
            this._last.precip = pickHourly('precipitation') || 0;
            this._last.rain = pickHourly('rain') || 0;
            this._last.cloud = pickHourly('cloudcover') || 0;
        } catch (e) {
            log.warn('Weather fetch failed', e);
            throw e;
        }
        return null;
    }

    temperature () {
        return this._last.temp || 0;
    }
    windspeed () {
        return this._last.wind || 0;
    }
    winddir () {
        return this._last.winddir || 0;
    }
    humidity () {
        return this._last.humidity || 0;
    }
    apparent () {
        return this._last.apparent || this._last.temp || 0;
    }
    cloudcover () {
        return this._last.cloud || 0;
    }
    precip () {
        return this._last.precip || 0;
    }
    rain () {
        return this._last.rain || 0;
    }
    condition () {
        const code = this._last.code;
        if (code == null) return '';
        // Basic mapping
        const map = {
            0: L('clear', 'καθαρός'),
            1: L('mainly clear', 'κυρίως καθαρός'),
            2: L('partly cloudy', 'μερική συννεφιά'),
            3: L('overcast', 'συννεφιά'),
            45: L('fog', 'ομίχλη'),
            48: L('fog', 'ομίχλη'),
            51: L('drizzle', 'ψιχάλες'),
            61: L('rain', 'βροχή'),
            71: L('snow', 'χιόνι'),
            95: L('storm', 'καταιγίδα')
        };
        return map[code] || String(code);
    }
    weathercode () {
        return this._last.code || 0;
    }
    lastUpdate () {
        return this._last.time || '';
    }
}

module.exports = Scratch3Weather;
