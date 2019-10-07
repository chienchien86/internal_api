/* eslint-disable no-console */
const { MongoClient } = require('mongodb');
const Redis = require('ioredis');

const stageConfig = require('./stage.config');
const prodConfig = require('./prod.config');

const FeaturesDAO = require('./dao/featuresDAO');
const UsersDAO = require('./dao/usersDAO');
const DevicesDAO = require('./dao/devicesDAO');


const app = require('./server');

const port = 3000;

async function main() {
    let db = {};
    db.stage = await connectDB(stageConfig);
    db.prod = await connectDB(prodConfig);

    // create prod and stage DAOs when app start.
    app.dao = {}
    await Promise.all(["prod", "stage"].map(async env => {
        const featuresDAO = new FeaturesDAO()
        await featuresDAO.build(db[env])
        const usersDAO = new UsersDAO()
        await usersDAO.build(db[env]);
        const devicesDAO = new DevicesDAO()
        await devicesDAO.build(db[env]);

        app.dao[env] = {
            featuresDAO,
            usersDAO,
            devicesDAO
        }
    }))

    app.stageConfig = stageConfig;
    app.prodConfig = prodConfig;
    app.db = db;

    app.listen(port, () => {
        console.log(`listening on port ${port}`);
    });
}

main();

function connectDB(config) {
    return MongoClient.connect(
        `mongodb://${config.database.user}:${config.database.password}@${config.database.host}:${config.database.port}/ivuu`,
        {
            useNewUrlParser: true,
        },
    ).then(async (mongo) => {
        const redis = new Redis({
            port: config.redis.port,          // Redis port
            host: config.redis.host,
            family: 4,           // 4 (IPv4) or 6 (IPv6)
            password: config.redis.password,
            db: 0,
        });

        return {
            mongo,
            redis
        };
    }).catch((err) => {
        console.error(err.stack);
        process.exit(1);
    })
}