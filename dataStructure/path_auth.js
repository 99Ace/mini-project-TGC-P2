// ===================== A U T H ============================
// POST : TO REGISTER USER
path = (URL + "/user/register")
bodyData = {
    "username": "",
    "email": "",
    "password": "",
    "passwordConfirm": "",
    "contact": "",
    "ownCar": false,
    // optional
    "carPlate": "",
    "ownerId": "",
    "ownerIdType": "0"

}
// GET : TO LOGIN USER
path = (URL + "/user/:username/:password/login")
// GET : TO RETRIEVE USER PROFILE
path = (URL + "/user/:username/profile")
// PUT : UPDATE PROFILE
path = (URL + "/user/update")
bodyData = {
    "_id": "6247a857ccaf24188b2fe3c3",
    "username": "Natalie",
    "email": "natalie@gmail.co",
    "contact": "91223322",
    "first_name": "Natalie",
    "last_name": "Portman"
}
// POST : ADD A NEW CAR
path = (URL + "/user/add_car")
bodyData = {
    "userId": "624a9a50986ffc067d8fd984",
    "carPlate": "SMS2S",
    "ownerId": "001C",
    "ownerIdType": "0"
}
// PUT : UPDATE DETAILS FOR CAR TO BE LISTED
path = (URL + "/user/:carId/add_to_listing")
bodyData = {
    "carPrice": "88888",
    "carRegDate": "",
    "carImages": "",
    "carMileage": "",
    "carAccessories": "",
    "carMake": "",
    "carModel": "",
    "carYearOfMake": "",
    "carCOE": "",
    "carARF": "",
    "carNoOfOwner": ""
}
// DELETE : REMOVE A CAR FROM USER INVENTORY
path = (URL + "/user/delete_car/:carId")



// TESTING DATAS
regData = {
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

insertNewCar = {
    "userId": "624a9a50986ffc067d8fd984",
    "carPlate": "SMS2S",
    "ownerId": "001C",
    "ownerIdType": "0"
}