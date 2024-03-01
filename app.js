class User {
    constructor (firstname, lastname, email, password, sessionID) {
        this.FirstName = firstname
        this.LastName = lastname
        this.Email = email
        this.Password = password
    }

    getPassword() { return this.Password } 
    getEmail() { return this.Email }
    getFullName() { return this.FirstName + ' ' + this.LastName }
}

const express = require('express')
const session = require('express-session')
const uuid = require('uuid')
const bodyParser = require('body-parser')
const cors = require('cors')
const mariadb = require('mariadb')
const app = express()

app.use(bodyParser.json())

app.use(cors())

app.use(session({
    genid: (req) => {
        return uuid.v4()
    },
    secret: 'e67a3d2a6851d3c7c5a03b78951d0d4c304b51a17d89113d7f7b02b7e63b8091',
    resave: false,
    saveUninitialized: true
}))

const userPool = mariadb.createPool({
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
        conn = await userPool.getConnection()
        const table = await conn.query('create table USERS(FirstName varchar(50) not null, LastName varchar(50) not null, Email varchar(100) primary key, Password varchar(50) not null);')
    } catch (error) {
        console.log(error)
    } finally {
        if(conn) conn.release()
    }
}

async function addUser(newUser) {
    let conn;
    try {
        conn = await userPool.getConnection()
        return await conn.query(`insert into USERS values ('${newUser.FirstName}', '${newUser.LastName}', '${newUser.Email}', '${newUser.Password}');`)
    } catch (error) {
        console.log(error)
    } finally {
        if(conn) conn.release()
    }
}

//createUserTable()

// Partially done validating user credentials for logging in.
async function getUser(Email, Password) {
    let conn;
    try {
        conn = await userPool.getConnection()
        return await conn.query(`select * from USERS where Email = '${Email}' and Password = '${Password}';` /*[Email, Password]*/)
    } catch (error) {
        console.log(error)
    } finally {
        if(conn) conn.release()
    }
}

// This POST takes care of registering an account.
app.post('/api/users', async (req, res) => {
    try{
        let { FirstName, LastName, Email, Password } = req.body
        let newUser = new User(FirstName, LastName, Email, Password)
        // send to database yada yada
        let response = await addUser(newUser)
        if(response)
            res.status(200).json(newUser)
        else
            res.status(401).json(newUser)
    } catch (error) {
        console.log(error)
    }
})

// This GET takes care of logging into an account.
app.get('/api/users', async (req, res) => {
    try {
        let { Email, Password } = req.query
        const rows = await getUser(Email, Password)
        if(rows.length > 0)
        {
            const SessionID = req.sessionID // generates a new SessionID for our user every login.
            const user = rows[0]
            user.SessionID = SessionID
            res.status(200).json(user)
        }
        else
            res.status(401).json(rows)

    } catch (error) {
        console.log(error)
    }
})

const port = process.env.port || 3000;

app.listen(port, () => {
    console.log(`Listening on port ${port}...`)
})
