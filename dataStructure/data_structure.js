const { ObjectId } = require("mongodb");

// COLLECTION : car_users
let car_users = {
    _id: ObjectId("6245dff535e647ca0b4e3ea4"),
    username: 'Brenda',
    email: 'brenda@gmail.com',
    password: '094fad....1a870114f633ab3528fd5b',
    contact: '91234567',
    ownCar: [
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
    car_plate: "SMA1234F",
    listed: false, // track if car is listed
    date_inserted: ISODate("2022-04-01T01:08:05.129Z"),


    // OPTIONAL: insert when listed
    car_detail: {
        car_make: "",
        car_model: "",
        car_reg_date: ISODate("2022-04-01T01:08:05.129Z"),
        car_price: "",
        car_mileage: "",
        car_coe: "",
        car_arf: "",
        car_owners: "",
        car_yom: "",
        car_description: "",
        car_accessories: "",


        availability: 0, // [sold, booked, available]
    }
}