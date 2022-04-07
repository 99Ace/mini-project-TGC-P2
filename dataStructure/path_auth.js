// ===================== A U T H ============================

const { path } = require("express/lib/application")

// POST : TO REGISTER USER
path = (URL + "/user/register")
bodyData = {
    "username": "Henry001",
    "email": "henry001@gmail.com",
    "password": "secret",
    "passwordConfirm": "secret",
    "contact": "80000001",
    "ownCar": "true",
    "carPlate": "SDL1D",
    "ownerId": "001D",
    "ownerIdType": "0"
}
// GET : TO LOGIN USER
path = (URL + "/user/:username/:password/login")
// GET : TO RETRIEVE USER PROFILE
path = (URL + "/user/:userId/profile")
// PUT : UPDATE PROFILE
path = (URL + "/user/:userId/update")
bodyData = {
    "username": "Natalie",
    "email": "natalie@gmail.co",
    "contact": "91223322",
    "firstName": "Natalie",
    "lastName": "Portman"
}
// POST : ADD A NEW CAR
path = (URL + "/user/:userId/add_car")
bodyData = {
    "carPlate": "SMS2S",
    "ownerId": "001C",
    "ownerIdType": "0"
}
// PUT : UPDATE DETAILS FOR CAR TO BE LISTED
path = (URL + "/user/:userId/:carId/add_to_listing")
bodyData = {
    "carPrice": "288888",
    "carRegDate": "2021-12-12",
    "carImages": [],
    "carMileage": "1000",
    "carAccessories": [],
    "carMake": "Porsche",
    "carModel": "Boxster",
    "carYearOfMake": "2021",
    "carCOE": "100000",
    "carARF": "80000",
    "carNoOfOwner": "1",
    "carType": "sports"
}
// DELETE : REMOVE A CAR FROM USER INVENTORY
path = (URL + "/user/delete_car/:carId")

// MARK CAR SOLD PATH : PASS ONLY ID
path = (URL + "/user/:carId/car_sold")

// LOGOUT PATH : SET THE AUTH TO FALSE TO DISABLE ALL OTHER FEATURES
path = (URL + '/user/:userId/logout')