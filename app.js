const express = require('express')
const app = express()

class User {
    constructor (email, password, firstname, lastname) {
        this._email = email
        this._password = password
        this._firstname = firstname
        this._lastname = lastname
    }

    getPassword() { return this._password } 
    getEmail() { return this._email }
    getFullName() { return this._firstname + ' ' + this._lastname }
}

app.get('/api/users', (req, res) => {
    
})

app.listen(6969, () => {
    console.log('Listening on port 6969, hehe...')
})