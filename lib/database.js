const MongoClient = require("mongodb").MongoClient;

let cachedDB = null;

module.exports = async () => {
    if(cachedDB){
        console.log("Use existing connection");
        return Promise.resolve(cachedDB);
    }
    else {
        return MongoClient.connect(process.env.MONGODB_URI, {
            useUnifiedTopology: true,
            useNewUrlParser: true
        })
        .then((client) => {
            let db = client.db(process.env.DB_NAME);
            console.log("New database connection");
            cachedDB = db;
            return cachedDB;
        })
        .catch((error) => {
            console.log("Mongo Connection error");
            console.log(error);
        })
    }
}