
async function findUser(userId, data) {
    try {
        data = await CAR_OWNER.find(
            { '_id': ObjectId(userId) }
        ).toArray();    
        console.log(data[0]);
    }
    catch(e) {
        res.status(403)
        res.send({
            "message": "UserId is not valid"
        })
    }
}
try {
    
}
catch (e) {
    res.status(403)
    res.send({
        "message": "UserId is not valid"
    })
}
// Validate to check if user can be found using the userId
function checkIfUserIsFound(data) {
    // return not found if no data
    if (data.length==0) {
        res.status(403)
        res.send({
        "message": "User not found"
        })
    }
}



async function hasSpecialCharacters ( username ) {
    let specialChars = `/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;`
    let userCheck = specialChars.split('').some(char=>username.includes(char));
    return (userCheck)
}




module.exports = {
    hasSpecialCharacters,
    checkIfUserIsFound,
    findUser
}