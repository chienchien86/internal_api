'use strict';
const async = require('async');
const utility = require('../utility.js');

const IAPManager = require('../libs/iapManager.js');
const ReceiptManager = require('../libs/receiptManager.js');
const PaypalManager = require('../libs/paypalManager.js');
const PaymentCache = require('../libs/paymentCache.js');
const FeatureManager = require('../libs/featureManager.js');


const moment = require('moment');
const has = Object.prototype.hasOwnProperty;

const getGoogleRenewTimes = function (order_id) {
    if (order_id === undefined) {
        return 0;
    }
    let tmp_split = order_id.split('..');
    let renew_times = 0;
    if (tmp_split.length > 1) {
        renew_times = parseInt(tmp_split.pop(), 10) + 1;
    }

    return renew_times;
};

const ERROR_CODE = {
    EXPIRED: 1,
    CANCELLED: 2,
};

// verify the owner's latest receipt
module.exports = function verifyReceiptFunc(dbs, owner, config) {
    const db_user_receipts = dbs.mongo.db('ivuu').collection('user_receipts');
    const db_user_features = dbs.mongo.db('ivuu').collection('user_features');
    const iapManager = new IAPManager(config);
    const receiptManager = new ReceiptManager(dbs.mongo);
    const paypalManager = new PaypalManager(config);
    const paymentCache = new PaymentCache(dbs.redis);
    const featureManager = new FeatureManager(dbs.mongo, config);

    function setFeatureRenewState(params, callback) {
        let query, doc, options;

        query = { 'name': utility.getSha1ProductionId(params.productId), 'owner': params.owner };

        doc = {
            '$set': {
                'autoRenewing': params.autoRenewing,
                'lastupdate': new Date()
            }
        };

        if (params.hasOwnProperty('status')) {
            doc.$set.status = params.status;
        }

        options = { 'upsert': false };

        db_user_features.updateMany(query, doc, options, function (err, item) {
            callback(err, item);
        });
    }

    function disableFeature(args, callback) {
        // {_id, productId, owner, autoRenewing}
        async.waterfall([
            function (next) {
                receiptManager.isOtherReceiptActive({
                    'type': 'subscriptions',
                    'id': args._id,
                    'owner': args.owner
                }, function (err, isActive) {
                    next(err, isActive);
                });
            },
            function (isActive, next) {
                if (isActive) {
                    next(null, null);
                    return;
                }

                async.parallel({
                    updateFeatures: function (cb) {
                        let query = { 'name': utility.getSha1ProductionId(args.productId), 'owner': args.owner };

                        let doc = {
                            '$set': {
                                'autoRenewing': false,
                                'status': false,
                                'lastupdate': new Date()
                            }
                        };

                        let options = { 'upsert': false };

                        db_user_features.updateMany(query, doc, options, function (err, item) {
                            cb(err, item);
                        });
                    },
                    setCacheKey: function (cb) {
                        paymentCache.delPremiumKey(args.owner, function (err) {
                            cb(err, null);
                        });
                    }
                }, function (err, results) {
                    if (err) {
                        next(err, null);
                        return;
                    }
                    next(err, results.updateFeatures);
                });

            }
        ], function (err, result) {
            callback(err, result);
        });

    }

    function disableSubscriptions(id, receipts, gdata, callback) {
        // console.log('disableSubscriptions', id);
        let data = {
            'autoRenewing': false,
            // 'cancelReason': null
        };
        let productId;
        // console.log(gdata);
        if (gdata !== null) {
            if (gdata.hasOwnProperty('cancelReason')) {
                data.cancelReason = gdata.cancelReason;
            }

            if (gdata.hasOwnProperty('autoRenewing')) {
                data.autoRenewing = gdata.autoRenewing;
            }


        }

        productId = receipts.receipt.data.productId || receipts.receipt.data.product_id;


        async.parallel({
            setFeature: function (cb) {
                let args = {
                    '_id': id,
                    'productId': productId,
                    'owner': receipts.owner,
                    'autoRenewing': data.autoRenewing
                };
                disableFeature(args, cb);
            },
            setReceipt: function (cb) {
                receiptManager.closeSubscriptionsReceipt(id, gdata, cb);
            }
        }, function (err, results) {
            callback(err, results);
        });

    }



    function updateSubscriptionsFeatures(receipts, result, callback) {
        let query, doc, options;

        let name = '';
        let now = new Date();

        if (receipts.platform === 'google') {
            name = utility.getSha1ProductionId(receipts.receipt.data.productId);
        }

        if (receipts.platform === 'appstore') {
            name = utility.getSha1ProductionId(receipts.receipt.data.product_id);
        }

        if (receipts.platform === 'paypal') {
            name = utility.getSha1ProductionId(receipts.receipt.data.productId);
        }

        query = {
            'name': name,
            'owner': receipts.owner
        };



        doc = {
            '$set': {
                'expiryTime': result.expiryTimeMillis,
                // 'autoRenewing': result.autoRenewing,
                'lastupdate': now,
                'status': true
            }
        };

        if (result.hasOwnProperty('autoRenewing')) {
            doc.$set.autoRenewing = result.autoRenewing;
        }

        // console.log('updateSubscriptionsFeatures: ', doc);

        options = { 'upsert': false };

        db_user_features.updateMany(query, doc, options, function (err, item) {
            callback(err, item);
        });
    }

    function execSubscriptionsExpiryCheck(id, receipts, result, callback) {
        // console.log('execSubscriptionsExpiryCheck',  receipts, result);
        let state = false;

        function execAppstore() {
            let data = {};
            let i = 0;
            let current_receipt = {};
            let receipt_list = [];
            let retryable = false;
            let isInternalError = false;
            // console.log('execAppstore: ', id);
            if (has.call(result, 'is-retryable') === false && result['is-retryable'] === true) {
                retryable = true;
                isInternalError = true;
            }

            // Internal data access error.
            if (result.status >= 21100 && result.status <= 21199) {
                retryable = true;
                isInternalError = true;
            }
            if (result.status !== 0 && result.status !== -1 && isInternalError === false && retryable === false) {
                // console.log(result);
                data.cancelReason = result.status;
                state = false;
                disableSubscriptions(id, receipts, data, function (err, result) {
                    callback(err, state, { 'text': 'status !== 0', 'data': result });
                });
                return;
            }
            // console.log('retryable: ' + retryable)
            if (retryable === true) {
                state = false;
                callback(result.status, state, { 'isRetry': true });
                return;
            }

            if (has.call(result, 'receipt') !== true) {
                state = false;
                callback(1, state, { 'text': 'not found receipt', 'data': null });
                return;
            }


            if (has.call(result.receipt, 'in_app') !== true) {
                state = false;
                callback(2, state, { 'text': 'not found in_app', 'data': null });
                return;
            }

            receipt_list = result.receipt.in_app;

            if (has.call(result, 'latest_receipt_info')) {
                receipt_list = result.latest_receipt_info;
            }


            receipt_list = receipt_list.sort(function (a, b) {
                return parseInt(b.purchase_date_ms, 10) - parseInt(a.purchase_date_ms, 10);
            });

            i = 0;
            while (receipt_list[i].product_id !== receipts.receipt.data.product_id) {
                i += 1;
                if (i === receipt_list.length) {
                    state = false;
                    callback(3, state, { 'text': 'not found receipt', 'data': null });
                    return;
                }
            }

            current_receipt = receipt_list[i];

            // console.log(current_receipt);

            data = {
                'startTimeMillis': parseInt(current_receipt.purchase_date_ms, 10),
                'expiryTimeMillis': parseInt(current_receipt.expires_date_ms, 10),
                'current_receipt': current_receipt
            };

            let nowtime = new Date().getTime();
            let doc = {
                'lastupdate': new Date(),
                'expiryTime': data.expiryTimeMillis,
                'receipt.data': current_receipt,
                'status': true
            };


            // console.log(current_receipt);
            if (current_receipt.hasOwnProperty('cancellation_date_ms')) {
                // console.log('cancellation_date_ms');
                doc.canceldate = new Date(parseInt(current_receipt.cancellation_date_ms, 10));
                doc.autoRenewing = false;
                data.autoRenewing = false;
                data.canceldate = new Date(parseInt(current_receipt.cancellation_date_ms, 10));
                disableSubscriptions(id, receipts, data, function (err, result) {
                    state = false;
                    callback(err, state, { 'error_code': ERROR_CODE.EXPIRED, 'text': 'nowtime >= data.expiryTimeMillis', 'data': result });
                });
                return;
            }
            // console.log(result)
            if (result.hasOwnProperty('pending_renewal_info')) {
                let renewal_info = result.pending_renewal_info;

                renewal_info.forEach(function (item) {

                    if (item.original_transaction_id === current_receipt.original_transaction_id) {
                        if (item.auto_renew_status === '0') {
                            doc.autoRenewing = false;
                            data.autoRenewing = false;
                        }
                    }
                    // if (item.original_transaction_id === current_receipt.original_transaction_id);
                });
            }


            if (nowtime >= data.expiryTimeMillis) {
                // if (has.call(doc, 'canceldate') === false) {
                //     data.canceldate = new Date(data.expiryTimeMillis);
                // }
                disableSubscriptions(id, receipts, data, function (err, result) {
                    state = false;
                    callback(err, state, { 'error_code': ERROR_CODE.EXPIRED, 'text': 'nowtime >= data.expiryTimeMillis', 'data': result });
                });
                return;
            }



            async.parallel({
                updateFeatures: function (cb) {
                    updateSubscriptionsFeatures(receipts, data, function (err, feature) {
                        cb(err, feature);
                    });
                },
                updateReceipt: function (cb) {
                    receiptManager.updateReceiptById(id, doc, function (err, result) {
                        cb(err, result);
                    });
                }
            }, function (err) {
                if (err) {
                    console.error('execAppstore', err, id);
                }
                state = true;
                callback(err, state, { 'text': '', 'data': id });
            });
        }

        function execGoogle() {
            let data = {
                'kind': result.kind,
                'startTimeMillis': parseInt(result.startTimeMillis, 10),
                'expiryTimeMillis': parseInt(result.expiryTimeMillis, 10),
                'autoRenewing': result.autoRenewing,
                'paymentState': result.paymentState
            };


            if ({}.hasOwnProperty.call(result, 'cancelReason')) {
                data.cancelReason = result.cancelReason;


                if ({}.hasOwnProperty.call(result, 'userCancellationTimeMillis')) {
                    data.state = 'cancelled';
                    data.canceldate = new Date(parseInt(result.userCancellationTimeMillis, 10));
                } else {
                    if (data.cancelReason === 0) {
                        data.canceldate = new Date(parseInt(result.expiryTimeMillis, 10));
                        data.state = 'refunded';
                    }
                }

            }


            let nowtime = new Date().getTime();

            if (nowtime >= data.expiryTimeMillis) {
                state = false;
                disableSubscriptions(id, receipts, data, function (err, result) {
                    callback(err, state, { 'error_code': ERROR_CODE.EXPIRED, 'text': 'nowtime >= data.expiryTimeMillis', 'data': result });
                });
                return;
            }

            async.parallel({
                updateFeatures: function (cb) {
                    updateSubscriptionsFeatures(receipts, data, function (err, feature) {
                        cb(err, feature);
                    });
                },
                updateReceipt: function (cb) {
                    let doc = {
                        'lastupdate': new Date(),
                        'expiryTime': data.expiryTimeMillis,
                        'autoRenewing': data.autoRenewing,
                        'paymentState': data.paymentState,
                        'renew_times': getGoogleRenewTimes(result.orderId),
                        'status': true
                    };

                    if ({}.hasOwnProperty.call(data, 'cancelReason')) {
                        doc.cancelReason = data.cancelReason;
                    }
                    if ({}.hasOwnProperty.call(data, 'canceldate')) {
                        doc.canceldate = data.canceldate;
                    }
                    if ({}.hasOwnProperty.call(data, 'state')) {
                        doc.state = data.state;
                    }
                    if ({}.hasOwnProperty.call(data, 'autoRenewing')) {
                        doc.autoRenewing = data.autoRenewing;
                    }
                    receiptManager.updateReceiptById(id, doc, function (err, result) {
                        cb(err, result);
                    });
                },
            }, function (err) {
                if (err) {
                    console.error('execGoogle', err, id);
                }
                state = true;

                callback(err, state, { 'text': '', 'data': id });
            });
        }

        switch (receipts.platform) {
            case 'appstore':
                execAppstore();
                break;
            case 'google':
                execGoogle();
                break;
            default:
                execGoogle();
        }


    }
    function insertSubscriptionsFeature(email, product_id, result, callback) {
        let name = '';

        try {
            name = utility.getSha1ProductionId(product_id);
        } catch (e) {
            callback(e);
        }

        async.waterfall([
            function (next) {
                let params = {
                    'name': name,
                    'owner': email
                };
                featureManager.getPaymentFeatureOne(params, function (err, item) {
                    next(err, item);
                });
            },
            function (item, next) {
                let exists = false;

                if (item === null) {
                    next(null, exists, null);
                    return;
                }
                exists = true;
                next(null, exists, item);
            },
            function (exists, item, next) {
                let params = {
                    'name': name,
                    'owner': email,
                    'status': true,
                    'startTime': result.startTimeMillis,
                    'expiryTime': result.expiryTimeMillis,
                    'product_id': product_id
                };
                if (result.hasOwnProperty('autoRenewing')) {
                    params.autoRenewing = result.autoRenewing;
                }

                if (exists) {
                    params._id = item._id;
                    if (item.status === true) {
                        params.startTime = item.startTime;
                    }
                    featureManager.updatePaymentFeatureByID(params, function (err, result) {
                        next(err, result);
                    });
                } else {
                    featureManager.insertPaymentFeatureOne(params, function (err, result) {
                        next(err, result);
                    });
                }

            }
        ], function (err, result) {
            callback(err, result);
        });
    }

    function execPayaleSubscription(params, callback) {
        let now = new Date();
        let result = params.result;
        let item = params.item;
        let receipt = params.receipt;
        let status = true;
        let ba = result.ba;
        let productId = receipt.receipt.data.productId;

        let featureName = utility.getSha1ProductionId(productId);
        let owner = receipt.owner;

        if (result.isVaild) {
            if (ba.state === 'Cancelled') {

                if (new Date().getTime() < receipt.expiryTime) {
                    async.parallel({
                        updateFeatures: function (cb) {
                            async.waterfall([
                                function (next) {
                                    let params = {
                                        name: featureName,
                                        owner: owner
                                    };
                                    featureManager.getPaymentFeatureOne(params, function (err, feature) {
                                        console.log(params, feature);
                                        return;
                                    });
                                },
                                function (feature, next) {
                                    if (feature === null) {
                                        let params = {
                                            name: featureName,
                                            owner: owner,
                                            status: true,
                                            startTime: receipt.startTime,
                                            expiryTime: receipt.expiryTime,
                                            autoRenewing: false,
                                            product_id: productId
                                        }
                                        featureManager.insertPaymentFeatureOne(params, function (err) {
                                            next(err);
                                        })
                                    } else {
                                        next(null)
                                    }
                                }
                            ], function (err) {
                                cb(err, null);
                            });
                        },
                        updateReceipt: function (cb) {
                            let doc = {
                                'autoRenewing': false,
                                'state': ba.state.toLowerCase(),
                                'canceldate': now,
                                'cancelReason': null,
                                'lastupdate': now,
                                'status': true
                            };

                            if (new Date().getTime() > receipt.expiryTime) {
                                status = ture;
                                doc.status = status;
                            }
                            receiptManager.updateReceiptById(item._id, doc, function (err, result) {
                                cb(err, result);
                            });
                        }
                    }, function (err) {
                        if (err) {
                            console.error('execPayaleSubscription', err, item._id);
                        }
                        callback(err, false, { 'error_code': ERROR_CODE.CANCELLED, 'text': 'receipt cancelled' });
                    });

                }

                async.parallel({

                    updateFeatures: function (cb) {
                        receiptManager.isOtherReceiptActive({
                            'id': item._id,
                            'owner': item.owner,
                            'type': item.type
                        }, function (err, isActive) {
                            if (err) {
                                cb(err);
                                return;
                            }

                            if (isActive === false && new Date().getTime() > receipt.expiryTime) {
                                status = false;
                            }

                            let doc = {
                                'status': status,
                                'owner': item.owner,
                                'autoRenewing': false,
                                'productId': item.receipt.data.productId,
                            };

                            setFeatureRenewState(doc, function (err, feature) {
                                cb(err, feature);
                            });

                        });
                    },
                    updateReceipt: function (cb) {

                        let doc = {
                            'autoRenewing': false,
                            'state': ba.state.toLowerCase(),
                            'canceldate': now,
                            'cancelReason': null,
                            'lastupdate': now
                        };

                        if (new Date().getTime() > receipt.expiryTime) {
                            status = false;
                            doc.status = status;
                        }

                        receiptManager.updateReceiptById(item._id, doc, function (err, result) {
                            cb(err, result);
                        });
                    }
                }, function (err) {
                    if (err) {
                        console.error('execPayaleSubscription', err, item._id);
                    }
                    callback(err, false, { 'error_code': ERROR_CODE.CANCELLED, 'text': 'receipt cancelled' });
                });
            } else {
                let _receipt = receipt.receipt;
                if (receipt.state === 'pending') {
                    activePaypal();
                } else {
                    callback(null, true, null);
                }

                function activePaypal() {
                    let payment_definition = ba.plan.payment_definitions[0];
                    let startTime = new Date().getTime();
                    let expiryTime = parseInt(moment(startTime, 'x')
                        .add(parseInt(payment_definition.frequency_interval), payment_definition.frequency.toLowerCase() + 's')
                        .add(1, 'days')
                        .format('x'));


                    async.parallel({
                        setCacheKey: function (cb) {
                            paymentCache.setPremiumKey(receipt.owner, function (err) {
                                cb(err);
                            });
                        },
                        insertFeature: function (cb) {
                            let data = {
                                'startTimeMillis': startTime,
                                'expiryTimeMillis': expiryTime,
                                'autoRenewing': true
                            };
                            insertSubscriptionsFeature(receipt.owner, receipt.receipt.data.productId, data, function (err, feature) {
                                cb(err, feature);
                            });
                        },
                        insertReceipt: function (cb) {

                            ba.agreement_details.productId = _receipt.data.productId;
                            let opt = {
                                _id: receipt._id,
                                detail: ba.agreement_details,
                                startTime: startTime,
                                expiryTime: expiryTime,
                                billing_agreement_id: receipt.order_id,
                            };

                            receiptManager.activedBillingPlanByID(opt, function (err, bp) {
                                cb(err, bp);
                            });

                        }
                    }, function (err, data) {
                        callback(null, true, null);
                    });

                }
            }
        } else {
            disableSubscriptions(item._id, receipt, { 'state': ba.state }, function (err, result) {
                callback(err, false, { 'error_code': ERROR_CODE.CANCELLED, 'text': 'receipt is not valid' });
            });
        }
    }

    function validateAndUpdate(item, callback) {
        const id = item._id;
        if (item.hasOwnProperty('receipt') === false) {
            callback(null);
            return;
        }

        async.waterfall([
            function (next) {
                function validateGoogle() {
                    iapManager.validateGoogle(item.type, item.receipt, function (err, result) {
                        console.error('validateGoogle: ', item._id);
                        next(err, item, result);
                    });
                }
                function validateApple() {
                    // console.log(item)
                    iapManager.validateApple(item.receipt.signature, function (err, result) {
                        next(err, item, result);
                    });
                }

                function validatePaypal() {
                    let params = {
                        'id': item.order_id,
                        'expiryTime': item.expiryTime
                    };
                    // console.log(params);
                    paypalManager.validateBA(params, function (err, result) {
                        next(err, item, result);
                    });
                }

                switch (item.platform) {
                    case 'google':
                        validateGoogle();
                        break;
                    case 'appstore':
                        validateApple();
                        break;
                    case 'paypal':
                        validatePaypal();
                        break;
                    default:
                        validateGoogle();
                }

            },
            function (receipt, result, next) {
                // console.log(receipt, result);
                
                // console.log(JSON.stringify(result, '', 4));
                if (item.platform === 'paypal') {
                    // return;
                    execPayaleSubscription({
                        'receipt': receipt,
                        'result': result,
                        'item': item
                    }, function (err, state, data) {
                        next(err, state, data);
                    });
                    return;
                }
                if (has.call(result, 'error')) {
                    if (has.call(result.error, 'code')) {

                        if (result.error.code === 400) {
                            disableSubscriptions(id, receipt, {}, function (err, result) {
                                next(err, false, null);
                            });
                            return;
                        }
                        if (result.error.code === 410 && item.platform === 'google') {
                            // need add grace period.
                            if (receipt.expiryTime < parseInt(moment().subtract(8, 'days').format('x'), 10)) {
                                disableSubscriptions(id, receipt, {}, function (err, result) {
                                    next(err, false, null);
                                });
                            } else {
                                // Not yet expired
                                next(err, true, null);
                            }
                            return;
                        }

                        // console.error('error.code: ' + result.error.code);
                        next(err, true, null);
                    } else {
                        next(err, true, null);
                    }

                } else {

                    if (receipt !== null) {
                        // console.log('execSubscriptionsExpiryCheck')
                        execSubscriptionsExpiryCheck(id, receipt, result, function (err, state, data) {
                            next(err, state, data);
                        });
                        return;
                    }
                    next(err, false, null);
                }
            }
        ], function (err, state, data) {
            if (err) {
                console.error('validateAndUpdate err:', err, id);

                if (data !== null && data !== undefined && has.call(data, 'isRetry')) {
                    validateAndUpdate(item, callback);
                    return;
                }
            }

            console.log('item done:', id, state);
            callback(null);
        });
    }

    return new Promise((res, rej) => {
        async.waterfall([
            function getOwnerLatestReceipt(next) {
                let query, project;

                query = {
                    'owner': owner,
                    'type': 'subscriptions',
                    'platform': {
                        '$nin': ['alfred-vip', 'paypal']
                    },
                    'status': true,
                };

                project = { '_id': 1, 'type': 1, 'receipt': 1, 'owner': 1, 'startTime': 1, 'expiryTime': 1, 'platform': 1, 'order_id': 1, 'state': 1 };

                db_user_receipts
                    .find(query)
                    .project(project)
                    .sort({ _id: -1 })
                    .limit(1)
                    .toArray(function (err, results) {
                        next(err, results);
                    });
            },
            function walkReceipts(receipts, next) {
                if (receipts.length === 0) {
                    return next("NotFound: NoReceipt");
                }
                validateAndUpdate(receipts[0], function (err) {
                    next(err, receipts);
                });
            },

        ], function (err) {
            if (err) {
                return rej(err)
            }

            res("done");
        });
    })

}