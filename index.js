// ==========================================================
// SETUP ALL DEPENDENCIES
// ==========================================================
const express = require('express');
const MongoUtil = require("./MongoUtil.js");
const ObjectId = require('mongodb').ObjectId;
const Mail = require('nodemailer/lib/mailer');
const cors = require("cors");

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
    app.use(cors());

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
            let password = req.params.password;
            console.log(password)
            let auth

            // find and download the data from database
            let data = await CAR_OWNER.find(
                { 'username': username }
            ).toArray();
            let passwordDatabase = cryptr.decrypt(data[0].password); // decrypt the password
            // check if username and password is correct
            if (username == data[0].username && password == passwordDatabase) {
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
    // PROFILE PATH : VIEW USER PROFILE 
    app.get('/user/:userId/profile', async (req, res) => {
        try {
            let user = await CAR_OWNER.find(
                { '_id': ObjectId(req.params.userId) }
            ).toArray();
            let ownedCars = await CAR_INFO.find(
                { 'userId': ObjectId(req.params.userId) }
            ).toArray();

            user = user[0];
            user.ownedCars = [...ownedCars]
            console.log(user, ownedCars);
            res.send(user)
        }
        catch (e) {
            res.status(500);
            res.send({
                message: "User not found"
            })
            console.log(e)
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
    app.delete('/user/:userId', async (req, res) => {
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
    app.get('/car/listing', async (req, res) => {
        console.log("======= CAR LISTING ========")
        try {
            let data = await CAR_INFO.find().toArray();
            res.status(200);
            res.send(data);
            console.log('Car data sent');
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
    app.post('/car/create', async (req, res) => {
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

            // check if carRegDate is in date format else convert it
            if (!(carRegDate instanceof Date)) {
                carRegDate = new Date(carRegDate);
            }

            let depreciation = Functions.calculateDepreciation({
                carRegDate, carPricing, carARF
            })
            // console.log(depreciation)

            // Insert in the new car
            let response = await CAR_INFO.insertOne({
                userId: ObjectId(userId),
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
                depreciation,
                availability: true,
                datePost: Functions.currentDate(),
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
    // UPDATE PATH : EDIT CAR LISTING
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
                carNoOfOwner,
                availability
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
                userId: car.userId,
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
                availability,
                datePost: car.datePost ? car.datePost : Functions.currentDate()
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
    // DELETE PATH : DELETE CAR LISTING
    app.delete('/car/:carId', async (req, res) => {
        console.log("===== DELETE CAR LISTING ======")
        try {
            // Remove the car
            await CAR_INFO.deleteOne({
                _id: ObjectId(req.params.carId)
            })
            res.status(200);
            res.send({
                "message": "Car listing is deleted"
            });
        } catch (e) {
            res.status(500);
            res.send({
                "message": "Error removing Car Listing from database"
            });
            console.log(e);
        }
    })
    // SEARCH PATH : SEARCH BY A FEW QUERY OPTIONS
    app.get('/car/search', async (req, res) => {
        console.log("======== SEARCH ========")
        try {
            let carMake = req.query.carMake || ""
            let carModel = req.query.carModel || ""
            let priceLower = req.query.priceLower|| 0
            let priceUpper = req.query.priceUpper||9999999
            let depreRangeLower = req.query.priceLower|| 0
            let depreRangeUpper = req.query.priceUpper||999999
            let yearRegLower = req.query.priceLower|| 0
            let yearRegUpper = req.query.priceUpper||9999
            let carType =req.query.carType || ""
            
            // let carType = req.query.carModel || ""
            

            console.log(carMake, carModel, priceLower, priceUpper);

            let data = await CAR_INFO.find(
                {
                    $and: [
                        
                        {
                            carMake: { $regex: carMake, $options: 'i' }
                        },
                        {
                            carModel: { $regex: carModel, $options: 'i' }
                        },
                        {
                            carPricing : {
                                "$gte" : parseInt(priceLower),
                                "$lte" : parseInt(priceUpper)
                            }
                        },
                        

                    ]
                }
            ).toArray()
            // console.log(data)

            res.send({
                data: data,
                message: "Search found"
            })
        }
        catch (e) {
            res.status(500);
            res.send({
                message: "Error finding your desired car"
            })
            console.log(e)
        }

    })
    // ==========================================================
    app.get('/', async (req, res) => {
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