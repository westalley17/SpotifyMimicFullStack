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
    database: 'mimic_db',
    connectionLimit: 50
})

// function to automatically create users table for me more efficiently.
async function createUsersTable() {
    let conn;
    try {
        conn = await userPool.getConnection()
        const userTable = await conn.query('CREATE table USERS (FirstName varchar(50) not null, LastName varchar(50) not null, Email varchar(100) primary key, Password varchar(50) not null);')
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
        const sessTable = await conn.query('CREATE table SESSIONS (SessionID char(36) primary key, Email varchar(100) not null, IDCreateDate varchar(30) not null, foreign key(Email) references users(Email) on delete cascade);')
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
        return await conn.query(`INSERT INTO USERS values (?, ?, ?, ?);`, 
        [`${newUser.FirstName}`, `${newUser.LastName}`, `${newUser.Email}`, `${newUser.Password}`])
    } catch (error) {
        console.log(error)
    } finally {
        if(conn) conn.release()
    }
}

// createUsersTable()
// createSessionsTable()

// Returns the rows from MariaDB where password matches the username, aka logging in.
async function loginUser(Email, Password) {
    let conn
    try {
        conn = await userPool.getConnection()
        return await conn.query(`SELECT * FROM USERS WHERE Email = ? and Password = ?;`, [`${Email}`, `${Password}`])
    } catch (error) {
        console.log(error)
    } finally {
        if(conn) conn.release()
    }
}

async function getUser(Email) {
    let conn
    try {
        conn = await userPool.getConnection()
        return await conn.query(`SELECT * FROM USERS WHERE Email = ?;`, [`${Email}`])
    } catch (error) {
        console.log(error)
    } finally {
        if(conn) conn.release()
    }
}

async function getSession(SessionID) {
    let conn
    try {
        conn = await userPool.getConnection()
        return await conn.query(`SELECT * FROM SESSIONS WHERE SessionID = ?;`, [`${SessionID}`])
    } catch (error) {
        console.log(error)
    } finally {
        if(conn) conn.release()
    }
}

// adds a new session to the sessions table.
async function addSession(SessionID, Email) {
    let conn
    try {
        conn = await userPool.getConnection()
        return await conn.query(`INSERT INTO SESSIONS values (?, ?, CURRDATE());`, [`${SessionID}`, `${Email}`])
    } catch (error) {
        console.log(error)
    }
}

async function removeSession(SessionID) {
    let conn
    try {
        conn = await userPool.getConnection()
        return  conn.query(`DELETE FROM SESSIONS WHERE SessionID = ?;`, [`${SessionID}`])
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
app.get('/api/users', async (req, res) => {
    try {
        let { Email, Password } = req.query
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


// MAKE THIS A DELETE THAT GETS CALLED FROM A LOGOUT BUTTON!!!!

// app.post('/api/sessions', async (req, res) => {
//     console.log(req)
//     const sessionStore = req.sessionStore
//     if(sessionStore && sessionStore.sessions) {
//         const sessionKeys = Object.keys(sessionStore.sessions)
//         if(sessionKeys.length > 0)
//         {
//             const SessionID = sessionKeys[0]
//             const response = await removeSession(SessionID)
//         }
//     }
// })

// This allows us to sign in once and stay signed in with the session.
app.get('/api/sessions', async (req, res) => {
    const { SessionID } = req.query
    const sessionRows = await getSession(SessionID)
    if(sessionRows.length > 0)
    {
        const user = await getUser(sessionRows[0].Email)
        res.status(200).json(user)
    }
})

const port = process.env.port || 3000;

app.listen(port, () => {
    console.log(`Listening on port ${port}...`)
})
