const { Router } = require('express');

const FeaturesCtrl = require('./features.controller');

const router = new Router();
const featuresCtrl = new FeaturesCtrl();

router.route('/region')
    .post(featuresCtrl.createRegion)
    .put(featuresCtrl.updateRegion)
    .delete(featuresCtrl.deleteRegion);

router.route('/')
    .get(featuresCtrl.getFeatures);

module.exports = router;
