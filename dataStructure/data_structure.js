const { ObjectId } = require("mongodb");

// COLLECTION : car_users
let car_users = {
    _id: ObjectId("6245dff535e647ca0b4e3ea4"),
    username: 'Brenda', // min6-max15 char
    email: 'brenda@gmail.com', //valid email
    password: '094fad....1a870114f633ab3528fd5b',
    contact: '91234567', // 8 number
    ownCar: true,
    cars : [
        {
            car_id: ObjectId("6245dff535e647ca0b4eddsc"),
            car_plate: "SMA1234F",
        }
    ],
    favorite: [],
    dateJoin: ISODate("2022-04-01T01:08:05.129Z")
}

let car_details = {

    // INSERTED WHEN REGISTER NEW USER
    car_id: ObjectId("6245dff535e647ca0b4eddsc"),
    carPlate: "SMA1234F",
    listed: false, // track if car is listed
    dateInserted: ISODate("2022-04-01T01:08:05.129Z"),


    // OPTIONAL: insert when listed
    car_detail: {
        carMake: "",
        carModel: "",
        carRegDate: ISODate("2022-04-01T01:08:05.129Z"),
        carPrice: "",
        carMileage: "",
        carCOE: "",
        carARF: "",
        carOwnership: "",
        carYOM: "",
        carDescription: "",
        carAccessories: "",

        availability: 0, // [sold, booked, available]
    }
}