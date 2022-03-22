// ==========================================================
// SETUP ALL DEPENDENCIES
const express = require('express');
const MongoUtil = require("./MongoUtil.js");
const ObjectId = require('mongodb').ObjectId;
const Mail = require('nodemailer/lib/mailer');

// import my functions
const Functions = require('./Functions.js')

// Session
const session = require("express-session");
const bodyParser = require("body-parser");

// encrypter
const Cryptr = require('cryptr');
const { use } = require('express/lib/application');
const { default: axios } = require('axios');
const cryptr = new Cryptr('myTotalySecretKey');

// Set up dotenv
require('dotenv').config();


async function main() {
    // ==========================================================
    // 1A. SETUP EXPRESS application
    // ==========================================================
    let app = express();
    app.use(express.json());

    // ==========================================================
    // 1B. SETUP SESSION
    // ==========================================================
    app.use(bodyParser.urlencoded({
        extended: true
    }))

    // ==========================================================
    // 1C. SETUP STATIC FOLDER
    // ==========================================================
    app.use(express.static('public')); // set up static file for images, css

    // ==========================================================
    // 1D. CONNECT TO MONGODB
    // ==========================================================
    await MongoUtil.connect(process.env.MONGO_URI, process.env.DBNAME);
    let db = MongoUtil.getDB();
    let CAR_INFO = db.collection(process.env.COLLECTION_CAR);
    let CAR_OWNER = db.collection(process.env.COLLECTION_OWNER);
    let CAR_REFERENCE = db.collection(process.env.COLLECTION_REFERENCE);

    // ==========================================================
    // ===================== R O U T E S ========================
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
    // ==========================================================

    // ===================== A U T H ============================
    // LOGIN PATH : FIND ONE USER - Send back user details if auth successful / empty if unsuccessful
    app.get('/user/:username/:password/login', async (req, res) => {
        console.log("=======LOGIN AUTH ROUTE========")
        try {
            // download the data from entry
            let username = req.params.username;
            let password = cryptr.decrypt(req.params.password); // decrypt the password
            console.log(password)
            let auth

            // find and download the data from database
            let data = await CAR_OWNER.find(
                { 'username': username }
            ).toArray();

            // check if username and password is correct
            if (username == data[0].username && password == data[0].password) {
                // remove password detail
                delete data[0]["password"];
                // pass successful login message
                auth = true;
            }
            else {
                data[0] = []
                auth = false
            }
            // create user data
            let userData = {
                data: data[0],
                auth
            }

            res.status(200);
            res.send(userData);
            console.log('Login successful, data sent');
        }
        catch (e) {
            res.status(500);
            res.send({
                data: [],
                auth: false
            })
        }
    })
    // REGISTER PATH : CREATE A NEW USER
    app.post('/user/register', async (req, res) => {
        console.log("======= REGISTER ROUTE ========")

        try {
            let {
                username, fname, lname,
                email, contact, termAndConditionAccepted
            } = req.body;
            let password = cryptr.encrypt(req.body.password);
            let dateJoin = Functions.currentDate();

            await CAR_OWNER.insertOne({
                username,
                fname,
                lname,
                email,
                password,
                contact,
                ownership: [],
                interest: [],
                termAndConditionAccepted,
                dateJoin
            })
            res.status(200);
            res.send({
                message: "Document inserted"
            })
        }
        catch (e) {
            res.status(500);
            res.send({
                message: "Unable to insert document"
            })
            console.log(e)
        }
    })
    // UPDATE PATH : EDIT USER PROFILE
    app.put('/user/update', async (req, res) => {
        console.log("===== EDIT USER ======")
        try {
            let {
                userId,
                username,
                fname,
                lname,
                email,
                contact,
            } = req.body;

            let user = await CAR_OWNER.find(
                { '_id': ObjectId(userId) }
            ).toArray();
            user = user[0];
            console.log(user);

            let updateData = {
                "_id": ObjectId(userId),
                username,
                fname,
                lname,
                email,
                contact,
                password: user.password,
                ownership: user.ownership,
                interest: user.interest,
                termAndConditionAccepted: true,
                dateJoin: user.dateJoin
            }
            console.log(updateData)


            // Update the user data
            await CAR_OWNER.updateOne(
                {
                    _id: ObjectId(userId)
                },
                {
                    "$set": updateData
                });

            res.status(200);
            res.send({
                "message": "User profile is updated"
            })
        } catch (e) {
            res.status(500);
            res.send({
                'message': "Unable to update User",
                "error": e
            })
            console.log(e);
        }
    })
    // DELETE PATH : DELETE USER
    app.delete('/user/:userId/delete', async (req, res) => {
        console.log("===== DELETE USER ======")
        try {
            await CAR_OWNER.deleteOne({
                _id: ObjectId(req.params.userId)
            })
            res.status(200);
            res.send({
                "message": "User is deleted"
            });
        } catch (e) {
            res.status(500);
            res.send({
                "message": "Error removing User from database"
            });
            console.log(e);
        }
    })
    // ==========================================================

    // ================== C A R   R O U T E =====================
    // READ PATH : ALL CAR LISTING
    app.get('/car/listing', async (req,res)=> {
        console.log("======= CAR LISTING ========")
        try {
            let data = await CAR_INFO.find().toArray();
            res.status(200);
            res.send(data);
            console.log('Login successful, data sent');
        }
        catch (e) {
            res.status(500);
            res.send({
                data: [],
                auth: false
            })
        }
    })
    // POST PATH : CREATE A NEW CAR LISTING
    app.post('/car/create', async (req,res)=>{
        console.log("======= CREATE CAR ROUTE ========")

        try {
            // Load in body
            let {
                userId,
                carPlate,
                ownerId,
                ownerIdType,
                carPricing,
                carImages,
                carMileage,
                carAccessories,
                carMake,
                carModel,
                carRegDate,
                carYearOfMake,
                carCOE,
                carOMV,
                carARF,
                carNoOfOwner
            } = req.body
            let datePost = Functions.currentDate();

            // Insert in the new car
            let response = await CAR_INFO.insertOne({
                userId : ObjectId(userId),
                carPlate,
                ownerId,
                ownerIdType,
                carPricing,
                carImages,
                carMileage,
                carAccessories,
                carMake,
                carModel,
                carRegDate,
                carYearOfMake,
                carCOE,
                carOMV,
                carARF,
                carNoOfOwner,
                datePost
            })                   
            // Find the user who insert the car
            let user = await CAR_OWNER.find(
                { '_id': ObjectId(userId) }
            ).toArray();
            console.log("Finding the user who inserted")
            console.log(user);
            // Update the cars ownership to user
            user[0].ownership.push( response.insertedId )
            console.log("inserted")
            console.log(user[0]);
            // Save to Car Owner database
            await CAR_OWNER.updateOne(
                { "_id":ObjectId(userId)},
                { $set: { ownership : user[0].ownership }}
            )
            res.status(200);
            res.send({
                data: user,
                message: "Document inserted"
            })
        }
        catch (e) {
            res.status(500);
            res.send({
                message: "Unable to insert document"
            })
            console.log(e)
        }
    })
    // UPDATE PATH : EDIT USER PROFILE
    app.put('/car/update', async (req, res) => {
        console.log("===== EDIT CAR INFO ======")
        try {
            // load data in from body
            let {
                carId,
                carPlate,
                ownerId,
                ownerIdType,
                carPricing,
                carImages,
                carMileage,
                carAccessories,
                carMake,
                carModel,
                carRegDate,
                carYearOfMake,
                carCOE,
                carOMV,
                carARF,
                carNoOfOwner
            } = req.body
            // find the edited car information
            let car = await CAR_INFO.find(
                { '_id': ObjectId(carId) }
            ).toArray();
            car = car[0];
            console.log(car);
                
             // organize the data   
            let updateData = {
                "_id": ObjectId(carId),
                userId : car.userId,
                carPlate,
                ownerId,
                ownerIdType,
                carPricing,
                carImages,
                carMileage,
                carAccessories,
                carMake,
                carModel,
                carRegDate,
                carYearOfMake,
                carCOE,
                carOMV,
                carARF,
                carNoOfOwner,
                datePost : car.datePost? car.datePost: Functions.currentDate()
            }
            console.log(updateData)


            // Update the car information
            await CAR_INFO.updateOne(
                {
                    _id: ObjectId(carId)
                },
                {
                    "$set": updateData
                });

            res.status(200);
            res.send({
                "message": "Car information is updated"
            })
        } catch (e) {
            res.status(500);
            res.send({
                'message': "Unable to update Car information",
                "error": e
            })
            console.log(e);
        }
    })
    
    // ==========================================================
    

    app.get('/', (req, res) => {
        
        res.send("Done")
    })
   
    
    // ==========================================================
    // LISTEN
    // ==========================================================
    // app.listen( process.env.PORT, function() {
    app.listen(process.env.PORT || 3000, function () {
        console.log("...We Are Serving...")
    })
}
main()