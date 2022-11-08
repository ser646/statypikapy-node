const express = require('express')
const router = express.Router();
const connectToDatabase = require('../lib/database');
const dateFunctions = require('../lib/dateFunctions')
const getSteamProfiles = require('../lib/steamFunctions').getSteamProfiles;

const SteamID = require('steamid');
const fetch = require('node-fetch');

router.get('/', async (req, res) => {
    const db = await connectToDatabase();
    const time_range = req.query['time_range'];
    const param = req.query['param'];

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

    let filter_class = JSON.parse(req.query['filter_class']);
    !filter_class ? filter_class = {'$exists' : 1} : false;
    let filter_maps = JSON.parse(req.query['filter_maps']);
    filter_maps.length == 0 ? filter_maps = {'$exists' : 1} : filter_maps = {'$in' : filter_maps};
    let dt = new Date();
    if(time_range == 'all')dt = 1;
    else if(time_range == 'weekly')dt =  dateFunctions.startOfWeek(dt);
    else if(time_range == 'monthly')dt =  dateFunctions.startOfMonth(dt);
    let z = new Date(dt);
    z = z.getTime()

    db.collection('logs').aggregate([
        {
        '$match': {
            'players_count': {
                '$lt': lt,
                '$gt' : gt
            }, 
            'info.date': {
            '$gt': z / 1000
            }
        }
        }, {
        '$project': {
            'names': {
            '$objectToArray': '$names'
            }, 
            'players_arr': {
            '$objectToArray': '$players'
            }, 
            'map': '$info.map'
        }
        }, {
        '$unwind': {
            'path': '$players_arr'
        }
        }, {
        '$project': {
            '_id': 1, 
            'p_id': '$players_arr.k', 
            'name': {
            '$arrayElemAt': [
                '$names', {
                '$indexOfArray': [
                    '$names.k', '$players_arr.k'
                ]
                }
            ]
            }, 
            'class_stats': '$players_arr.v.class_stats',
            'map': '$map', 
            'value': {'$convert': {
                'input': `$players_arr.v.${param}`, 
                'to': 'double'
                }
            }
        }
        }, {
        '$project': {
            '_id': 1, 
            'p_id': 1, 
            'name': '$name.v', 
            'map': 1, 
            'class_stats' : 1,
            'value': 1
        }
        },{
        '$match':{
            'map' : filter_maps,
            'class_stats.type' : filter_class
        }
        }, {
        '$sort': {
            'value': -1
        }
        }, {
        '$limit': 10
        }
    ]).toArray(async (cmdErr, result) => {
        let steamids64 = [];
        for(let {p_id} of result){
            p_id = new SteamID(p_id).getSteamID64();
            if(!steamids64.includes(p_id))steamids64.push(p_id)
        }

        const steam_profiles = await getSteamProfiles(steamids64);
        for(let r of result){
            let p_id = new SteamID(r.p_id).getSteamID64();
            r['m_id'] = r._id,
            r = Object.assign(r,steam_profiles.find(x => {return x._id == p_id}))
        }
        res.status(200).json(result);
    });
})

module.exports = router;