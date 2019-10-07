const { Router } = require('express');
const usersCtrl = require('./users.controller');
const { ownerVerify } = require('../utility');

const router = new Router();

router.route('/kvtoken').delete(usersCtrl.deleteKVToken);
router.route('/')
    .get(ownerVerify, usersCtrl.getUser)
    .delete(ownerVerify, usersCtrl.deleteUser);

router.get('/device', ownerVerify, usersCtrl.getUserDevices)
router.put('/receipt', ownerVerify, usersCtrl.verifyReceipt);

module.exports = router;
