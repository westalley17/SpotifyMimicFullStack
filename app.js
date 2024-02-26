class User {
    constructor (firstname, lastname, email, password, sessionID) {
        this.Firstname = firstname
        this.Lastname = lastname
        this.Email = email
        this.Password = password
        this.SessionID = sessionID
    }

    getPassword() { return this.Password } 
    getEmail() { return this.Email }
    getFullName() { return this.Firstname + ' ' + this.Lastname }
}

const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const app = express()

app.use(bodyParser.json())

app.use(cors())

app.post('/api/users', (req, res) => {
    let { FirstName, LastName, Email, Password } = req.body
    let SessionID = '123-456'
    let newUser = new User(FirstName, LastName, Email, Password, SessionID)
    // send to database yada yada
    res.status(201).json(newUser)
})

app.post('/api/sessions', (req, res) => {
    
})

app.listen(6969, () => {
    console.log('Listening on port 6969, hehe...')
})