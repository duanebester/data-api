const { app, sequelize } = require('./app');

app.listen({ port: 8080 }, () => {
    try {
        sequelize.authenticate();
        sequelize.sync({ alter: true });
        console.log('Connected to db');
    } catch (error) {
        console.log('Failed to connect to db', error);
    }
    console.log('Server started');
})