const {users, events} = require ('./db');
const crypto = require('crypto');
const {hashPassword} = require('./users');

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


async function seedDemoUsers(){
    // Hash user passwords before inserting accounts into the database
    const userList = demoUsers.map(({username, password,role}) => {
        const salt = crypto.randomBytes(16).toString('hex');
        const hashedPassword = hashPassword(username, password, salt);
        
        return {username, hashedPassword, salt, role,createdAt: new Date()};
    });

    await users.insertMany(userList);
}

async function seedDemoEvents(){
    const admin = await users.findOne({'username': 'admin'});
    const adminId = admin._id;
    const DAY_MS = 24 * 60 * 60 * 1000;
    const aWeekFromNow = Date.now() + 7 * DAY_MS;

    const demoEvents = [
        {
            'title': 'Wildcats vs. Sun Devils Watch Party',
            'description': 'Big screen, free popcorn, and the loudest crowd in Tucson.',
            'venue': 'Student Union Grand Ballroom',
            'date': new Date(aWeekFromNow),
            'capacity': 50,
            'seatsLeft': 50,
            'priceCents': 1500,
            'status': 'on_sale',
            'createdBy': adminId,
            'createdAt': new Date()
        },
        {
            'title': 'Wilbur\'s Winter Concert',
            'description': 'The UA Pride of Arizona band plays holiday favorites.',
            'venue': 'Centennial Hall',
            'date': new Date(aWeekFromNow + 1 * DAY_MS),
            'capacity': 20,
            'seatsLeft': 20,
            'priceCents': 2500,
            'status': 'on_sale',
            'createdBy': adminId,
            'createdAt': new Date()
        },
        {
            // The race-test event: only 1 seat, so alice and bob can fight over it.
            'title': 'Front-Row Seat: Wildcats Basketball',
            'description': 'One courtside seat. First to hold it wins.',
            'venue': 'McKale Center',
            'date': new Date(aWeekFromNow + 2 * DAY_MS),
            'capacity': 1,
            'seatsLeft': 1,
            'priceCents': 9900,
            'status': 'on_sale',
            'createdBy': adminId,
            'createdAt': new Date()
        }
    ]

    await events.insertMany(demoEvents);
}


async function seedIfEmpty(){
    //Configure the user collection to allow only unique documents
    //No multiple accounts can have the same username
    await users.createIndex({username:1}, {unique:true});

    const anyUser = await users.findOne({});
    const anyEvent = await events.findOne({});

    if (anyUser === null && anyEvent === null){
        await seedDemoUsers();
        await seedDemoEvents();
        console.log('Seed demo data');
    }
}

module.exports = {seedIfEmpty}
