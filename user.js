const crypto = require('crypto');
const {users} = require('./db');


function hashPassword(username, password, salt){
    return crypto.createHash('sha256')
        .update(username)
        .update(password)
        .update(salt)
        .digest('hex');
}


function requireLogin(req, res, next){
    if (!req.session.userId){
        return res.status(401).json({'error':'Please log in first.'});
    }
    next();
}

function requireAdmin (req,res,next){
    if(req.session.role !== 'admin'){
        return res.status(403).json({'error':'Admins only.'});
    }
    next();
}

//Called by login and register, after the password check passes.
function startUserSession(req,user) {
    req.session.userId = user._id.toString();
    req.session.username = user.username;
    req.session.role = user.role;
}

function addUserRoutes(app){
    app.post('/api/register', processRegistrationRequest);
    app.post('/api/login', processLogin);
}

const processRegistrationRequest = async function(req, res){
    const username = req?.body?.username;
    const password = req?.body?.password;

    const usernamePattern = /^[A-Za-z][A-Za-z0-9_]{2,19}$/

    if (!username || !password){
        return res.status(400).json({'error':'Username and password are required.'})
    }

    // check for NoSQL injection
    if(typeof username !== 'string' || typeof password !== 'string'){
        return res.status(400).json({'error':'Invalid username or password.'});
    }

    if(!usernamePattern.test(username)){
        return res.status(400).json({'error':'Username can only contain letters A-Z, a-z, digits 0-9 and underscore "_".' +
                ' The first character must be a letter. Username must be between 3 and 20 characters long.'});
    }

    if(password.length < 8 || password.length > 128){
        return res.status(400).json({'error': 'Invalid password. Password must be between 8 and 128 characters long.'});
    }

    try{
        const existUsername = await users.findOne({'username':username});
        
        if(existUsername !== null){
            return res.status(409).json({'error': "This username is already taken. Please choose another username."});
        }
    }catch(err){
        console.error('Something went wrong while finding a username', err.message);
        return res.status(500).json({'error':'Something went wrong while creating your account. Please try again later.'});
    }


    const salt = crypto.randomBytes(16).toString('hex');
    const hashedPassword = hashPassword(username, password, salt);
    const newUser = {username, hashedPassword,salt, role:'user'};
    let result
    try{
        result = await users.insertOne(newUser);
    }catch(err){
        console.error('Something went wrong while inserting a new account into the database.', err.message);
        return res.status(500).json({'error': 'Something went wrong while creating your account. Please try again later.'});
    }

    newUser._id = result.insertedId;
    startUserSession(req, newUser);

    return res.status(201).json({'ok': true,
                                'username': newUser.username,
                                'role': newUser.role});
}

const processLogin = async function (req,res){
    const username = req?.body?.username;
    const password = req?.body?.password;

    // check if user provide username and password
    if(!username || !password){
        return res.status(400).json({'error': 'Username and password are required.'});
    }

    // check for NoSQL injection
    if(typeof username !== 'string' || typeof password !== 'string'){
        return res.status(400).json({'error': 'Invalid username or password.'});
    }
    
    let user;
    try{
        user = await users.findOne({'username': username});
    }catch(err){
        console.error('Something went wrong while looking for a user', err.message);
        return res.status(500).json({'error':'Something went wrong. Please try again later.'});
    }

    // check if there is an account with the given username in the database.
    if (user === null){
        return res.status(401).json({'error': 'Incorrect username or password.'});
    }

    const hashedLoginPassword = hashPassword(username, password, user.salt);
    if(hashedLoginPassword !== user.hashedPassword){
        return res.status(401).json({'error': 'Incorrect username or password.'});
    }


    // Logged in: remove the old session id anre generate a new one.
    req.session.regenerate(function(err){
        if (err){
            return next(err); // regenerate failed: let server.js response with the 500 code
        }
        startUserSession(req, user); // write the data into the new session
        return res.status(200).json({'ok':true,
                                    'username': user.username,
                                    'role': user.role});
    });
}







module.exports = {hashPassword, addUserRoutes, requireLogin, requireAdmin}
