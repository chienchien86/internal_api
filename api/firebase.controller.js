const { getAccessToken, getFirebaseRemoteConfig, updateFirebaseRemoteConfig } = require("./firebase.helper")


const FIREBASE_ANDROID_PARAM = "Android test version";
const FIREBASE_IOS_PARAM = "iOS test version";


/**
 * return remote config all test can update
 * @param {*} firebase: firebase config
 */
exports.getRemoteConfig = async function getRemoteConfig(req, res) {
    try {
        let accessToken = "";
        try {
            accessToken = await getAccessToken(req.config.firebase);
        } catch (err) {
            console.error(err);
            throw new Error("ServerError: get google service account error.")
        }

        let returnData = {};
        const {
            data
        } = await getFirebaseRemoteConfig(req.config.firebase.remote_config_url, accessToken);
        for (const key of Object.keys(data.parameters)) {
            const parameter = data.parameters[key];

            if (!parameter.conditionalValues) {
                continue;
            }

            if (!parameter.conditionalValues.hasOwnProperty(FIREBASE_ANDROID_PARAM) && !parameter.conditionalValues.hasOwnProperty(FIREBASE_IOS_PARAM)) {
                continue;
            }

            Object.assign(returnData, {
                [key]: parameter
            });
        }
        res.send(returnData);
    } catch (err) {
        console.error(err);
        throw new Error("ServerError: get remote config failed.");
    }
}

exports.updateRemoteConfig = async function updateRemoteConfig(req, res) {
    const {
        platform = 'android',
        key = '',
        value
    } = req.body;

    const param = platform === 'android' ?
        FIREBASE_ANDROID_PARAM :
        FIREBASE_IOS_PARAM;

    if (key === '' || value === '') {
        throw new Error("ParamNotSupport: have to set key and value.");
    }

    let accessToken = "";
    try {
        accessToken = await getAccessToken(req.config.firebase);
    } catch (err) {
        console.error(err);
        throw new Error("ServerError: get google service account error.")
    }

    let {
        data: remoteConfig,
        eTag
    } = await getFirebaseRemoteConfig(req.config.firebase.remote_config_url, accessToken);

    if (!remoteConfig["parameters"] || !remoteConfig["parameters"][key] || !remoteConfig["parameters"][key]["conditionalValues"] || !remoteConfig["parameters"][key]["conditionalValues"][param]) {
        throw new Error("NotFound: parameter is not found");
    }

    remoteConfig["parameters"][key]["conditionalValues"][param]["value"] = value;

    await updateFirebaseRemoteConfig(req.config.firebase.remote_config_url, accessToken, remoteConfig, eTag);

    res.send();
}

