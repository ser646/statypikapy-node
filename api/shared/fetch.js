const connectToDatabase = require('../../lib/database');
const fetch = require('node-fetch');

module.exports = async function(matchid){
    const db = await connectToDatabase();
    if(matchid){
        const res = await fetch('http://logs.tf/api/v1/log/'+matchid)
        .then(r => {
            if(r.status == 200){
                const contentType = r.headers.get("content-type");
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    return r.json().then(r => {   
                        r['_id'] = matchid;
                        r['players_count'] = Object.keys(r.players).length;
                        return db.collection('logs').insertOne(r)
                        .then(_ => {
                            return {status : 'Success', error : ''};
                        })
                        .catch(e => {
                            if(e.code == 11000)e = "id already exists";
                            return {status : 'MongoDB Failure', error : e};
                            console.log(e)
                        })
                    })
                } 
                else {
                    return {status : 'Logs.tf failure', error : r.status};
                }
            }
            else {
                return {status : 'Logs.tf failure', error : r.status};
            }
        })
        .catch(e => console.log(e))
        return res;
    }
    else return {status : 'Failure', error : "no id"};
}