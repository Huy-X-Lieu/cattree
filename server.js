const express                       = require('express');
const session                       = require('express-session');
const path                          = require('path');
const {connectDb}                   = require('./db');
const {seedIfEmpty}                 = require('./seed');
const {addUserRoutes}               = require('./users');
const {addEventRoutes}              = require('./events');
//const {addAdminRoutes}              = require('./admin');
//const {addSaleRoutes, startSweeper} = require('./sales');

const app = express();


// Read JSON request bodies into req.body
app.use(express.json());

//Sessions: the cookies hold only a random key;
// the data stays on the server.
app.use(session({
    'secret': 'you-gotta-be-kitten-me',     // signs the cookie, so nobody can forge one
    'resave': false,                        // don't re-save a session if it is unchanged
    'saveUninitialized': false              // don't create a session until someone logs in
}));

function sendPage(name){
    return (req,res) => res.sendFile(path.join(__dirname, name));
}

app.get('/', sendPage('home.html'));
app.get('/home.html', sendPage('home.html'));
app.get('/checkout.html', sendPage('checkout.html'));
app.get('/event.html', sendPage('event.html'));
app.get('/tickets.html', sendPage('tickets.html'));
app.get('/login.html', sendPage('login.html'));
app.get('/register.html', sendPage('register.html'));
app.get('/admin.html', sendPage('admin.html'));
app.get('/event_form.html', sendPage('event_form.html'));
app.get('/style.css', sendPage('style.css'));
app.get('/ui_common.js', sendPage('ui_common.js'));
app.get('/ui_users.js', sendPage('ui_users.js'));
app.get('/ui_events.js', sendPage('ui_events.js'));
app.get('/ui_admin.js', sendPage('ui_admin.js'));
app.get('/ui_sales.js', sendPage('ui_sales.js'));


//The JSON API: each module add its own routes
addUserRoutes(app)
addEventRoutes(app)
//addAdminRoutes(app)
//addSaleRoutes(app)


// Last: any error thrown in a route lands here, so the page always get JSON back.
// Express knows this is the error handler because the function take four arguments.

app.use(function (err, req, res, next){
    console.log(err);
    return res.status(500).json({'error':'Something went wrong on the server.'});
});

async function main(){
    await connectDb();
    await seedIfEmpty();
    //startSweeper()
    const port =  8080;
    app.listen(port, () => console.log('CatTree running at http://localhost:' + port));
}

main().catch( function (err){
    console.log('Could not start. Check if MongoDB is running on 127.0.0.1:27017');
    console.log(err);
    process.exit(1);
});
