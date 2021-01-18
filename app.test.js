const request = require('supertest');
const crypto = require('crypto');
const { app, sequelize } = require('./app');

describe('GET /data', async () => {
  beforeAll(async () => {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
  })
  
  it('responds with json with key', async (done) => {
    request(app)
      .get('/data?key=12345')
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .expect(200)
      .end((err, resp) => {
        if(err) return done(err);
        expect(resp.text).toEqual('[]');
        return done();
      })
  });

  it('responds with 403 without key', async (done) => {
    request(app)
      .get('/data')
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .expect(403)
      .end((err, resp) => {
        if(err) return done(err);
        expect(resp.text).toEqual('Bad API Key');
        return done();
      })
  });

  it('responds with 403 with a bad API key', async (done) => {
    request(app)
      .get('/data?key=12346')
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .expect(403)
      .end((err, resp) => {
        if(err) return done(err);
        expect(resp.text).toEqual('Bad API Key');
        return done();
      })
  });
});

describe('POST /data', async () => {
  beforeAll(async () => {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
  });

  it('create data with key and hmac', (done) => {
    let data = {
      name: "Breakroom",
      serial: "001",
      temperature: 72.02
    };
    let dataString = JSON.stringify(data);
    let hmac = crypto.createHmac('sha1', 'cupcakes')
      .update(dataString)
      .digest('hex');

    request(app)
      .post('/data?key=12345')
      .set('Content-Type', 'application/json')
      .set('hmac', hmac)
      .send(data)
      .expect(201, done);
  });

  it('return 403 without a key', (done) => {
    let data = {
      name: "Breakroom",
      serial: "001",
      temperature: 72.02
    };
    let dataString = JSON.stringify(data);
    let hmac = crypto.createHmac('sha1', 'cupcakes')
      .update(dataString)
      .digest('hex');

    request(app)
      .post('/data')
      .set('Content-Type', 'application/json')
      .set('hmac', hmac)
      .send(data)
      .expect(403, done);
  });

  it('return 403 without hmac header', (done) => {
    let data = {
      name: "Breakroom",
      serial: "001",
      temperature: 72.02
    };

    request(app)
      .post('/data?key=12345')
      .set('Content-Type', 'application/json')
      .send(data)
      .expect(403, done);
  });
});