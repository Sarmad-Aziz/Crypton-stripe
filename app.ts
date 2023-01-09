const express = require('express');
const bodyParser = require('body-parser');

const stripe = require('stripe')();

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.set('view engine', 'ejs');
const pk = 'pk';
const sk = 'sk';

console.log('listening');
app.get('/', (req: Request, res: any) => {
  res.render('home', {
    key: pk,
  });
});

app.post('/payment', (req: any, res: any) => {
  stripe.customers
    .create({
      email: req.body.stripeEmail,
      source: req.body.stripeToken,
      name: 'Sarmad',
      address: {
        line1: 'TC 9/4 Old MES colony',
        postal_code: '110092',
        city: 'New Islambad',
        state: 'Islambad',
        country: 'Pakistan',
      },
    })
    .then((customer: any) => {
      return stripe.charges.create({
        amount: 7000,
        description: 'Web Development Product',
        currency: 'USD',
        customer: customer.id,
      });
    })
    .then((charge: any) => {
      res.send('Success');
    })
    .catch((err: any) => {
      res.send(err);
    });
});

app.listen(8080);
