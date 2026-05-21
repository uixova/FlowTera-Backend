const { Router } = require('express');
const authRoutes          = require('./modules/auth/auth.routes');
const userRoutes          = require('./modules/users/user.routes');
const teamRoutes          = require('./modules/teams/team.routes');
const expenseRoutes       = require('./modules/expenses/expense.routes');
const tripRoutes          = require('./modules/trips/trip.routes');
const planRoutes          = require('./modules/plans/plan.routes');
const archiveRoutes       = require('./modules/archive/archive.routes');
const logRoutes           = require('./modules/logs/log.routes');
const subscriptionRoutes  = require('./modules/subscriptions/subscription.routes');
const paymentRoutes       = require('./modules/payments/payment.routes');
const notificationRoutes  = require('./modules/notifications/notification.routes');
const requestRoutes       = require('./modules/requests/request.routes');

const mainRouter = Router();

mainRouter.use('/auth',          authRoutes);
mainRouter.use('/users',         userRoutes);
mainRouter.use('/teams',         teamRoutes);
mainRouter.use('/expenses',      expenseRoutes);
mainRouter.use('/trips',         tripRoutes);
mainRouter.use('/plans',         planRoutes);
mainRouter.use('/archive',       archiveRoutes);
mainRouter.use('/logs',          logRoutes);
mainRouter.use('/subscriptions', subscriptionRoutes);
mainRouter.use('/payments',      paymentRoutes);
mainRouter.use('/notifications', notificationRoutes);
mainRouter.use('/requests',      requestRoutes);

module.exports = mainRouter;
export {};