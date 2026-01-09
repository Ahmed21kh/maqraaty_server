const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const livereload = require("livereload")
const path = require("path")
const bodyparser = require("body-parser")
const http = require("http")
const hostname = "127.0.0.1"
const port = 8080
const url = "mongodb://127.0.0.1:27017/Maqraaty"
// const url = "mongodb+srv://AhmedKh:mongo@cluster0.xrny0xe.mongodb.net/Maqraaty"
const connectLivereload = require("connect-livereload")
const fs = require("fs")
const multer = require("multer")
const router = express.Router()
const Formidable = require("formidable")
const bluebird = require("bluebird")
const bfs = bluebird.promisifyAll(require("fs"))
var connect = require("connect")
const mongoClient = require('mongodb').MongoClient
// const client = new mongoClient(url);
const studentSchema = require('./models/studentsModel')
const app = express()
const studentRoutes = require('./routes/studentsWithMongoose')
app.set("view engine", "ejs")
app.set("views", "views")
app.use(bodyparser.json())
app.use(cors())
const server = require("http").createServer(app)
// app.use(express.static(__dirname + '/uploads'));
app.use('/uploads', express.static('uploads'));
app.use(express.static(path.join(__dirname, "dist/maqraaty_2/browser")))
app.use("/api",studentRoutes)
const folderPath1 = path.join(__dirname, "uploads"); // Path to the folder

  if (fs.existsSync(folderPath1)) {
    console.log("Folder exists.");
  } else {
    console.log("Folder does not exist.");
    fs.mkdirSync(folderPath1, { recursive: true });
  }
app.get("*",  (req, res,next) => {
    // res.setHeader('Content-Type', 'text/html; charset=utf');
    // res.render('index',{
    //   title:"Home page",
    //   title2:"Hello Backend !!"
    // })
    res.sendFile(path.join(__dirname,'/dist/maqraaty_2/browser','index.html'));
    // next()
})


server.listen(8080, () => {
  console.log("listening on port 8080")
  mongoose.connect(url).then((clientdb)=>{
    // console.log(clientdb);
    console.log("connect to database");
    // clientdb.disconnect()

  })
})

const liveReloadServer = livereload.createServer()
liveReloadServer.watch(path.join(__dirname,'/dist/maqraaty_2/browser','index.html'))

app.use(connectLivereload())

liveReloadServer.server.once("connection", () => {
  setTimeout(() => {
    liveReloadServer.refresh("/")
  }, 100)
})