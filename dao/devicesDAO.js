/* eslint-disable no-console */

module.exports = class DevicesDAO {
    async build(db) {
        try {
            this.user_events = await db.mongo.db('ivuu').collection('user_events');
            this.device_logs = await db.mongo.db('ivuu').collection('device_logs');
            this.user_devices = await db.mongo.db('ivuu').collection('user_devices');
            // this.rClient = db.redis;
        } catch (e) {
            throw new Error(`DBError: ${e}`);
        }
    }

    getDeviceByJid(jid){
        return this.user_devices.findOne({
            jid,
            type: "camera"
        })
    }

    async getEvents({
        jid,
        start,
        end,
        limit,
        rm,
        type,
        sort
    }) {
        try {
            const types = type.split(",");
            const hint = 'jid_1_timestamp_-1';
            const project = {
                '_id': 1,
                'timestamp': 1,
                'type': 1,
                'activity': 1,
                'duration': 1,
                'quality': 1,
                'thumbnail_range': 1,
                'ml_data.degree': 1,
                'ml_data.bounding_box': 1,
                'ml_data.viewport': 1,
                'reported': 1,
                'payload': 1,
                'error': 1
            };
            let query = {
                jid,
                $and: [{
                    timestamp: {
                        $gte: Number(start)
                    }
                }, {
                    timestamp: {
                        $lte: Number(end)
                    }
                }]
            };
            if (rm === 'true') {
                query.$or = [{
                    'type': {
                        '$in': types
                    },
                    'rm': { $exists: false }
                }, {
                    'type': {
                        '$in': types.map(function (type) {
                            return 'rm-' + type;
                        })
                    }
                }];
                if (types.indexOf('motion') > -1 || types.indexOf('person') > -1) {
                    query.$or[0].snapshot = { '$exists': true };
                }
            } else {
                query.type = {
                    '$in': types
                };

                if (types.indexOf('motion') > -1 || types.indexOf('person') > -1) {
                    query.snapshot = { '$exists': true };
                }
                query.rm = { '$exists': false };
            }

            return await this.user_events
                .find(query)
                .project(project)
                .limit(Number(limit) || 50)
                .sort({
                    timestamp: Number(sort || -1)
                })
                .hint(hint)
                .toArray();
        } catch (e) {
            throw new Error(`DBError: ${e}`);
        }
    }

    async insertEvents(eventList){
        return this.user_events.insertMany(eventList);
    }

    async getLogs({
        jid
    }) {
        const query = {
            jid
        };

        return this.device_logs
            .find(query)
            .toArray();
    }

    async fetchNewestPersonAndMotionData(){
        return Promise.all(
            [this.user_events.find({
                type: 'motion',
                snapshot:{
                    $exists: true,
                },
                video: {
                    $exists: true,
                },
                source: {
                    $exists: false
                }
            }).limit(1).project({
                snapshot: 1,
                video: 1,
                thumbnail_range: 1
            }).sort({
                _id: -1
            }).next(),
            this.user_events.find({
                type: 'person',
                snapshot: {
                    $exists: true,
                },
                video: {
                    $exists: true,
                },
                source: {
                    $exists: false
                }
            }).limit(1).project({
                snapshot: 1,
                video: 1,
                thumbnail_range: 1
            }).sort({
                _id: -1
            }).next()]
        )
    }

    async getOneDeviceLessVersion({
        owner, version, lastupdate
    }) {
        const query = {
            'owner': owner,
            'os': 'android',
            'type': 'camera',
            'appversion': {
                '$lt': version
            },
            'lastupdate': {
                '$gte': lastupdate
            }
        };
        const project = { _id: 1 };

        return this.user_devices.find(query)
            .limit(1)
            .project(project)
    }
};
