const {ObjectId} = require('mongodb');
const {requireLogin, requireAdmin} = require('./users');
const {events, users} = require('./db');

const readEventInfo = function(req){
    const title = String(req.body?.title || '').trim();
    const description = String(req.body?.description || '').trim();
    const venue = String(req.body?.venue || '').trim();
    const date = new Date(req.body?.date);

    const price = Number(req.body?.price);
    let priceCents;

    if(title.length === 0){
        return null;
    }

    if(description.length === 0){
        return null;
    }

    if(venue.length === 0){
        return null;
    }

    if(isNaN(date.getTime()) || date < new Date())
        return null;

    if(!Number.isFinite(price) || price < 0)
        return null;

    priceCents = Math.round(price * 100);
    
    return {title, description, venue, date, priceCents};
}



function addAdminRoutes(app){
    app.get('/api/admin/events', requireLogin, requireAdmin, getAllEvents)
    app.post('/api/admin/events', requireLogin, requireAdmin, addNewEvent);
    app.put('/api/admin/events/:id', requireLogin, requireAdmin, updateEvent);
    app.post('/api/admin/events/:id/cancel', requireLogin, requireAdmin, cancelEvent);
}

const getAllEvents = async function(req,res){
    const upcomingEvents = await events.find({})
                                    .sort({date: 1})
                                    .toArray();
    return res.status(200).json(upcomingEvents);
}

const addNewEvent = async function(req,res){
    const info = readEventInfo(req);
    const capacity = Number(req.body?.capacity);
    if(!info || !Number.isInteger(capacity) || capacity < 1 || capacity > 1000)
        return res.status(400).json({'error':`Missing event's information. Please provide the event's full information.`});

    const {title, description, venue, date, priceCents } = info;

   
    const adminId = new ObjectId(req.session.userId);
    const createdAt = new Date();

    const result = await events.insertOne({title, description, venue,
                                         date, capacity, 'seatsLeft': capacity,
                                         priceCents, 'status': 'on_sale', 'createdBy': adminId,
                                         createdAt});

    return res.status(200).json({'eventId': result.insertedId});
}

const updateEvent = async function(req,res) {
    if (!ObjectId.isValid(req.params?.id)) {
        return res.status(400).json({'error': 'Invalid eventId'});
    }

    const info = readEventInfo(req);
    if(!info)
        return res.status(400).json({'error': `Missing event information. Please provide the event's full information.`});

    const result = await events.updateOne({'_id': new ObjectId(req.params.id), 'status':'on_sale'}, {'$set': info});

    if(result.matchedCount !== 1)
        return res.status(404).json({'error':'Event not found'})

    return res.status(200).json({'ok': true});

}

const cancelEvent = async function(req,res) {
    if(!ObjectId.isValid(req.params?.id)){
        return res.status(404).json({'error':'Invalid EventId'});
    }

    const result = await events.updateOne({'_id': new ObjectId(req.params.id)}, {'$set':{'status':'cancelled'}});

    if(result.matchedCount === 0)
        return res.status(404).json({'error': 'Event not found'});

    return res.status(200).json({'ok': true});
}



module.exports = {addAdminRoutes}
