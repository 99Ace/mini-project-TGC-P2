function currentDate() {
    Date.prototype.addHours = function (h) {
        this.setTime(this.getTime() + (h * 60 * 60 * 1000));
        return this;
    }
    return new Date().addHours(8);
}
function calculateDepreciation(info) {
    let carYear = info.carRegDate.getFullYear()
    let carMonth = info.carRegDate.getMonth() + 1
    let currentYear = new Date().getFullYear()
    let currentMonth = new Date().getMonth() + 1

    let mthsRemaining = (carYear + 10 - currentYear) * 12 + (carMonth - currentMonth)

    return ((info.carPrice - info.carARF / 2) / mthsRemaining) * 12
}

// ============== USER VERIFICATION ================
checkMatchCount = (e) => {
    console.log("E is =>",e)
    return e === undefined ? true : false;
}
// validate username : no specialChar, length 6-15
validateUser = (elementValue) => {
    let userPattern = /^[a-zA-Z0-9]{6,15}$/;
    return userPattern.test(elementValue)
}
// validate is email
validateEmail = (elementValue) => {
    var emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
    return emailPattern.test(elementValue);
}
// validate contact : all numbers, length = 8 
validateContact = (elementValue) => {
    let contact = /^[0-9]{8}$/;
    return contact.test(elementValue);
}
// validate password: both password matches, both length 6 and above
validatePassword = (pass1, pass2) => {
    if (pass1.length > 5 && pass2.length > 5) {
        return pass1 == pass2
    }
    else {
        return false
    }

}
// validate car plate : 3char4digit1char format
validateCarPlate = (elementValue) => {
    var carPlate = /^[a-zA-Z]{1,3}[0-9]{1,4}[a-zA-Z]{1}$/;
    return carPlate.test(elementValue);
}
// validate car detail : owner id
validateOwnerId = (elementValue) => {
    var ownerId = /^[0-9]{3}[a-zA-Z]{1}$/;
    return ownerId.test(elementValue);
}
validateOwnerIdType = (elementValue) => {
    var ownerId = /^[0-9]{1}$/;
    return ownerId.test(elementValue);
}

validateNoNegativeNumber = (elementValue)=> {
    return elementValue<0 ? 0 : elementValue
}
// ============== CAR INFO VERIFICATION ================
validateCarDetails = (elementValue) => {
    let validationCheck =[]
    let errMessage = [
        "Pricing",
    ]
    console.log(elementValue.carRegDate)
    validationCheck.push ( 
        elementValue.carRegDate !== null && elementValue.carRegDate!=="" 
    );
    validationCheck.push ( elementValue.carImages.length === 0 ); 
    validationCheck.push ( elementValue.carMileage >= 0 );
    validationCheck.push ( elementValue.carYearOfMake > 0);
    validationCheck.push ( elementValue.carCOE >= 0 );
    validationCheck.push ( elementValue.carARF >= 0 );
    validationCheck.push ( elementValue.carNoOfOwner >= 1 );
    return (validationCheck)
}



module.exports = {
    // Validation user
    checkMatchCount,
    validateUser, validateEmail, validateContact, validatePassword,
    validateCarPlate, validateOwnerId, validateOwnerIdType,
    // Validation car info
    validateNoNegativeNumber, validateCarDetails,

    currentDate,
    calculateDepreciation,
}