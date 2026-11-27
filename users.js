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

function readCredentials(req){
    const username = req.body?.username;
    const password = req.body?.password;
    //Check if username and password are null/undefined
    if(!username || !password)
        return {};

    //Check if types of username and password are string
    //to avoid NoSQL injection
    if(typeof username !== 'string' || typeof password !== 'string')
        return {};

    //valid
    return {username, password};
}

function regenerateSession(req){
    return new Promise((resolve, reject) => {
        req.session.regenerate(err => err ? reject(err) : resolve());
    });
}
    

//Called by login and register, after the password check passes.
async function startUserSession(req,user) {
    await regenerateSession(req);

    req.session.userId = user._id.toString();
    req.session.username = user.username;
    req.session.role = user.role;

}

function addUserRoutes(app){
    app.post('/api/register', processRegistrationRequest);
    app.post('/api/login', processLogin);
    app.get('/api/me', getAccountInfo);
    app.post('/api/logout', processLogout);
}

const processRegistrationRequest = async function(req, res){
    const {username, password} = readCredentials(req);
    const usernamePattern = /^[A-Za-z][A-Za-z0-9_]{2,19}$/

    if (!username || !password){
        return res.status(400).json({'error':'Username and password are required.'})
    }

    if(!usernamePattern.test(username)){
        return res.status(400).json({'error':'Username can only contain letters A-Z, a-z, digits 0-9 and underscore "_".' +
                ' The first character must be a letter. Username must be between 3 and 20 characters long.'});
    }

    if(password.length < 8 || password.length > 128){
        return res.status(400).json({'error': 'Invalid password. Password must be between 8 and 128 characters long.'});
    }


    const salt = crypto.randomBytes(16).toString('hex');
    const hashedPassword = hashPassword(username, password, salt);
    const newUser = {username, hashedPassword,salt, role:'user',createdAt: new Date()};
    let result ;
    try{
        result = await users.insertOne(newUser);
    }catch(err){
        if(err.code === 11000){
            return res.status(409).json({'error':'This username already exists. Please choose another username.'});
        }
        throw err;
    }

    newUser._id = result.insertedId;
    await startUserSession(req, newUser);

    return res.status(201).json({'ok': true,
                                'username': newUser.username,
                                'role': newUser.role});
}

const processLogin = async function (req,res){
    const {username, password}  = readCredentials(req);

    if(!username || !password){
        return res.status(400).json({'error':'Incorrect username or password'});
    }

    let user = await users.findOne({'username': username});

    // check if there is an account with the given username in the database.
    if (user === null){
        return res.status(401).json({'error': 'Incorrect username or password.'});
    }

    const hashedLoginPassword = hashPassword(username, password, user.salt);
    if(hashedLoginPassword !== user.hashedPassword){
        return res.status(401).json({'error': 'Incorrect username or password.'});
    }


    // Logged in: remove the old session id anre generate a new one.
    await startUserSession(req, user);
    return res.status(200).json({'ok':true,
                                'username':user.username,
                                'role':user.role});
}

const processLogout = function (req, res){
    req.session.destroy((err) => {
        if (err) {
            console.error('An error happened while removing an account session.', err.message);
            return res.status(500).json({'ok':false,
                                    'error': 'Something went wrong on our end. Please try again.'});
        }
        res.clearCookie('connect.sid');
        return res.status(200).json({'ok': true});
    });
}

const getAccountInfo = function (req,res){
    if(req.session.userId === null || req.session.userId === undefined){
        return res.status(200).json({'ok': false,
                                    'loggedIn': false,
                                    'error': 'Could not identify your account'});
    }
    return res.status(200).json({'ok': true,
                                'loggedIn': true,
                                'username': req.session.username,
                                'role': req.session.role});
}
                                




module.exports = {hashPassword, addUserRoutes, requireLogin, requireAdmin}
