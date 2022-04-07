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
    // LOGIN PATH : FIND ONE USER - Send back user details if auth successful / empty if unsuccessful  (TEST PASS *** ***)
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
            console.log(Functions.validateUser(username), validationCheck)
            if (!validationCheck.includes(false)) {
                // find and download the data from database
                let userData = await CAR_OWNER.findOne(
                    { 'username': username }
                );
                let carData = [];
                console.log(userData)
                if (userData == null) {
                    message.push("Invalid Username/Password");
                    res.status(200);
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
                                { userId: ObjectId(userData._id) }
                            ).toArray();
                        }
                        console.log(userData.loginCode)

                        if (!userData.auth) {
                            await CAR_OWNER.updateOne(
                                { _id: ObjectId(userData._id) },
                                {
                                    $set: {
                                        auth: true
                                    }
                                }
                            )
                            userData.loginCode = loginCode
                        }

                        userData.cars = carData;


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
            else {
                message.push("Invalid username/password");
                res.status(200);
                res.send({
                    auth: false,
                    message
                })
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
    // PROFILE PATH : VIEW USER PROFILE (TEST PASS *** ***)
    app.get('/user/:userId/profile', async (req, res) => {
        let message = [];
        try {
            // Find the user
            let userData = await CAR_OWNER.findOne(
                { _id: ObjectId(req.params.userId) }
            );
            if (userData.auth) {
                let carData=[]
                if (userData.ownCar) {
                    carData = await CAR_INFO.find(
                        { userId: ObjectId(userData._id) }
                    ).toArray();
                }
                // insert carData into userData  
                userData.cars = carData;
                // remove password and detail not needed
                delete userData["password"]

                message.push(`Welcome back, ${userData.username} !`)
                res.status(200);
                res.send({
                    userData,
                    auth: true,
                    message
                });
                console.log(message)
            }
            else {
                message.push(`${userData.username} session has expired! Please login again`)
                res.status(200);
                res.send({
                    auth: false,
                    message
                });
                console.log(message)
            }
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
    // REGISTER PATH : CREATE A NEW USER (TEST PASS *** ***)
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
            ownCar = Boolean(ownCar);
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
                res.status(200);
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
                        auth: true,
                        favorite: [],
                        dateJoin
                    }
                    let carData = []
                    let res1 = await CAR_OWNER.insertOne(userData);
                    // console.log("insert car owner", response);
                    let user = { '_id': res1.insertedId };
                    if (ownCar) {
                        // INSERT CAR INTO THE CAR_DB, INSERTING THE USER ID
                        let res2 = await CAR_INFO.insertOne({
                            userId: user._id,
                            carPlate,
                            currentOwnerId: ownerId,
                            currentOwnerIdType: ownerIdType,
                            availability: false,
                            dateInserted: dateJoin
                        });
                        let car = { '_id': res2.insertedId };
                        await CAR_OWNER.update(
                            { _id: ObjectId(user._id) },
                            {
                                $set: {
                                    cars: [
                                        {
                                            carId: ObjectId(car._id),
                                            carPlate,
                                        }
                                    ]
                                }
                            }
                        )
                        console.log("insert car details", res1)

                        // find from database and send both data back
                        userData = await CAR_OWNER.findOne({ _id: ObjectId(user._id) })
                        carData = await CAR_INFO.find({ userId: ObjectId(user._id) }).toArray();
                    }
                    userData.cars = carData;
                    // remove password and detail not needed
                    delete userData["password"]

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
                    res.status(200);
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
    // UPDATE PATH : EDIT USER PROFILE (TEST PASS *** ***)
    app.put('/user/:userId/update', async (req, res) => {
        console.log("======= UPDATE PROFILE ROUTE ========")
        let message = []
        try {
            let userId = req.params.userId || " ";
            let username = req.body.username || "";
            let email = req.body.email || "";
            let contact = req.body.contact || "";
            let firstName = req.body.firstName || "";
            let lastName = req.body.lastName || "";

            let [userData] = await CAR_OWNER.find(
                { _id: ObjectId(userId) }
            ).toArray()

            if (userData.auth) {
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
                    res.status(200);
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
                        // Save the modified fields
                        await CAR_OWNER.updateOne(
                            {
                                _id: ObjectId(userId)
                            },
                            {
                                "$set": {
                                    username,
                                    email,
                                    contact,
                                    firstName,
                                    lastName
                                }
                            }
                        );

                        // Find the user
                        let res4 = await CAR_OWNER.findOne(
                            { _id: ObjectId(userData._id) }
                        );
                        // console.log(userData ,req.params.username)
                        carData = await CAR_INFO.find(
                            { userId: ObjectId(userData._id) }
                        ).toArray();
                        // insert carData into userData  
                        res4.cars = carData;
                        // remove password and detail not needed
                        delete res4["password"];

                        message.push("Profile is updated")
                        res.status(200);
                        res.send({
                            userData: res4,
                            auth: true,
                            message
                        })
                        console.log(message)
                    }
                    // Failed Validation : Suspected not from our website 
                    else {
                        message.push("Unauthorized access detected")
                        res.status(200);
                        res.send({
                            auth: false,
                            message
                        });
                    }
                }
            }
            else {
                message.push(`${userData.username} session has expired! Please login again`)
                res.status(200);
                res.send({
                    auth: false,
                    message
                });
                console.log(message)
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
    // ADD & EDIT CAR PATH: ADD NEW CAR TO OWNER'S INVENTORY (TEST PASS *** ***)
    app.post('/user/:userId/add_car', async (req, res) => {
        let message = [];
        try {
            let validationCheck = [];
            let userId = req.params.userId || "";
            // Find the user
            let userData = await CAR_OWNER.findOne(
                { _id: ObjectId(userId) },
                {
                    projection: {
                        username: 1,
                        auth: 1
                    }
                }
            );

            if (userData.auth) {
                // Load in the data
                let carPlate = req.body.carPlate || "";
                let currentOwnerId = req.body.ownerId || "";
                let currentOwnerIdType = req.body.ownerIdType || "0";

                let errMessage = [
                    `${carPlate} already exist in record`,
                ];

                let res4 = CAR_INFO.aggregate([
                    { $match: { carPlate: req.body.carPlate } },
                    {
                        $group: {
                            _id: null,
                            count: { $sum: 1 }
                        }
                    }]).toArray();

                [checkCarPlateOk] = await res4;

                validationCheck.push(Functions.checkMatchCount(checkCarPlateOk));
                validationCheck.filter((e, index) => {
                    !e ? message.push(errMessage[index]) : null;
                })
                // FIRST ROUND VALIDATION
                if (validationCheck.includes(false)) {
                    console.log(message)
                    res.status(200);
                    res.send({
                        auth: false,
                        message
                    });
                } else {
                    // Add car to car_details
                    let res1 = await CAR_INFO.insertOne({
                        userId: ObjectId(userId),
                        carPlate,
                        currentOwnerId,
                        currentOwnerIdType,
                        availability: false,
                        dateInserted: Functions.currentDate()
                    });

                    // Get the _id of the inserted car 
                    let car = { _id: res1.insertedId }
                    console.log(car)

                    // Push the new car into car_users > cars
                    CAR_OWNER.updateOne({
                        "_id": ObjectId(userId)
                    }, {
                        '$push': {
                            'cars': {
                                _id: ObjectId(car._id),
                                carPlate
                            }
                        }
                    })
                    // find from database and send both data back
                    let userData = await CAR_OWNER.findOne({ _id: ObjectId(userId) })
                    let carData = await CAR_INFO.find({ userId: ObjectId(userId) }).toArray();
                    console.log(carData)

                    userData.cars = carData;
                    // remove password and detail not needed
                    delete userData["password"]

                    message.push("New car inserted")
                    res.status(200);
                    res.send({
                        userData,
                        auth: true,
                        message
                    })
                    console.log(message)
                }
            }
            else {
                message.push(`${userData.username} session has expired! Please login again`)
                res.status(200);
                res.send({
                    auth: false,
                    message
                });
                console.log(message)
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
    // ADD CAR DETAILS PATH : ADD MORE DETAILS PRIOR LISTING FOR SALE (TEST PASS *** ***)
    app.put('/user/:userId/:carId/add_to_listing', async (req, res) => {
        let message = []
        try {
            let userId = req.params.userId || "";
            console.log(req.params.userId)
            // Find the user
            let userData = await CAR_OWNER.findOne(
                { _id: ObjectId(userId) },
                {
                    projection: {
                        username: 1,
                        auth: 1
                    }
                }
            );
            if (userData.auth) {
                let carId = req.params.carId || "";
                let carToList = await CAR_INFO.findOne(
                    { _id: ObjectId(carId) }
                )
                console.log("Car Details", carToList)
                let carPrice = parseInt(req.body.carPrice) || 0;
                let carRegDate = req.body.carRegDate || null;
                let carImages = req.body.carImages || [];
                let carMileage = parseInt(req.body.carMileage) || 0;
                let carMake = req.body.carMake || "";
                let carModel = req.body.carModel || "";
                let carYearOfMake = parseInt(req.body.carYearOfMake) || 0;
                let carCOE = parseInt(req.body.carCOE) || 0;
                let carARF = parseInt(req.body.carARF) || 0;
                let carNoOfOwner = parseInt(req.body.carNoOfOwner) || 1;
                let carType = req.body.carType || "sedan";
                // Optional
                let carAccessories = req.body.carAccessories || [];

                // check if values are negative 
                carPrice = validateNoNegativeNumber(carPrice);
                carMileage = validateNoNegativeNumber(carMileage);
                carYearOfMake = validateNoNegativeNumber(carYearOfMake);
                carCOE = validateNoNegativeNumber(carCOE);
                carARF = validateNoNegativeNumber(carARF);
                carNoOfOwner = validateNoNegativeNumber(carNoOfOwner);


                let info = {
                    carPrice, carRegDate, carImages, carMileage,
                    carYearOfMake, carCOE, carARF, carNoOfOwner
                }
                console.log("validateCarDetails=>", Functions.validateCarDetails(info))

                // check if carRegDate is in date format else convert it
                !(carRegDate instanceof Date) ? carRegDate = new Date(carRegDate) : null;
                carToList.dateListed === undefined ? dateListed = Functions.currentDate() : dateListed = carToList.dateListed;

                let carDetails = {
                    carPrice, carRegDate, carImages, carMileage,
                    carYearOfMake, carCOE, carARF, carNoOfOwner,
                    carMake, carModel, carType, dateListed
                }
                console.log("Car Price =>", carDetails)

                await CAR_INFO.updateOne(
                    { _id: ObjectId(carId) },
                    {
                        $set: {
                            carDetails,
                            availability: true
                        }
                    }
                )

                // find from database and send both data back
                userData = await CAR_OWNER.findOne({ _id: ObjectId(carToList.userId) })
                carData = await CAR_INFO.find({ userId: ObjectId(carToList.userId) }).toArray();

                // // remove password and detail not needed
                delete userData["password"]
                userData.cars = carData;

                message.push("Car info is updated")
                res.status(200);
                res.send({
                    userData,
                    auth: true,
                    message
                })
                console.log(message)
            }
            else {
                message.push(`${userData.username} session has expired! Please login again`)
                res.status(200);
                res.send({
                    auth: false,
                    message
                });
                console.log(message)
            }
        }
        catch (e) {
            res.status(500);
            res.send({ e })
        }
    })
    // MARK CAR SOLD PATH : PASS ONLY ID (TEST PASS *** )
    app.put('/user/:userId/:carId/car_sold', async (req, res) => {
        let message = []
        try {
            let userId = req.params.userId || "";
            // Find the user
            let userData = await CAR_OWNER.findOne(
                {
                    _id: ObjectId(userId),
                },
                {
                    projection: {
                        username: 1,
                        auth: 1
                    }
                }
            );
            if (userData.auth) {
                let carId = req.params.carId || "";
                let res1 = await CAR_INFO
                    .findOne(
                        { _id: ObjectId(carId) }
                    )
                console.log(res1);

                if (res1.availability) {
                    userId = res1.userId

                    let res2 = await CAR_OWNER.updateOne({
                        '_id': ObjectId(userId)
                    }, {
                        '$pull': {
                            'cars': {
                                '_id': ObjectId(carId)
                            }
                        }
                    })
                    let res3 = await CAR_INFO.updateOne(
                        { _id: ObjectId(carId) },
                        {
                            $set: {
                                userId: ObjectId("624aee00cb5441e647a02a74"), // Set to default user
                                availability: false
                            },
                            $push: {
                                pastOwners: {
                                    _id: ObjectId("624ad83d1e656c7ad5f587fe"),
                                    dateSold: Functions.currentDate()
                                }
                            }
                        }
                    )
                    // find from database and send both data back
                    userData = await CAR_OWNER.findOne({ _id: ObjectId(userId) })
                    let carData = await CAR_INFO.find({ userId: ObjectId(userId) }).toArray();
                    // console.log("carData =>", carData)

                    userData.cars = carData;
                    // remove password
                    delete userData["password"]


                    message.push(` ${res1.carPlate} is sold!`)
                    res.status(200);
                    res.send({
                        userData,
                        auth: true,
                        message
                    })
                    console.log(message)
                }
                else {
                    message.push("Car is not listed")
                    res.status(200);
                    res.send({
                        auth: false,
                        message
                    })
                }
            }
            else {
                message.push(`${userData.username} session has expired! Please login again`)
                res.status(200);
                res.send({
                    auth: false,
                    message
                });
                console.log(message)
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
    // MARK CAR UNSOLD : PENDING DEVELOPMENT 

    // DELETE CAR PATH : REMOVE CAR FROM HIS CURRENT COLLECTION (TEST PASS ***)
    // - will not remove from inventory of car_details
    // - update car_details: move current user to pastOwners and create pastOwners log
    app.delete('/user/:userId/:carId/delete_car', async (req, res) => {
        console.log("===== DELETE CAR FROM USER INVENTORY ======")
        let message = []
        try {
            let userId = req.params.userId || "";
            // Find the user
            let userData = await CAR_OWNER.findOne(
                {
                    _id: ObjectId(userId),
                },
                {
                    projection: {
                        username: 1,
                        auth: 1
                    }
                }
            );
            if (userData.auth) {


                let carId = req.params.carId || "";
                let res1 = await CAR_INFO
                    .findOne(
                        { _id: ObjectId(carId) }
                    )
                console.log("USERID =>", res1.userId);
                if (res1.userId == "624aee00cb5441e647a02a74") {
                    message.push(`${res1.carPlate} not found in your inventory`);
                    res.status(200);
                    res.send({
                        auth: false,
                        message
                    });
                    console.log(message);
                }
                else {
                    const userId = res1.userId

                    let res2 = await CAR_OWNER.updateOne(
                        { _id: ObjectId(userId) },
                        { $pull: { cars: { carId: ObjectId(carId) } } }
                    );
                    let res3 = await CAR_INFO.updateOne(
                        { _id: ObjectId(carId) },
                        {
                            $set: {
                                userId: ObjectId("624aee00cb5441e647a02a74"), // Set to default user
                            },
                            $push: {
                                pastOwners: {
                                    _id: ObjectId(userId),
                                    dateSold: Functions.currentDate()
                                }
                            }
                        }
                    )
                    console.log("Before returning data", userId)
                    // find from database and send both data back
                    userData = await CAR_OWNER.findOne({ _id: ObjectId(userId) })
                    let carData = await CAR_INFO.find({ userId: ObjectId(userId) }).toArray();
                    // console.log("carData =>", carData)

                    userData.cars = carData;
                    // // remove password and detail not needed
                    delete userData["password"]

                    message.push(`We have removed ${res1.carPlate} from your inventory.`);
                    res.status(200);
                    res.send({
                        userData,
                        auth: true,
                        message
                    });
                    console.log(message);
                }
            }
            else {
                message.push(`${userData.username} session has expired! Please login again`)
                res.status(200);
                res.send({
                    auth: false,
                    message
                });
                console.log(message)
            }

        } catch (e) {
            message.push("Error accessing the database")
            res.status(500);
            res.send({
                auth: false,
                message
            });
            console.log(e);
        }
    })
    // LOGOUT PATH : SET THE AUTH TO FALSE TO DISABLE ALL OTHER FEATURES
    app.put('/user/:userId/logout', async (req, res) => {
        let message = [];
        try {
            let userId = req.params.userId || "";
            // Find the user
            let userData = await CAR_OWNER.findOne(
                {
                    _id: ObjectId(userId),
                },
                {
                    projection: {
                        username: 1,
                        auth: 1
                    }
                }
            );
            if (userData.auth) {
                userData = await CAR_OWNER.updateOne(
                    {
                        _id: ObjectId(userId),
                    },
                    {
                        $set: {
                            auth: false
                        }
                    }
                );
                message.push(`${userData.username} is logout! See you again soon!`)
                res.status(200);
                res.send({
                    auth: false,
                    message
                });
                console.log(message)
            }
            else {
                message.push(`${userData.username} is not login! Please login again`)
                res.status(200);
                res.send({
                    auth: false,
                    message
                });
                console.log(message)
            }
        }
        catch {
            message.push("Error accessing the database")
            res.status(500);
            res.send({
                auth: false,
                message
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
                            'carDetails.carMake': { $regex: carMake, $options: 'i' }
                        },
                        {
                            'carDetails.carModel': { $regex: carModel, $options: 'i' }
                        },
                        // {
                        //     'carDetails.carPricing': {
                        //         "$gte": parseInt(priceLower),
                        //         "$lte": parseInt(priceUpper)
                        //     }
                        // },


                    ]
                }
            ).toArray()
            console.log(data.length)

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



    // // READ PATH : ALL CAR LISTING
    // app.get('/car/listing', async (req, res) => {
    //     console.log("======= CAR LISTING ========")
    //     try {
    //         let data = await CAR_INFO.find().toArray();
    //         res.status(200);
    //         res.send(data);
    //         console.log('Car data sent');
    //     }
    //     catch (e) {
    //         res.status(500);
    //         res.send({
    //             data: [],
    //             auth: false
    //         })
    //     }
    // })


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