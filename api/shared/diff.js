const connectToDatabase = require('../../lib/database');
const fetch = require('node-fetch');

module.exports = async function(){
    const db = await connectToDatabase();
    let use_tf2pickup_api = Number(process.env.USE_TF2PICKUP_API)
    let tf2pickup_api_limit = Number(process.env.TF2PICKUP_API_LIMIT)
    let title = process.env.LOGSTF_TITLE;

    let mode = process.env.MATCH_FORMAT;
    let lt = 0;
    let gt = 0;

    if(mode == "6v6"){
        lt = 15;
        gt = 0;
    }
    else if(mode == "9v9"){
        lt = 30;
        gt = 15;
    }

    let p1 = fetch(`https://logs.tf/api/v1/log?title=${title}&limit=10000`)
    .then(r => r.json())
    .then(r => {
        let logs = [];
        for(let l of r.logs){
            if(l.players > gt && l.players < lt)logs.push(`${l.id}`)
        }
        return logs;
    }) 
    let p2 = use_tf2pickup_api ? fetch(`https://api.${title}/games?limit=100`)
    .then(r => r.json()).then(r => {
        let logs = [];
        for(let l of r.results){
            let len = Object.keys(l.slots).length;
            if(l.logsUrl && len > gt  && len < lt)
                logs.push(l.logsUrl.slice(-7))
        }
        return logs;
    }) : [];
    let p3 = db.collection('logs').distinct('_id', {}, {})
    const d = await Promise.all([p1,p2,p3]).then(r => {
        let diff1 = r[0].filter(x => !r[2].includes(x));
        let diff2 = r[1].filter(x => !r[2].includes(x));
        let diff = diff1.concat(diff2.filter((item) => diff1.indexOf(item) < 0))
        return diff;
    })
    return d;
};