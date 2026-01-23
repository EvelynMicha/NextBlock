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

class Scratch3HttpApi {
    constructor (runtime) {
        this.runtime = runtime;
        this._lastText = '';
        this._lastJson = null;
        this._lastStatus = 0;
        this._handles = Object.create(null); // id -> value
        this._nextId = 1;
        this._lastHandle = '';
    }

    getInfo () {
        return {
            id: 'httpapi',
            name: formatMessage({
                id: 'extension.httpapi.name',
                default: L('HTTP / API', 'HTTP / API'),
                description: 'Generic HTTP fetch extension'
            }),
            color1: '#009688',
            color2: '#009688',
            blocks: [
                {
                    opcode: 'fetchJson',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.httpapi.fetchJson',
                        default: L('fetch JSON from [URL]', 'πάρε JSON από [URL]'),
                        description: 'Fetch JSON'
                    }),
                    arguments: {
                        URL: {
                            type: ArgumentType.STRING,
                            defaultValue: 'https://api.github.com'
                        }
                    }
                },
                {
                    opcode: 'parseJson',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.httpapi.parseJson',
                        default: L('parse json [TEXT]', 'ανάλυσε json [TEXT]'),
                        description: 'Parse JSON text to a handle'
                    }),
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: '{"hello": "world"}'
                        }
                    }
                },
                {
                    opcode: 'lastText',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.httpapi.lastText',
                        default: L('last response text', 'τελευταίο κείμενο απάντησης'),
                        description: 'Last response text'
                    })
                },
                {
                    opcode: 'lastStatus',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.httpapi.lastStatus',
                        default: L('last status', 'τελευταίο status'),
                        description: 'Last HTTP status'
                    })
                },
                {
                    opcode: 'lastHandle',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.httpapi.lastHandle',
                        default: L('last json handle', 'τελευταίο json handle'),
                        description: 'Handle to last JSON'
                    })
                },
                {
                    opcode: 'jsonKeys',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.httpapi.jsonKeys',
                        default: L('json keys at [PATH] in [HANDLE]', 'json κλειδιά στο [PATH] στο [HANDLE]'),
                        description: 'List of keys/indices at path'
                    }),
                    arguments: {
                        PATH: {type: ArgumentType.STRING, defaultValue: ''},
                        HANDLE: {type: ArgumentType.STRING, defaultValue: 'last'}
                    }
                },
                {
                    opcode: 'jsonType',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.httpapi.jsonType',
                        default: L('json type at [PATH] in [HANDLE]', 'json τύπος στο [PATH] στο [HANDLE]'),
                        description: 'Type at path'
                    }),
                    arguments: {
                        PATH: {type: ArgumentType.STRING, defaultValue: ''},
                        HANDLE: {type: ArgumentType.STRING, defaultValue: 'last'}
                    }
                },
                {
                    opcode: 'getProperty',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.httpapi.getProperty',
                        default: L('property [KEY] of [HANDLE]', 'ιδιότητα [KEY] του [HANDLE]'),
                        description: 'Get property of object'
                    }),
                    arguments: {
                        KEY: {type: ArgumentType.STRING, defaultValue: 'slip'},
                        HANDLE: {type: ArgumentType.STRING, defaultValue: 'last'}
                    }
                },
                {
                    opcode: 'getItem',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.httpapi.getItem',
                        default: L('item [INDEX] of [HANDLE]', 'στοιχείο [INDEX] του [HANDLE]'),
                        description: 'Get item from array'
                    }),
                    arguments: {
                        INDEX: {type: ArgumentType.NUMBER, defaultValue: 0},
                        HANDLE: {type: ArgumentType.STRING, defaultValue: 'last'}
                    }
                },
                {
                    opcode: 'stringify',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.httpapi.stringify',
                        default: L('stringify [HANDLE]', 'stringify [HANDLE]'),
                        description: 'Stringify handle'
                    }),
                    arguments: {
                        HANDLE: {type: ArgumentType.STRING, defaultValue: 'last'}
                    }
                },
                {
                    opcode: 'lengthOf',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.httpapi.lengthOf',
                        default: L('length of [HANDLE]', 'μήκος του [HANDLE]'),
                        description: 'Length of array or keys of object'
                    }),
                    arguments: {
                        HANDLE: {type: ArgumentType.STRING, defaultValue: 'last'}
                    }
                },
                {
                    opcode: 'hasKey',
                    blockType: BlockType.BOOLEAN,
                    text: formatMessage({
                        id: 'extension.httpapi.hasKey',
                        default: L('has key [KEY] in [HANDLE]', 'έχει κλειδί [KEY] στο [HANDLE]'),
                        description: 'Check key'
                    }),
                    arguments: {
                        KEY: {type: ArgumentType.STRING, defaultValue: 'slip'},
                        HANDLE: {type: ArgumentType.STRING, defaultValue: 'last'}
                    }
                }
            ]
        };
    }

    _newHandle (value) {
        const id = `json_${this._nextId++}`;
        this._handles[id] = value;
        return id;
    }

    _getHandle (id) {
        const key = (id || '').trim() || 'last';
        if (key === 'last') return this._lastJson;
        return this._handles[key];
    }

    async fetchJson (args) {
        this._lastText = '';
        this._lastJson = null;
        this._lastStatus = 0;
        this._lastHandle = '';
        const cleanUrl = (args.URL || '').trim();
        if (!cleanUrl) throw new Error('URL required');
        const res = await fetchWithTimeout(cleanUrl, {}, 10000);
        this._lastStatus = res.status || 0;
        const text = await res.text();
        this._lastText = text;
        try {
            this._lastJson = JSON.parse(text);
            this._lastHandle = this._newHandle(this._lastJson);
        } catch (e) {
            log.warn('JSON parse failed', e);
            this._lastJson = null;
            this._lastHandle = '';
        }
        return null;
    }

    parseJson (args) {
        const txt = args.TEXT || '';
        try {
            const obj = JSON.parse(txt);
            const h = this._newHandle(obj);
            this._lastHandle = h;
            return h;
        } catch (e) {
            log.warn('parseJson failed', e);
            return '';
        }
    }

    lastText () {
        return this._lastText || '';
    }
    lastStatus () {
        return this._lastStatus || 0;
    }
    lastHandle () {
        return this._lastHandle || '';
    }

    _resolveJsonPath (pathStr, handleId) {
        const root = this._getHandle(handleId);
        if (root === undefined) return {ok: false, value: null};
        const raw = (pathStr || '').trim();
        if (!raw) return {ok: true, value: root};
        const tokens = [];
        const re = /[^.[\]]+/g;
        let m;
        while ((m = re.exec(raw)) !== null) tokens.push(m[0]);
        let cur = root;
        for (const t of tokens) {
            const key = /^\d+$/.test(t) ? Number(t) : t;
            if (cur && Object.prototype.hasOwnProperty.call(cur, key)) {
                cur = cur[key];
            } else {
                return {ok: false, value: null};
            }
        }
        return {ok: true, value: cur};
    }

    jsonKeys (args) {
        const res = this._resolveJsonPath(args.PATH || '', args.HANDLE || 'last');
        if (!res.ok || res.value === null || res.value === undefined) return '';
        const val = res.value;
        if (Array.isArray(val)) {
            return val.map((_, i) => i).join(',');
        } else if (typeof val === 'object') {
            return Object.keys(val).join(',');
        }
        return '';
    }

    jsonType (args) {
        const res = this._resolveJsonPath(args.PATH || '', args.HANDLE || 'last');
        if (!res.ok) return '';
        const v = res.value;
        if (Array.isArray(v)) return 'array';
        if (v === null) return 'null';
        return typeof v;
    }

    getProperty (args) {
        const obj = this._getHandle(args.HANDLE);
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return '';
        const key = args.KEY || '';
        if (!Object.prototype.hasOwnProperty.call(obj, key)) return '';
        return this._valueToReturn(obj[key]);
    }

    getItem (args) {
        const arr = this._getHandle(args.HANDLE);
        if (!Array.isArray(arr)) return '';
        const idx = Math.max(0, Math.floor(Number(args.INDEX) || 0));
        if (idx >= arr.length) return '';
        return this._valueToReturn(arr[idx]);
    }

    stringify (args) {
        const v = this._getHandle(args.HANDLE);
        try {
            return JSON.stringify(v);
        } catch (e) {
            return '';
        }
    }

    lengthOf (args) {
        const v = this._getHandle(args.HANDLE);
        if (Array.isArray(v)) return v.length;
        if (v && typeof v === 'object') return Object.keys(v).length;
        return 0;
    }

    hasKey (args) {
        const obj = this._getHandle(args.HANDLE);
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
        const key = args.KEY || '';
        return Object.prototype.hasOwnProperty.call(obj, key);
    }

    _valueToReturn (val) {
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') {
            const h = this._newHandle(val);
            this._lastHandle = h;
            return h;
        }
        return val;
    }
}

module.exports = Scratch3HttpApi;
