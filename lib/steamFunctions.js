const connectToDatabase = require('../lib/database');

const fetch = require('node-fetch');

function chunk(array, size) {
    const chunked_arr = [];
    let index = 0;
    while (index < array.length) {
      chunked_arr.push(array.slice(index, size + index));
      index += size;
    }
    return chunked_arr;
  }

module.exports = {
    getSteamProfiles : async function (steamids64){
        const db = await connectToDatabase();
        let p = [];
        const steam_api_key = process.env.STEAM_API_KEY;
        const date = Date.now();
        const d = new Date(date)
        let old_date = d.setDate(d.getMonth() - 1);
        
        
        const already_in_db =  await db.collection('steam_profiles').find({
        'update_timestamp': {$gt : old_date},
        '_id': { $in: steamids64}
        }).toArray();
        let db_ids = [];
        for(let e of already_in_db)db_ids.push(e._id) 
        let ids = steamids64.filter(x => !db_ids.includes(x));
        ids = chunk(ids, 100)
        
        for(let i = 0;i < ids.length;i++){
            p[i] = fetch(`http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${steam_api_key}&steamids=`+JSON.stringify(ids[i]))
                .then(d => d.json())
                .then(d => {
                let profiles = [];
                d = d.response.players
                for(p of d){
                    profiles.push({
                    _id : p.steamid,
                    avatar : p.avatar,
                    profileurl : p.profileurl,
                    personaname: p.personaname
                    })
                }
                return profiles;
                })
                .catch(e => {
                    console.log(e)
                })
        }
        return await Promise.all(p).then(d => {
            let merged = [];
            for(let dd of d) {
            merged = merged.concat(dd)
            }
            for(let m of merged){
            m['update_timestamp'] = date;
            db.collection('steam_profiles').replaceOne({'_id' : m._id},m,{upsert : true})
                .then(_ => {})
                .catch(e => {console.log('Failure: '+e);})
            }
            for(let dd of already_in_db) {
            merged = merged.concat(dd)
            }
            return merged;          
        })
  }
}