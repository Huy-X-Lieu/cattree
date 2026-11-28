const {sales, events} = require('./db');
const {ObjectId} = require('mongodb');
const {requireLogin} = require('./users');

const HOLD_SECONDS = Number(process.env.HOLD_SECONDS) || 300;
const SWEEP_MS = 10000;

async function giveSeatBack(sale, newStatus) {
    const result = await sales.updateOne(
        {'_id': sale._id, 'status':'held'},
        {'$set': {'status': newStatus, 'endedAt': new Date()}}
    );

    if(result.modifiedCount === 0)
        return false;

    await events.updateOne({'_id':sale.eventId},{'$inc':{'seatsLeft':1}});
    return true;
}

function startSweeper(){

}

function addSaleRoutes(app){
    app.post('/api/events/:id/hold', requireLogin, holdSeat);
    app.get('/api/sales/:id', requireLogin, getSale);
    app.post('/api/sales/:id/confirm', requireLogin, confirmSale);
    app.post('/api/sales/:id/release', requireLogin, releaseHeldSeat);
}

const holdSeat = async function(req,res){
    if(!ObjectId.isValid(req.params?.id)){
        return res.status(404).json({'error':'Event not found'});
    }

    const eventId = new ObjectId(req.params.id);
    const userId = new ObjectId(req.session.userId);

    const theEvent = await events.findOne({'_id':eventId});
    if (theEvent === null || theEvent.status !== 'on_sale'){
        return res.status(404).json({'error':'Event not found.'})
    }

    // Check if the user is holding a seat for the event
    const heldSeat = await sales.findOne({'eventId': eventId, 'userId': userId, 'status':'held'});

    if(heldSeat !== null)
        return res.status(409).json({'error': 'You are already holding a seat.',
                                    'saleId': heldSeat._id});

    // hold a seat
    const result = await events.updateOne(
        {'_id': eventId, 'status': 'on_sale', 'seatsLeft':{'$gt': 0}},
        {'$inc': {'seatsLeft': -1}}
    );

    // response with a 409 error if there are no available seats
    if(result.modifiedCount === 0){
        return res.status(409).json({'error':'Sorry, All seat are either sold out or being held.'});
    }

    const now = new Date();
    let sale; 
    try{
        sale = await sales.insertOne(
            {eventId,
                userId,
                'status': 'held',
                'priceCents': theEvent.priceCents,
                expiresAt: new Date(now.getTime() + HOLD_SECONDS * 1000),
                createdAt: now
            });
    }catch(err){
        await events.updateOne(
            {'_id': eventId},
            {'$inc':{'seatsLeft': 1}}
        );
        throw err;
    }

    
    return res.status(200).json({'saleId': sale.insertedId});
}

const getSale = async function(req, res){
    if(!ObjectId.isValid(req.params?.id)){
        return res.status(404).json({'error':'Hold not found'});
    }

    const saleId = new ObjectId(req.params?.id);
    const userId = new ObjectId(req.session.userId);
    const sale = await sales.findOne({'_id': saleId, 'userId': userId});

    if(!sale){
        return res.status(404).json({'error':'Hold not found.'});
    }

    
    const theEvent = await events.findOne({'_id':sale.eventId});
    if(!theEvent) {
        return res.status(404).json({'error': 'Hold not found'});
    }
    
    const timeLeft = Math.max(0, Math.round((sale.expiresAt - new Date()) / 1000));
    

    return res.status(200).json(
        {'status': sale.status,
            'secondsLeft': timeLeft,
            'priceCents': sale.priceCents,
            'event':
            { _id: theEvent._id,
                title: theEvent.title,
                venue: theEvent.venue,
                date: theEvent.date
            }
        });

}

const confirmSale = async function (req, res) {
    if (!ObjectId.isValid(req.params?.id)) {
        return res.status(404).json({'error': 'Hold not found.'});
    }

    const saleId = new ObjectId(req.params.id);
    const userId = new ObjectId(req.session.userId);

    const paymentRef = 'CATSH-' + Math.round(Math.random() * 1000000);
    const result = await sales.updateOne(
        {'_id': saleId, 'userId': userId, 'status': 'held', expiresAt: {'$gt': new Date()}},
        {'$set': {'status': 'confirmed', 'paymentRef': paymentRef, confirmedAt: new Date()}});

    if(result.modifiedCount === 1){
        return res.status(200).json({'paymentRef': paymentRef});
    }

    const sale = await sales.findOne({'_id': saleId, 'userId': userId});

    if (!sale) {
        return res.status(404).json({'error': 'Hold not found'});
    }

    if (sale.status === 'confirmed') {
        return res.status(409).json({'error': 'Already confirmed.'});
    }

    return res.status(410).json({'error': 'This hold has expired or was released.'})

}

const releaseHeldSeat = async function(req, res){
    if(!ObjectId.isValid(req.params.id)){
        return res.status(404).json({'error': 'Hold not found.'});
    }

    const saleId = new ObjectId(req.params.id);
    const userId = new ObjectId(req.session.userId);

    const sale = await sales.findOne({'_id':saleId, 'userId': userId});

    if(!sale){
        return res.status(404).json({'error': 'Hold not found.'});
    }

    const ok = await giveSeatBack(sale, 'released');

    if(ok){
        return res.status(200).json({'ok': true});
    }

    const freshSale = await sales.findOne({'_id':saleId, 'userId':userId});

    if(freshSale.status === 'released'){
        return res.status(200).json({'ok':true});
    }

    return res.status(409).json({'error': "This hold can no longer be released."})
}




module.exports = {addSaleRoutes, startSweeper}


