const {requireLogin, requireAdmin} = require('./users');

function addAdminRoutes(app){

    app.get('/api/admin/events', requireLogin, requireAdmin, (req,res) => res.json([]))
}

modules.exports = {addAdminRoutes}
