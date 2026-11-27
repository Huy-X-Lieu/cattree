const {requireLogin, requireAdmin} = require('./users');
const {events} = require('./db');

function addAdminRoutes(app){

    app.get('/api/admin/events', requireLogin, requireAdmin, getAllEvents)
}

const getAllEvents = async function(req,res){
    const currentTime = new Date();
    const upcomingEvents = await events.find({})
                                    .sort({date: 1})
                                    .toArray();
    return res.status(200).json(upcomingEvents);
}

module.exports = {addAdminRoutes}
