const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const formatMessage = require('format-message');

// Guard for browser support.
const SpeechRecognition = (typeof window !== 'undefined') &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

class Scratch3Speech {
    constructor (runtime) {
        this.runtime = runtime;
        this._supported = Boolean(SpeechRecognition);
        this._recognizer = null;
        this._listening = false;
        this._lastTranscript = '';
    }

    _isGreek () {
        const loc = (this.runtime && this.runtime.locale) || '';
        return loc.toLowerCase().startsWith('el');
    }

    getInfo () {
        const isGR = this._isGreek();
        const tr = (en, gr) => (isGR ? gr : en);
        return {
            id: 'speech',
            name: tr('Speech to Text', 'Ομιλία σε κείμενο'),
            color1: '#0F9FD6',
            color2: '#0D86B5',
            color3: '#0C769F',
            blocks: [
                {
                    opcode: 'startListening',
                    blockType: BlockType.COMMAND,
                    text: tr('start listening [LANG]', 'ξεκίνα ακρόαση [LANG]'),
                    arguments: {
                        LANG: {
                            type: ArgumentType.STRING,
                            menu: 'LANG_MENU',
                            defaultValue: 'en-US'
                        }
                    }
                },
                {
                    opcode: 'stopListening',
                    blockType: BlockType.COMMAND,
                    text: tr('stop listening', 'σταμάτα την ακρόαση')
                },
                {
                    opcode: 'whenSpeech',
                    blockType: BlockType.HAT,
                    isEdgeActivated: true,
                    text: tr('when speech is heard', 'όταν ακούγεται ομιλία')
                },
                {
                    opcode: 'whenTranscriptContains',
                    blockType: BlockType.HAT,
                    isEdgeActivated: true,
                    text: tr('when transcript contains [WORD]', 'όταν το κείμενο περιέχει [WORD]'),
                    arguments: {
                        WORD: {
                            type: ArgumentType.STRING,
                            defaultValue: 'hello'
                        }
                    }
                },
                {
                    opcode: 'lastTranscript',
                    blockType: BlockType.REPORTER,
                    text: tr('last transcript', 'τελευταίο κείμενο')
                },
                {
                    opcode: 'isListening',
                    blockType: BlockType.BOOLEAN,
                    text: tr('listening?', 'ακούει;')
                },
                {
                    opcode: 'supported',
                    blockType: BlockType.BOOLEAN,
                    text: tr('speech to text supported?', 'υποστηρίζεται ομιλία σε κείμενο;')
                }
            ],
            menus: {
                LANG_MENU: ['en-US', 'el-GR', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'pt-PT', 'ru-RU']
            }
        };
    }

    _ensureRecognizer (lang) {
        if (!this._supported) return;
        if (!this._recognizer) {
            this._recognizer = new SpeechRecognition();
            this._recognizer.continuous = true;
            this._recognizer.interimResults = true; // get partials to update sooner
            this._recognizer.maxAlternatives = 1;
            this._recognizer.onresult = event => {
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const res = event.results[i];
                    if (res[0] && res[0].transcript) {
                        // update even on interim to let the user see text
                        if (res.isFinal) this._handleTranscript(res[0].transcript);
                        else this._lastTranscript = String(res[0].transcript).trim();
                    }
                }
            };
            this._recognizer.onstart = () => { this._listening = true; };
            this._recognizer.onend = () => { this._listening = false; };
            this._recognizer.onerror = () => { this._listening = false; };
        }
        this._recognizer.lang = lang || 'en-US';
    }

    _handleTranscript (text) {
        const transcript = String(text || '').trim();
        if (!transcript) return;
        this._lastTranscript = transcript;
        // Fire generic hat.
        this.runtime.startHats('speech_whenSpeech');
        // Fire per-word hats.
        const words = transcript.toLowerCase().match(/[a-z\u0370-\u03ff\u1f00-\u1fff']+/g) || [];
        const seen = new Set();
        for (const w of words) {
            if (seen.has(w)) continue;
            seen.add(w);
            this.runtime.startHats('speech_whenTranscriptContains', {WORD: w});
        }
    }

    startListening (args) {
        if (!this._supported) return;
        const lang = args.LANG || 'en-US';
        this._ensureRecognizer(lang);
        // Warm up microphone permissions explicitly.
        const startRecognizer = () => {
            try {
                this._recognizer.start();
                this._listening = true;
            } catch (e) {
                // Ignore start errors (often "already started").
            }
        };
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({audio: true})
                .then(() => startRecognizer())
                .catch(() => startRecognizer()); // even if denied, attempt so user sees permission UI
        } else {
            startRecognizer();
        }
    }

    stopListening () {
        if (!this._supported || !this._recognizer) return;
        try {
            this._recognizer.stop();
        } catch (e) {
            // ignore
        }
        this._listening = false;
        this._lastTranscript = this._lastTranscript || '';
    }

    whenSpeech () {
        // fired via runtime.startHats in _handleTranscript
        return true;
    }

    whenTranscriptContains (args) {
        // fired via runtime.startHats with WORD matching the detected word
        return true;
    }

    lastTranscript () {
        return this._lastTranscript;
    }

    isListening () {
        return this._listening;
    }

    supported () {
        return this._supported;
    }
}

module.exports = Scratch3Speech;
