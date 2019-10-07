module.exports = class FeaturesDAO {
    async build(db){
        try {
            this.features = await db.mongo.db('ivuu').collection('user_features');
        } catch (e) {
            throw new Error(`DBError: ${e}`);
        }
    }

    async activateFeature(_id) {
        const query = {
            _id
        };

        const doc = { $set: { status: true } };
        const opt = { upsert: false };
        try {
            return await this.features.updateOne(query, doc, opt);
        } catch (e) {
            throw new Error(`DBError: ${e}`);
        }
    }

    async deactivateFeature(_id) {
        const query = {
            _id
        };
        const doc = { $set: { status: false } };
        const opt = { upsert: false };
        try {
            return await this.features.updateOne(query, doc, opt);
        } catch (e) {
            throw new Error(`DBError: ${e}`);
        }
    }

    async insertFeature(feature, owner) {
        const doc = feature;
        doc.owner = owner;

        try {
            return await this.features.insertOne(doc);
        } catch (e) {
            throw new Error(`DBError: ${e}`);
        }
    }

    async getFeature({owner, name, project}) {
        try {
            return await this.features
                .findOne({ owner, name }, project);
        } catch (e) {
            throw new Error(`DBError: ${e}`);
        }
    }

    async getFeatures({ owner, project }) {
        try {
            return await this.features
                .find({ owner })
                .project(project)
                .toArray();
        } catch (e) {
            throw new Error(`DBError: ${e}`);
        }
    }

    async delFeatures(owner) {
        try {
            return await this.features.deleteMany({ owner });
        } catch (e) {
            throw new Error(`DBError: ${e}`);
        }
    }

    async updateFeature({
        _id,
        owner,
        name,
        kvList
    }){
        const query = {
            _id,
            owner,
            name
        };

        let doc = {
            $set: {}
        }
        Object.keys(kvList).map(k => {
            doc["$set"][k] = kvList[k]
        })
        const opt = { upsert: false };
        try {
            return await this.features.updateOne(query, doc, opt);
        } catch (e) {
            throw new Error(`DBError: ${e}`);
        }
    }
};
