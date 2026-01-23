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

// MediaPipe Hands CDN
const MPHANDS_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
const MPHANDS_ASSET = file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;

// Finger landmark indices (MediaPipe numbering)
const FINGER_TIPS = {
    thumb: 4,
    index: 8,
    middle: 12,
    ring: 16,
    pinky: 20
};
const FINGER_PIPS = {
    thumb: 2,
    index: 6,
    middle: 10,
    ring: 14,
    pinky: 18
};

// Connections for drawing
const CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4], // thumb
    [0, 5], [5, 6], [6, 7], [7, 8], // index
    [5, 9], [9, 10], [10, 11], [11, 12], // middle
    [9, 13], [13, 14], [14, 15], [15, 16], // ring
    [13, 17], [17, 18], [18, 19], [19, 20], // pinky
    [0, 17] // wrist to pinky base
];

class Scratch3HandPose {
    constructor (runtime) {
        this.runtime = runtime;
        this._mpLoaded = false;
        this._hands = null;
        this._lastHands = []; // array of {landmarks, score}
        this._lastLabel = 'none';
        this._loopHandle = null;
        this._loopBusy = false;
        this._mirror = true;
        this._overlayCanvas = null;
        this._overlayCtx = null;
        this._drawOverlay = false;
    }

    getInfo () {
        return {
            id: 'handpose',
            name: formatMessage({
                id: 'extension.handpose.name',
                default: L('AI Hands', 'AI Χέρια'),
                description: 'Hand tracking with MediaPipe'
            }),
            color1: '#FF7F50',
            color2: '#FF6A39',
            blocks: [
                {
                    opcode: 'startTracking',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.handpose.start',
                        default: L('start hand tracking', 'ξεκίνα ανίχνευση χεριών'),
                        description: 'Start hand tracking'
                    })
                },
                {
                    opcode: 'stopTracking',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.handpose.stop',
                        default: L('stop hand tracking', 'σταμάτα ανίχνευση χεριών'),
                        description: 'Stop hand tracking'
                    })
                },
                {
                    opcode: 'classifyOnce',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.handpose.once',
                        default: L('detect hands once', 'ανίχνευσε χέρια μία φορά'),
                        description: 'Detect hands once'
                    })
                },
                {
                    opcode: 'handPresent',
                    blockType: BlockType.BOOLEAN,
                    text: formatMessage({
                        id: 'extension.handpose.present',
                        default: L('hands detected?', 'ανιχνεύτηκαν χέρια;'),
                        description: 'Any hands detected'
                    })
                },
                {
                    opcode: 'handLabel',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.handpose.label',
                        default: L('hand gesture label', 'ετικέτα χειρονομίας'),
                        description: 'Gesture label'
                    })
                },
                {
                    opcode: 'handDetected',
                    blockType: BlockType.BOOLEAN,
                    text: formatMessage({
                        id: 'extension.handpose.handDetected',
                        default: L('is [GESTURE] detected?', 'αν [GESTURE] ανιχνεύθηκε;'),
                        description: 'Check gesture'
                    }),
                    arguments: {
                        GESTURE: {
                            type: ArgumentType.STRING,
                            menu: 'gestureMenu',
                            defaultValue: 'open'
                        }
                    }
                },
                {
                    opcode: 'handDirection',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.handpose.direction',
                        default: L('hand direction', 'κατεύθυνση χεριού'),
                        description: 'Rough hand direction (up/down/left/right/center)'
                    })
                },
                {
                    opcode: 'fingersUp',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.handpose.fingersUp',
                        default: L('fingers up', 'δαχτυλα σηκωμένα'),
                        description: 'Number of extended fingers'
                    })
                },
                {
                    opcode: 'fingerTipX',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.handpose.fingerTipX',
                        default: L('[HAND] [FINGER] x', '[HAND] [FINGER] x'),
                        description: 'Finger tip x'
                    }),
                    arguments: {
                        HAND: {type: ArgumentType.STRING, menu: 'handMenu', defaultValue: 'left'},
                        FINGER: {type: ArgumentType.STRING, menu: 'fingerMenu', defaultValue: 'index'}
                    }
                },
                {
                    opcode: 'fingerTipY',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.handpose.fingerTipY',
                        default: L('[HAND] [FINGER] y', '[HAND] [FINGER] y'),
                        description: 'Finger tip y'
                    }),
                    arguments: {
                        HAND: {type: ArgumentType.STRING, menu: 'handMenu', defaultValue: 'left'},
                        FINGER: {type: ArgumentType.STRING, menu: 'fingerMenu', defaultValue: 'index'}
                    }
                },
                {
                    opcode: 'handScore',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.handpose.score',
                        default: L('[HAND] hand score', '[HAND] σκορ χεριού'),
                        description: 'Hand score'
                    }),
                    arguments: {
                        HAND: {type: ArgumentType.STRING, menu: 'handMenu', defaultValue: 'left'}
                    }
                },
                {
                    opcode: 'showOverlay',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.handpose.showOverlay',
                        default: L('show hand overlay', 'εμφάνισε overlay χεριών'),
                        description: 'Show overlay'
                    })
                },
                {
                    opcode: 'hideOverlay',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.handpose.hideOverlay',
                        default: L('hide hand overlay', 'κρύψε overlay χεριών'),
                        description: 'Hide overlay'
                    })
                },
                {
                    opcode: 'setMirror',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.handpose.mirror',
                        default: L('set camera mirror [STATE]', 'καθρέφτισε κάμερα [STATE]'),
                        description: 'Mirror camera'
                    }),
                    arguments: {
                        STATE: {type: ArgumentType.STRING, menu: 'mirrorMenu', defaultValue: 'on'}
                    }
                }
            ],
            menus: {
                handMenu: [
                    {text: L('left', 'αριστερό'), value: 'left'},
                    {text: L('right', 'δεξί'), value: 'right'}
                ],
                fingerMenu: [
                    {text: L('thumb', 'αντίχειρας'), value: 'thumb'},
                    {text: L('index', 'δείκτης'), value: 'index'},
                    {text: L('middle', 'μεσαίο'), value: 'middle'},
                    {text: L('ring', 'παράμεσο'), value: 'ring'},
                    {text: L('pinky', 'μικρό'), value: 'pinky'}
                ],
                mirrorMenu: [
                    {text: 'on', value: 'on'},
                    {text: 'off', value: 'off'}
                ],
                gestureMenu: [
                    {text: L('open', 'ανοιχτό'), value: 'open'},
                    {text: L('fist', 'γροθιά'), value: 'fist'},
                    {text: L('point', 'δείχνω'), value: 'point'},
                    {text: L('victory', 'νίκη'), value: 'victory'},
                    {text: L('none', 'κανένα'), value: 'none'}
                ]
            }
        };
    }

    async _ensureMP () {
        if (this._mpLoaded) return;
        await new Promise((resolve, reject) => {
            const existing = document.querySelector('script[data-mp-hands]');
            if (existing) {
                existing.addEventListener('load', () => resolve(), {once: true});
                existing.addEventListener('error', err => reject(err), {once: true});
                return;
            }
            const s = document.createElement('script');
            s.src = MPHANDS_URL;
            s.async = true;
            s.dataset.mpHands = 'true';
            s.onload = () => resolve();
            s.onerror = e => reject(e);
            document.head.appendChild(s);
        });
        if (typeof window.Hands === 'undefined') throw new Error('Failed to load MediaPipe Hands');
        this._mpLoaded = true;
    }

    async _ensureModel () {
        await this._ensureMP();
        if (this._hands) return;
        const hands = new window.Hands({locateFile: MPHANDS_ASSET});
        hands.setOptions({
            maxNumHands: 2,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
            modelComplexity: 1
        });
        hands.onResults(results => {
            this._handleResults(results);
        });
        this._hands = hands;
    }

    _handleResults (results) {
        const list = [];
        if (results && results.multiHandLandmarks && results.multiHandLandmarks.length) {
            for (let i = 0; i < results.multiHandLandmarks.length; i++) {
                const lm = results.multiHandLandmarks[i];
            const handed = results.multiHandedness && results.multiHandedness[i]
                ? results.multiHandedness[i].label.toLowerCase()
                : (lm[17] && lm[0] && lm[17].x > lm[0].x ? 'right' : 'left');
            const score = results.multiHandedness && results.multiHandedness[i]
                ? results.multiHandedness[i].score
                : 0.5;
            list.push({landmarks: lm, handedness: handed, score});
            }
        }
        this._lastHands = list;
        this._lastLabel = this._computeGesture();
        if (this._drawOverlay) this._renderOverlay();
    }

    async _sendFrame () {
        if (!this._hands) return;
        const video = this.runtime.ioDevices.video;
        if (!video) throw new Error('Video device unavailable');
        await video.enableVideo();
        const frame = await video.getFrame({
            format: video.FORMAT_IMAGE_DATA,
            mirror: this._mirror,
            width: 320,
            height: 240
        });
        if (!frame || !frame.data) return;
        const imageData = new ImageData(
            new Uint8ClampedArray(frame.data),
            frame.width,
            frame.height
        );
        await this._hands.send({image: imageData});
    }

    async _detectOnce () {
        try {
            await this._ensureModel();
            await this._sendFrame();
        } catch (e) {
            log.warn('Hand detect error', e);
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
        }, 150);
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

    handPresent () {
        return this._lastHands.some(h => h.score > 0.2);
    }

    handLabel () {
        return this._lastLabel;
    }

    handDetected (args) {
        const target = (args.GESTURE || '').toLowerCase();
        return this._lastLabel.toLowerCase() === target;
    }

    handDirection () {
        const hand = this._getHandData('any');
        if (!hand || !hand.landmarks || !hand.landmarks[0]) return 'center';
        const wrist = hand.landmarks[0];
        const tip = hand.landmarks[FINGER_TIPS.index] || wrist;
        const dx = tip.x - wrist.x;
        const dy = tip.y - wrist.y;
        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx < -0.1) return 'left';
            if (dx > 0.1) return 'right';
        } else {
            if (dy < -0.1) return 'up';
            if (dy > 0.1) return 'down';
        }
        return 'center';
    }

    fingersUp () {
        const hand = this._getHandData('any');
        if (!hand || !hand.landmarks) return 0;
        const extended = finger => {
            if (finger === 'thumb') return this._isThumbExtended(hand);
            const tipIdx = FINGER_TIPS[finger];
            const pipIdx = FINGER_PIPS[finger];
            const tip = hand.landmarks[tipIdx];
            const pip = hand.landmarks[pipIdx];
            if (!tip || !pip) return false;
            return tip.y < pip.y - 0.02;
        };
        let count = 0;
        if (extended('thumb')) count++;
        if (extended('index')) count++;
        if (extended('middle')) count++;
        if (extended('ring')) count++;
        if (extended('pinky')) count++;
        return count;
    }

    _computeGesture () {
        // Use first hand for gesture label
        const hand = this._lastHands[0];
        if (!hand || !hand.landmarks) return 'none';
        const lm = hand.landmarks;
        const extended = finger => {
            const tip = lm[FINGER_TIPS[finger]];
            const pip = lm[FINGER_PIPS[finger]];
            if (!tip || !pip) return false;
            return tip.y < pip.y - 0.02; // y up
        };
        const idx = extended('index');
        const mid = extended('middle');
        const ring = extended('ring');
        const pinky = extended('pinky');
        const thumb = extended('thumb');

        // Heuristics
        if (idx && mid && ring && pinky && thumb) return 'open';
        if (!idx && !mid && !ring && !pinky && !thumb) return 'fist';
        if (idx && !mid && !ring && !pinky) return 'point';
        if (idx && mid && !ring && !pinky) return 'victory';
        return 'none';
    }

    _getHandData (which) {
        const key = (which || 'left').toLowerCase();
        if (key === 'any') return this._lastHands[0] || null;
        const wantRight = key === 'right';
        let best = null;
        for (const h of this._lastHands) {
            const isRight = h.handedness === 'right';
            if (wantRight === isRight) {
                if (!best || h.score > best.score) best = h;
            }
        }
        return best || this._lastHands[0] || null;
    }

    _fingerTip (hand, finger) {
        if (!hand || !hand.landmarks) return {x: 0, y: 0, score: 0};
        const idx = FINGER_TIPS[finger] || 8;
        const lm = hand.landmarks[idx];
        if (!lm) return {x: 0, y: 0, score: 0};
        return {x: lm.x, y: lm.y, score: hand.score || 0};
    }

    fingerTipX (args) {
        const hand = this._getHandData(args.HAND);
        const tip = this._fingerTip(hand, args.FINGER || 'index');
        return tip.x;
    }

    fingerTipY (args) {
        const hand = this._getHandData(args.HAND);
        const tip = this._fingerTip(hand, args.FINGER || 'index');
        return tip.y;
    }

    _isThumbExtended (hand) {
        if (!hand || !hand.landmarks) return false;
        const tip = hand.landmarks[FINGER_TIPS.thumb];
        const pip = hand.landmarks[FINGER_PIPS.thumb];
        if (!tip || !pip) return false;
        const isRight = hand.handedness === 'right';
        return isRight ? (tip.x < pip.x - 0.02) : (tip.x > pip.x + 0.02);
    }

    handScore (args) {
        const hand = this._getHandData(args.HAND);
        return hand ? hand.score || 0 : 0;
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
        canvas.style.zIndex = '7';
        canvas.width = stage.clientWidth || 480;
        canvas.height = stage.clientHeight || 360;
        stage.appendChild(canvas);
        this._overlayCanvas = canvas;
        this._overlayCtx = canvas.getContext('2d');
    }

    _renderOverlay () {
        if (!this._overlayCanvas || !this._overlayCtx) return;
        const renderer = this.runtime.renderer;
        const rc = renderer && renderer.canvas ? renderer.canvas.getBoundingClientRect() : null;
        if (rc) {
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
        ctx.lineWidth = 2.5;
        ctx.fillStyle = 'rgba(255,120,80,0.9)';

        const drawHand = hand => {
            if (!hand || !hand.landmarks) return;
            ctx.beginPath();
            for (const [a, b] of CONNECTIONS) {
                const pa = hand.landmarks[a];
                const pb = hand.landmarks[b];
                if (!pa || !pb) continue;
                ctx.moveTo(pa.x * w, pa.y * h);
                ctx.lineTo(pb.x * w, pb.y * h);
            }
            ctx.stroke();
            for (const lm of hand.landmarks) {
                ctx.beginPath();
                ctx.arc(lm.x * w, lm.y * h, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        };

        for (const hand of this._lastHands) drawHand(hand);
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
        this._mirror = on;
        return null;
    }
}

module.exports = Scratch3HandPose;
