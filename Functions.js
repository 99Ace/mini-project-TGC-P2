async function hasSpecialCharacters(username) {
    let specialChars = `/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;`
    let userCheck = specialChars.split('').some(char => username.includes(char));
    return (userCheck)
}
function currentDate() {
    Date.prototype.addHours = function (h) {
        this.setTime(this.getTime() + (h * 60 * 60 * 1000));
        return this;
    }
    return new Date().addHours(8);
}



module.exports = {
    hasSpecialCharacters,
    currentDate
}