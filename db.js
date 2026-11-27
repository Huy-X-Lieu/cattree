const {MongoClient} = require('mongodb');

const client = new MongoClient('mongodb://127.0.0.1:27017/')
const db = client.db('cattree')

const users = db.collection('users');
const events = db.collection('events');
const sales = db.collection('sales');

async function connectDb(){
    await client.connect();
    console.log('Connected to mongodb')
}

async function closeDb(){
    await client.close()
}

module.exports = {users, events, sales, connectDb, closeDb};
