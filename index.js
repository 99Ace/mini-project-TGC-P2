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

    // FUNCTIONS
    async function aceValidate(
        userData,
        username,
        email,
        contact,
        carPlate) {

        // VALIDATION IF DATA Ok IN DB
        let validationCheck = [];
        let message = [];
        let errMessage = [
            `${username} already exist in record`,
            `${email} already exist in record`,
            `${contact} already exist in record`,
            `${carPlate} already exist in record`,
        ];
        console.log(
            username, email, contact
        )
        // set up data verification in mongodb
        let res1 = CAR_OWNER.aggregate([
            { $match: { username: username } },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 }
                }
            }]).toArray();
        let res2 = CAR_OWNER.aggregate([
            { $match: { email: email } },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 }
                }
            }]).toArray();
        let res3 = CAR_OWNER.aggregate([
            { $match: { contact: contact } },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 }
                }
            }]).toArray();
        let res4 = CAR_INFO.aggregate([
            { $match: { carPlate: carPlate } },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 }
                }
            }]).toArray();

        // load in the count result
        let [checkUsernameOk] = await res1;
        let [checkEmailOk] = await res2;
        let [checkContactOk] = await res3;
        // ownCar ? [checkCarPlateOk] = await res4 : null;
        console.log(checkContactOk, checkEmailOk, checkUsernameOk)

        validationCheck.push(Functions.checkMatchCount(checkUsernameOk));
        validationCheck.push(Functions.checkMatchCount(checkEmailOk));
        validationCheck.push(Functions.checkMatchCount(checkContactOk));
        // ownCar ? validationCheck.push(Functions.checkMatchCount(checkCarPlateOk)) : null;

        console.log("First round check", validationCheck);
        validationCheck.filter((e, index) => {
            !e ? message.push(errMessage[index]) : null;
        });
        return {
            validationCheck,
            message
        }
    }

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
        let message = [];
        try {
            // download the data from entry
            let username = req.params.username || "";
            let password = req.params.password || "";

            let validationCheck = [];
            validationCheck.push(
                Functions.validateUser(username) &&
                password.length > 5
            );
            if (!validationCheck.includes(false)) {
                // find and download the data from database
                let userData = await CAR_OWNER.findOne(
                    { 'username': username }
                );
                let carData = [];
                console.log(userData)
                if (userData == null) {
                    message.push("Invalid Username/Password");
                    res.status(406);
                    res.send({
                        auth: false,
                        message
                    });
                } else {
                    let passwordDatabase = cryptr.decrypt(userData.password); // decrypt the password

                    // check if username and password is correct
                    if (username == userData.username && password == passwordDatabase) {
                        // remove password and detail not needed
                        delete userData["password"];
                        console.log(userData.ownCar)
                        if (userData.ownCar) {
                            carData = await CAR_INFO.find(
                                { 'user_id': ObjectId(userData._id) }
                            ).toArray();
                        }
                        console.log(carData)
                        // insert carData into userData  
                        userData.carData = carData;
                        // console.log (userData)

                        message.push(`Welcome back, ${userData.username} !`)
                        res.status(200);
                        res.send({
                            userData,
                            auth: true,
                            message
                        });
                        console.log('Login successful, data sent');
                    }
                    else {
                        message.push("Invalid Username/Password");
                        res.status(200);
                        res.send({
                            auth: false,
                            message
                        });
                        console.log('Invalid user/password');
                    }
                }
            }
        }
        catch (e) {
            message.push("Error accessing the database");
            res.status(500);
            res.send({
                auth: false,
                message
            })
        }
    })
    // PROFILE PATH : VIEW USER PROFILE 
    app.get('/user/:username/profile', async (req, res) => {
        let message = [];
        try {
            // Find the user
            let userData = await CAR_OWNER.findOne(
                { username: req.params.username }
            );
            // console.log(userData ,req.params.username)
            if (userData.ownCar) {
                carData = await CAR_INFO.find(
                    { 'user_id': ObjectId(userData._id) }
                ).toArray();
            }
            // insert carData into userData  
            userData.carData = carData;
            console.log(userData)

            message.push(`Welcome back, ${userData.username} !`)
            res.status(200);
            res.send({
                userData,
                auth: true,
                message
            });
            console.log(message)
        }
        catch (e) {
            message.push("Unauthorized access detected")
            res.status(500);
            res.send({
                auth: false,
                message
            })
            console.log(e)
        }
    })
    // REGISTER PATH : CREATE A NEW USER
    app.post('/user/register', async (req, res) => {
        console.log("======= REGISTER ROUTE ========")
        let message = []
        try {
            let username = req.body.username || "";
            let email = req.body.email || "";
            let contact = req.body.contact || "";
            let password = req.body.password || "";
            let passwordConfirm = req.body.passwordConfirm || "";
            let ownCar = req.body.ownCar || false;
            let carPlate = req.body.carPlate || "";
            let ownerId = req.body.ownerId || "";
            let ownerIdType = req.body.ownerIdType || "";
            ownerIdType = ownerIdType.toString();
            console.log(req.body);

            // VALIDATION IF DATA Ok IN DB
            let validationCheck = [];
            let errMessage = [
                `${username} already exist in record`,
                `${email} already exist in record`,
                `${contact} already exist in record`,
                `${carPlate} already exist in record`,
            ];
            // set up data verification in mongodb
            let res1 = CAR_OWNER.aggregate([
                { $match: { username: req.body.username } },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 }
                    }
                }]).toArray();
            let res2 = CAR_OWNER.aggregate([
                { $match: { email: req.body.email } },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 }
                    }
                }]).toArray();
            let res3 = CAR_OWNER.aggregate([
                { $match: { contact: req.body.contact } },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 }
                    }
                }]).toArray();
            let res4 = CAR_INFO.aggregate([
                { $match: { carPlate: req.body.carPlate } },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 }
                    }
                }]).toArray();

            // load in the count result
            let [checkUsernameOk] = await res1;
            let [checkEmailOk] = await res2;
            let [checkContactOk] = await res3;
            ownCar ? [checkCarPlateOk] = await res4 : null;

            validationCheck.push(Functions.checkMatchCount(checkUsernameOk));
            validationCheck.push(Functions.checkMatchCount(checkEmailOk));
            validationCheck.push(Functions.checkMatchCount(checkContactOk));
            ownCar ? validationCheck.push(Functions.checkMatchCount(checkCarPlateOk)) : null;

            console.log("First round check", validationCheck);
            validationCheck.filter((e, index) => {
                !e ? message.push(errMessage[index]) : null;
            })
            // FIRST ROUND VALIDATION
            if (validationCheck.includes(false)) {
                console.log(message)
                res.status(406);
                res.send({
                    auth: false,
                    message
                });
            } else {
                // RESET validationCheck
                validationCheck = [];
                // VALIDATION OF ENTRY
                validationCheck.push(
                    Functions.validateUser(username),
                    Functions.validateEmail(email),
                    Functions.validateContact(contact),
                    Functions.validatePassword(password, passwordConfirm)
                );
                // VALIDATE CAR details if car is submitted
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
                    // ORGANISE THE DATA
                    let userData = {
                        username,
                        email,
                        password,
                        ownCar,
                        contact,
                        favorite: [],
                        dateJoin
                    }
                    let carData = []
                    let res1 = await CAR_OWNER.insertOne(userData);
                    // console.log("insert car owner", response);
                    let user = { '_id': res1.insertedId };
                    if (ownCar) {
                        // INSERT CAR INTO THE CAR_DB, INSERTING THE USER ID
                        let res1 = await CAR_INFO.insertOne({
                            user_id: user._id,
                            carPlate,
                            availability:false,
                            dateInserted: dateJoin
                        });
                        // console.log("insert car details",res1)

                        // find from database and send both data back
                        userData = await CAR_OWNER.findOne({ '_id': ObjectId(user._id) })
                        carData = await CAR_INFO.find({ 'user_id': ObjectId(user._id) }).toArray()
                    }
                    userData.carData = carData;
                    message.push("Welcome to MikarWorld, User is successful registered")
                    res.status(200);
                    res.send({
                        userData,
                        auth: true,
                        message
                    })
                    console.log(message)
                }
                // Failed Validation : Suspected not from our website 
                else {
                    message.push("Unauthorized access detected")
                    res.status(406);
                    res.send({
                        auth: false,
                        message
                    });
                }
            }

        }
        catch (e) {
            message.push("Error accessing the database")
            res.status(500);
            res.send({
                auth: false,
                message
            })
            console.log(e)
        }
    })
    // UPDATE PATH : EDIT USER PROFILE
    app.put('/user/update', async (req, res) => {
        console.log("======= UPDATE PROFILE ROUTE ========")
        let message = []
        try {
            let userId = req.body.user_id || " ";
            let username = req.body.username || "";
            let email = req.body.email || "";
            let contact = req.body.contact || "";
            let first_name = req.body.first_name || "";
            let last_name = req.body.last_name || "";

            console.log(req.body.user_id);

            let [userData] = await CAR_OWNER.find(
                { '_id': ObjectId(userId) }
            ).toArray()

            console.log("====LOCAL CHECK====")
            // VALIDATION IF DATA Ok IN DB
            let validationCheck = [];
            let errMessage = [
                `${username} already exist in record`,
                `${email} already exist in record`,
                `${contact} already exist in record`,
            ];
            // VERIFYING IF USER EXIST IN DB
            // if is current username is sent in, will pass as true
            if (username !== "" && username !== userData.username) {
                let res1 = CAR_OWNER.aggregate([
                    { $match: { username: req.body.username } },
                    {
                        $group: {
                            _id: null,
                            count: { $sum: 1 }
                        }
                    }]).toArray();
                let [checkUsernameOk] = await res1;
                validationCheck.push(Functions.checkMatchCount(checkUsernameOk));
            } else {
                validationCheck.push(true);
            }
            // VERIFYING IF EMAIL EXIST IN DB
            if (email !== "" && email !== userData.email) {
                let res2 = CAR_OWNER.aggregate([
                    { $match: { email: email } },
                    {
                        $group: {
                            _id: null,
                            count: { $sum: 1 }
                        }
                    }]).toArray();
                    console.log("email==>", await res2)
                let [checkEmailOk] = await res2;
                validationCheck.push(Functions.checkMatchCount(checkEmailOk));
            } else {
                validationCheck.push(true);
            }
            // VERIFYING IF CONTACT EXIST IN DB
            if (contact !== "" && contact !== userData.contact) {
                let res3 = CAR_OWNER.aggregate([
                    { $match: { contact: req.body.contact } },
                    {
                        $group: {
                            _id: null,
                            count: { $sum: 1 }
                        }
                    }]).toArray();
                let [checkContactOk] = await res3;
                validationCheck.push(Functions.checkMatchCount(checkContactOk));
            } else {
                validationCheck.push(true);
            }

            console.log("First round check", validationCheck);
            validationCheck.filter((e, index) => {
                !e ? message.push(errMessage[index]) : null;
            })
            console.log(message)

            // FIRST ROUND VALIDATION
            if (validationCheck.includes(false)) {
                console.log(message)
                res.status(406);
                res.send({
                    auth: false,
                    message
                });
            } 
            else {
                // RESET validationCheck
                validationCheck = [];
                // VALIDATION OF ENTRY
                validationCheck.push(
                    Functions.validateUser(username),
                    Functions.validateEmail(email),
                    Functions.validateContact(contact),
                );
                // If pass Validation : insert into DB
                if (!validationCheck.includes(false)) {
                    // ORGANISE THE DATA
                    let newUserData = {
                        _id : ObjectId(userId),
                        username,
                        email,
                        password:userId.password,
                        ownCar:userId.ownCar,
                        contact,
                        favorite:userId.favorite,
                        dateJoin:userId.dateJoin,
                        first_name,
                        last_name
                    };

                    await CAR_OWNER.updateOne(
                        {
                            _id: ObjectId(userId)
                        },
                        {
                            "$set": newUserData
                        }
                    );
                    // console.log("insert car owner", response);

                    message.push("Profile is updated")
                    res.status(200);
                    res.send({
                        newUserData,
                        auth: true,
                        message
                    })
                    console.log(message)
                }
                // Failed Validation : Suspected not from our website 
                else {
                    message.push("Unauthorized access detected")
                    res.status(406);
                    res.send({
                        auth: false,
                        message
                    });
                }
            }
        } 
        catch (e) {
            message.push("Unable to update User")
            res.status(500);
            res.send({
                auth: false,
                message,
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
    app.post('/', async (req, res) => {
        let message = [];

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