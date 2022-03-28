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

    return ((info.carPricing - info.carARF / 2) / mthsRemaining) * 12
}

// ===================== VERIFICATION =====================
// check for specialChars
hasSpecialCharacters = (username) => {
    let specialChars = `/[!@#$%^&*()_+-=[]{};':"\\|,.<>/?]+/;`
    let userCheck = specialChars.split('').some(char => username.includes(char));
    return (userCheck) // will return true/false
}
// validate is email
validateEmail = (elementValue) => {
    var emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
    return emailPattern.test(elementValue);
}
// validate contact
validateContact = (elementValue) => {
    var contact = /^[0-9]{8}$/;
    return contact.test(elementValue);
}
// validate password matches
validatePassword = () => {
    this.setState({
        passwordChecker: this.state.password === this.state.passwordConfirm
    }, () => this.checkFormReady())
}
// validate car detail : car plate
validateCarPlate = (elementValue) => {
    var carPlate = /^[a-zA-Z]{3}[0-9]+[a-zA-Z]{1}$/;
    return carPlate.test(elementValue);
}
// validate car detail : owner id
validateOwnerId = (elementValue) => {
    var ownerId = /^[0-9]{3}[a-zA-Z]{1}$/;
    return ownerId.test(elementValue);
}


module.exports = {
    hasSpecialCharacters, validatePassword, validateEmail, validateContact, validatePassword, 
    validateCarPlate, validateOwnerId,
    currentDate,
    calculateDepreciation
}