// User class to group our user data together.
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
    getFullName() { return this.FirstName + ' ' + this.LastName }
}

// This block of requires is needed to use Express.JS and MariaDB with some other needed libraries.
const express = require('express')
const session = require('express-session')
const uuid = require('uuid')
const bodyParser = require('body-parser')
const cors = require('cors')
const mariadb = require('mariadb')
const app = express()

app.use(bodyParser.json())

app.use(cors())

// This uses a secret to generate a SessionID for us.
app.use(session({
    genid: (req) => {
        return uuid.v4()
    },
    secret: 'e67a3d2a6851d3c7c5a03b78951d0d4c304b51a17d89113d7f7b02b7e63b8091',
    resave: false,
    saveUninitialized: true
}))

// This creates our pool that we will use throughout the backend to communicate to the database.
const userPool = mariadb.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'Mickey2024!',
    database: 'mimic_db',
    connectionLimit: 50 // idk, 50 seemed like it be enough
})

// function to automatically create users table for me more efficiently.
async function createUsersTable() {
    let conn;
    try {
        conn = await userPool.getConnection()
        const userTable = await conn.query('CREATE table TBL_USERS (FirstName varchar(50) not null, LastName varchar(50) not null, Email varchar(100) primary key, Password varchar(50) not null);')
    } catch (error) {
        console.log(error)
    } finally {
        if(conn) conn.release()
    }
}

// function to automatically create sessions table for me more efficiently.
async function createSessionsTable() {
    let conn
    try {
        conn = await userPool.getConnection()
        const sessTable = await conn.query('CREATE table TBL_SESSIONS (SessionID char(36) primary key, Email varchar(100) not null, IDCreateDate char(10) not null, foreign key(Email) references TBL_USERS(Email) on delete cascade);')
    } catch (error) {
        console.log(error)
    } finally {
        if(conn) conn.release()
    }
}

// this returns truthy response from MariaDB to the register POST below.
async function addUser(newUser) {
    let conn
    try {
        conn = await userPool.getConnection()
        return await conn.query(`INSERT INTO TBL_USERS values (?, ?, ?, ?);`, 
        [`${newUser.FirstName}`, `${newUser.LastName}`, `${newUser.Email}`, `${newUser.Password}`])
    } catch (error) {
        console.log(error)
    } finally {
        if(conn) conn.release()
    }
}

// createUsersTable()
//createSessionsTable()

// Returns the rows from MariaDB where password matches the username, aka logging in.
async function loginUser(Email, Password) {
    let conn
    try {
        conn = await userPool.getConnection()
        return await conn.query(`SELECT * FROM TBL_USERS WHERE Email = ? and Password = ?;`, [`${Email}`, `${Password}`])
    } catch (error) {
        console.log(error)
    } finally {
        if(conn) conn.release()
    }
}

// Returns the all the sessions associated with a given Email.
async function getUser(Email) {
    let conn
    try {
        conn = await userPool.getConnection()
        return await conn.query(`SELECT * FROM TBL_USERS WHERE Email = ?;`, [`${Email}`])
    } catch (error) {
        console.log(error)
    } finally {
        if(conn) conn.release()
    }
}

// Returns one session that we will LATER use to see if it is still valid. (Go on a day-by-day basis.)
async function getSession(SessionID) {
    let conn
    try {
        conn = await userPool.getConnection()
        return await conn.query(`SELECT * FROM TBL_SESSIONS WHERE SessionID = ?;`, [`${SessionID}`])
    } catch (error) {
        console.log(error)
    } finally {
        if(conn) conn.release()
    }
}

// adds a new session to the TBL_SESSIONS table.
async function addSession(SessionID, Email) {
    let conn
    try {
        conn = await userPool.getConnection()
        return await conn.query(`INSERT INTO TBL_SESSIONS values (?, ?, CURDATE());`, [`${SessionID}`, `${Email}`])
    } catch (error) {
        console.log(error)
    }
}

// removes a given session by value.
async function removeSession(SessionID) {
    let conn
    try {
        conn = await userPool.getConnection()
        return conn.query(`DELETE FROM TBL_SESSIONS WHERE SessionID = ?;`, [`${SessionID}`])
    } catch (error) {
        console.log(error)
    }
}

// This POST takes care of registering an account.
app.post('/api/users', async (req, res) => {
    try {
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
app.post('/api/sessions', async (req, res) => {
    try {
        let { Email, Password } = req.body
        const rows = await loginUser(Email, Password)
        if(rows.length > 0)
        {
            const SessionID = req.sessionID // generates a new SessionID for our user every time login button is used correctly.
            const user = rows[0]
            user.SessionID = SessionID
            const session = await addSession(SessionID, Email)
            res.status(200).json(user)
        }
        else
            res.status(401).json(rows)

    } catch (error) {
        console.log(error)
    }
})


// This DELETE lets us remove a session from the database.
app.delete('/api/sessions', async (req, res) => {
    const { SessionID } = req.query
    const response = await removeSession(SessionID)
    if(response){
        res.status(200).json('Success')
    }
    else {
        res.status(404).json('Error')
    }
})

// This GET allows us to sign in once and stay signed in with the session.
app.get('/api/sessions', async (req, res) => {
    const { SessionID } = req.query
    const sessionRows = await getSession(SessionID)
    if(sessionRows.length > 0)
    {
        const user = await getUser(sessionRows[0].Email) // This is needed so that we place 
        res.status(200).json(user)
    }
})

const port = process.env.port || 3000;

app.listen(port, () => {
    console.log(`Listening on port ${port}...`)
})
