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

// MediaPipe Face Mesh CDN
const MPFACE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js';
const MPFACE_ASSET = file => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;

// Landmarks we expose and use for heuristics
const LM = {
    MOUTH_LEFT: 61,
    MOUTH_RIGHT: 291,
    MOUTH_TOP: 13,
    MOUTH_BOTTOM: 14,
    LEFT_EYE: 33,
    RIGHT_EYE: 263,
    NOSE_TIP: 1,
    CHIN: 199,
    LEFT_EAR: 234,
    RIGHT_EAR: 454
};
// Eye landmarks (upper/lower) for simple openness check
const LEFT_EYE_TOP = 159;
const LEFT_EYE_BOTTOM = 145;
const RIGHT_EYE_TOP = 386;
const RIGHT_EYE_BOTTOM = 374;

class Scratch3Face {
    constructor (runtime) {
        this.runtime = runtime;
        this._mpLoaded = false;
        this._mesh = null;
        this._mirror = true;
        this._faces = []; // {bbox:{x,y,w,h}, landmarks, score, emotion}
        this._overlayCanvas = null;
        this._overlayCtx = null;
        this._drawOverlay = false;
        this._loopHandle = null;
        this._loopBusy = false;
    }

    getInfo () {
        return {
            id: 'face',
            name: formatMessage({
                id: 'extension.face.name',
                default: L('AI Face', 'AI Πρόσωπο'),
                description: 'Face detection extension'
            }),
            color1: '#00bcd4',
            color2: '#00acc1',
            blocks: [
                {
                    opcode: 'startTracking',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.face.start',
                        default: L('start face tracking', 'ξεκίνα ανίχνευση προσώπου'),
                        description: 'Start face tracking'
                    })
                },
                {
                    opcode: 'stopTracking',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.face.stop',
                        default: L('stop face tracking', 'σταμάτα ανίχνευση προσώπου'),
                        description: 'Stop face tracking'
                    })
                },
                {
                    opcode: 'detectOnce',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.face.once',
                        default: L('detect faces once', 'ανίχνευσε πρόσωπα μία φορά'),
                        description: 'Detect faces once'
                    })
                },
                {
                    opcode: 'facesCount',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.face.count',
                        default: L('faces count', 'πλήθος προσώπων'),
                        description: 'Number of faces'
                    })
                },
                {
                    opcode: 'faceBBoxX',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.face.bboxX',
                        default: L('face [IDX] x', 'πρόσωπο [IDX] x'),
                        description: 'Face bbox x'
                    }),
                    arguments: {
                        IDX: {type: ArgumentType.NUMBER, defaultValue: 1}
                    }
                },
                {
                    opcode: 'faceBBoxY',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.face.bboxY',
                        default: L('face [IDX] y', 'πρόσωπο [IDX] y'),
                        description: 'Face bbox y'
                    }),
                    arguments: {
                        IDX: {type: ArgumentType.NUMBER, defaultValue: 1}
                    }
                },
                {
                    opcode: 'faceBBoxW',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.face.bboxW',
                        default: L('face [IDX] width', 'πρόσωπο [IDX] πλάτος'),
                        description: 'Face bbox width'
                    }),
                    arguments: {
                        IDX: {type: ArgumentType.NUMBER, defaultValue: 1}
                    }
                },
                {
                    opcode: 'faceBBoxH',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.face.bboxH',
                        default: L('face [IDX] height', 'πρόσωπο [IDX] ύψος'),
                        description: 'Face bbox height'
                    }),
                    arguments: {
                        IDX: {type: ArgumentType.NUMBER, defaultValue: 1}
                    }
                },
                {
                    opcode: 'faceEmotion',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.face.emotion',
                        default: L('face [IDX] emotion', 'πρόσωπο [IDX] συναίσθημα'),
                        description: 'Heuristic emotion'
                    }),
                    arguments: {
                        IDX: {type: ArgumentType.NUMBER, defaultValue: 1}
                    }
                },
                {
                    opcode: 'faceIsEmotion',
                    blockType: BlockType.BOOLEAN,
                    text: formatMessage({
                        id: 'extension.face.isEmotion',
                        default: L('face [IDX] is [EMO]?', 'πρόσωπο [IDX] είναι [EMO];'),
                        description: 'Check emotion'
                    }),
                    arguments: {
                        IDX: {type: ArgumentType.NUMBER, defaultValue: 1},
                        EMO: {type: ArgumentType.STRING, menu: 'emotionMenu', defaultValue: 'happy'}
                    }
                },
                {
                    opcode: 'landmarkX',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.face.landmarkX',
                        default: L('face [IDX] [POINT] x', 'πρόσωπο [IDX] [POINT] x'),
                        description: 'Face landmark x'
                    }),
                    arguments: {
                        IDX: {type: ArgumentType.NUMBER, defaultValue: 1},
                        POINT: {type: ArgumentType.STRING, menu: 'pointMenu', defaultValue: 'left_eye'}
                    }
                },
                {
                    opcode: 'landmarkY',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'extension.face.landmarkY',
                        default: L('face [IDX] [POINT] y', 'πρόσωπο [IDX] [POINT] y'),
                        description: 'Face landmark y'
                    }),
                    arguments: {
                        IDX: {type: ArgumentType.NUMBER, defaultValue: 1},
                        POINT: {type: ArgumentType.STRING, menu: 'pointMenu', defaultValue: 'left_eye'}
                    }
                },
                {
                    opcode: 'showOverlay',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.face.showOverlay',
                        default: L('show face overlay', 'εμφάνισε overlay προσώπου'),
                        description: 'Show overlay'
                    })
                },
                {
                    opcode: 'hideOverlay',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.face.hideOverlay',
                        default: L('hide face overlay', 'κρύψε overlay προσώπου'),
                        description: 'Hide overlay'
                    })
                },
                {
                    opcode: 'setMirror',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'extension.face.mirror',
                        default: L('set camera mirror [STATE]', 'καθρέφτισε κάμερα [STATE]'),
                        description: 'Mirror camera feed'
                    }),
                    arguments: {
                        STATE: {type: ArgumentType.STRING, menu: 'mirrorMenu', defaultValue: 'on'}
                    }
                }
            ],
            menus: {
                emotionMenu: [
                    {text: L('happy', 'χαρά'), value: 'happy'},
                    {text: L('neutral', 'ουδέτερο'), value: 'neutral'},
                    {text: L('surprised', 'έκπληξη'), value: 'surprised'},
                    {text: L('angry', 'θυμός'), value: 'angry'},
                    {text: L('disgusted', 'αηδία'), value: 'disgusted'},
                    {text: L('fear', 'φόβος'), value: 'fear'},
                    {text: L('sad', 'λύπη'), value: 'sad'},
                    {text: L('none', 'κανένα'), value: 'none'}
                ],
                pointMenu: [
                    {text: L('left eye', 'αριστερό μάτι'), value: 'left_eye'},
                    {text: L('right eye', 'δεξί μάτι'), value: 'right_eye'},
                    {text: L('nose tip', 'άκρη μύτης'), value: 'nose_tip'},
                    {text: L('mouth left', 'αριστερό στόμα'), value: 'mouth_left'},
                    {text: L('mouth right', 'δεξί στόμα'), value: 'mouth_right'},
                    {text: L('mouth top', 'πάνω στόμα'), value: 'mouth_top'},
                    {text: L('mouth bottom', 'κάτω στόμα'), value: 'mouth_bottom'},
                    {text: L('chin', 'πηγούνι'), value: 'chin'},
                    {text: L('left ear', 'αριστερό αυτί'), value: 'left_ear'},
                    {text: L('right ear', 'δεξί αυτί'), value: 'right_ear'}
                ],
                mirrorMenu: [
                    {text: 'on', value: 'on'},
                    {text: 'off', value: 'off'}
                ]
            }
        };
    }

    async _ensureMP () {
        if (this._mpLoaded) return;
        await new Promise((resolve, reject) => {
            const existing = document.querySelector('script[data-mp-face]');
            if (existing) {
                existing.addEventListener('load', () => resolve(), {once: true});
                existing.addEventListener('error', err => reject(err), {once: true});
                return;
            }
            const s = document.createElement('script');
            s.src = MPFACE_URL;
            s.async = true;
            s.dataset.mpFace = 'true';
            s.onload = () => resolve();
            s.onerror = e => reject(e);
            document.head.appendChild(s);
        });
        if (typeof window.FaceMesh === 'undefined') throw new Error('Failed to load MediaPipe FaceMesh');
        this._mpLoaded = true;
    }

    async _ensureModel () {
        await this._ensureMP();
        if (this._mesh) return;
        const mesh = new window.FaceMesh({locateFile: MPFACE_ASSET});
        mesh.setOptions({
            maxNumFaces: 5,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        mesh.onResults(res => this._handleResults(res));
        this._mesh = mesh;
    }

    _handleResults (results) {
        const faces = [];
        if (results && results.multiFaceLandmarks && results.multiFaceLandmarks.length) {
            for (const lm of results.multiFaceLandmarks) {
                const bbox = this._computeBBox(lm);
                const emotion = this._heuristicEmotion(lm);
                faces.push({landmarks: lm, bbox, score: 0.8, emotion});
            }
        }
        this._faces = faces;
        if (this._drawOverlay) this._renderOverlay();
    }

    _computeBBox (lm) {
        let minX = 1, minY = 1, maxX = 0, maxY = 0;
        for (const p of lm) {
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
        }
        return {x: minX, y: minY, w: (maxX - minX), h: (maxY - minY)};
    }

    _dist (a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    _eyeRatio (lm) {
        const lTop = lm[LEFT_EYE_TOP];
        const lBot = lm[LEFT_EYE_BOTTOM];
        const rTop = lm[RIGHT_EYE_TOP];
        const rBot = lm[RIGHT_EYE_BOTTOM];
        if (!lTop || !lBot || !rTop || !rBot) return 0;
        const l = this._dist(lTop, lBot);
        const r = this._dist(rTop, rBot);
        return (l + r) / 2;
    }

    _heuristicEmotion (lm) {
        if (!lm || lm.length <= LM.MOUTH_BOTTOM) return 'neutral';
        const left = lm[LM.MOUTH_LEFT];
        const right = lm[LM.MOUTH_RIGHT];
        const top = lm[LM.MOUTH_TOP];
        const bottom = lm[LM.MOUTH_BOTTOM];
        const width = this._dist(left, right);
        const height = this._dist(top, bottom);
        if (!width || !height) return 'neutral';
        const mouth = height / width; // openness
        const eye = this._eyeRatio(lm); // bigger -> eyes more open
        // Lip corner tendency (negative -> corners up, positive -> corners down)
        const cornerMeanY = (left.y + right.y) / 2;
        const mouthCenterY = (top.y + bottom.y) / 2;
        const cornerDelta = cornerMeanY - mouthCenterY;
        const mouthTopLift = top.y - mouthCenterY; // negative when upper lip lifts
        const asym = Math.abs(left.y - right.y);

        const scores = {
            happy: 0,
            sad: 0,
            angry: 0,
            disgusted: 0,
            fear: 0,
            surprised: 0,
            neutral: 0
        };

        // Surprised: big mouth, big eyes
        if (mouth > 0.45) scores.surprised += 2;
        if (mouth > 0.55 && eye > 0.02) scores.surprised += 2;
        if (eye > 0.028) scores.surprised += 1;

        // Fear: open mouth (medium-high), eyes wide, not smiling
        if (mouth > 0.28 && mouth <= 0.48) scores.fear += 2;
        if (eye > 0.028) scores.fear += 1;
        if (cornerDelta > -0.005) scores.fear += 1;

        // Happy: corners up, mild mouth open
        if (cornerDelta < -0.01) scores.happy += 2;
        if (mouth > 0.12 && mouth < 0.35) scores.happy += 1;
        if (eye < 0.03) scores.happy += 0.5;

        // Sad: corners down, small mouth
        if (cornerDelta > 0.02) scores.sad += 2;
        if (mouth < 0.2) scores.sad += 1;
        if (eye < 0.018) scores.sad += 0.5;

        // Angry: corners down, mouth mid, eyes not too wide
        if (cornerDelta > 0.01) scores.angry += 1;
        if (mouth > 0.14 && mouth < 0.30) scores.angry += 1;
        if (eye < 0.026) scores.angry += 1;

        // Disgusted: upper lip lifts, small mouth, some asymmetry helps
        if (mouth < 0.18) scores.disgusted += 1;
        if (mouthTopLift < -0.008) scores.disgusted += 1.5;
        if (asym > 0.01) scores.disgusted += 0.5;

        // Neutral: default fallback
        scores.neutral = 0.1;

        const best = Object.entries(scores).reduce((acc, [emo, val]) => {
            if (val > acc.score) return {emo, score: val};
            return acc;
        }, {emo: 'neutral', score: 0});
        return best.emo;
    }

    async _sendFrame () {
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
        await this._mesh.send({image: imageData});
    }

    async detectOnce () {
        try {
            await this._ensureModel();
            await this._sendFrame();
        } catch (e) {
            log.warn('Face detect error', e);
        }
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
                await this.detectOnce();
            } finally {
                this._loopBusy = false;
            }
        }, 180);
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

    facesCount () {
        return this._faces.length;
    }

    _getFace (idx) {
        const i = Math.max(0, Math.min(this._faces.length - 1, Math.floor(idx) - 1));
        return this._faces[i] || null;
    }

    faceBBoxX (args) {
        const f = this._getFace(args.IDX);
        return f ? f.bbox.x : 0;
    }
    faceBBoxY (args) {
        const f = this._getFace(args.IDX);
        return f ? f.bbox.y : 0;
    }
    faceBBoxW (args) {
        const f = this._getFace(args.IDX);
        return f ? f.bbox.w : 0;
    }
    faceBBoxH (args) {
        const f = this._getFace(args.IDX);
        return f ? f.bbox.h : 0;
    }

    faceEmotion (args) {
        const f = this._getFace(args.IDX);
        return f ? f.emotion : 'none';
    }
    faceIsEmotion (args) {
        let target = String(args.EMO || '').toLowerCase();
        if (target === 'none') target = 'neutral';
        const f = this._getFace(args.IDX);
        return f && f.emotion.toLowerCase() === target;
    }

    _mapPointName (name) {
        switch (name) {
        case 'left_eye': return LM.LEFT_EYE;
        case 'right_eye': return LM.RIGHT_EYE;
        case 'nose_tip': return LM.NOSE_TIP;
        case 'mouth_left': return LM.MOUTH_LEFT;
        case 'mouth_right': return LM.MOUTH_RIGHT;
        case 'mouth_top': return LM.MOUTH_TOP;
        case 'mouth_bottom': return LM.MOUTH_BOTTOM;
        case 'chin': return LM.CHIN;
        case 'left_ear': return LM.LEFT_EAR;
        case 'right_ear': return LM.RIGHT_EAR;
        default: return LM.NOSE_TIP;
        }
    }

    _getPoint (face, pointName) {
        if (!face || !face.landmarks) return {x: 0, y: 0};
        const idx = this._mapPointName(pointName);
        const p = face.landmarks[idx];
        return p || {x: 0, y: 0};
    }

    landmarkX (args) {
        const f = this._getFace(args.IDX);
        const p = this._getPoint(f, args.POINT || 'nose_tip');
        return p.x || 0;
    }

    landmarkY (args) {
        const f = this._getFace(args.IDX);
        const p = this._getPoint(f, args.POINT || 'nose_tip');
        return p.y || 0;
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
        canvas.style.zIndex = '8';
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
        ctx.strokeStyle = 'rgba(0,255,255,0.9)';
        ctx.lineWidth = 2.5;
        ctx.fillStyle = 'rgba(0,255,255,0.3)';
        for (const f of this._faces) {
            const {x, y, w: bw, h: bh} = f.bbox;
            ctx.beginPath();
            ctx.rect(x * w, y * h, bw * w, bh * h);
            ctx.stroke();
            if (f.emotion) {
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(x * w, y * h - 20, 80, 20);
                ctx.fillStyle = '#0ff';
                ctx.font = '14px Arial';
                ctx.fillText(f.emotion, x * w + 4, y * h - 6);
            }
            ctx.fillStyle = 'rgba(0,255,255,0.3)';
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
        this._mirror = on;
        return null;
    }
}

module.exports = Scratch3Face;
