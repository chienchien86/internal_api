const crypto = require('crypto');
const PRODUCT_IDS_REF = {
    'ads_free_hy': 'AdsRemovalSubscription',
    'ads_free': 'ads_free',
    'alfred_hd': 'alfred_hd',
    'alfred_hd_2': 'alfred_hd',
    'premium_3m': 'alfred_hd',
    'premium_6m': 'alfred_hd',
    'premium_12m': 'alfred_hd',
    'premium_1m_ip': 'alfred_hd',
    'com.kalavision.alfred.AlfredHD': 'alfred_hd',
    'com.kalavision.alfred.AlfredHD3Mv2': 'alfred_hd',
    'com.kalavision.alfred.AlfredHD6M': 'alfred_hd',
    'com.kalavision.alfred.AlfredHD12M': 'alfred_hd',
    'com.kalavision.alfred.AlfredPlus': 'ads_free',
    'com.kalavision.alfred.AlfredPlusv2': 'ads_free',
    'paypal_billing': 'alfred_hd',
    'paypal_billing_1m': 'alfred_hd',
    'paypal_billing_3m': 'alfred_hd',
    'paypal_billing_6m': 'alfred_hd',
    'paypal_billing_12m': 'alfred_hd',
    'premium_12m_free_trial': 'alfred_hd',
    'alfred_hd_free_trial': 'alfred_hd',
    'premium_12m_0.99': 'alfred_hd',
    'premium_12m_1.49': 'alfred_hd',
    'premium_12m_2.99': 'alfred_hd',
    'premium_12m_3.99': 'alfred_hd',
    'premium_12m_2.49_introductory_1.99': 'alfred_hd',
    'premium_1m_1.99': 'alfred_hd',
    'premium_1m_2.99': 'alfred_hd',
    'premium_1m_4.99': 'alfred_hd',
    'premium_1m_5.99': 'alfred_hd',
    'premium_1m_1.99_free_trial': 'alfred_hd',
    'premium_1m_2.99_free_trial': 'alfred_hd',
    'premium_1m_4.99_free_trial': 'alfred_hd',
    'premium_1m_5.99_free_trial': 'alfred_hd',
    'com.kalavision.alfred.premium_1m_4.99': 'alfred_hd',
    'com.kalavision.alfred.premium_1m_4.99_free_trial': 'alfred_hd',
    'com.kalavision.alfred.premium_1m_5.99': 'alfred_hd',
    'com.kalavision.alfred.premium_1m_5.99_free_trial': 'alfred_hd',
    'com.kalavision.alfred.premium_12m_2.49_introductory_1.99': 'alfred_hd',
    'com.kalavision.alfred.premium_12m_2.99': 'alfred_hd',
    'com.kalavision.alfred.premium_12m_3.99': 'alfred_hd',
    'premium_12m_1.99': 'alfred_hd',
    'com.kalavision.alfred.premium_12m_1.99': 'alfred_hd'
};

// verify owner
exports.ownerVerify = function ownerVerify(req, res, next) {
    const owner = req.query.owner;
    if (!owner) {
        return res.status(400).json({
            error: "Must specify owner."
        })
    }
    req.owner = owner;
    next()
}

exports.validateEmail = function validateEmail(email) {
    // eslint-disable-next-line no-useless-escape
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
};

// This is used to restrict API in internal test email.
// For both email and JID verification.
exports.isTestGroupMember = function isTestGroupMember(email) {

    const regex1 = /^alfredxp.*@gmail.com/i;
    const regex2 = /^alfredq.*lin@gmail.com/i;
    const regex3 = /^.*?@alfred.camera/i;
    if (regex1.test(email) === false && regex2.test(email) === false && regex3.test(email) === false) {
        return false;
    }
    return true;
};

exports.jidVerify = function jidVerify(req, res, next) {
    const jid = req.query.jid;
    if (!jid) {
        return res.status(400).json({
            error: "Must specify jid."
        })
    }

    req.jid = decodeURIComponent(jid);
    next()
}

exports.getSha1ProductionId = function (type) {
    let sha1sum = crypto.createHash('sha1');
    sha1sum.update(PRODUCT_IDS_REF[type]);
    return sha1sum.digest('hex');
};
