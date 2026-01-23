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

// MoveNet Lightning (single pose) TF Hub URL (tfjs).
const MOVENET_URL = 'https://tfhub.dev/google/tfjs-model/movenet/singlepose/lightning/4';

const POSE_PARTS = [
    'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
    'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
    'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
    'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
];
const POSE_PAIRS = [
    ['left_ear', 'left_eye'], ['right_ear', 'right_eye'],
    ['left_eye', 'nose'], ['right_eye', 'nose'],
    ['left_shoulder', 'right_shoulder'],
    ['left_shoulder', 'left_elbow'], ['left_elbow', 'left_wrist'],
    ['right_shoulder', 'right_elbow'], ['right_elbow', 'right_wrist'],
    ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'],
    ['left_hip', 'right_hip'],
    ['left_hip', 'left_knee'], ['left_knee', 'left_ankle'],
    ['right_hip', 'right_knee'], ['right_knee', 'right_ankle']
];

class Scratch3PoseHand {
    constructor (runtime) {
        this.runtime = runtime;
        this._tf = null;
        this._model = null;
        this._last = {}; // part -> {x,y,score}
        this._lastScore = 0;
        this._loopHandle = null;
        this._loopBusy = false;
        this._inputSize = 192;
        this._overlayCanvas = null;
        this._overlayCtx = null;
        this._drawOverlay = false;
        this._overlayRect = null;
        this._mirrorCamera = true;
        this._lastPose = 'none';
    }

    getInfo () {
        return {
            id: 'posehand',
            name: formatMessage({
                id: 'extension.posehand.name',
                default: L('AI Pose', 'AI Στάσεις'),
                description: 'Pose detection extension'
            }),
            color1: '#8C60FF',
            color2: '#7A52E3',
            blocks: [
                {
                    opcode: 'startTracking',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.posehand.start',
                        default: L('start pose detection', 'ξεκίνα ανίχνευση στάσης'),
                        description: 'Start pose detection loop'
                    })
                },
                {
                    opcode: 'stopTracking',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.posehand.stop',
                        default: L('stop pose detection', 'σταμάτα ανίχνευση στάσης'),
                        description: 'Stop pose detection loop'
                    })
                },
                {
                    opcode: 'classifyOnce',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.posehand.once',
                        default: L('detect pose once', 'ανίχνευσε στάση μία φορά'),
                        description: 'Detect pose once'
                    })
                },
                {
                    opcode: 'poseLabel',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.posehand.label',
                        default: L('pose label', 'ετικέτα στάσης'),
                        description: 'Heuristic pose label'
                    })
                },
                {
                    opcode: 'poseDetected',
                    blockType: BlockType.BOOLEAN,
                    text: formatMessage({
                        id: 'extension.posehand.poseDetected',
                        default: L('is [POSE] detected?', 'αν [POSE] ανιχνεύθηκε;'),
                        description: 'Check if pose label matches'
                    }),
                    arguments: {
                        POSE: {
                            type: ArgumentType.STRING,
                            menu: 'poseMenu',
                            defaultValue: 'hands_up'
                        }
                    }
                },
                {
                    opcode: 'isTracking',
                    blockType: BlockType.BOOLEAN,
                    text: formatMessage({
                        id: 'extension.posehand.running',
                        default: L('pose detection running?', 'τρέχει η ανίχνευση στάσης;'),
                        description: 'Is loop running'
                    })
                },
                {
                    opcode: 'isModelLoaded',
                    blockType: BlockType.BOOLEAN,
                    text: formatMessage({
                        id: 'extension.posehand.model',
                        default: L('pose model loaded?', 'μοντέλο στάσης φορτώθηκε;'),
                        description: 'Is model loaded'
                    })
                },
                {
                    opcode: 'posePresent',
                    blockType: BlockType.BOOLEAN,
                    text: formatMessage({
                        id: 'extension.posehand.present',
                        default: L('pose detected?', 'ανιχνεύθηκε στάση;'),
                        description: 'Pose detected above threshold'
                    })
                },
                {
                    opcode: 'showOverlay',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.posehand.showOverlay',
                        default: L('show pose overlay', 'εμφάνισε overlay στάσης'),
                        description: 'Show pose overlay on stage'
                    })
                },
                {
                    opcode: 'hideOverlay',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.posehand.hideOverlay',
                        default: L('hide pose overlay', 'κρύψε overlay στάσης'),
                        description: 'Hide pose overlay on stage'
                    })
                },
                {
                    opcode: 'setMirror',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.posehand.setMirror',
                        default: L('set camera mirror [STATE]', 'καθρέφτισε κάμερα [STATE]'),
                        description: 'Mirror camera feed for overlay'
                    }),
                    arguments: {
                        STATE: {
                            type: ArgumentType.STRING,
                            menu: 'mirrorMenu',
                            defaultValue: 'on'
                        }
                    }
                },
                {
                    opcode: 'landmarkX',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.posehand.landmarkX',
                        default: L('[PART] x', '[PART] x'),
                        description: 'Landmark X'
                    }),
                    arguments: {
                        PART: {
                            type: ArgumentType.STRING,
                            menu: 'partsMenu',
                            defaultValue: 'nose'
                        }
                    }
                },
                {
                    opcode: 'landmarkY',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.posehand.landmarkY',
                        default: L('[PART] y', '[PART] y'),
                        description: 'Landmark Y'
                    }),
                    arguments: {
                        PART: {
                            type: ArgumentType.STRING,
                            menu: 'partsMenu',
                            defaultValue: 'nose'
                        }
                    }
                },
                {
                    opcode: 'landmarkScore',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.posehand.landmarkScore',
                        default: L('[PART] score', '[PART] σκορ'),
                        description: 'Landmark score'
                    }),
                    arguments: {
                        PART: {
                            type: ArgumentType.STRING,
                            menu: 'partsMenu',
                            defaultValue: 'nose'
                        }
                    }
                }
            ],
            menus: {
                partsMenu: POSE_PARTS.map(p => ({text: p, value: p}))
                ,
                mirrorMenu: [
                    {text: 'on', value: 'on'},
                    {text: 'off', value: 'off'}
                ],
                poseMenu: [
                    {text: 'hands_up', value: 'hands_up'},
                    {text: 'left_up', value: 'left_up'},
                    {text: 'right_up', value: 'right_up'},
                    {text: 't_pose', value: 't_pose'},
                    {text: 'none', value: 'none'}
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
        if (!window.tf) throw new Error('Unable to load TensorFlow.js');
        this._tf = window.tf;
        return this._tf;
    }

    async _ensureModel () {
        const tf = await this._ensureTF();
        if (this._model) return this._model;
        this._model = await tf.loadGraphModel(MOVENET_URL, {fromTFHub: true});
        return this._model;
    }

    async _getCameraTensor (tf) {
        const video = this.runtime.ioDevices.video;
        if (!video) throw new Error('Video device unavailable');
        await video.enableVideo();
        const frame = await video.getFrame({
            format: video.FORMAT_IMAGE_DATA,
            mirror: this._mirrorCamera,
            width: this._inputSize,
            height: this._inputSize
        });
        if (!frame || !frame.data) throw new Error('No video frame');
        const img = tf.browser.fromPixels(frame);
        const resized = tf.image.resizeBilinear(img, [this._inputSize, this._inputSize]);
        // MoveNet expects int32 [1, h, w, 3]
        const batched = resized.expandDims(0).toInt();
        img.dispose();
        resized.dispose();
        return batched;
    }

    _saveResults (data) {
        // data shape [1,1,17,3]: [y,x,score]
        this._last = {};
        this._lastScore = 0;
        if (!data || data.length < 51) return;
        for (let i = 0; i < 17; i++) {
            const y = data[i * 3];
            const x = data[i * 3 + 1];
            const score = data[i * 3 + 2];
            const name = POSE_PARTS[i];
            this._last[name] = {x, y, score};
            if (score > this._lastScore) this._lastScore = score;
        }
        if (this._drawOverlay) this._renderOverlay();
    }

    async _detectOnce () {
        const tf = await this._ensureTF();
        await this._ensureModel();
        let input;
        try {
            input = await this._getCameraTensor(tf);
            const data = await tf.tidy(() => {
                const preds = this._model.execute(input);
                return preds.dataSync();
            });
            input.dispose();
            this._saveResults(Array.from(data));
        } catch (e) {
            if (input && input.dispose) input.dispose();
            log.warn('Pose detect error', e);
        }
    }

    async classifyOnce () {
        await this._detectOnce();
        return null;
    }

    startTracking () {
        if (this._loopHandle) return null;
        this._loopHandle = setInterval(async () => {
            if (this._loopBusy) return;
            // avoid running if a modal (library) is open
            if (typeof document !== 'undefined' &&
                document.querySelector('.ReactModal__Overlay--after-open')) {
                return;
            }
            this._loopBusy = true;
            try {
                await this._detectOnce();
            } finally {
                this._loopBusy = false;
            }
        }, 200);
        return null;
    }

    async stopTracking () {
        if (this._loopHandle) {
            clearInterval(this._loopHandle);
            this._loopHandle = null;
        }
        this._loopBusy = false;
        const video = this.runtime.ioDevices.video;
        if (video) await video.disableVideo();
        return null;
    }

    isTracking () {
        return !!this._loopHandle;
    }

    isModelLoaded () {
        return !!this._model;
    }

    posePresent () {
        return this._lastScore > 0.2;
    }

    poseLabel () {
        this._lastPose = this._classifyPose();
        return this._lastPose;
    }

    poseDetected (args) {
        const target = (args.POSE || '').toLowerCase();
        const current = this.poseLabel().toLowerCase();
        return target === current;
    }

    _classifyPose () {
        const p = name => this._getPart(name);
        const lw = p('left_wrist');
        const rw = p('right_wrist');
        const ls = p('left_shoulder');
        const rs = p('right_shoulder');
        const lElbow = p('left_elbow');
        const rElbow = p('right_elbow');
        const has = (pt, min = 0.2) => pt && pt.score >= min;

        const bothWrists = has(lw) && has(rw) && has(ls) && has(rs);
        if (bothWrists) {
            const leftUp = lw.y < ls.y - 0.05;
            const rightUp = rw.y < rs.y - 0.05;
            if (leftUp && rightUp) return 'hands_up';
            if (leftUp && !rightUp) return 'left_up';
            if (rightUp && !leftUp) return 'right_up';
            // T-pose: wrists near shoulders height and far apart horizontally
            const nearLeft = Math.abs(lw.y - ls.y) < 0.05;
            const nearRight = Math.abs(rw.y - rs.y) < 0.05;
            const span = Math.abs(lw.x - rw.x);
            if (nearLeft && nearRight && span > 0.4) return 't_pose';
        }
        // fallback
        return 'none';
    }

    _getPart (part) {
        const p = (part || '').toLowerCase();
        return this._last[p] || {x: 0, y: 0, score: 0};
    }

    landmarkX (args) {
        return this._getPart(args.PART).x;
    }

    landmarkY (args) {
        return this._getPart(args.PART).y;
    }

    landmarkScore (args) {
        return this._getPart(args.PART).score;
    }

    _ensureOverlay () {
        if (typeof document === 'undefined') return;
        if (this._overlayCanvas) return;
        const stage = document.querySelector('.stage-wrapper') || document.body;
        if (stage && getComputedStyle(stage).position === 'static') {
            stage.style.position = 'relative';
        }
        const canvas = document.createElement('canvas');
        canvas.style.position = 'absolute';
        canvas.style.left = '0';
        canvas.style.top = '0';
        canvas.style.pointerEvents = 'none';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.zIndex = '5';
        canvas.width = stage.clientWidth || 480;
        canvas.height = stage.clientHeight || 360;
        stage.appendChild(canvas);
        this._overlayCanvas = canvas;
        this._overlayCtx = canvas.getContext('2d');
        const rect = stage.getBoundingClientRect();
        this._overlayRect = rect;
    }

    _renderOverlay () {
        if (!this._overlayCanvas || !this._overlayCtx) return;
        const renderer = this.runtime.renderer;
        const rc = renderer && renderer.canvas ? renderer.canvas.getBoundingClientRect() : null;
        if (rc) {
            this._overlayCanvas.style.position = 'absolute';
            this._overlayCanvas.style.left = `${rc.left + window.scrollX}px`;
            this._overlayCanvas.style.top = `${rc.top + window.scrollY}px`;
            this._overlayCanvas.style.width = `${rc.width}px`;
            this._overlayCanvas.style.height = `${rc.height}px`;
        }
        const w = renderer && renderer.canvas ? renderer.canvas.width : this._overlayCanvas.clientWidth || this._overlayCanvas.width;
        const h = renderer && renderer.canvas ? renderer.canvas.height : this._overlayCanvas.clientHeight || this._overlayCanvas.height;
        this._overlayCanvas.width = w;
        this._overlayCanvas.height = h;
        const ctx = this._overlayCtx;
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 3;
        ctx.fillStyle = 'rgba(0,200,255,0.9)';
        const getXY = name => {
            const p = this._last[name];
            if (!p) return null;
            return {x: p.x * w, y: p.y * h, score: p.score};
        };
        ctx.beginPath();
        for (const [a, b] of POSE_PAIRS) {
            const pa = getXY(a);
            const pb = getXY(b);
            if (!pa || !pb || pa.score < 0.2 || pb.score < 0.2) continue;
            ctx.moveTo(pa.x, pa.y);
            ctx.lineTo(pb.x, pb.y);
        }
        ctx.stroke();
        for (const part of POSE_PARTS) {
            const p = getXY(part);
            if (!p || p.score < 0.2) continue;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    showOverlay () {
        this._drawOverlay = true;
        this._ensureOverlay();
        return null;
    }

    hideOverlay () {
        this._drawOverlay = false;
        if (this._overlayCanvas && this._overlayCanvas.parentNode) {
            this._overlayCanvas.parentNode.removeChild(this._overlayCanvas);
        }
        this._overlayCanvas = null;
        this._overlayCtx = null;
        return null;
    }

    setMirror (args) {
        const on = String(args.STATE || 'on').toLowerCase() === 'on';
        this._mirrorCamera = on;
        return null;
    }
}

module.exports = Scratch3PoseHand;
