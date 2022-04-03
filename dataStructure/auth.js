// ===================== A U T H ============================
// POST : TO REGISTER USER
path = (URL + "/user/register")
bodyData = {
    "username": "",
    "email": "",
    "password": "",
    "contact": "",
    "ownCar": "",
     // optional
    "carPlate": "",
    "ownerId": "",
    "ownerIdType": "0"
    
}
// GET : TO LOGIN USER
path = (URL +"/user/:username/:password/login")
// GET : TO RETRIEVE USER PROFILE
path= (URL + "/user/:username/profile")
// PUT : UPDATE PROFILE
path = (URL + "/user/update")
bodayData = {
    "_id": "6247a857ccaf24188b2fe3c3",
    "username": "Natalie",
    "email": "natalie@gmail.co",
    "ownCar": true,
    "contact": "91223322",
    "first_name" : "Natalie",
    "last_name" : "Portman"
}