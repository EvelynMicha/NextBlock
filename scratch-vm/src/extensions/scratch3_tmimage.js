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

class Scratch3TMImage {
    constructor (runtime) {
        this.runtime = runtime;
        this._tf = null;
        this._model = null;
        this._labels = [];
        this._last = {label: '', confidence: 0};
        this._lastDistribution = [];
        this._inputSize = 224;
        this._threshold = 0.0; // 0..1
        this._minInterval = 300; // ms
        this._lastRun = 0;
        this._activeSource = 'camera'; // camera | stage
        this._loopHandle = null;
        this._loopBusy = false;
    }

    getInfo () {
        return {
            id: 'tmimage',
            name: formatMessage({
                id: 'extension.tmimage.name',
                default: L('AI Image (TM)', 'AI Εικόνα (TM)'),
                description: 'Teachable Machine image classifier'
            }),
            color1: '#4B9EFA',
            color2: '#4B9EFA',
            blocks: [
                {
                    opcode: 'loadModel',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.tmimage.load',
                        default: L('load TM model [URL]', 'φόρτωσε TM μοντέλο [URL]'),
                        description: 'Load a Teachable Machine model'
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
                        id: 'extension.tmimage.classifyOnce',
                        default: L('classify once from [SRC]', 'ταξινόμησε μία φορά από [SRC]'),
                        description: 'Classify one frame'
                    }),
                    arguments: {
                        SRC: {
                            type: ArgumentType.STRING,
                            menu: 'sourceMenu',
                            defaultValue: 'camera'
                        }
                    }
                },
                {
                    opcode: 'startRecognition',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.tmimage.start',
                        default: L('start recognition from [SRC]', 'ξεκίνα αναγνώριση από [SRC]'),
                        description: 'Start auto classification'
                    }),
                    arguments: {
                        SRC: {
                            type: ArgumentType.STRING,
                            menu: 'sourceMenu',
                            defaultValue: 'camera'
                        }
                    }
                },
                {
                    opcode: 'stopRecognition',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.tmimage.stop',
                        default: L('stop recognition', 'σταμάτα αναγνώριση'),
                        description: 'Stop auto classification'
                    })
                },
                {
                    opcode: 'lastLabel',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.tmimage.lastLabel',
                        default: L('last label', 'τελευταία ετικέτα'),
                        description: 'Last predicted label'
                    })
                },
                {
                    opcode: 'lastConfidence',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.tmimage.confidence',
                        default: L('last confidence', 'τελευταία εμπιστοσύνη'),
                        description: 'Confidence of last prediction'
                    })
                },
                {
                    opcode: 'confidenceOf',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.tmimage.confidenceOf',
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
                    opcode: 'topLabels',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.tmimage.topLabels',
                        default: L('top labels', 'κορυφαίες ετικέτες'),
                        description: 'Top labels from last prediction'
                    })
                },
                {
                    opcode: 'setThreshold',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.tmimage.threshold',
                        default: L('set confidence threshold [T]', 'όρισε όριο εμπιστοσύνης [T]'),
                        description: 'Set minimum confidence'
                    }),
                    arguments: {
                        T: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0.5
                        }
                    }
                },
                {
                    opcode: 'setInterval',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.tmimage.interval',
                        default: L('set classify interval ms [MS]', 'διάστημα ταξινόμησης (ms) [MS]'),
                        description: 'Set minimum time between classifications'
                    }),
                    arguments: {
                        MS: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 300
                        }
                    }
                },
                {
                    opcode: 'isModelLoaded',
                    blockType: BlockType.BOOLEAN,
                    text: formatMessage({
                        id: 'extension.tmimage.modelLoaded',
                        default: L('model loaded?', 'μοντέλο φορτώθηκε;'),
                        description: 'Is TM model loaded'
                    })
                },
                {
                    opcode: 'isRecognitionRunning',
                    blockType: BlockType.BOOLEAN,
                    text: formatMessage({
                        id: 'extension.tmimage.running',
                        default: L('recognition running?', 'τρέχει αναγνώριση;'),
                        description: 'Is recognition loop running'
                    })
                }
            ],
            menus: {
                sourceMenu: [
                    {text: L('camera', 'κάμερα'), value: 'camera'},
                    {text: L('stage', 'σκηνή'), value: 'stage'}
                ]
            }
        };
    }

    async _ensureTF () {
        if (this._tf) return this._tf;
        if (typeof window !== 'undefined' && window.tf) {
            this._tf = window.tf;
            return this._tf;
        }
        // Fallback: inject script tag (UMD build)
        const url = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.18.0/dist/tf.min.js';
        await new Promise((resolve, reject) => {
            const existing = document.querySelector('script[data-tfjs]');
            if (existing) {
                existing.addEventListener('load', () => resolve(), {once: true});
                existing.addEventListener('error', err => reject(err), {once: true});
                return;
            }
            const s = document.createElement('script');
            s.src = url;
            s.async = true;
            s.dataset.tfjs = 'true';
            s.onload = () => resolve();
            s.onerror = e => reject(e);
            document.head.appendChild(s);
        });
        if (!window.tf) {
            throw new Error('Unable to load TensorFlow.js');
        }
        this._tf = window.tf;
        return this._tf;
    }

    async loadModel (args) {
        const urlRaw = args.URL || '';
        if (!urlRaw) throw new Error('Model URL is required');
        const {modelUrl, labelsUrl} = this._normalizeUrls(urlRaw);
        const tf = await this._ensureTF();
        this._model = await tf.loadLayersModel(modelUrl);
        this._last = {label: '', confidence: 0};
        this._labels = [];
        try {
            const res = await fetch(labelsUrl);
            const meta = await res.json();
            if (meta && Array.isArray(meta.labels)) this._labels = meta.labels;
            if (meta && typeof meta.imageSize === 'number') {
                this._inputSize = meta.imageSize;
            } else if (meta && meta.imageSize && meta.imageSize[0]) {
                this._inputSize = meta.imageSize[0];
            }
        } catch (e) {
            log.warn('TM Image: could not load labels', e);
        }
        return null;
    }

    _normalizeUrls (urlRaw) {
        // Accept share link e.g. https://teachablemachine.withgoogle.com/models/XXXX/
        // or direct model.json / metadata.json
        let base = urlRaw.trim();
        if (!base) throw new Error('Model URL is required');
        if (base.endsWith('model.json')) {
            const idx = base.lastIndexOf('/');
            base = base.slice(0, idx + 1);
        }
        if (!base.endsWith('/')) base += '/';
        const modelUrl = `${base}model.json`;
        const labelsUrl = `${base}metadata.json`;
        return {modelUrl, labelsUrl};
    }

    async _getFrameTensor (tf) {
        const video = this.runtime.ioDevices.video;
        if (!video) throw new Error('Video device unavailable');
        await video.enableVideo();
        const frame = await video.getFrame({
            format: video.FORMAT_IMAGE_DATA,
            mirror: false,
            width: this._inputSize,
            height: this._inputSize
        });
        if (!frame || !frame.data) throw new Error('No video frame');
        const img = tf.browser.fromPixels(frame);
        const resized = tf.image.resizeBilinear(img, [this._inputSize, this._inputSize]);
        const normalized = resized.div(255.0);
        const batched = normalized.expandDims(0);
        img.dispose();
        resized.dispose();
        return batched;
    }

    async _getStageTensor (tf) {
        const renderer = this.runtime.renderer;
        if (!renderer || !renderer.requestSnapshot) throw new Error('Renderer unavailable');
        const dataURL = await new Promise((resolve, reject) => {
            try {
                renderer.requestSnapshot(dataURL => resolve(dataURL), 'png');
            } catch (e) {
                reject(e);
            }
        });
        const img = await new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = dataURL;
        });
        const canvas = document.createElement('canvas');
        canvas.width = this._inputSize;
        canvas.height = this._inputSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, this._inputSize, this._inputSize);
        const tensor = tf.browser.fromPixels(canvas);
        const normalized = tensor.div(255.0);
        const batched = normalized.expandDims(0);
        tensor.dispose();
        return batched;
    }

    async _classifyTensor (tf, makeTensorFn) {
        if (!this._model) throw new Error('Load model first');
        let input;
        const now = Date.now();
        const wait = Math.max(0, this._minInterval - (now - this._lastRun));
        if (wait > 0) await this._sleep(wait);
        this._lastRun = Date.now();
        try {
            input = await makeTensorFn();
            const preds = this._model.predict(input);
            const data = await preds.data();
            preds.dispose();
            input.dispose();
            let bestIdx = 0;
            let bestVal = data[0];
            for (let i = 1; i < data.length; i++) {
                if (data[i] > bestVal) {
                    bestVal = data[i];
                    bestIdx = i;
                }
            }
            const dist = Array.from(data).map((v, i) => ({
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
        } catch (e) {
            if (input && input.dispose) input.dispose();
            log.warn('TM Image classify error', e);
            throw e;
        }
    }

    lastConfidence () {
        return this._last.confidence;
    }

    lastLabel () {
        return this._last.label;
    }

    confidenceOf (args) {
        const target = (args.LABEL || '').toLowerCase();
        const hit = this._lastDistribution.find(e => e.label.toLowerCase() === target);
        return hit ? hit.confidence : 0;
    }

    topLabels () {
        if (!this._lastDistribution || !this._lastDistribution.length) return '';
        const top3 = this._lastDistribution.slice(0, 3);
        return top3.map(e => `${e.label}:${e.confidence}`).join(', ');
    }

    async enableCamera () {
        const video = this.runtime.ioDevices.video;
        if (!video) throw new Error('Video device unavailable');
        await video.enableVideo();
        return null;
    }

    async disableCamera () {
        const video = this.runtime.ioDevices.video;
        if (!video) return null;
        await video.disableVideo();
        return null;
    }

    setThreshold (args) {
        const v = Number(args.T);
        const t = isNaN(v) ? 0 : Math.max(0, Math.min(1, v));
        this._threshold = t;
        return null;
    }

    setInterval (args) {
        const v = Number(args.MS);
        const ms = isNaN(v) ? 300 : Math.max(0, Math.min(5000, v));
        this._minInterval = ms;
        return null;
    }

    _sleep (ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async _classifyOnce (source) {
        const tf = await this._ensureTF();
        const makeTensor = source === 'stage'
            ? () => this._getStageTensor(tf)
            : () => this._getFrameTensor(tf);
        return await this._classifyTensor(tf, makeTensor);
    }

    classifyOnce (args) {
        const source = args.SRC || 'camera';
        return this._classifyOnce(source);
    }

    async startRecognition (args) {
        const source = args.SRC || 'camera';
        this._activeSource = source === 'stage' ? 'stage' : 'camera';
        await this.stopRecognition();
        if (this._activeSource === 'camera') {
            const video = this.runtime.ioDevices.video;
            if (video) await video.enableVideo();
        } else {
            const video = this.runtime.ioDevices.video;
            if (video) await video.disableVideo();
        }
        this._loopHandle = setInterval(async () => {
            if (this._loopBusy) return;
            // Avoid running while a modal/library is open (sprite/backdrop picker)
            if (typeof document !== 'undefined' &&
                document.querySelector('.ReactModal__Overlay--after-open')) {
                return;
            }
            this._loopBusy = true;
            try {
                await this._classifyOnce(this._activeSource);
            } catch (e) {
                log.warn('TM Image loop error', e);
            } finally {
                this._loopBusy = false;
            }
        }, this._minInterval);
        return null;
    }

    async stopRecognition () {
        if (this._loopHandle) {
            clearInterval(this._loopHandle);
            this._loopHandle = null;
        }
        this._loopBusy = false;
        if (this._activeSource === 'camera') {
            const video = this.runtime.ioDevices.video;
            if (video) await video.disableVideo();
        }
        return null;
    }

    isModelLoaded () {
        return !!this._model;
    }

    isRecognitionRunning () {
        return !!this._loopHandle;
    }
}

module.exports = Scratch3TMImage;
