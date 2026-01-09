const multer = require('multer');
const fs = require("fs")
const path = require("path")
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
      
        cb(null, 'uploads');
    },
    filename: function(req, file, cb) {
        cb(null, file.originalname);
    }
});
 const upload = multer({ storage: storage ,
    limits : {fieldSize: 1024 * 1024 * 5}, });

 module.exports = upload
