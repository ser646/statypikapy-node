const express = require('express')
const router = express.Router();
const connectToDatabase = require('../lib/database');
const dateFunctions = require('../lib/dateFunctions');
const bodyParser = require('body-parser')

const fetch = require('node-fetch');

router.use(bodyParser.json())

router.get('/', async (req, res) => {
    const db = await connectToDatabase();
    db.collection('logs').distinct('_id', {}, {}, function (err, result) {
        res.status(200).json(result);
    })
})

router.get('/:option', async (req, res, next) => {
    const db = await connectToDatabase();
    const option = req.params.option;

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
        if(option == "weekly" || option == "monthly" || option == "all"){
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
    next();
})

router.get('/diff', async (req, res) => {
    const r = await require('./shared/diff.js')();
    res.status(200).json(r);
})

router.get('/fetch', async (req, res) => {
    const diff = req.body.ids|| await require('./shared/diff.js')();
    const fetchMatch = require('./shared/fetch.js');
    
    console.log("Amount of logs requested to fetch: " + diff.length)
    let i = 0;
	let c = 0;
    let interval = setInterval(async function (){

        if(i >= diff.length - 1)clearInterval(interval);
        else {
            if(c == 0){	
                if(i % 400 == 0 && i != 0) {
                    c++;
                    i++;
                }
                else {
                    await fetchMatch(diff[i]).then(r => {
                        console.log(i + ':' + diff[i] + " " + r.status + " " + r.error)
                        i++;
                    });
                }
            }
            else {
                c++;
            }
            if(c == (5*240)){
                c = 0;
            }
        }
    },250)
    res.status(200).json("Logs to fetch: " + diff.length + ". Fetching started.");
})

router.delete('/', async (req, res) => {
    const db = await connectToDatabase();

    let n = Number(req.query.amount);
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
    const r = await require('./shared/fetch.js')(req.query['id']);
    res.status(200).json(r);
})

module.exports = router;