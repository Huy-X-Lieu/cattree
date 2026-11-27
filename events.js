const {ObjectId} = require('mongodb');
const {events} = require('./db');

function addEventRoutes(app){
    app.get('/api/events', getUpcomingEvents);
    app.get('/api/events/:id', getEventById);

}

const getUpcomingEvents = async function(req,res){
    const upcomingEvents =  await events
        .find({'status':'on_sale'})
        .sort({date: 1})
        .toArray();
    return res.status(200).json(upcomingEvents);
}

const getEventById = async function (req, res) {
  const id = req.params.id;

  if (!ObjectId.isValid(id)) {
    return res.status(404).json({ 'error': 'Event not found.' });
  }

  const event = await events.findOne({ '_id': new ObjectId(id), 'status': 'on_sale' });

  if (event === null) {
    return res.status(404).json({ 'error': 'Event not found.' });
  }

  res.json(event);
}


module.exports = {addEventRoutes}
