const MongoClient = require("mongodb").MongoClient;

let cachedDB = null;
let new_msg = true;

module.exports = async () => {
    if(cachedDB){
        if(new_msg)console.log("Use existing connection");
        new_msg = false;
        return Promise.resolve(cachedDB);
    }
    else {
        return MongoClient.connect(process.env.MONGODB_URI, {
            useUnifiedTopology: true,
            useNewUrlParser: true
        })
        .then((client) => {
            let db = client.db();
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