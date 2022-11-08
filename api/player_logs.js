const express = require('express')
const router = express.Router();
const connectToDatabase = require('../lib/database');
const dateFunctions = require('../lib/dateFunctions')

const fetch = require('node-fetch');

router.get('/:player_id', async (req, res) => {
    const db = await connectToDatabase();
    const p_id = req.params.player_id;

    let time_range = req.query["time_range"];
    let limit = req.query["limit"] || 5000;
    let offset = req.query["offset"] || 0;

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

    if(!time_range) time_range = "all"
    if(time_range == "all" || time_range == "weekly" || time_range == "monthly"){
        let dt = new Date();
        if(time_range == 'all')dt = 1;
        else if(time_range == 'weekly')dt =  dateFunctions.startOfWeek(dt);
        else if(time_range == 'monthly')dt =  dateFunctions.startOfMonth(dt);
        let z = new Date(dt);
        z = z.getTime()

        db.collection('logs').aggregate([
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
                    },
                }
            },
            { '$skip': Number(offset) },
            { '$limit': Number(limit) },
            {
                '$sort': {
                    'info.date': -1
                }
                },
            {
                '$project': {
                'map': '$info.map', 
                'team' : '$players.'+p_id+'.team',
                'score' : {
                    'Red' : '$teams.Red.score',
                    'Blue' : '$teams.Blue.score'
                },
                'result' : {
                    "$switch": {
                    "branches": [
                        { "case": 
                        { 
                            '$and': [
                            {'$eq' : ['$players.'+p_id+'.team','Red']},
                            {"$gt": [ '$teams.Red.score', '$teams.Blue.score' ]}
                            ]
                        },
                        "then": 'won' 
                        },
                        { "case": 
                        { 
                            '$and': [
                            {'$eq' : ['$players.'+p_id+'.team','Blue']},
                            {"$gt": [ '$teams.Blue.score', '$teams.Red.score' ]}
                            ]
                        },
                        "then": 'won' 
                        },
                        { "case": 
                        { 
                            '$and': [
                            {'$eq' : ['$players.'+p_id+'.team','Blue']},
                            {"$lt": [ '$teams.Blue.score', '$teams.Red.score' ]}
                            ]
                        },
                        "then": 'lost' 
                        },
                        { "case": 
                        { 
                            '$and': [
                            {'$eq' : ['$players.'+p_id+'.team','Red']},
                            {"$lt": [ '$teams.Red.score', '$teams.Blue.score' ]}
                            ]
                        },
                        "then": 'lost' 
                        }
                    ],
                    "default": 'tied'
                    }
                },
                'stats' : {
                    'kills' : '$players.'+p_id+'.kills',
                    'assists':'$players.'+p_id+'.assists',
                    'deaths':'$players.'+p_id+'.deaths',
                    'dmg':'$players.'+p_id+'.dmg',
                    'dapm':'$players.'+p_id+'.dapm',
                    'kpd':'$players.'+p_id+'.kpd',
                    'cpc':'$players.'+p_id+'.cpc'
                }, 
                'classes': {
                    '$map': {
                    'input': '$players.'+p_id+'.class_stats', 
                    'as': 'class', 
                    'in': '$$class.type'
                    }
                }
                }
            }
        ],{ allowDiskUse: true }
        ).toArray((cmdErr, result) => {
            if(cmdErr){
                console.log(cmdErr)
                res.status(400).json({status: "Failure", err: cmdErr})
            }
            else res.status(200).json(result)
        })
    }
    else res.status(400).json({status: "Failure", err: "Wrong query parameter/s "})
})

module.exports = router;