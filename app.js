class User {
    constructor (firstname, lastname, email, password, sessionID) {
        this.FirstName = firstname
        this.LastName = lastname
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
const mariadb = require('mariadb')
const app = express()

app.use(bodyParser.json())

app.use(cors())

const pool = mariadb.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'Mickey2024!',
    database: 'users_db',
    connectionLimit: 5
})

async function createUserTable() {
    let conn;
    try {
        conn = await pool.getConnection()
        const table = await conn.query('CREATE table USERS(FirstName varchar(50) primary key, LastName varchar(50), Email varchar(100), Password varchar(50), SessionID varchar(10));')
    } catch (error) {
        console.log(error)
    } finally {
        if(conn) conn.release()
    }
}

async function addUser(newUser) {
    let conn;
    try {
        conn = await pool.getConnection()
        const user = await conn.query(`INSERT into USERS values ('${newUser.FirstName}', '${newUser.LastName}', '${newUser.Email}', '${newUser.Password}', '${newUser.SessionID}');`)
    } catch (error) {
        console.log(error)
    } finally {
        if(conn) conn.release()
    }
}

app.post('/api/users', (req, res) => {
    let { FirstName, LastName, Email, Password } = req.body
    let SessionID = '123-456'
    let newUser = new User(FirstName, LastName, Email, Password, SessionID)
    // send to database yada yada
    addUser(newUser)
    res.status(201).json(newUser)
})

app.post('/api/sessions', (req, res) => {
    
})

const port = app.env.port || 3000;

app.listen(port, () => {
    console.log(`Listening on port ${port}...`)
})
