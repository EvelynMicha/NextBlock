const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const formatMessage = require('format-message');
const {LEXICON} = require('./lexicon');

// Negations per language to flip polarity when found immediately before a token.
const NEGATIONS = {
    en: new Set(['not', 'no', "don't", "didn't", 'never', 'cant', "can't", 'wont', "won't"]),
    gr: new Set(['δεν', 'μη', 'μην', 'όχι', 'χωρίς'])
};

// Simple emoji/emoticon cues (language-agnostic).
const EMOJI_SCORES = {
    ':)': 1,
    ':-)': 1,
    ':d': 1,
    '(:': 1,
    ':(': -1,
    ':-(': -1,
    '):': -1,
    ':/': -0.5,
    ':-/': -0.5,
    ":'(": -1,
    '>:(': -1
};

// Normalize text: lowercase and strip diacritics so Greek variants match.
const normalizeText = txt => String(txt || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');

// Build word/phrase scores per language for O(1) lookup.
const WORD_SCORES = {en: new Map(), gr: new Map()};
const PHRASES = {en: [], gr: []};

const generateGreekAdjForms = base => {
    const forms = new Set([base]);
    if (base.endsWith('ος')) {
        const stem = base.slice(0, -2);
        // singular
        forms.add(stem + 'η');
        forms.add(stem + 'ο');
        // plural
        forms.add(stem + 'οι');
        forms.add(stem + 'ες');
        forms.add(stem + 'α');
        // common gen/acc plural variants
        forms.add(stem + 'ων');
        forms.add(stem + 'ους');
    }
    return Array.from(forms);
};

for (const entry of LEXICON) {
    const lang = entry.lang === 'gr' ? 'gr' : 'en';
    const normWord = normalizeText(entry.word);
    const isPhrase = entry.pos === 'phrase' || /\s/.test(entry.word);
    if (isPhrase) {
        PHRASES[lang].push({phrase: normWord, score: entry.score});
    } else if (lang === 'gr' && entry.pos === 'adj') {
        const lemma = normalizeText(entry.lemma || entry.word);
        for (const form of generateGreekAdjForms(lemma)) {
            WORD_SCORES[lang].set(form, entry.score);
        }
        WORD_SCORES[lang].set(normWord, entry.score);
    } else {
        WORD_SCORES[lang].set(normWord, entry.score);
    }
}

// Heuristic language detection: Greek characters => 'gr', else 'en'.
const hasGreek = text => /[α-ωάέήίόύώϊϋΐΰ]/i.test(text);
const detectLang = text => (hasGreek(text) ? 'gr' : 'en');

// Tokenizer that keeps Greek and Latin letters plus apostrophes.
const TOKEN_RE = /[a-z\u0370-\u03ff\u1f00-\u1fff']+/gi;

class Scratch3Sentiment {
    constructor (runtime) {
        this.runtime = runtime;
        this._last = {label: 'neutral', score: 0, scaled: 0, lang: 'en', text: ''};
    }

    _isGreek () {
        const loc = (this.runtime && this.runtime.locale) || '';
        return loc.toLowerCase().startsWith('el');
    }

    getInfo () {
        const isGR = this._isGreek();
        const tr = (en, gr) => (isGR ? gr : en);
        return {
            id: 'sentiment',
            name: tr('Sentiment', 'Συναίσθημα'),
            color1: '#0F9FD6',
            color2: '#0D86B5',
            color3: '#0C769F',
            blocks: [
                {
                    opcode: 'analyzeText',
                    blockType: BlockType.COMMAND,
                    text: tr('analyze text [TEXT]', 'ανάλυση κειμένου [TEXT]'),
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: 'I love Scratch!'
                        }
                    }
                },
                {
                    opcode: 'whenPositive',
                    blockType: BlockType.HAT,
                    isEdgeActivated: true,
                    text: tr('when text is positive', 'όταν το κείμενο είναι θετικό'),
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: 'I love Scratch!'
                        }
                    }
                },
                {
                    opcode: 'whenNegative',
                    blockType: BlockType.HAT,
                    isEdgeActivated: true,
                    text: tr('when text is negative', 'όταν το κείμενο είναι αρνητικό'),
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: 'I love Scratch!'
                        }
                    }
                },
                {
                    opcode: 'whenNeutral',
                    blockType: BlockType.HAT,
                    isEdgeActivated: true,
                    text: tr('when text is neutral', 'όταν το κείμενο είναι ουδέτερο'),
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: 'I love Scratch!'
                        }
                    }
                },
                {
                    opcode: 'sentimentExplain',
                    blockType: BlockType.REPORTER,
                    text: tr('explain sentiment of [TEXT]', 'εξήγησε το συναίσθημα του [TEXT]'),
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: 'I love Scratch!'
                        }
                    }
                },
                {
                    opcode: 'lastSentimentLabel',
                    blockType: BlockType.REPORTER,
                    text: tr('last sentiment label', 'τελευταία ένδειξη συναισθήματος')
                },
                {
                    opcode: 'lastSentimentScore',
                    blockType: BlockType.REPORTER,
                    text: tr('last sentiment score', 'τελευταίο σκορ συναισθήματος')
                },
                {
                    opcode: 'lastSentimentScaled',
                    blockType: BlockType.REPORTER,
                    text: tr('last sentiment (-5 to 5)', 'τελευταίο συναίσθημα (-5 έως 5)')
                },
                {
                    opcode: 'lastSentimentLanguage',
                    blockType: BlockType.REPORTER,
                    text: tr('last sentiment language', 'γλώσσα τελευταίας ανάλυσης')
                }
            ]
        };
    }

    _analyze (text, {updateLast = false} = {}) {
        const raw = normalizeText(text);
        const lang = detectLang(raw);
        const words = raw.match(TOKEN_RE) || [];

        let posWeight = 0;
        let negWeight = 0;
        const reasons = [];

        for (let i = 0; i < words.length; i++) {
            const w = words[i];
            const baseScore = WORD_SCORES[lang].get(w);
            if (baseScore === undefined) continue;
            const flipped = NEGATIONS[lang].has(words[i - 1]) ? -baseScore : baseScore;
            if (flipped > 0) posWeight += flipped;
            else negWeight -= flipped; // flipped is negative, accumulate absolute
            reasons.push({text: w, score: flipped});
        }

        // Phrase cues (multi-word)
        for (const {phrase, score} of PHRASES[lang]) {
            let idx = raw.indexOf(phrase);
            while (idx !== -1) {
                if (score > 0) posWeight += score;
                else negWeight += -score;
                reasons.push({text: phrase, score});
                idx = raw.indexOf(phrase, idx + phrase.length);
            }
        }

        // Emoji/emoticon cues
        let emojiScore = 0;
        for (const [emoji, val] of Object.entries(EMOJI_SCORES)) {
            if (raw.includes(emoji)) emojiScore += val;
            if (raw.includes(emoji)) reasons.push({text: emoji, score: val});
        }

        const magnitude = posWeight + negWeight + Math.abs(emojiScore);
        const rawScore = posWeight - negWeight + emojiScore;
        // Scale to roughly -5..5, clamped.
        const scaled = Math.max(-5, Math.min(5, magnitude > 0 ? rawScore : rawScore));

        let label = 'neutral';
        if (scaled <= -3) label = 'very negative';
        else if (scaled < -0.5) label = 'negative';
        else if (scaled > 3) label = 'very positive';
        else if (scaled > 0.5) label = 'positive';

        // Keep a normalized -1..1 score for backward compatibility blocks.
        const normalizedScore = magnitude > 0 ? rawScore / magnitude : 0;
        // Sort reasons by absolute contribution and keep top 5 for explanation.
        const topReasons = reasons
            .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
            .slice(0, 5);

        const result = {score: normalizedScore, label, scaled, lang, reasons: topReasons, text: raw};
        if (updateLast) {
            this._last = result;
        }
        return result;
    }

    sentimentLabel (args) {
        return this._analyze(args.TEXT).label;
    }

    sentimentScore (args) {
        return this._analyze(args.TEXT).score;
    }

    sentimentScaled (args) {
        return this._analyze(args.TEXT).scaled;
    }

    sentimentStrength (args) {
        return this._analyze(args.TEXT).label;
    }

    analyzeText (args) {
        this._analyze(args.TEXT, {updateLast: true});
    }

    _labelFromArgsOrLast (args) {
        const txt = args && args.TEXT;
        if (txt === undefined || txt === null || txt === '') {
            return this._last.label;
        }
        return this._analyze(txt).label;
    }

    whenPositive (args) {
        const label = this._labelFromArgsOrLast(args);
        return label === 'positive' || label === 'very positive';
    }

    whenNegative (args) {
        const label = this._labelFromArgsOrLast(args);
        return label === 'negative' || label === 'very negative';
    }

    whenNeutral (args) {
        const label = this._labelFromArgsOrLast(args);
        return label === 'neutral';
    }

    sentimentExplain (args) {
        const result = this._analyze(args.TEXT);
        if (!result.reasons.length) {
            return `${result.label} (no strong sentiment words found)`;
        }
        const parts = result.reasons.map(r => `${r.text}:${r.score}`);
        return `${result.label} (${parts.join(', ')})`;
    }

    sentimentLanguage (args) {
        const raw = normalizeText(args.TEXT);
        return detectLang(raw);
    }

    lastSentimentLabel () {
        return this._last.label;
    }

    lastSentimentScore () {
        return this._last.score;
    }

    lastSentimentScaled () {
        return this._last.scaled;
    }

    lastSentimentLanguage () {
        return this._last.lang;
    }
}

module.exports = Scratch3Sentiment;
