const axios = require('axios');
const google = require('googleapis');
const fetch = require('node-fetch');

/**
 * get access token of service account
 *
 * @param {*} config  firebase config
 * @returns {String}  access token
 */
exports.getAccessToken = function getAccessToken(config) {
    return new Promise(function (resolve, reject) {
        var key = require('../service-account.json');
        var jwtClient = new google.auth.JWT(
            key.client_email,
            null,
            key.private_key,
            config.scopes,
            null
        );
        jwtClient.authorize(function (err, tokens) {
            if (err) {
                reject(err);
                return;
            }
            resolve(tokens.access_token);
        });
    });
}

exports.getFirebaseRemoteConfig =  async function getFirebaseRemoteConfig(remote_config_url, accessToken) {
    try {
        // axios cannot show all headers (such as eTag), that's why replace by fetch here.
        const response = await fetch(remote_config_url, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        const data = await response.json();
        return {
            eTag: response.headers.get("etag"),
            data: data
        };
    } catch (err) {
        console.error(err);
        throw new Error("ServerError: get remote config error.");
    }
}

exports.updateFirebaseRemoteConfig = async function updateFirebaseRemoteConfig(remote_config_url, accessToken, config, eTag) {
    try {
        await axios.put(remote_config_url, config, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json; UTF-8',
                'If-Match': eTag
            }
        });
    } catch (err) {
        console.error(err.response);
        throw new Error("ServerError: update remote config error.");
    }
}