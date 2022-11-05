const express = require('express')
const router = express.Router();
const connectToDatabase = require('../lib/database');

const fetch = require('node-fetch');

router.get('/', async (req, res) => {
    const db = await connectToDatabase();
    db.collection('logs').distinct('_id', {}, {}, function (err, result) {
        res.status(200).json(result);
    })
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