/* eslint-disable no-console */

const moment = require('moment');


const DummyMotionEventTemplate = {
    "type": "motion",
    "thumbnail_range": "140-31630",
    "snapshot": "alfredq33lin/ivuu12iPhone4S99F0CEA270B4/20190719/motion-1563501876841/1563501876841_140-31630_s.jpg",
    "video": "alfredq33lin/ivuu12iPhone4S99F0CEA270B4/20190719/motion-1563501876841/1563501876841.mp4",
    "duration": 7,
    "codec": "AVVideoCodecH264",
    "quality": 2,
    "vsize": 1049994,
    "nv": false,
    "mute": false,
    "ip": "0",
    "receive": 0,
    "success": 0,
    "failure": 0,
    "payload": {
        "upload_duration": 7505,
        "sensitivity": 3
    }
}
const DummyPersonEventTemplate = {
    "type": "person",
    "thumbnail_range": "116-18531",
    "snapshot": "alfredq18lin/ivuu11SHIELD-Android-TV00044B8A3E23/20190719/motion-1563502005560/1563502005560_116-18531_s.jpg",
    "offline": false,
    "ip": "",
    "receive": 0,
    "success": 0,
    "failure": 0,
    "appversion": 2101,
    "video": "alfredq18lin/ivuu11SHIELD-Android-TV00044B8A3E23/20190719/motion-1563502005560/1563502005560.mp4",
    "duration": 12,
    "quality": 2,
    "frames": 180,
    "vsize": 1265609,
    "nv": false,
    "mute": false,
    "payload": {
        "upload_duration": 2007,
        "sensitivity": 2
    }
}

module.exports = class Devices {
    constructor() {
    }

    getEvents = async (req, res) => {
        const jid = req.jid;
        let {
            start,
            end,
            limit,
            rm,
            type,
            sort
        } = req.query;

        if (!start) {
            throw new Error("ParamNotSupport: must provide start");
        }

        if (!end) {
            end = new Date();
        }

        if (!sort || Number(sort) !== 1) {
            sort = -1;
        }

        const eventList = await req.devicesDAO.getEvents({
            jid,
            start,
            end,
            limit,
            rm,
            type,
            sort
        });
        res.status(200).json(eventList.map(event => Object.assign({}, event, {
            timestamp: new Date(event.timestamp)
        })));
    }

    getLogs = async (req, res) => {
        const jid = req.jid;
        const logList = await req.devicesDAO.getLogs({
            jid
        });
        res.status(200).json(logList.map(log => Object.assign({}, log, {
            ts: new Date(log.ts),
            events: log.events.map(event => {
                event.ts = new Date(event.ts);
                return event
            })
        })));
    }

    createDummyEvents = async (req, res) => {
        const jid = req.jid;
        let dummyEvent = {};
        const {
            type
        } = req.body;

        const [
            motionData,
            personData
        ] = await req.devicesDAO.fetchNewestPersonAndMotionData();

        const device = await req.devicesDAO.getDeviceByJid(jid);
        if(!device){
            throw new Error("NotFound: Not Found Device");
        }

        const owner = jid.split("/")[0];

        const deviceInfo = {
            "device": device.device,
            "owner": owner,
            "jid": jid,
            "label": device.label || device.device,
            "os": device.os,
            "appversion": device.appversion,
            "source": "internal-api"
        }

        if (type === 'person') {
            dummyEvent = Object.assign({}, DummyPersonEventTemplate, deviceInfo, {
                snapshot: personData.snapshot,
                video: personData.video
            })
        } else {
            dummyEvent = Object.assign({}, DummyMotionEventTemplate, deviceInfo, {
                snapshot: motionData.snapshot,
                video: motionData.video
            })
        }

        const dummyEventList = [];
        const now = moment();
        const expireAt = now.add(7, 'days').valueOf();
        for(let i=0; i< 300; i++){
            const timestamp = now.subtract(144, 'minute').valueOf();
            dummyEventList.push(Object.assign({}, dummyEvent, { timestamp, expireAt}));
        }

        // console.log(dummyEventList);
        await req.devicesDAO.insertEvents(dummyEventList);

        res.send();
    }
};
