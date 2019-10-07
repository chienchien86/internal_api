/* eslint-disable no-console */
const jwt = require('jsonwebtoken');
const utitlity = require('../utility.js');
const verifyReceiptFunc = require("./receipt.helper");

module.exports = class User {
    constructor() {
    }

    static async deleteUser(req, res) {
        const errors = {};

        let email = req.owner;
        let deleteResult = false;
        let delFeatureResult = false;

        if (utitlity.validateEmail(email) === false) {
            res.status(400).json({ error: 'not valid email' });
            return;
        }

        email = email.toLowerCase();

        if (utitlity.isTestGroupMember(email) === false) {
            res.status(400).json({ error: 'not alfred account' });
            return;
        }

        try {
            deleteResult = await req.usersDAO.deleteUser(email);
            delFeatureResult = await req.featuresDAO.delFeatures(email);
        } catch (e) {
            console.log(e);
            res.status(500).json(e);
        }
        if (deleteResult === false || delFeatureResult === false) {
            errors.general = 'Internal error, please try again later';
        }

        if (Object.keys(errors).length > 0) {
            res.status(400).json(errors);
            return;
        }
        res.status(200).json(deleteResult);
    }

    static async getUserDevices(req, res){
        const owner = req.owner;
        const deviceList = await req.usersDAO.getUserDevices(owner);
        
        res.send({
            deviceList
        })
    }

    static async getUser(req, res){
        const owner = req.owner;

        const ownerDetail = await req.usersDAO.getUser(owner);

        if(!ownerDetail || ownerDetail.length === 0){
            throw new Error("NotFound: user not found.")
        }

        res.send({
            user: ownerDetail[0]
        })
    }

    static deleteKVToken = async (req, res) => {
        const kvToken = req.query.kvtoken;
        const JWT_SECRET = req.config.ALFRED_JWT_SECRET;
        if (!kvToken) {
            throw new Error("NotFound: Need kv token")
        }

        // verify kvtoken
        await jwt.verify(kvToken, JWT_SECRET);

        const jid = await req.usersDAO.getTokenFromRedis(kvToken);
        if (!utitlity.isTestGroupMember(jid)) {
            throw new Error("AuthenticationError: kvtoken should belong to test group.");
        }

        await req.usersDAO.deleteKVToken(kvToken);
        res.send()
    }

    static verifyReceipt = async (req, res) => {
        const owner = req.owner;

        if (!utitlity.isTestGroupMember(owner)) {
            throw new Error("AuthenticationError: owner should belong to test group.");
        }

        try {
            await verifyReceiptFunc(req.db, owner, req.config);
        } catch (err) {
            throw new Error(err);
        }

        res.send();
    }
};