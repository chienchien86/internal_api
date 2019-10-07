const { Router } = require('express');

const DevicesCtrl = require('./devices.controller');

const router = new Router();
const devicesCtrl = new DevicesCtrl();

function onlySupportStageEnv(req, res, next){
    if(req.env !== "stage"){
        throw new Error("ParamNotSupport: OnlySupportStageEnv")
    }

    next();
}

router.route('/event')
    .get(devicesCtrl.getEvents);

router.route('/log')
    .get(devicesCtrl.getLogs);

router.route('/dummy-event')
    .post(onlySupportStageEnv ,devicesCtrl.createDummyEvents);

module.exports = router;