const express = require('express')
const router = express.Router();
const connectToDatabase = require('../lib/database');
const dateFunctions = require('../lib/dateFunctions')

const getSteamProfiles = require('../lib/steamFunctions').getSteamProfiles;
const SteamID = require('steamid');

router.get('/pr/:player_id', async (req, res) => {
    const db = await connectToDatabase();
    const p_id = req.params.player_id;

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

    let time_range = req.query["time_range"];
    if(!time_range) time_range = "all"
    if(time_range == "all" || time_range == "weekly" || time_range == "monthly"){
        let dt = new Date();
        if(time_range == 'all')dt = 1;
        else if(time_range == 'weekly')dt =  dateFunctions.startOfWeek(dt);
        else if(time_range == 'monthly')dt =  dateFunctions.startOfMonth(dt);
        let z = new Date(dt);
        z = z.getTime()

        
        db.collection('logs').aggregate(
        [
            {
                '$match': {
                    ['players.'+p_id]: {
                        '$exists': true
                    }, 
                    'info.date': {
                        '$gt': z / 1000
                    },
                    'players_count': {
                        '$lt': lt,
                        '$gt' : gt
                    }
                }
            }, {
                '$project': {
                'stats': `$players.${p_id}`
                }
            }, {
                '$project': {
                'kills': '$stats.kills', 
                'dapm': '$stats.dapm', 
                'dmg': '$stats.dmg', 
                'kpd': '$stats.kpd'
                }
            }, {
                '$group': {
                '_id': null, 
                'maxKills': {
                    '$max': '$kills'
                }, 
                'maxDpm': {
                    '$max': '$dapm'
                }, 
                'maxDmg': {
                    '$max': '$dmg'
                }, 
                'maxKpd': {
                    '$max': {
                        '$convert': {
                            'input': '$kpd', 
                            'to': 'double'
                        }
                    }
                }
                }
            }
        ]).toArray((cmdErr, result) => {
            if(cmdErr){
                console.log(cmdErr)
                res.status(400).json({status: "Failure", err: cmdErr})
            }
            else res.status(200).json(result[0])
        })
    }
    else res.status(400).json({status: "Failure", err: "Wrong query parameter/s "})
})

router.get('/steam/:player_id', async (req, res) => {
    const player_id = req.params.player_id

    let sid = new SteamID(player_id)
    sid = sid.getSteamID64()
    getSteamProfiles([sid]).then(result => {
        res.status(200).json(result)
    })
})

module.exports = router;