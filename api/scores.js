const express = require('express')
const router = express.Router();
const connectToDatabase = require('../lib/database');
const dateFunctions = require('../lib/dateFunctions')
const getSteamProfiles = require('../lib/steamFunctions').getSteamProfiles;

const SteamID = require('steamid');
const fetch = require('node-fetch');

router.get('/:option', async (req, res) => {
    const db = await connectToDatabase();
    option = req.params.option

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

    if(option == "weekly" || option == "monthly" || option == "all" || option == "event_christmas_2025"){
        let time_range = option;
        let dt = new Date();
        let matchQuery = {};

        if(time_range == 'event_christmas_2025'){
            // Event timeframe: 19.12.2025 16:00 till 4.01.2026 00:00
            let eventStart = dateFunctions.event_christmas_2025_Start();
            let eventEnd = dateFunctions.event_christmas_2025_End();
            matchQuery = {
                'info.date': {
                    '$gte': eventStart.getTime() / 1000,
                    '$lte': eventEnd.getTime() / 1000
                },
                'players_count': {
                    '$lt': lt,
                    '$gt' : gt
                }
            };
        } else {
            if(time_range == 'all')dt = 1;
            else if(time_range == 'weekly')dt =  dateFunctions.startOfWeek(dt);
            else if(time_range == 'monthly')dt =  dateFunctions.startOfMonth(dt);
            let z = new Date(dt);
            z = z.getTime()

            matchQuery = {
                'info.date': {
                    '$gt': z / 1000
                },
                'players_count': {
                    '$lt': lt,
                    '$gt' : gt
                }
            };
        }

        let players = {};
        let steamids = [];
        let steamids64 = [];

        db.collection('logs').aggregate([
            {
            '$match': matchQuery
            }, {
            '$sort': {
                'info.date': 1
            }
            }, {
            '$project': {
                'players': {
                '$map': {
                    'input': {
                    '$objectToArray': '$players'
                    },
                    'as': 'p',
                    'in': {'id' : '$$p.k','team' : '$$p.v.team'}
                }
                },
                'score': {
                'Blue': '$teams.Blue.score',
                'Red': '$teams.Red.score'
                },
                'names' : 1
            }
            }
        ]).toArray(function (err,result){
            for(let log of result){
            let winner;
            if(log.score.Red > log.score.Blue)winner = 'Red';
            else if(log.score.Red < log.score.Blue)winner = 'Blue';
            else winner = false;

            for(let p of log.players){
                let id = p.id;
                if(players[id] == undefined){
                    let sid = new SteamID(id);
                    steamids.push(id);
                    sid = sid.getSteamID64();
                    steamids64.push(sid);
                    players[id] = {
                        'name' : '',
                        'steamid64' : sid,
                        'avatar' : '',
                        'games_played' : 0,
                        'games_won' : 0,
                        'games_lost' : 0,
                        'games_tied' : 0,
                        'score' : 0
                    }
                }
                players[id].games_played += 1;
                if(winner && p.team == winner){
                    players[id].games_won += 1;
                }
                else if(winner && p.team != winner){
                    players[id].games_lost += 1;
                }
                else {
                    players[id].games_tied += 1;
                }
            }
            }

            getSteamProfiles(steamids64).then(result => {
            for(let r of result){
                let sid3 = new SteamID(r._id);
                sid3 = sid3.getSteam3RenderedID()
                players[sid3].avatar = r.avatar;
                players[sid3].name = r.personaname;
            }
            res.status(200).json(players)
            })
        })
    }
})

module.exports = router;
