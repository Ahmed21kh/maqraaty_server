const { app, BrowserWindow, screen } = require("electron/main");
const path = require("node:path");
const mongoose = require("mongoose");
const url = "mongodb://127.0.0.1:27017/Maqraaty";
const newUrl = require("url");
const express = require("express");
const studentRoutes = require("./routes/studentsWithMongoose");
const cors = require("cors");
const livereload = require("livereload");
const connectLivereload = require("connect-livereload");
// const path = require("path")
const bodyparser = require("body-parser");
const fs = require("fs");
try {
  require("electron-reloader")(module);
} catch {}
function createWindow() {
  const size = screen.getPrimaryDisplay().workAreaSize;
  let win = new BrowserWindow({
    width: size.width,
    height: size.height,
    icon: `file://${__dirname}/dist/maqraaty_2/browser/favicon.ico`,
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      enableRemoteModule: true,
      webviewTag: true,
    },
  });
  console.log(__dirname);
  if (
    fs.existsSync(path.join(__dirname, "dist/maqraaty_2/browser", "index.html"))
  ) {
    win.loadFile(path.join(__dirname, "dist/maqraaty_2/browser", "index.html"));
    win.loadURL(
      newUrl.format({
        pathname: path.join(__dirname, "dist/maqraaty_2/browser/index.html"),
        protocol: "file:",
        slashes: true,
      })
    );
  }

  require("electron-reload")(__dirname);
  // win.loadURL(path.join(__dirname, 'dist/maqraaty_2/browser',window.location.pathname ,'index.html'));
  // win.setMenu(null);
  // win.setIcon(`file://${__dirname}/src/assets/favicon.ico`)
  win.setIcon(path.join(__dirname, "dist/maqraaty_2/browser", "favicon.ico"));
  // win.loadFile(`dist/index.html`);
  win.on("closed", function () {
    win = null;
  });

  
  // win.loadURL('http://localhost:8080');
  // win.reload()
  // mongoose.connect(url).then((clientdb)=>{
  //   // console.log(clientdb);
  //   console.log("connect to database");
  //   // clientdb.disconnect()

  // })
  const appExp = express();
  appExp.set("view engine", "ejs");
  appExp.set("views", "views");
  appExp.use(bodyparser.json());
  appExp.use(cors());
  const server = require("http").createServer(appExp);
  // appExp.use(express.static(__dirname + '/uploads'));
  appExp.use("/uploads", express.static("uploads"));
  appExp.use(express.static(path.join(__dirname, "dist/maqraaty_2/browser")));
  appExp.use("/api", studentRoutes);
  const folderPath1 = path.join(__dirname, "uploads"); // Path to the folder

  if (fs.existsSync(folderPath1)) {
    console.log("Folder exists.");
  } else {
    console.log("Folder does not exist.");
    fs.mkdirSync(folderPath1, { recursive: true });
  }
  appExp.get("*", (req, res, next) => {
    // res.setHeader('Content-Type', 'text/html; charset=utf');
    // res.render('index',{
    //   title:"Home page",
    //   title2:"Hello Backend !!"
    // })
    res.sendFile(
      path.join(__dirname, "/dist/maqraaty_2/browser", "index.html")
    );
    // next()
  });

  server.listen(8080, () => {
    console.log("listening on port 8080");
    mongoose.connect(url).then((clientdb) => {
      // console.log(clientdb);
      console.log("connect to database");
      // clientdb.disconnect()
    });
  });

  const liveReloadServer = livereload.createServer();
  liveReloadServer.watch(
    path.join(__dirname, "/dist/maqraaty_2/browser", "index.html")
  );

  appExp.use(connectLivereload());

  liveReloadServer.server.once("connection", () => {
    setTimeout(() => {
      liveReloadServer.refresh("/");
    }, 100);
  });
}
// appExp.on("ready", createWindow);
app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

if (require("electron-squirrel-startup")) app.quit();

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
