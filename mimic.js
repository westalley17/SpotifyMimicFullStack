// User class to group our user data together.
class User {
    constructor (firstname, lastname, email, password, sessionID) {
        this.FirstName = firstname
        this.LastName = lastname
        this.Email = email
        this.Password = password
        this.SessionID = sessionID
    }
}

// This block of requires is needed to use Express.JS and MariaDB with some other needed libraries.
const express = require('express')
const session = require('express-session')
const uuid = require('uuid')
const bodyParser = require('body-parser')
const cors = require('cors')
const sqlite3 = require('sqlite3').verbose()
const dbSource = "mimic.db"
const app = express()

app.use(bodyParser.json())

app.use(cors())

const db = new sqlite3.Database(dbSource)

// This uses a secret to generate a SessionID for us.
app.use(session({
    genid: (req) => {
        return uuid.v4()
    },
    secret: 'e67a3d2a6851d3c7c5a03b78951d0d4c304b51a17d89113d7f7b02b7e63b8091',
    resave: false,
    saveUninitialized: true,
}))

// Creates necessary tables ONLY if they don't already exist.
db.serialize(() => {
    db.run('CREATE TABLE IF NOT EXISTS TBL_USERS (FirstName TEXT, LastName TEXT, Email TEXT PRIMARY KEY, Password TEXT)')
    db.run('CREATE TABLE IF NOT EXISTS TBL_SESSIONS (SessionID TEXT PRIMARY KEY, Email TEXT, IDCreateDate TEXT, FOREIGN KEY(Email) REFERENCES TBL_USERS(Email) ON DELETE CASCADE)')
})

// this returns truthy response from SQLite to the register POST below.
async function addUser(newUser) {
    return new Promise((resolve, reject) => {
        db.run('INSERT INTO TBL_USERS VALUES (?, ?, ?, ?)', 
        [newUser.FirstName, newUser.LastName, newUser.Email, newUser.Password],
        (err) => {
            if (err)
                reject('Account with that email already exists!')
            else 
                resolve()
        })
    })
}

// Returns the rows from SQLite where password matches the username, aka logging in.
async function loginUser(Email, Password) {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM TBL_USERS WHERE Email = ? AND Password = ?', [Email, Password],
        (err, rows) => {
            if (err) 
                reject(err)
            else 
                resolve(rows)
        })
    })
}

// Returns the all the sessions associated with a given Email.
async function getUser(Email) {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM TBL_USERS WHERE Email = ?', [Email],
        (err, rows) => {
            if (err) 
                reject(err)
            else 
                resolve(rows)
        })
    })
}

// Returns one session that we will LATER use to see if it is still valid. (Go on a day-by-day basis.)
async function getSession(SessionID) {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM TBL_SESSIONS WHERE SessionID = ?', [SessionID],
        (err, rows) => {
            if (err) 
                reject(err)
            else 
                resolve(rows)
        })
    })
}

// adds a new session to the TBL_SESSIONS table.
async function addSession(SessionID, Email) {
    return new Promise((resolve, reject) => {
        db.run('INSERT INTO TBL_SESSIONS VALUES (?, ?, date("now"))', 
        [SessionID, Email], 
        (err) => {
            if (err) 
                reject(err)
            else 
                resolve()
        })
    })
}

// removes a given session by value.
async function removeSession(SessionID) {
    return new Promise((resolve, reject) => {
        db.run('DELETE FROM TBL_SESSIONS WHERE SessionID = ?', [SessionID], 
        (err) => {
            if (err) 
                reject(err)
            else 
                resolve()
        })
    })
}

// This POST takes care of registering an account.
app.post('/api/users', async (req, res) => {
    try {
        let FirstName = req.body.FirstName
        let LastName = req.body.LastName
        let Email = req.body.Email
        let Password = req.body.Password

        let newUser = new User(FirstName, LastName, Email, Password)
        await addUser(newUser)
        res.status(200).json(newUser)
    } catch (error) {
        console.log(error)
        res.status(500).json({error: 'Account with that email already exists'})
    }
})

// This GET takes care of logging into an account.
app.post('/api/sessions', async (req, res) => {
    try {
        let Email = req.body.Email
        let Password = req.body.Password
        // means that no such user exists
        if((await getUser(Email)).length < 1) {
            res.status(404).json({error: 'No such user exists'})
        }
        else {
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
                res.status(401).json({error: 'Invalid credentials'})
        }

    } catch (error) {
        console.log(error)
        res.status(500).json({error: 'Internal servor error'})
    }
})


// This DELETE lets us remove a session from the database.
app.delete('/api/sessions', async (req, res) => {
    try {
        const SessionID = req.body.SessionID
        await removeSession(SessionID)
        res.status(200).json('Success')
    } catch (error) {
        console.log(error)
        res.status(500).json({error: 'Internal servor error'})
    }
})

// This GET allows us to sign in once and stay signed in with the session.
app.get('/api/sessions', async (req, res) => {
    try {
        const SessionID = req.query.SessionID
        const sessionRows = await getSession(SessionID)
        if(sessionRows.length > 0)
        {
            const user = await getUser(sessionRows[0].Email)
            res.status(200).json(user)
        } 
        else {
            res.status(401).json({error: 'Session expired, please sign in again'})
        }
    } catch (error) {
        console.log(error)
        res.status(500).json({error: 'Internal servor error'})
    }
    
})

const port = process.env.port || 3000;

app.listen(port, () => {
    console.log(`Listening on port ${port}...`)
})
