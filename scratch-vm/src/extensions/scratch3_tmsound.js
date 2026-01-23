/* global navigator */
const ArgumentType = require('../extension-support/argument-type');
const BlockType = require('../extension-support/block-type');
const formatMessage = require('format-message');
const log = require('../util/log');

const isGreek = () => {
    const setup = formatMessage.setup && formatMessage.setup();
    const lang = (setup && setup.locale ? setup.locale : '').toLowerCase();
    return lang.startsWith('el');
};
const L = (en, el) => (isGreek() ? el : en);

class Scratch3TMSound {
    constructor (runtime) {
        this.runtime = runtime;
        this._tf = null;
        this._speech = null;
        this._recognizer = null;
        this._labels = [];
        this._last = {label: '', confidence: 0};
        this._lastDistribution = [];
        this._threshold = 0.6;
        this._running = false;
    }

    getInfo () {
        return {
            id: 'tmsound',
            name: formatMessage({
                id: 'extension.tmsound.name',
                default: L('AI Audio (TM)', 'AI Ήχος (TM)'),
                description: 'Teachable Machine audio classifier'
            }),
            color1: '#FF8C00',
            color2: '#FF8C00',
            blocks: [
                {
                    opcode: 'loadModel',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.tmsound.load',
                        default: L('load TM sound model [URL]', 'φόρτωσε TM μοντέλο ήχου [URL]'),
                        description: 'Load a TM sound model'
                    }),
                    arguments: {
                        URL: {
                            type: ArgumentType.STRING,
                            defaultValue: 'https://teachablemachine.withgoogle.com/models/XXXX/'
                        }
                    }
                },
                {
                    opcode: 'classifyOnce',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.tmsound.classifyOnce',
                        default: L('classify sound once', 'ταξινόμησε ήχο μία φορά'),
                        description: 'Classify one audio window'
                    })
                },
                {
                    opcode: 'startRecognition',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.tmsound.start',
                        default: L('start sound recognition', 'ξεκίνα αναγνώριση ήχου'),
                        description: 'Start streaming classification'
                    })
                },
                {
                    opcode: 'stopRecognition',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.tmsound.stop',
                        default: L('stop sound recognition', 'σταμάτα αναγνώριση ήχου'),
                        description: 'Stop streaming classification'
                    })
                },
                {
                    opcode: 'lastLabel',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.tmsound.lastLabel',
                        default: L('last sound label', 'τελευταία ετικέτα ήχου'),
                        description: 'Last predicted label'
                    })
                },
                {
                    opcode: 'lastConfidence',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.tmsound.confidence',
                        default: L('last confidence', 'τελευταία εμπιστοσύνη'),
                        description: 'Confidence of last prediction'
                    })
                },
                {
                    opcode: 'confidenceOf',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.tmsound.confidenceOf',
                        default: L('confidence of [LABEL]', 'εμπιστοσύνη για [LABEL]'),
                        description: 'Confidence of a label from last prediction'
                    }),
                    arguments: {
                        LABEL: {
                            type: ArgumentType.STRING,
                            defaultValue: 'class 0'
                        }
                    }
                },
                {
                    opcode: 'isModelLoaded',
                    blockType: BlockType.BOOLEAN,
                    text: formatMessage({
                        id: 'extension.tmsound.modelLoaded',
                        default: L('model loaded?', 'μοντέλο φορτώθηκε;'),
                        description: 'Is TM model loaded'
                    })
                },
                {
                    opcode: 'isRecognitionRunning',
                    blockType: BlockType.BOOLEAN,
                    text: formatMessage({
                        id: 'extension.tmsound.running',
                        default: L('recognition running?', 'τρέχει αναγνώριση;'),
                        description: 'Is recognition loop running'
                    })
                },
                {
                    opcode: 'setThreshold',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.tmsound.threshold',
                        default: L('set confidence threshold [T]', 'όρισε όριο εμπιστοσύνης [T]'),
                        description: 'Set minimum confidence'
                    }),
                    arguments: {
                        T: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0.6
                        }
                    }
                }
            ]
        };
    }

    async _ensureSpeech () {
        if (this._speech) return this._speech;
        // load tfjs if needed
        if (typeof window !== 'undefined' && !window.tf) {
            await new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.18.0/dist/tf.min.js';
                s.onload = () => resolve();
                s.onerror = e => reject(e);
                document.head.appendChild(s);
            });
        }
        await new Promise((resolve, reject) => {
            const existing = document.querySelector('script[data-speechcommands]');
            if (existing) {
                existing.addEventListener('load', () => resolve(), {once: true});
                existing.addEventListener('error', err => reject(err), {once: true});
                return;
            }
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/speech-commands@0.5.4/dist/speech-commands.min.js';
            s.async = true;
            s.dataset.speechcommands = 'true';
            s.onload = () => resolve();
            s.onerror = e => reject(e);
            document.head.appendChild(s);
        });
        if (!window.speechCommands) throw new Error('Unable to load speech-commands');
        this._speech = window.speechCommands;
        return this._speech;
    }

    _normalizeUrls (urlRaw) {
        let base = (urlRaw || '').trim();
        if (!base) throw new Error('Model URL is required');
        if (base.endsWith('model.json')) {
            const idx = base.lastIndexOf('/');
            base = base.slice(0, idx + 1);
        }
        if (!base.endsWith('/')) base += '/';
        return {
            modelUrl: `${base}model.json`,
            metadataUrl: `${base}metadata.json`
        };
    }

    async loadModel (args) {
        const urlRaw = args.URL || '';
        const {modelUrl, metadataUrl} = this._normalizeUrls(urlRaw);
        const speech = await this._ensureSpeech();
        this._recognizer = speech.create('BROWSER_FFT', undefined, modelUrl, metadataUrl);
        await this._recognizer.ensureModelLoaded();
        this._labels = this._recognizer.wordLabels();
        this._last = {label: '', confidence: 0};
        this._lastDistribution = [];
        return null;
    }

    _processScores (scores) {
        let bestIdx = 0;
        let bestVal = scores[0];
        for (let i = 1; i < scores.length; i++) {
            if (scores[i] > bestVal) {
                bestVal = scores[i];
                bestIdx = i;
            }
        }
        const dist = Array.from(scores).map((v, i) => ({
            label: this._labels[i] || `class ${i}`,
            confidence: Math.round(v * 1000) / 1000
        })).sort((a, b) => b.confidence - a.confidence);
        const top = dist[0];
        let label = top ? top.label : 'none';
        const conf = top ? top.confidence : 0;
        if (conf < this._threshold) label = 'none';
        this._last = {label, confidence: conf};
        this._lastDistribution = dist;
        return label;
    }

    async classifyOnce () {
        if (!this._recognizer) throw new Error('Load model first');
        const res = await this._recognizer.recognizeOnce();
        return this._processScores(res.scores);
    }

    async startRecognition () {
        if (!this._recognizer) throw new Error('Load model first');
        if (this._running) return null;
        this._running = true;
        await this._recognizer.listen(result => {
            try {
                this._processScores(result.scores);
            } catch (e) {
                log.warn('TM sound listen error', e);
            }
        }, {
            includeSpectrogram: false,
            probabilityThreshold: this._threshold,
            overlapFactor: 0.5
        });
        return null;
    }

    async stopRecognition () {
        if (this._recognizer && this._running) {
            await this._recognizer.stopListening();
        }
        this._running = false;
        return null;
    }

    lastLabel () {
        return this._last.label;
    }
    lastConfidence () {
        return this._last.confidence;
    }
    confidenceOf (args) {
        const target = (args.LABEL || '').toLowerCase();
        const hit = this._lastDistribution.find(e => e.label.toLowerCase() === target);
        return hit ? hit.confidence : 0;
    }
    isModelLoaded () {
        return !!this._recognizer;
    }
    isRecognitionRunning () {
        return !!this._running;
    }
    setThreshold (args) {
        const v = Number(args.T);
        const t = isNaN(v) ? 0 : Math.max(0, Math.min(1, v));
        this._threshold = t;
        return null;
    }
}

module.exports = Scratch3TMSound;
