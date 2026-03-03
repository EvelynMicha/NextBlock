/* eslint-disable */
import React from 'react';
import {FormattedMessage} from 'react-intl';

import musicIconURL from './music/music.png';
import musicInsetIconURL from './music/music-small.svg';

import penIconURL from './pen/pen.png';
import penInsetIconURL from './pen/pen-small.svg';

import videoSensingIconURL from './videoSensing/video-sensing.png';
import videoSensingInsetIconURL from './videoSensing/video-sensing-small.svg';

import text2speechIconURL from './text2speech/text2speech.png';
import text2speechInsetIconURL from './text2speech/text2speech-small.svg';

import translateIconURL from './translate/translate.png';
import translateInsetIconURL from './translate/translate-small.png';
import sentimentIconURL from './sentiment/sentiment.png';
import sentimentInsetIconURL from './sentiment/sentiment-small.png';

import makeymakeyIconURL from './makeymakey/makeymakey.png';
import makeymakeyInsetIconURL from './makeymakey/makeymakey-small.svg';

import microbitIconURL from './microbit/microbit.png';
import microbitInsetIconURL from './microbit/microbit-small.svg';
import microbitConnectionIconURL from './microbit/microbit-illustration.svg';
import microbitConnectionSmallIconURL from './microbit/microbit-small.svg';

import speechIconURL from './speech/speech.png';
import speechInsetIconURL from './speech/speech-small.svg';

// Custom artwork
import faceCustomIconURL from './custom/ai-face.png';
import handposeCustomIconURL from './custom/ai-hands.png';
import poseCustomIconURL from './custom/ai-pose.png';
import httpapiCustomIconURL from './custom/http-api.png';
import maqueenCustomIconURL from './custom/maqueen-plus-v2.png';
import speechCustomIconURL from './custom/speech-to-text.png';
import easyplugCustomIconURL from './custom/super-starter-kit.png';
import tmSoundCustomIconURL from './custom/teachable-machine-audio.png';
import tmImageCustomIconURL from './custom/teachable-machine-image.png';
import sentimentCustomIconURL from './custom/text-sentiment.png';
import weatherCustomIconURL from './custom/weather.png';

// Temporary reuse of micro:bit artwork until EasyPlug assets are added.
const easyplugIconURL = easyplugCustomIconURL;
const easyplugInsetIconURL = easyplugCustomIconURL;

import ev3IconURL from './ev3/ev3.png';
import ev3InsetIconURL from './ev3/ev3-small.svg';
import ev3ConnectionIconURL from './ev3/ev3-hub-illustration.svg';
import ev3ConnectionSmallIconURL from './ev3/ev3-small.svg';

import wedo2IconURL from './wedo2/wedo.png'; // TODO: Rename file names to match variable/prop names?
import wedo2InsetIconURL from './wedo2/wedo-small.svg';
import wedo2ConnectionIconURL from './wedo2/wedo-illustration.svg';
import wedo2ConnectionSmallIconURL from './wedo2/wedo-small.svg';
import wedo2ConnectionTipIconURL from './wedo2/wedo-button-illustration.svg';

import boostIconURL from './boost/boost.png';
import boostInsetIconURL from './boost/boost-small.svg';
import boostConnectionIconURL from './boost/boost-illustration.svg';
import boostConnectionSmallIconURL from './boost/boost-small.svg';
import boostConnectionTipIconURL from './boost/boost-button-illustration.svg';

import gdxforIconURL from './gdxfor/gdxfor.png';
import gdxforInsetIconURL from './gdxfor/gdxfor-small.svg';
import gdxforConnectionIconURL from './gdxfor/gdxfor-illustration.svg';
import gdxforConnectionSmallIconURL from './gdxfor/gdxfor-small.svg';

// Simple inline icons for TM image (unique URLs to avoid key clashes).
const tmImageIconURL = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="372" viewBox="0 0 600 372"><rect width="600" height="372" fill="%230d5fe5"/><rect x="30" y="30" width="540" height="312" rx="24" fill="%230a4aa8"/><circle cx="190" cy="186" r="82" fill="%23fff"/><circle cx="190" cy="186" r="42" fill="%230d5fe5"/><rect x="320" y="106" width="150" height="160" rx="16" fill="%23fff"/><rect x="340" y="126" width="110" height="120" rx="12" fill="%230d5fe5"/><text x="375" y="205" font-family="Arial" font-size="48" fill="%23fff" font-weight="700">TM</text></svg>';
const tmImageInsetIconURL = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="10" fill="%230d5fe5"/><circle cx="22" cy="32" r="14" fill="%23fff"/><circle cx="22" cy="32" r="7" fill="%230a4aa8"/><rect x="33" y="18" width="18" height="28" rx="4" fill="%23fff"/><text x="36" y="39" font-family="Arial" font-size="12" fill="%230a4aa8" font-weight="700">TM</text></svg>';

// Inline icons for pose extension.
const poseIconURL = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="372" viewBox="0 0 600 372"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%239d6bff"/><stop offset="100%" stop-color="%237552e3"/></linearGradient></defs><rect width="600" height="372" fill="%23303445"/><rect x="24" y="24" width="552" height="324" rx="24" fill="url(%23g)"/><circle cx="210" cy="110" r="32" fill="%23fff"/><rect x="200" y="140" width="20" height="110" rx="8" fill="%23fff"/><rect x="170" y="175" width="80" height="18" rx="8" transform="rotate(-25 210 184)" fill="%23fff"/><rect x="170" y="175" width="80" height="18" rx="8" transform="rotate(25 210 184)" fill="%23fff"/><rect x="205" y="240" width="18" height="80" rx="8" transform="rotate(-10 214 280)" fill="%23fff"/><rect x="190" y="240" width="18" height="80" rx="8" transform="rotate(15 199 280)" fill="%23fff"/><text x="320" y="200" font-family="Arial" font-size="90" fill="%23fff" font-weight="700">POSE</text></svg>';
const poseInsetIconURL = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><defs><linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%239d6bff"/><stop offset="100%" stop-color="%237552e3"/></linearGradient></defs><rect width="64" height="64" rx="10" fill="url(%23g2)"/><circle cx="24" cy="16" r="6" fill="%23fff"/><rect x="22" y="22" width="4" height="18" rx="2" fill="%23fff"/><rect x="18" y="24" width="12" height="3" rx="1.5" transform="rotate(-25 24 25.5)" fill="%23fff"/><rect x="18" y="24" width="12" height="3" rx="1.5" transform="rotate(25 24 25.5)" fill="%23fff"/><rect x="23" y="38" width="4" height="12" rx="2" transform="rotate(-8 25 44)" fill="%23fff"/><rect x="20" y="38" width="4" height="12" rx="2" transform="rotate(12 22 44)" fill="%23fff"/><text x="32" y="41" font-family="Arial" font-size="12" fill="%23fff" font-weight="700">P</text></svg>';

// Inline icons for hand extension.
const handIconURL = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="372" viewBox="0 0 600 372"><rect width="600" height="372" fill="%23303445"/><rect x="24" y="24" width="552" height="324" rx="24" fill="%23ff7f50"/><path d="M200 270c0-30 10-90 10-120 0-8-1-16 8-16 11 0 13 12 14 25 1 12 1 26 1 26s3-74 3-92c0-8 4-14 12-14 9 0 11 8 11 16v73l5-78c0-9 5-15 13-15 9 0 12 6 12 15l-1 75 8-64c2-10 7-16 14-16 8 0 12 6 11 16-2 22-6 93-6 120 0 43-33 66-71 66s-54-23-54-56z" fill="%23fff"/><text x="330" y="210" font-family="Arial" font-size="90" fill="%23fff" font-weight="700">HAND</text></svg>';
const handInsetIconURL = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="10" fill="%23ff7f50"/><path d="M18 44c0-7 2-21 2-28 0-2 1-4 4-4 4 0 5 4 5 9v6s1-17 1-21c0-3 2-5 5-5 3 0 4 2 4 5v17l2-15c0-3 2-5 5-5 3 0 4 2 4 5l-1 14 3-12c1-3 3-5 5-5 3 0 4 2 4 5-1 7-3 28-3 36 0 13-10 20-22 20s-18-7-18-17z" fill="%23fff"/></svg>';

// Inline icons for face extension.
const faceIconURL = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="372" viewBox="0 0 600 372"><rect width="600" height="372" fill="%232d2f40"/><rect x="24" y="24" width="552" height="324" rx="24" fill="%2300bcd4"/><circle cx="220" cy="140" r="60" fill="%23fff"/><rect x="190" y="200" width="60" height="90" rx="12" fill="%23fff"/><circle cx="200" cy="130" r="10" fill="%2300bcd4"/><circle cx="240" cy="130" r="10" fill="%2300bcd4"/><rect x="205" y="155" width="30" height="8" rx="4" fill="%2300bcd4"/><path d="M205 170 q15 15 30 0" stroke="%2300bcd4" stroke-width="6" fill="none"/><text x="320" y="210" font-family="Arial" font-size="90" fill="%23fff" font-weight="700">FACE</text></svg>';
const faceInsetIconURL = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="10" fill="%2300bcd4"/><circle cx="26" cy="22" r="10" fill="%23fff"/><rect x="22" y="32" width="8" height="20" rx="3" fill="%23fff"/><circle cx="23" cy="20" r="2" fill="%2300bcd4"/><circle cx="29" cy="20" r="2" fill="%2300bcd4"/><rect x="24" y="24" width="4" height="2" rx="1" fill="%2300bcd4"/><path d="M23 27 q4 4 8 0" stroke="%2300bcd4" stroke-width="2" fill="none"/><text x="36" y="38" font-family="Arial" font-size="12" fill="%23fff" font-weight="700">F</text></svg>';

// Inline icons for weather extension.
const weatherIconURL = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="372" viewBox="0 0 600 372"><rect width="600" height="372" rx="26" fill="%230d72ff"/><circle cx="180" cy="150" r="58" fill="%23ffcf33"/><rect x="150" y="200" width="320" height="120" rx="30" fill="%23fff"/><circle cx="200" cy="210" r="50" fill="%23fff"/><circle cx="320" cy="220" r="60" fill="%23fff"/><circle cx="410" cy="210" r="55" fill="%23fff"/><line x1="230" y1="290" x2="230" y2="330" stroke="%230d72ff" stroke-width="10" stroke-linecap="round"/><line x1="270" y1="300" x2="270" y2="340" stroke="%230d72ff" stroke-width="10" stroke-linecap="round"/><line x1="310" y1="290" x2="310" y2="330" stroke="%230d72ff" stroke-width="10" stroke-linecap="round"/><line x1="350" y1="300" x2="350" y2="340" stroke="%230d72ff" stroke-width="10" stroke-linecap="round"/><text x="380" y="125" font-family="Arial" font-size="64" fill="%23fff" font-weight="700">WX</text></svg>';
const weatherInsetIconURL = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="10" fill="%230d72ff"/><circle cx="18" cy="20" r="10" fill="%23ffcf33"/><rect x="12" y="28" width="36" height="18" rx="9" fill="%23fff"/><circle cx="24" cy="28" r="12" fill="%23fff"/><circle cx="40" cy="30" r="12" fill="%23fff"/><line x1="24" y1="44" x2="24" y2="54" stroke="%230d72ff" stroke-width="4" stroke-linecap="round"/><line x1="32" y1="44" x2="32" y2="54" stroke="%230d72ff" stroke-width="4" stroke-linecap="round"/><text x="42" y="22" font-family="Arial" font-size="10" fill="%23fff" font-weight="700">WX</text></svg>';

// Inline icons for TM sound extension.
const tmSoundIconURL = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="372" viewBox="0 0 600 372"><rect width="600" height="372" rx="26" fill="%23ff8c00"/><rect x="60" y="70" width="160" height="220" rx="30" fill="%23fff"/><rect x="90" y="110" width="40" height="140" rx="8" fill="%23ff8c00"/><rect x="150" y="130" width="40" height="120" rx="8" fill="%23ff8c00"/><circle cx="420" cy="180" r="80" fill="%23fff"/><path d="M380 140 q40 -30 80 0" stroke="%23ff8c00" stroke-width="12" fill="none" stroke-linecap="round"/><path d="M380 190 q40 30 80 0" stroke="%23ff8c00" stroke-width="12" fill="none" stroke-linecap="round"/><line x1="480" y1="150" x2="520" y2="130" stroke="%23fff" stroke-width="10" stroke-linecap="round"/><line x1="480" y1="210" x2="520" y2="230" stroke="%23fff" stroke-width="10" stroke-linecap="round"/><text x="250" y="90" font-family="Arial" font-size="64" fill="%23fff" font-weight="700">TM</text></svg>';
const tmSoundInsetIconURL = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="10" fill="%23ff8c00"/><rect x="10" y="14" width="16" height="36" rx="5" fill="%23fff"/><rect x="18" y="22" width="8" height="20" rx="3" fill="%23ff8c00"/><circle cx="44" cy="32" r="12" fill="%23fff"/><path d=\"M38 28 q6 -4 12 0\" stroke=\"%23ff8c00\" stroke-width=\"3\" fill=\"none\" stroke-linecap=\"round\"/><path d=\"M38 36 q6 4 12 0\" stroke=\"%23ff8c00\" stroke-width=\"3\" fill=\"none\" stroke-linecap=\"round\"/><text x=\"20\" y=\"12\" font-family=\"Arial\" font-size=\"10\" fill=\"%23fff\" font-weight=\"700\">TM</text></svg>';

// Inline icons for HTTP/API extension.
const httpApiIconURL = 'data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"600\" height=\"372\" viewBox=\"0 0 600 372\"><rect width=\"600\" height=\"372\" rx=\"26\" fill=\"%23009688\"/><rect x=\"60\" y=\"90\" width=\"480\" height=\"192\" rx=\"18\" fill=\"%23fff\"/><rect x=\"90\" y=\"130\" width=\"100\" height=\"32\" rx=\"8\" fill=\"%23009688\"/><rect x=\"210\" y=\"130\" width=\"160\" height=\"32\" rx=\"8\" fill=\"%23e0f2f1\"/><rect x=\"90\" y=\"180\" width=\"420\" height=\"26\" rx=\"6\" fill=\"%23e0f2f1\"/><rect x=\"90\" y=\"220\" width=\"260\" height=\"26\" rx=\"6\" fill=\"%23e0f2f1\"/><text x=\"110\" y=\"152\" font-family=\"Arial\" font-size=\"16\" fill=\"%23fff\" font-weight=\"700\">GET</text><text x=\"220\" y=\"152\" font-family=\"Arial\" font-size=\"16\" fill=\"%23009688\" font-weight=\"700\">https://api.example.com</text><text x=\"380\" y=\"65\" font-family=\"Arial\" font-size=\"60\" fill=\"%23fff\" font-weight=\"700\">API</text></svg>';
const httpApiInsetIconURL = 'data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"64\" height=\"64\" viewBox=\"0 0 64 64\"><rect width=\"64\" height=\"64\" rx=\"10\" fill=\"%23009688\"/><rect x=\"8\" y=\"20\" width=\"48\" height=\"24\" rx=\"6\" fill=\"%23fff\"/><rect x=\"10\" y=\"22\" width=\"14\" height=\"8\" rx=\"2\" fill=\"%23009688\"/><rect x=\"26\" y=\"22\" width=\"26\" height=\"8\" rx=\"2\" fill=\"%23e0f2f1\"/><rect x=\"10\" y=\"32\" width=\"40\" height=\"8\" rx=\"2\" fill=\"%23e0f2f1\"/><text x=\"32\" y=\"16\" font-family=\"Arial\" font-size=\"10\" fill=\"%23fff\" font-weight=\"700\">API</text></svg>';


export default [
    {
        name: (
            <FormattedMessage
                defaultMessage="Music"
                description="Name for the 'Music' extension"
                id="gui.extension.music.name"
            />
        ),
        extensionId: 'music',
        iconURL: musicIconURL,
        insetIconURL: musicInsetIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Play instruments and drums."
                description="Description for the 'Music' extension"
                id="gui.extension.music.description"
            />
        ),
        featured: true
    },
    {
        name: 'Speech to Text',
        id: 9998,
        extensionId: 'speech',
        iconURL: speechCustomIconURL,
        insetIconURL: speechCustomIconURL,
        description: 'Turn speech into text using the browser microphone.',
        featured: true,
        internetConnectionRequired: true
    },
    {
        name: (
            <FormattedMessage
                defaultMessage="Pen"
                description="Name for the 'Pen' extension"
                id="gui.extension.pen.name"
            />
        ),
        extensionId: 'pen',
        iconURL: penIconURL,
        insetIconURL: penInsetIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Draw with your sprites."
                description="Description for the 'Pen' extension"
                id="gui.extension.pen.description"
            />
        ),
        featured: true
    },
    {
        name: (
            <FormattedMessage
                defaultMessage="Video Sensing"
                description="Name for the 'Video Sensing' extension"
                id="gui.extension.videosensing.name"
            />
        ),
        extensionId: 'videoSensing',
        iconURL: videoSensingIconURL,
        insetIconURL: videoSensingInsetIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Sense motion with the camera."
                description="Description for the 'Video Sensing' extension"
                id="gui.extension.videosensing.description"
            />
        ),
        featured: true
    },
    {
        name: (
            <FormattedMessage
                defaultMessage="Text to Speech"
                description="Name for the Text to Speech extension"
                id="gui.extension.text2speech.name"
            />
        ),
        extensionId: 'text2speech',
        collaborator: 'Amazon Web Services',
        iconURL: text2speechIconURL,
        insetIconURL: text2speechInsetIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Make your projects talk."
                description="Description for the Text to speech extension"
                id="gui.extension.text2speech.description"
            />
        ),
        featured: true,
        internetConnectionRequired: true
    },
    {
        name: (
            <FormattedMessage
                defaultMessage="Translate"
                description="Name for the Translate extension"
                id="gui.extension.translate.name"
            />
        ),
        extensionId: 'translate',
        collaborator: 'Google',
        iconURL: translateIconURL,
        insetIconURL: translateInsetIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Translate text into many languages."
                description="Description for the Translate extension"
                id="gui.extension.translate.description"
            />
        ),
        featured: true,
        internetConnectionRequired: true
    },
    {
        name: 'Makey Makey',
        extensionId: 'makeymakey',
        collaborator: 'JoyLabz',
        iconURL: makeymakeyIconURL,
        insetIconURL: makeymakeyInsetIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Make anything into a key."
                description="Description for the 'Makey Makey' extension"
                id="gui.extension.makeymakey.description"
            />
        ),
        featured: true
    },
    {
        name: 'micro:bit',
        extensionId: 'microbit',
        collaborator: 'micro:bit',
        iconURL: microbitIconURL,
        insetIconURL: microbitInsetIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Connect your projects with the world."
                description="Description for the 'micro:bit' extension"
                id="gui.extension.microbit.description"
            />
        ),
        featured: true,
        disabled: false,
        bluetoothRequired: true,
        internetConnectionRequired: true,
        launchPeripheralConnectionFlow: true,
        useAutoScan: false,
        connectionIconURL: microbitConnectionIconURL,
        connectionSmallIconURL: microbitConnectionSmallIconURL,
        connectingMessage: (
            <FormattedMessage
                defaultMessage="Connecting"
                description="Message to help people connect to their micro:bit."
                id="gui.extension.microbit.connectingMessage"
            />
        ),
        helpLink: 'https://scratch.mit.edu/microbit'
    },
    {
        name: (
            <FormattedMessage
                defaultMessage="AI Image (TM)"
                description="Name for Teachable Machine image extension"
                id="gui.extension.tmimage.name"
            />
        ),
        id: 9999,
        extensionId: 'tmimage',
        iconURL: tmImageCustomIconURL,
        insetIconURL: tmImageCustomIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Load a Teachable Machine image model and classify webcam frames offline."
                description="Description for TM image extension"
                id="gui.extension.tmimage.description"
            />
        ),
        featured: true
    },
    {
        name: (
            <FormattedMessage
                defaultMessage="AI Pose"
                description="Name for pose detection extension"
                id="gui.extension.posehand.name"
            />
        ),
        id: 9998,
        extensionId: 'posehand',
        iconURL: poseCustomIconURL,
        insetIconURL: poseCustomIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Track body landmarks with MoveNet (camera)."
                description="Description for pose detection extension"
                id="gui.extension.posehand.description"
            />
        ),
        featured: true
    },
    {
        name: (
            <FormattedMessage
                defaultMessage="AI Hands"
                description="Name for hand tracking extension"
                id="gui.extension.handpose.name"
            />
        ),
        id: 9997,
        extensionId: 'handpose',
        iconURL: handposeCustomIconURL,
        insetIconURL: handposeCustomIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Track hands (wrists) with MoveNet (camera)."
                description="Description for hand tracking extension"
                id="gui.extension.handpose.description"
            />
        ),
        featured: true
    },
    {
        name: (
            <FormattedMessage
                defaultMessage="AI Face"
                description="Name for face detection extension"
                id="gui.extension.face.name"
            />
        ),
        id: 9996,
        extensionId: 'face',
        iconURL: faceCustomIconURL,
        insetIconURL: faceCustomIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Detect faces, boxes, and simple emotions."
                description="Description for face detection extension"
                id="gui.extension.face.description"
            />
        ),
        featured: true
    },
    {
        name: (
            <FormattedMessage
                defaultMessage="EasyPlug Super"
                description="Name for the EasyPlug extension"
                id="gui.extension.easyplug.name"
            />
        ),
        extensionId: 'easyplug',
        iconURL: easyplugIconURL,
        insetIconURL: easyplugInsetIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Connect via USB (WebSerial) for EasyPlug pins."
                description="Description for the EasyPlug extension"
                id="gui.extension.easyplug.description"
            />
        ),
        featured: true
    },
    {
        name: 'Maqueen Plus',
        extensionId: 'maqueen',
        iconURL: maqueenCustomIconURL,
        insetIconURL: maqueenCustomIconURL,
        description: 'Drive the Maqueen Plus V2 over Bluetooth (BLE UART).',
        featured: true,
        bluetoothRequired: true
    },
    {
        name: 'Sentiment',
        id: 9997,
        extensionId: 'sentiment',
        iconURL: sentimentCustomIconURL,
        insetIconURL: sentimentCustomIconURL,
        description: 'Classify text as positive, negative, or neutral.',
        featured: true
    },
    {
        name: (
            <FormattedMessage
                defaultMessage="Weather"
                description="Name for weather extension"
                id="gui.extension.weather.name"
            />
        ),
        id: 9995,
        extensionId: 'weather',
        iconURL: weatherCustomIconURL,
        insetIconURL: weatherCustomIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Get live weather for a city (open-meteo)."
                description="Description for weather extension"
                id="gui.extension.weather.description"
            />
        ),
        featured: true,
        internetConnectionRequired: true
    },
    {
        name: (
            <FormattedMessage
                defaultMessage="AI Audio (TM)"
                description="Name for TM sound extension"
                id="gui.extension.tmsound.name"
            />
        ),
        id: 9994,
        extensionId: 'tmsound',
        iconURL: tmSoundCustomIconURL,
        insetIconURL: tmSoundCustomIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Load a Teachable Machine sound model and classify microphone audio."
                description="Description for TM sound extension"
                id="gui.extension.tmsound.description"
            />
        ),
        featured: true
    },
    {
        name: (
            <FormattedMessage
                defaultMessage="HTTP / API"
                description="Name for HTTP API extension"
                id="gui.extension.httpapi.name"
            />
        ),
        id: 9993,
        extensionId: 'httpapi',
        iconURL: httpapiCustomIconURL,
        insetIconURL: httpapiCustomIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Fetch JSON/XML or text from any public API."
                description="Description for HTTP API extension"
                id="gui.extension.httpapi.description"
            />
        ),
        featured: true,
        internetConnectionRequired: true
    },
    {
        name: 'LEGO MINDSTORMS EV3',
        extensionId: 'ev3',
        collaborator: 'LEGO',
        iconURL: ev3IconURL,
        insetIconURL: ev3InsetIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Build interactive robots and more."
                description="Description for the 'LEGO MINDSTORMS EV3' extension"
                id="gui.extension.ev3.description"
            />
        ),
        featured: true,
        disabled: false,
        bluetoothRequired: true,
        internetConnectionRequired: true,
        launchPeripheralConnectionFlow: true,
        useAutoScan: false,
        connectionIconURL: ev3ConnectionIconURL,
        connectionSmallIconURL: ev3ConnectionSmallIconURL,
        connectingMessage: (
            <FormattedMessage
                defaultMessage="Connecting. Make sure the pin on your EV3 is set to 1234."
                description="Message to help people connect to their EV3. Must note the PIN should be 1234."
                id="gui.extension.ev3.connectingMessage"
            />
        ),
        helpLink: 'https://scratch.mit.edu/ev3'
    },
    {
        name: 'LEGO BOOST',
        extensionId: 'boost',
        collaborator: 'LEGO',
        iconURL: boostIconURL,
        insetIconURL: boostInsetIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Bring robotic creations to life."
                description="Description for the 'LEGO BOOST' extension"
                id="gui.extension.boost.description"
            />
        ),
        featured: true,
        disabled: false,
        bluetoothRequired: true,
        internetConnectionRequired: true,
        launchPeripheralConnectionFlow: true,
        useAutoScan: true,
        connectionIconURL: boostConnectionIconURL,
        connectionSmallIconURL: boostConnectionSmallIconURL,
        connectionTipIconURL: boostConnectionTipIconURL,
        connectingMessage: (
            <FormattedMessage
                defaultMessage="Connecting"
                description="Message to help people connect to their BOOST."
                id="gui.extension.boost.connectingMessage"
            />
        ),
        helpLink: 'https://scratch.mit.edu/boost'
    },
    {
        name: 'LEGO Education WeDo 2.0',
        extensionId: 'wedo2',
        collaborator: 'LEGO',
        iconURL: wedo2IconURL,
        insetIconURL: wedo2InsetIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Build with motors and sensors."
                description="Description for the 'LEGO WeDo 2.0' extension"
                id="gui.extension.wedo2.description"
            />
        ),
        featured: true,
        disabled: false,
        bluetoothRequired: true,
        internetConnectionRequired: true,
        launchPeripheralConnectionFlow: true,
        useAutoScan: true,
        connectionIconURL: wedo2ConnectionIconURL,
        connectionSmallIconURL: wedo2ConnectionSmallIconURL,
        connectionTipIconURL: wedo2ConnectionTipIconURL,
        connectingMessage: (
            <FormattedMessage
                defaultMessage="Connecting"
                description="Message to help people connect to their WeDo."
                id="gui.extension.wedo2.connectingMessage"
            />
        ),
        helpLink: 'https://scratch.mit.edu/wedo'
    },
    {
        name: 'Go Direct Force & Acceleration',
        extensionId: 'gdxfor',
        collaborator: 'Vernier',
        iconURL: gdxforIconURL,
        insetIconURL: gdxforInsetIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Sense push, pull, motion, and spin."
                description="Description for the Vernier Go Direct Force and Acceleration sensor extension"
                id="gui.extension.gdxfor.description"
            />
        ),
        featured: true,
        disabled: false,
        bluetoothRequired: true,
        internetConnectionRequired: true,
        launchPeripheralConnectionFlow: true,
        useAutoScan: false,
        connectionIconURL: gdxforConnectionIconURL,
        connectionSmallIconURL: gdxforConnectionSmallIconURL,
        connectingMessage: (
            <FormattedMessage
                defaultMessage="Connecting"
                description="Message to help people connect to their force and acceleration sensor."
                id="gui.extension.gdxfor.connectingMessage"
            />
        ),
        helpLink: 'https://scratch.mit.edu/vernier'
    }
];
/* eslint-disable */
