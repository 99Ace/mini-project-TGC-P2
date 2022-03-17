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

    // ==========================================================
    // 1B. SETUP STATIC FOLDER
    // ==========================================================
    app.use(express.static('public')); // set up static file for images, css

    // ==========================================================
    // 1C. CONNECT TO MONGODB
    // ==========================================================
    await MongoUtil.connect(process.env.MONGO_URI, process.env.DBNAME);
    let db = MongoUtil.getDB();
    let CAR_INFO = db.collection(process.env.COLLECTION_CAR)
    let CAR_OWNER = db.collection(process.env.COLLECTION_OWNER)
    let CAR_REFERENCE = db.collection(process.env.COLLECTION_REFERENCE)


    // ==========================================================
    // REFERENCE ROUTE
    // ==========================================================
    app.get('/owners', async (req, res) => {
        try {
            let data = await CAR_OWNER.find().toArray();
            res.status(200)
            res.send(data)
            console.log('data sent')
        } 
        catch(e)  {
            res.status(500);
            res.send({
                message : "No data available"
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