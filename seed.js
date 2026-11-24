const {users, events, connecDb, closeDb} = require ('./db');
const crypto = require('crypto');
const {hashPassword} = require('./user');

const demoUsers = [
  { username: "admin",   password: "admin123",   role: "admin" },
  { username: "alice",   password: "alice123",   role: "user" },
  { username: "bob",     password: "bob123",     role: "user" },
  { username: "carol",   password: "carol123",   role: "admin" },
  { username: "dave",    password: "dave123",    role: "user" },
  { username: "eve",     password: "eve123",     role: "user" },
  { username: "frank",   password: "frank123",   role: "user" },
  { username: "grace",   password: "grace123",   role: "user" },
  { username: "heidi",   password: "heidi123",   role: "user" },
  { username: "ivan",    password: "ivan123",    role: "user" },
  { username: "judy",    password: "judy123",    role: "user" },
  { username: "mallory", password: "mallory123", role: "admin" },
  { username: "niaj",    password: "niaj123",    role: "user" },
  { username: "olivia",  password: "olivia123",  role: "user" },
  { username: "peggy",   password: "peggy123",   role: "user" },
  { username: "rupert",  password: "rupert123",  role: "user" },
  { username: "sybil",   password: "sybil123",   role: "user" },
  { username: "trent",   password: "trent123",   role: "user" },
  { username: "victor",  password: "victor123",  role: "user" },
  { username: "walter",  password: "walter123",  role: "user" },
];

async function seedDemoData(){
    //Configure the user collection to allow only unique documents
    //No multiple accounts can have the same username
    await users.createIndex({username:1}, {unique:true});

    // Hash user passwords before inserting accounts into the database
    const userList = demoUsers.map(({username, password,role}) => {
        const salt = crypto.randomBytes(16).toString('hex');
        const hashedPassword = hashPassword(username, password, salt);
        
        return {username, hashedPassword, salt, role};
    });

    await users.insertMany(userList);
}

async function seedIfEmpty(){
    const anyUser = await users.findOne({});
    const anyEvent = await events.findOne({});

    if (anyUser === null && anyEvent === null){
        await seedDemoData();
        console.log('Seed demo data');
    }
}

module.exports = {seedDemoData, seedIfEmpty}
