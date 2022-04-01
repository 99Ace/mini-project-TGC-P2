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
const { response } = require('express');
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
            let username = req.params.username || "";
            let password = req.params.password || "";
            let data = {}

            let validationCheck = [];
            validationCheck.push(
                Functions.validateUser(username),
                password.length >5
            )
            if (!validationCheck.includes(false)) {
                // find and download the data from database
                let userData = await CAR_OWNER.find(
                    { 'username': username }
                ).toArray();
                let carData = []
                if (userData.length == 0) {
                    
                    res.status(200);
                    res.send({
                        auth: false,
                        message: "Invalid Username/Password"
                    });
                } else {
                    userData = userData[0];
                    let passwordDatabase = cryptr.decrypt(userData.password); // decrypt the password

                    // check if username and password is correct
                    if (username == userData.username && password == passwordDatabase) {
                        // remove password and detail not needed
                        delete userData["password"];
                        if (userData.ownCar) {
                            carData = await CAR_INFO.find( { 'user_id': ObjectId(user._id) } ).toArray();
                        }
                        // insert carData into userData  
                        userData.carData = carData;

                        res.status(200);
                        res.send({
                            userData,    
                            auth: true,
                            message: "Login Successful"
                        });
                        console.log('Login successful, data sent');
                    }
                    else {
                        res.status(200);
                        res.send({
                            auth: false,
                            message: "Invalid Username/Password"
                        });
                        console.log('Invalid user/password');
                    }

                }
            }
        }
        catch (e) {
            res.status(500);
            res.send({
                auth: false,
                message: "Error accessing the database"
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
            let username = req.body.username || "";
            let email = req.body.email || "";
            let contact = req.body.contact || "";
            let password = req.body.password || "";
            let passwordConfirm = req.body.passwordConfirm || "";
            let ownCar = req.body.ownCar || "";
            let carPlate = req.body.carPlate || false;
            let ownerId = req.body.ownerId || "";
            let ownerIdType = req.body.ownerIdType || "";
            ownerIdType = ownerIdType.toString();
            console.log(req.body)
            // VALIDATION
            let validationCheck = [];
            validationCheck.push(
                Functions.validateUser(username),
                Functions.validateEmail(email),
                Functions.validateContact(contact),
                Functions.validatePassword(password, passwordConfirm)
            );
            // Conduct validation check for car details if car is submitted
            if (ownCar) {
                validationCheck.push(
                    Functions.validateCarPlate(carPlate),
                    Functions.validateOwnerId(ownerId),
                    Functions.validateOwnerIdType(ownerIdType)
                )
            }
            
            // If pass Validation : insert into DB
            if (!validationCheck.includes(false)) {
                let dateJoin = Functions.currentDate();
                password = cryptr.encrypt(password)
                let userData = {
                    username,
                    email,
                    password,
                    contact,
                    favorite:[],
                    dateJoin
                }
                let carData =[]
                let res1 = await CAR_OWNER.insertOne( userData );
                // console.log("insert car owner", response);
                let user = { '_id': res1.insertedId };
                if (ownCar) {
                    
                    // INSERT CAR INTO THE CAR_DB, INSERTING THE USER ID
                    let res1 = await CAR_INFO.insertOne({
                        user_id: response.insertedId,
                        carPlate,
                        dateInserted: dateJoin
                    });
                    // console.log("insert car details",res1)

                    // find from database and send both data back
                    userData = await CAR_OWNER.findOne( { '_id': ObjectId(user._id) } )
                    carData = await CAR_INFO.find( { 'user_id': ObjectId(user._id) } ).toArray()
                }
                userData.carData = carData;
                res.status(200);
                res.send({
                    userData,
                    auth: true,
                    message: "User successful registered"
                })
            }
            // Failed Validation : Suspected not from our website 
            else {
                res.status(406);
                res.send({
                    auth: false,
                    message: "Unauthorized access detected"
                });
            }

        }
        catch (e) {
            res.status(500);
            res.send({
                auth:false,
                message: "Error accessing the database"
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
            let priceLower = req.query.priceLower || 0
            let priceUpper = req.query.priceUpper || 9999999
            let depreRangeLower = req.query.priceLower || 0
            let depreRangeUpper = req.query.priceUpper || 999999
            let yearRegLower = req.query.priceLower || 0
            let yearRegUpper = req.query.priceUpper || 9999
            let carType = req.query.carType || ""

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
                            carPricing: {
                                "$gte": parseInt(priceLower),
                                "$lte": parseInt(priceUpper)
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
    app.listen(process.env.PORT || 3001, function () {
        console.log("...We Are Serving...")
    })
}
main()