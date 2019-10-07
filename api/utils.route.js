const { Router } = require('express');
const utilCtrl = require('./utils.controller');

const router = new Router();

router.post('/encode-jid', utilCtrl.encodeJID);

module.exports = router;
