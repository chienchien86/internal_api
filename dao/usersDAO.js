/* eslint-disable no-console */
const UID_MAIL_PREFIX = 'userIdMail:';
const UID_PREFIX = 'userId:';
const LIST_PREFIX = 'cmlist-cache.';

module.exports = class UsersDAO {
    async build(db) {
        try {
            this.users = await db.mongo.db('ivuu').collection('users');
            this.user_devices = await db.mongo.db('ivuu').collection('user_devices');

            this.rClient = db.redis;
        } catch (e) {
            throw new Error(`DBError: ${e}`);
        }
    }

    getUserDevices(email){
        return this.user_devices.find({
            owner: email
        }).toArray()
    }

    getUser(email){
        // because Email is not unique in the past
        // have to use find().limit(1) instead of findOne to ensure getting the latest user info.
        return this.users
            .find({email})
            .sort({
                _id: -1
            })
            .limit(1)
            .toArray();
    }

    async deleteKVToken(kvToken){
        await this.rClient.del(kvToken);
    }

    /**
    * Delete a user in the `users` collection
    * @param {string} email - The email of the desired user
    * @returns {Object | null} Returns either a single user or nothing
    */
    async deleteUser(email) {
        const uid = await this.rClient.get(UID_MAIL_PREFIX + email);
        this.rClient.del(UID_PREFIX + uid);
        this.rClient.del(LIST_PREFIX + email);

        try {
            const userExecResult = await this.users.deleteMany({ email });
            const devicesExecResult = await this.user_devices.deleteMany({
                owner: email
            })
            return { result: {
                user: userExecResult.result,
                device: devicesExecResult.result
            }};
        } catch (e) {
            throw new Error(`DBError: ${e}`);
        }
    }

    getTokenFromRedis(token){
        return this.rClient.get(token);
    }

    async updateUser({
        _id,
        kvList
    }){
        const query = {
            _id,
            uniqueId: {
                $exists: true
            }
        };
        let doc = {
            $set: {}
        }
        Object.keys(kvList).map(k => {
            doc["$set"][k] = kvList[k]
        })
        const opt = { upsert: false };

        try {
            return await this.users.updateOne(query, doc, opt);
        } catch (e) {
            throw new Error(`DBError: ${e}`);
        }
    }

    getUserId(email){
        return this.users.findOne({
            email,
            uniqueId: {
                $exists: true
            }
        }, {
            _id: 1
        })
    }
    
    getUserFields({
        email, 
        project
    }){
        return this.users.findOne({
            email
        }, project)
    }

    async getUserRegion(email) {
        let cursor;
        try {
            // Delete the user document with the user's email.
            cursor = await this.users
                .findOne({ email }, {
                    region: 1 
                });
        } catch (e) {
            throw new Error(`DBError: ${e}`);
        }
        return cursor;
    }
};
