const express = require("express")
const axios = require("axios");
const session = require("express-session")
const { google } = require("googleapis");
const passport = require("passport");
require('dotenv').config()
require('./auth')

function isLoggedIn(req, res, next) {
    req.user ? next() : res.sendStatus(401)
}
const app = express()
app.use(session({ secret: 'test' }))
app.use(passport.initialize())
app.use(passport.session())

app.set('view engine', 'ejs')

app.use(express.urlencoded({ extended: true }))

app.get('/', (req, res) => {
    res.send('<a href="/auth/google">Login</a>')
})

app.get('/auth/google',
    passport.authenticate('google', { scope: ['email', 'profile'] })
)

app.get('/google/callback',
    passport.authenticate('google', {
        successRedirect: '/home',
        failureRedirect: '/auth/failure',
    })
)

app.get('/auth/failure', (req, res) => {
    res.send('something went wrong...')
})

app.post("/save", async (req, res) => {
    try {
        const { tasa, email, index, id } = req.body

        const auth = new google.auth.GoogleAuth({
            keyFile: "credentials.json",
            scopes: "https://www.googleapis.com/auth/spreadsheets",
        });

        const client = await auth.getClient();

        const googleSheets = google.sheets({ version: "v4", auth: client })

        const sheetId = "1mKY-YRKh4fUXvnOcJo2bA2nlVjN_8qjZHw10BYSO0i4"

        const response = await googleSheets.spreadsheets.values.update({
            auth,
            spreadsheetId: sheetId,
            range: "Hoja 1!B" + index + ":C" + index,
            valueInputOption: "USER_ENTERED",
            resource: {
                values: [[tasa, email]],
            },
        })

        await axios.post(process.env.API_ROUTE, {
            'idOp': id,
            'tasa': tasa,
            'email': email
        }).then((response) => {
            console.log('ok', response);
        })
        res.redirect(req.get('referer'))
    } catch (err) {
        res.send('Error')
    }
})

app.get("/home", isLoggedIn, async (req, res) => {

    const auth = new google.auth.GoogleAuth({
        keyFile: "credentials.json",
        scopes: "https://www.googleapis.com/auth/spreadsheets",
    });

    const client = await auth.getClient();

    const googleSheets = google.sheets({ version: "v4", auth: client })

    const sheetId = "1mKY-YRKh4fUXvnOcJo2bA2nlVjN_8qjZHw10BYSO0i4"

    const getRows = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId: sheetId,
        range: "Hoja 1"
    })

    res.render('index', { data: getRows.data })
})

app.get('/logout', (req, res) => {
    req.logout(function (err) {
        if (err) { return next(err); }
        res.send('Logged out')
    });
})

app.listen(process.env.PORT || 3001, (req, res) => {
    console.log("Running on port 3001");
})