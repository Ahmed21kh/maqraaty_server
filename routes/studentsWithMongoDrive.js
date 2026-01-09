const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const bodyParser = require('body-parser');
const url = "mongodb://127.0.0.1:27017"
const mongoClient = require('mongodb').MongoClient
const objectId = require('mongodb').ObjectId
const client = new mongoClient(url);
client.connect().then((client_db) => {
    console.log("connect to database");
    // console.log("client_db",client_db?.db());
    let db = client_db?.db("Maqraaty")

    //Read students data 
    router.get('/students',(req, res) => {
       db.collection('students').find().toArray().then((data) => 
       {
        console.log(data);

        res.status(200).json({data:data})
       }
        ).then((res)=>{
          console.log(res);
            client_db.close()
        })
        
    } )

    //Upload image
    router.post('/upload-image',upload.single("file") ,(req , res) => {
        console.log(req.file);
        if (req.file.size > 1024 * 1024 * 50) {
          res.status(413).json({message:"file is too large please upload file smaller than 50mb"})
        }else {
      
          res.send(req.file)
        }
      })


    //Add new student Data
    router.post('/add_student',bodyParser.json({extended:true}),(req, res) => {
        console.log(req.body);
        if (req.body) {
            db.collection('students').insertOne(req.body).then((result)=>{
             console.log(result);
             client_db.close()
             res.status(200).json({message:"student add success"})
            })
            
        } else {
            res.status(400).json({message:"no data found"})
        }
     })

         //Update one student Data
    router.put('/update_student',bodyParser.json({extended:true}),(req, res) => {
        console.log(req.body);
        console.log(req.query?.id);
        console.log(req.params);
        if (req.body) {
            db.collection('students').updateOne({_id:new objectId(req.query?.id)},{$set:req.body}).then((value)=>{
                console.log(value);
                client_db.close()
                res.status(200).json({message:"student updated successfuly"})

            })
            
        } else {
            res.status(400).json({message:"no data found"})
        }
     })

           //delete one student Data
    router.delete('/delete_student',(req, res) => {
        console.log(req.body);
        console.log(req.query?.id);
        console.log(req.params);
        if (req.body) {
            db.collection('students').deleteOne({_id:new objectId(req.query?.id)}).then((value)=>{
                console.log(value);
                client_db.close()
                res.status(200).json({message:"student deleted successfuly"})

            })
            
        } else {
            res.status(400).json({message:"no data found"})
        }
     })


    // db.collection('students').insertOne({
    //   name:'ahmed khaled',
    //   phone_1:"01020696230",
    //   phone_2:"01020696230",
    //   landline:"0403416369",
    //   address:"33 lam3y street",
    //   notes:"",
    //   image:""
    // }).then((result)=> {
    //   console.log(result);

    //   client_db.close()
    // })
})

module.exports = router ;