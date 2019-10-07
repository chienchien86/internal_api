/* eslint-disable no-console */
const moment = require('moment');
const config = require('../common.config');

const {
    PREMIUM_KEY,
    PLUS_KEY,
    generateAdsRmBtnFeatures,
    generateTestPlusMenuEntryFeatures,
    generateAdsControlParamsFeatures,
    generatePrivacy,
    generateUpgradeBtnFeatures,
    generateHDBtnFeatures,
    generateDeviceLogFeatures,
    generateRemoveAdsURLFeatures,
    generateIapFeatures,
    generateUserTagging,
    generateHelpCenterURLFeatures,
    generateHelpCenterURLFeaturesOld,
    generateHelpOnboardingURLFeatures,
} = require('./feature.helper');

const FEATURES_PROJECTION = {
    '_id': 0,
    'name': 1,
    'group_id': 1,
    'status': 1,
    'expiryTime': 1,    // premium service
    'autoRenewing': 1,  // premium service
    'version': 1,       // UpgradeButton
    'always': 1,
    'live': 1,          // AdsControlParams
    'events': 1,        // AdsControlParams
    'moments': 1,       // AdsControlParams
    'banner_refresh': 1,// AdsControlParams
    'ctr_bonus': 1,     // AdsControlParams
    'progress': 1,
    'page_url': 1,
    'image_url': 1,
    'base_url': 1,
    'referrer': 1,
    'tags': 1,  // for UserTagging
    'addr': 1,  // for AlfredCameraXmpp
    'port': 1,   // for AlfredCameraXmpp
    'startTime': 1,// for premium service
    'project_name': 1, // for ml-training
    'products': 1,  // for upgradebutton feature 
    'campaign': 1,   // for upgradebutton feature
    'sync': 1,  // for premium,
    'cycle': 1, // premium period
    'features': 1, // for Beta
};

class Feature {
    constructor() {
        this.xmpp = config.features.xmpp;
        this.insertXMPPFeature = this.insertXMPPFeature.bind(this);
        this.generateXMPPFeature = this.generateXMPPFeature.bind(this);
    }

    generateXMPPFeature = (region) => {
        return {
            name: this.xmpp.feature,
            addr: `${region}${this.xmpp.host_prefix}`,
            port: this.xmpp.port,
            status: true,
            createdate: new Date(),
        };
    }
    /**
     *
     *
     * @param {*} owner
     * @param {*} usersDAO
     * @param {*} featuresDAO
     * @returns
     * @memberof Feature
     */
    insertXMPPFeature = async (owner, usersDAO, featuresDAO) => {
        try {
            const user = await usersDAO.getUserRegion(owner);
            if (!user || user.region === null) {
                throw new Error('ParamNotSupport: Region is Undefined');
            }
            const feature = this.generateXMPPFeature(user.region.name);
            return await featuresDAO.insertFeature(feature, owner);
        } catch (e) {
            throw new Error(e);
        }
    }

    createRegion = async (req, res) => {
        const { owner } = req;
        const errors = {};
        try {
            const originFeature = await req.featuresDAO.getFeature({
                owner,
                name: this.xmpp.feature,
                project: {
                    _id: 1,
                    status: 1,
                    addr: 1,
                }
            });

            if (originFeature === null) {
                await this.insertXMPPFeature(owner, req.usersDAO, req.featuresDAO);
            } else {
                await req.featuresDAO.activateFeature(originFeature._id);
            }
        } catch (e) {
            throw new Error(e);
        }

        res.status(200).end();
    }

    updateRegion = async (req, res) => {
        const { owner } = req;
        const { region } = req.body;

        if (!region || !isRegionSupport(region)) {
            throw new Error("ParamNotSupport");
        }

        const originUser = await req.usersDAO.getUserId(owner);
        if(!originUser){
            throw new Error("NotFound: user not found");
        }

        const originFeature = await req.featuresDAO.getFeature({
            owner,
            name: this.xmpp.feature,
            project: {
                _id: 1,
                status: 1,
                addr: 1,
            }
        });

        if (originFeature === null) {
            const feature = this.generateXMPPFeature(region);
            await req.featuresDAO.insertFeature(feature, owner);
        } else {
            await req.featuresDAO.updateFeature({
                _id: originFeature._id,
                owner,
                name: this.xmpp.feature,
                kvList: {
                    addr: `${region}${this.xmpp.host_prefix}`
                }
            })
        }

        await req.usersDAO.updateUser({
            _id: originUser._id,
            kvList: {
                "region.name": region,
                "region.source": "internal-api"
            }
        })

        res.status(200).end();
    }

    deleteRegion = async (req, res) => {
        const { owner } = req;

        const originFeature = await req.featuresDAO.getFeature({
            owner,
            name: this.xmpp.feature,
            project: {
                _id: 1
            }
        });

        if (originFeature) {
            await req.featuresDAO.deactivateFeature(originFeature._id);
            return res.json({
                data: "successfully deactivate region feature"
            })
        }

        return res.status(404).json({
            data: "user doens't have region feature."
        })
    }

    getFeatures = async (req, res) => {
        const email = req.owner;

        let {
            version,
            isDesktop,
            isAndroid,
            isiOS
        } = req.query;

        isAndroid = isAndroid === 'true';
        isiOS = isiOS === 'true';
        isDesktop = isDesktop === 'true';

        let project = { email: 1, lang: 1, history: 1, register_date: 1, countries: 1, _id: 0, privacy_consent: 1 };
        const user = await req.usersDAO.getUserFields({ email, project });

        if(!user){
            throw new Error("NotFound: user not found.")
        }

        // check whether user has old version camera
        const data = {
            owner: email,
            version: 1176,
            lastupdate: parseInt(moment().subtract(2, 'months').format('x'), 10)
        }
        const hasOld = await req.devicesDAO.getOneDeviceLessVersion(data);

        const features = await req.featuresDAO.getFeatures({
            owner: email,
            project: FEATURES_PROJECTION
        });

        var i, feature_count;
        var hasAdsrmBtn = false,
            hasUpgradeBtn = false,
            hasAlfredHD = false,
            hasDeviceLog = false,
            hasAdsControlParams = false,
            hasRemoveAdsURL = false,
            userTagging = -1,
            hasPremium = false,
            hasPlus = false,
            wasPremium = false,
            hasPromotion = false,
            isPromation = false,
            skipPromition = false,
            isUpgrade12M = false,
            tags = [];

        feature_count = features.length;
        let upgradeButton = {};
        let promotionItem = {};

        //  Check exists feature;
        for (i = 0; i < feature_count; i += 1) {
            if (features[i].name === 'AdsRemovalButton') {
                hasAdsrmBtn = true;
            }

            if (features[i].name === 'UpgradeButton') {
                hasUpgradeBtn = true;
                upgradeButton = features[i];
                if (features[i].hasOwnProperty('promotion') && upgradeButton.promotion === false) {
                    skipPromition = true;
                }
            }

            if (features[i].name === 'Promotion') {
                hasPromotion = true;
                promotionItem = features[i];
                if (promotionItem.status === false) {
                    skipPromition = true;
                }
            }

            if (features[i].name === 'AlfredHD') {
                hasAlfredHD = true;
            }
            if (features[i].name === 'DeviceLogs') {
                hasDeviceLog = true;
            }

            if (features[i].name === 'AdsControlParams') {
                hasAdsControlParams = true;
            }

            if (features[i].name === 'RemoveAdsURL') {
                hasRemoveAdsURL = true;
            }

            if (features[i].name === PREMIUM_KEY) {
                if (features[i].status) {
                    hasPremium = true;
                } else {
                    wasPremium = true;
                }
            }

            if (features[i].name === PLUS_KEY) {
                if (features[i].status) {
                    hasPlus = true;
                }
            }

            if (features[i].name === 'UserTagging') {
                userTagging = i;
            }

            if (features[i].name === 'testFeatureUnavailable') {
                next(true);
                return;
            }
            if (features[i].name === 'Beta' && features[i].status === true) {
                if (features[i].features.indexOf('upgrade_to_12m') > -1) {
                    isUpgrade12M = true;
                }
            }
        }

        // check privacy consent
        if (user.hasOwnProperty('privacy_consent') === true) {
            features.push(generatePrivacy(user.privacy_consent));
        }

        if (hasRemoveAdsURL !== true) {
            features.push(generateRemoveAdsURLFeatures());
        }

        if (hasPremium) {
            tags.push('premium');
            isPromation = false;
        }

        if (hasPlus) {
            tags.push('plus');
        }

        if (hasOld) {
            tags.push('outdated_app');
        }

        if (isUpgrade12M) {
            tags.push('upgrade_12m');
        }

        features.push(generateHelpOnboardingURLFeatures(user.lang));

        if (version !== null) {
            if (isAndroid) {
                // for android 
                features.push(generateIapFeatures('android'));
                features.push(generateHelpCenterURLFeatures(user.lang));

                if (version >= 1096 && !hasDeviceLog) {
                    features.push(generateDeviceLogFeatures(1));
                }

                if (version >= 1168 && !hasAlfredHD) {
                    features.push(generateHDBtnFeatures());
                }

                if (version >= 1020 && !hasAdsrmBtn) {
                    features.push(generateAdsRmBtnFeatures(0));
                }

                if (!hasUpgradeBtn) {
                    upgradeButton = generateUpgradeBtnFeatures(1, true);
                }

                if (version < 1490 && !hasAdsControlParams) {
                    features.push(generateAdsControlParamsFeatures());
                }

            } else if (isiOS) {
                // for iOS
                features.push(generateIapFeatures('ios'));
                features.push(generateAdsControlParamsFeatures());
                features.push(generateTestPlusMenuEntryFeatures(1));
                if (version <= versions.ios.helpCenter) {
                    features.push(generateHelpCenterURLFeatures(user.lang));
                } else {
                    features.push(generateHelpCenterURLFeaturesOld(user.lang));
                }
                if (!hasUpgradeBtn) {
                    if (version >= versions.ios.upgradeBtn) {
                        upgradeButton = generateUpgradeBtnFeatures(1, true);
                    } else {
                        upgradeButton = generateUpgradeBtnFeatures(1, false);
                    }
                }
            } else {

                if (!hasUpgradeBtn) {
                    upgradeButton = generateUpgradeBtnFeatures(1, true);
                }
                features.push(generateHelpCenterURLFeatures(user.lang));
            }
        } else {
            features.push(generateAdsControlParamsFeatures());
            // unknown device
            if (!hasUpgradeBtn) {
                upgradeButton = generateUpgradeBtnFeatures(1, true);
            }
            features.push(generateHelpCenterURLFeatures(user.lang));
        }

        // set upgrade button
        if (!hasUpgradeBtn) {
            features.push(upgradeButton);
        }

        if (tags.length > 0) {
            if (userTagging >= 0) {
                features[userTagging].tags = features[userTagging].tags.concat(tags);
            } else {
                features.push(generateUserTagging(tags));
            }
        }


        // hidden some feature for web.
        if (isDesktop) {
            features = features.filter(function (item) {
                if (item.name === PLUS_KEY || item.name === PREMIUM_KEY) {
                    return false;
                }
                return true;
            });
        }

        return res.json({
            features
        })
    }
}

function isRegionSupport(region) {
    return ['tw', 'sa', 'na', 'na2', 'eu', 'ap'].indexOf(region) > -1
}

module.exports = Feature;
