const { Router } = require('express');

const FirebaseCtrl = require('./firebase.controller');

const router = new Router();

router.route('/')
    .get(FirebaseCtrl.getRemoteConfig)
    .put(FirebaseCtrl.updateRemoteConfig);

module.exports = router;