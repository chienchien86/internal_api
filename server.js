const helmet = require('helmet');
const express = require('express');
require('express-async-errors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const cors = require('cors');

// const features = require('./features');
const features = require('./api/features.route');
const users = require('./api/users.route');
const devices = require('./api/devices.route');
const utils = require('./api/utils.route');
const firebase = require('./api/firebase.route');


const {
    ownerVerify,
    jidVerify
} = require('./utility');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(morgan(':remote-addr [:date[web]] :method :url HTTP/:http-version :status :res[content-length] :user-agent :response-time ms'));
app.use(helmet());
app.disable('x-powered-by');


const router = new express.Router();

router.use('/feature', ownerVerify, features);
router.use('/user', users);
router.use('/util', utils);
router.use('/device', jidVerify, devices);
router.use('/firebase', firebase);

app.use('/stage', async (req, res, next) => {
    req.env = "stage";

    Object.assign(req, {
        featuresDAO,
        usersDAO,
        devicesDAO
    } = app.dao.stage)

    req.config = app.stageConfig;
    req.db = app.db.stage;

    next();
}, router);

app.use('/prod', async (req, res, next) => {
    req.env = "prod";

    Object.assign(req, {
        featuresDAO,
        usersDAO,
        devicesDAO
    } = app.dao.prod)

    req.config = app.prodConfig;
    req.db = app.db.prod;

    next();
}, router);

app.use((err, req, res, next) => {
    console.log(err)
    if (/^ParamNotSupport/.test(err.message)) {
        res.status(400);
        return res.json({ error: err.message });
    }
    if (/^NotFound/.test(err.message)) {
        res.status(404);
        return res.json({ error: err.message });
    }

    if (/^AuthenticationError/.test(err.message)){
        res.status(401);
        return res.json({ error: err.message });
    }

    res.status(500);
    res.json({ error: err.message });
});


// export default app;
module.exports = app;
