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
const bodyParser = require('body-parser')
const cors = require('cors')
const mariadb = require('mariadb')
const app = express()

app.use(bodyParser.json())

app.use(cors())

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
        const table = await conn.query('create table USERS(FirstName varchar(50), LastName varchar(50), Email varchar(100) primary key, Password varchar(50), SessionID varchar(10));')
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
        return await conn.query(`insert into USERS values ('${newUser.FirstName}', '${newUser.LastName}', '${newUser.Email}', '${newUser.Password}', '${newUser.SessionID}');`)
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
        let SessionID = '124523'
        let newUser = new User(FirstName, LastName, Email, Password, SessionID)
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
            res.status(200).json(rows[0])
        else
            res.status(401).json(rows)

    } catch (error) {
        console.log(error)
    }
})

app.post('/api/sessions', (req, res) => {
    
})

const port = 3000;

app.listen(port, () => {
    console.log(`Listening on port ${port}...`)
})
