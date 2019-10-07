const HELP_CENTER_URL = {
    en: 'forum/t/607',
    de: 'forum/t/982',
    zh: 'forum/t/1129',
    es: 'forum/t/784',
    pt: 'forum/t/17821',
    ja: 'forum/t/17826',
    ko: 'forum/t/17825',
    ru: 'forum/t/17827'
};

const HELP_ONBOARDING_URL = {
    en: '786',
    de: '786/7',
    zh: '786/13',
    es: '786/5',
    pt: '786/12',
    ja: '786/8',
    ko: '786/9',
    ru: '786/11',
    it: '786/6',
    fr: '786/10'
};

const PROMOTION_CONF = {
    start: 48,
    period: 168,
    expire: 24
};

exports.generateAdsRmBtnFeatures = function generateAdsRmBtnFeatures(group_id) {
    return {
        'name': 'AdsRemovalButton',
        'group_id': group_id,
        'status': true
    };
}

exports.generateTestPlusMenuEntryFeatures = function generateTestPlusMenuEntryFeatures(group_id) {
    return {
        'name': 'testPlusMenuEntry',
        'group_id': group_id,
        'status': true
    };
}

exports.generateAdsControlParamsFeatures = function generateAdsControlParamsFeatures() {
    return {
        'name': 'AdsControlParams',
        'status': true,
        'live': [1000, 0],
        'events': [1000, 0],
        'moments': [1000, 0],
        'banner_refresh': [120, 30],
        'banner': [430],
        'ctr_bonus': [10]
    };
}

exports.generatePrivacy = function generatePrivacy(privacy) {
    if (privacy.version <= 0) {
        privacy.version = 1;
    }
    return {
        'name': 'PrivacyConsent',
        'version': privacy.version,
        'status': true
    };
}

exports.PLUS_KEY = '8bf388b5d63d021356f9538f42a5d51af16245d8';
exports.PREMIUM_KEY = '496869366716600c6d93ad2444feab8f5d48ba9f';

exports.generatePromotionFeatures = function generatePromotionFeatures(campaign, status) {
    let data = {
        'name': 'Promotion',
        'campaign': campaign,
        'products': ['premium_1m_ip'],
        'status': status
    };
    return data;
}

exports.generateUpgradeBtnFeatures = function generateUpgradeBtnFeatures(version, status) {
    let data = {
        'name': 'UpgradeButton',
        'always': true,
        'version': version,
        'status': status
    };

    return data;
}

exports.generateHDBtnFeatures = function generateHDBtnFeatures() {
    return {
        'name': 'AlfredHD',
        'status': true
    };
}

exports.generateDeviceLogFeatures = function generateDeviceLogFeatures(gid) {
    return {
        'name': 'DeviceLogs',
        'group_id': gid,
        'status': true
    };
}

exports.generateRemoveAdsURLFeatures = function generateRemoveAdsURLFeatures() {
    return {
        'name': 'RemoveAdsURL',
        'base_url': 'alfred-purchase://upgrade-plus',
        'referrer': 'utm_source=app&utm_campaign=alfredplus&utm_medium=ad&utm_term=ad',
        // 'referrer': 'page=1&utm_source=app&utm_campaign=alfredpremium&utm_medium=ad&utm_term=ad',
        'status': true
    };
}

exports.generateIapFeatures = function generateIapFeatures(os) {
    let obj = {};

    switch (os) {
        case 'android':
            obj = {
                'name': 'IapProducts',
                'status': true,
                'premiumservice': 'alfred_hd_2',
                'premiumservice-3m': 'premium_3m',
                'premiumservice-6m': 'premium_6m',
                'premiumservice-12m': 'premium_12m',
                'premiumservice-1m-ip50off': 'premium_1m_ip',
                'adsremoval': 'ads_free',
                'premiumservice-free-trial': 'alfred_hd_free_trial',
                'premiumservice-12m-free-trial': 'premium_12m_free_trial',
                'premiumservice-12m-0.99': 'premium_12m_0.99',
                'premiumservice-12m-1.49': 'premium_12m_1.49',
                'premiumservice-12m-2.99': 'premium_12m_2.99',
                'premiumservice-12m-3.99': 'premium_12m_3.99',
                'premiumservice-12m-2.49-intro-1.99': 'premium_12m_2.49_introductory_1.99',
                'premiumservice-1m-1.99': 'premium_1m_1.99',
                'premiumservice-1m-2.99': 'premium_1m_2.99',
                'premiumservice-1m-4.99': 'premium_1m_4.99',
                'premiumservice-1m-5.99': 'premium_1m_5.99',
                'premiumservice-1m-1.99-free-trial': 'premium_1m_1.99_free_trial',
                'premiumservice-1m-2.99-free-trial': 'premium_1m_2.99_free_trial',
                'premiumservice-1m-4.99-free-trial': 'premium_1m_4.99_free_trial',
                'premiumservice-1m-5.99-free-trial': 'premium_1m_5.99_free_trial',
                'premiumservice-12m-1.99': 'premium_12m_1.99'
            };
            break;
        case 'ios':
            obj = {
                'name': 'IapProducts',
                'status': true,
                'premiumservice': 'com.kalavision.alfred.AlfredHD',
                'premiumservice-3m': 'com.kalavision.alfred.AlfredHD3Mv2',
                'premiumservice-6m': 'com.kalavision.alfred.AlfredHD6M',
                'premiumservice-12m': 'com.kalavision.alfred.AlfredHD12M',
                'adsremoval': 'com.kalavision.alfred.AlfredPlus',
                'premiumservice-1m-4.99': 'com.kalavision.alfred.premium_1m_4.99',
                'premiumservice-1m-4.99-free-trial': 'com.kalavision.alfred.premium_1m_4.99_free_trial',
                'premiumservice-1m-5.99': 'com.kalavision.alfred.premium_1m_5.99',
                'premiumservice-1m-5.99-free-trial': 'com.kalavision.alfred.premium_1m_5.99_free_trial',
                'premiumservice-12m-2.49-intro-1.99': 'com.kalavision.alfred.premium_12m_2.49_introductory_1.99',
                'premiumservice-12m-2.99': 'com.kalavision.alfred.premium_12m_2.99',
                'premiumservice-12m-3.99': 'com.kalavision.alfred.premium_12m_3.99',
                'premiumservice-12m-1.99': 'com.kalavision.alfred.premium_12m_1.99'
            };
            break;
        default:
            obj = {
                'name': 'IapProducts',
                'status': true,
                'premiumservice': 'alfred_hd_2',
                'premiumservice-3m': 'premium_3m',
                'premiumservice-6m': 'premium_6m',
                'premiumservice-12m': 'premium_12m',
                'premium-1m-ip50off': 'premium_1m_ip',
                'adsremoval': 'ads_free'
            };
            break;
    }



    return obj;
}

exports.generateUserTagging = function generateUserTagging(tags) {
    return {
        'name': 'UserTagging',
        'tags': tags,
        'status': true
    };
}

exports.generateHelpCenterURLFeatures = function generateHelpCenterURLFeatures(lang) {
    let item = {
        'name': 'HelpCenterURL',
        'base_url': 'https://alfred.camera/',
        'en': HELP_CENTER_URL.en,
        'default': HELP_CENTER_URL.en,
        'status': true
    };

    if (lang === undefined || lang === null) {
        return item;
    }

    if (lang.indexOf('_') > -1) {
        lang = lang.split('_')[0];
    }
    if (lang.indexOf('-') > -1) {
        lang = lang.split('-')[0];
    }
    if (lang !== 'en' && HELP_CENTER_URL[lang] !== undefined) {
        item.default = HELP_CENTER_URL[lang];
    }
    return item;
}

exports.generateHelpCenterURLFeaturesOld = function generateHelpCenterURLFeaturesOld(lang) {
    let item = {
        'name': 'HelpCenterURL',
        'base_url': 'https://alfred.camera/faq?lang',
        'en': 'en',
        'default': 'en',
        'status': true
    };

    if (lang === undefined || lang === null) {
        return item;
    }

    if (lang.indexOf('_') > -1) {
        lang = lang.split('_')[0];
    }
    if (lang.indexOf('-') > -1) {
        lang = lang.split('-')[0];
    }
    if (lang !== 'en' && HELP_CENTER_URL[lang] !== undefined) {
        item.default = lang;
    }
    return item;
}

exports.generateHelpOnboardingURLFeatures = function generateHelpOnboardingURLFeatures(lang) {
    var item = {
        'name': 'HelpOnboardingURL',
        'base_url': 'https://alfred.camera/forum/t/',
        'en': HELP_ONBOARDING_URL.en,
        'default': HELP_ONBOARDING_URL.en,
        'status': true
    };

    if (lang === undefined || lang === null) {
        return item;
    }

    if (lang.indexOf('_') > -1) {
        lang = lang.split('_')[0];
    }
    if (lang.indexOf('-') > -1) {
        lang = lang.split('-')[0];
    }
    if (lang !== 'en' && HELP_ONBOARDING_URL[lang] !== undefined) {
        item.default = HELP_ONBOARDING_URL[lang];
    }

    return item;
}