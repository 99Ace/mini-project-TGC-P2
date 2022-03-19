// ==========================================================
// SETUP ALL DEPENDENCIES
const express = require('express');
const MongoUtil = require("./MongoUtil.js");
const ObjectId = require('mongodb').ObjectId;
const Mail = require('nodemailer/lib/mailer');

require('dotenv').config();


async function main() {
    // ==========================================================
    // 1A. SETUP EXPRESS application
    // ==========================================================
    let app = express();
    app.use(express.json());

    // ==========================================================
    // 1B. SETUP STATIC FOLDER
    // ==========================================================
    app.use(express.static('public')); // set up static file for images, css

    // ==========================================================
    // 1C. CONNECT TO MONGODB
    // ==========================================================
    await MongoUtil.connect(process.env.MONGO_URI, process.env.DBNAME);
    let db = MongoUtil.getDB();
    let CAR_INFO = db.collection(process.env.COLLECTION_CAR);
    let CAR_OWNER = db.collection(process.env.COLLECTION_OWNER);
    let CAR_REFERENCE = db.collection(process.env.COLLECTION_REFERENCE);


    // ==========================================================
    // REFERENCE ROUTE
    // ==========================================================
    
    // READ ALL OWNERS ROUTE - ONLY ADMIN ACCESS
    app.get('/admin/owners', async (req, res) => {
        try {
            let data = await CAR_OWNER.find().toArray();
            res.status(200);
            res.send(data);
            console.log('data sent');
        }
        catch (e) {
            res.status(500);
            res.send({
                message: "No data available"
            });
        };
    })
    // FIND ONE USER AND VALIDATE LOGIN
    app.get('/owner/:username/:password/login', async (req, res) => {
        try {
            // download the data from entry
            let username = req.params.username;
            let password = req.params.password;
            let message
      
            // find and download the data from database
            let data = await CAR_OWNER.find(
                { 'username': username }
            ).toArray();

            // check if username and password is correct
            if (username==data[0].username && password==data[0].password){
                // remove password detail
                delete data[0]["password"];
                // pass successful login message
                message = "Login successful";
            }
            else {
                data[0] = []
                message = "Invalid username/password"
            }
            let loginData = {
                data : data[0],
                message
            }
            
            res.status(200);
            res.send(loginData);
            console.log('Login successful, data sent');
        }
        catch (e) {
            res.status(500);
            res.send({
                data:[],
                message: "No data available"
            })
        }
    })
 
  

    // ==========================================================
    // LISTEN
    // ==========================================================
    // app.listen( process.env.PORT, function() {
    app.listen(3000, function () {
        console.log("...We Are Serving...")
    })
}
main()