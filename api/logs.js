const express = require('express')
const router = express.Router();
const connectToDatabase = require('../lib/database');
const dateFunctions = require('../lib/dateFunctions');

const fetch = require('node-fetch');

router.get('/', async (req, res) => {
    const db = await connectToDatabase();
    db.collection('logs').distinct('_id', {}, {}, function (err, result) {
        res.status(200).json(result);
    })
})

router.get('/:option', async (req, res) => {
    const db = await connectToDatabase();
    const option = req.params.option;

    let title = process.env.LOGSTF_TITLE;
    let use_tf2pickup_api = Number(process.env.USE_TF2PICKUP_API)

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

    if(Number(option)){
        const matchid = option
        db.collection('logs').findOne({_id : matchid}, (cmdErr, result) => {
            if(cmdErr){
                console.log(cmdErr)
                res.status(400).json(cmdErr);
            }
            else res.status(200).json(result);
        });
    }
    else {
        if(option == 'diff'){
            let p1 = fetch(`https://logs.tf/api/v1/log?title=${title}&limit=10000`)
            .then(r => r.json()).then(r => {
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
            Promise.all([p1,p2,p3]).then(r => {
                let diff1 = r[0].filter(x => !r[2].includes(x));
                let diff2 = r[1].filter(x => !r[2].includes(x));
                let diff = diff1.concat(diff2)
                res.status(200).json(diff);
            })
        }
        else if(option == "weekly" || option == "monthly" || option == "all"){
            let time_range = option;
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
                            '$gt': z/1000
                        }
                    }
                },
                {
                '$project': {
                    '_id': 1, 
                    'map': '$info.map', 
                    'date': '$info.date', 
                    'result': {
                        'Red': '$teams.Red.score', 
                        'Blue': '$teams.Blue.score'
                    }
                }
                },
                {
                '$sort' :{
                    'date': -1
                    }
                }
            ])
            .toArray((err,r) => {
                if(err){
                    console.log(err)
                    res.status(400).json(err);
                }
                else res.status(200).json(r);
            })
        }
    }
})

router.delete('/', async (req, res) => {
    const db = await connectToDatabase();

    let n = Number(req.query['amount']);

    if(n){
        db.collection('logs').distinct('_id', {}, {}, function (err, result) {
            for(var i=result.length;i>result.length-n;i--){
                db.collection('logs').deleteOne({_id : result[i]}, function(err, obj) {
                    if (err) throw err;
                });
            }
            var p2 = db.collection('logs').distinct('_id', {}, {}).then(r => {
            console.log('Deleted: '+n+' rows. Remaining: '+r.length)
            res.status(200).json({status : "Success", deleted_rows:  n,remaining_logs: r.length});
            })
        })
    }
    else res.status(400).json({status : "Failure"});  
})

router.delete('/:id', async (req, res) => {
    const db = await connectToDatabase();
    db.collection('logs').deleteOne({_id : req.params.id}, function(err, obj) {
        if (err) res.status(400).json({status : 'Failure', error : err});
        else res.status(200).json({status : "Success", deleted_log:  req.params.id});
    });
})

router.post('/', async (req, res) => {
    const db = await connectToDatabase();
    let matchid = req.query['id'];
    if(matchid)
    fetch('http://logs.tf/api/v1/log/'+matchid).then(r => r.json()).then(r => {   
        r['_id'] = matchid;
        r['players_count'] = Object.keys(r.players).length;
        db.collection('logs').insertOne(r)
        .then(_ => {
            res.json({status : 'Success'});
        }).catch(e => {
            if(e.code == 11000)e = "id already exists";
            res.json({status : 'MongoDB Failure', error : e});
            console.log(e)
        })
    }).catch(e => {
        res.json({status : 'Logs.tf failure', error : e});
        console.log(e)
    })
    else res.status(400).json({status : 'Failure', error : "no id"});
})

module.exports = router;

/*
module.exports = async (req, res) => {
    const db = await connectToDatabase();
    if(req.method == "GET"){ 
        db.collection('logs').distinct('_id', {}, {}, function (err, result) {
            res.status(200).json(result);
        })
    }
    else if(req.method == "DELETE"){
        let n = Number(req.query['amount']);
        if(n){
            db.collection('logs').distinct('_id', {}, {}, function (err, result) {
                for(var i=result.length;i>result.length-n;i--){
                    db.collection('logs').deleteOne({_id : result[i]}, function(err, obj) {
                        if (err) throw err;
                    });
                }
                var p2 = db.collection('logs').distinct('_id', {}, {}).then(r => {
                console.log('Deleted: '+n+' rows. Remaining: '+r.length)
                res.status(200).json({status : "Success", deleted_rows:  n,remaining_logs: r.length});
                })
            })
        }
        else res.status(400).json({status : "Failure"});  
    }
    else if(req.method == "POST"){
        let matchid = req.query['id'];
        if(matchid)
        fetch('http://logs.tf/api/v1/log/'+matchid).then(r => r.json()).then(r => {   
            r['_id'] = matchid;
            r['players_count'] = Object.keys(r.players).length;
            db.collection('logs').insertOne(r)
            .then(_ => {
                res.json({status : 'Success'});
            }).catch(e => {
                if(e.code == 11000)e = "id already exists";
                res.json({status : 'MongoDB Failure', error : e});
                console.log(e)
            })
        }).catch(e => {
            res.json({status : 'Logs.tf failure', error : e});
            console.log(e)
        })
        else res.status(400).json({status : 'Failure', error : "no id"});
    }
    else{
        res.status(400).json({status: "ERROR ROUTE NOT FOUND"});
    }
};
*/