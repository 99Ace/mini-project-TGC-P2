async function hasSpecialCharacters(username) {
    let specialChars = `/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;`
    let userCheck = specialChars.split('').some(char => username.includes(char));
    return (userCheck) // will return true/false
}
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


module.exports = {
    hasSpecialCharacters,
    currentDate,
    calculateDepreciation
}