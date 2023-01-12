const express = require('express');
const bodyParser = require('body-parser');

const stripe = require('stripe')(
  'sk_test_51M75tkHYPl3GVlyhFSyAQkUHLRM83PEpes3jrN1rJn6kmMP69bhjfv2Y6oQJ7yLY9V3jmQUQFeX569THoaHelyVt00lGXsdUrI'
);
const domain = 'http://localhost:8080';

const app = express();
app.use('/webhooks', express.raw({ type: 'application/json' }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.set('view engine', 'ejs');
const pk =
  'pk_test_51M75tkHYPl3GVlyhICcqKxtwQxGEE6Tyzbpp3y66kq1QKsHekfgIaBBdREyNsbeL7kEAocTTCbn9uI4oQEUdwQGU00mwHD2G0x';
const sk =
  'sk_test_51M75tkHYPl3GVlyhFSyAQkUHLRM83PEpes3jrN1rJn6kmMP69bhjfv2Y6oQJ7yLY9V3jmQUQFeX569THoaHelyVt00lGXsdUrI';

console.log('listening');
app.get('/', (req: Request, res: any) => {
  res.render('home', {
    key: pk,
  });
});

// app.post('/checkout.stripe.com/v2/checkout.js')

app.post('/payment', (req: any, res: any) => {
  stripe.customers
    .create({
      email: req.body.stripeEmail,
      source: req.body.stripeToken,
      name: 'Sarmad',
      //   address: {
      //     line1: 'TC 9/4 Old MES colony',
      //     postal_code: '110092',
      //     city: 'New Islambad',
      //     state: 'Islambad',
      //     country: 'Pakistan',
      //   },
    })
    .then((customer: any) => {
      console.log(customer);
      return stripe.charges.create({
        amount: 10000000,
        description: 'Web Development Product',
        currency: 'pkr',
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

app.post('/addProduct', (req: any, res: any, next: any) => {
  console.log(req.body.name);
  stripe.products
    .create({
      name: req.body.name,
      default_price_data: {
        // unit_amount: 1000,
        // currency: 'usd',
        // recurring: { interval: 'month' },
      },
      expand: ['default_price'],
    })
    .then((product: any) => {
      console.log(product);
      //   prod_N9F7TaQjZfvE8m

      stripe.plans.create({
        amount: 1000,
        currency: 'usd',
        interval: 'month',
        product: product.id,
      });
    });
});

/////// Adding Payment Method

app.post('/paymentMethod', async (req: any, res: any, next: any) => {
  const paymentMethod = await stripe.paymentMethods.create({
    type: 'card',
    card: {
      number: '4242424242424242',
      exp_month: 8,
      exp_year: 2023,
      cvc: '314',
    },
  });
  console.log(paymentMethod);
});

/// Adding Payment Method to CUSTOMER
app.post('/addPM', async (req: any, res: any, next: any) => {
  try {
    const paymentMethod = await stripe.paymentMethods.attach(
      'pm_1MOz5SHYPl3GVlyhaJxpI60E',
      { customer: 'cus_N8aeQi1ifXNsAA' }
    );
    console.log(paymentMethod);
  } catch (err) {
    console.log(err);
  }
});

//creating PAYMENT-INTENT
app.post('/payment-intent', async (req: any, res: any, next: any) => {
  try {
    const customerId = req.body.customerId;
    const planId = req.body.planId;

    // const paymentMethod = await stripe.customers.retrievePaymentMethod(
    //   customerId,
    //   'pm_1MOz5SHYPl3GVlyhaJxpI60E'
    // );

    const plan = await stripe.plans.retrieve(planId);
    const customer = await stripe.customers.retrieve(customerId);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: plan.amount,
      currency: plan.currency,
      payment_method_types: ['card'],
      customer: customer.id,
      //   payment_method: paymentMethod,
      payment_method: 'pm_1MOz5SHYPl3GVlyhaJxpI60E',
    });
    console.log(paymentIntent.id);
    const paymentIntentConfirm = await stripe.paymentIntents.confirm(
      paymentIntent.id,
      { payment_method: 'pm_card_visa' }
    );
    console.log(paymentIntentConfirm);
  } catch (err) {
    console.log('failed');
    console.log(err);
  }
});

//Retreive Customer Information
app.get('/customer', async (req: any, res: any) => {
  const customer = await stripe.customers.retrieve('cus_N8aeQi1ifXNsAA');
  console.log(customer);
});

// Retreive Customer payment method
app.get('/cp', async (req: any, res: any) => {
  const paymentMethod = await stripe.customers.retrievePaymentMethod(
    'cus_N8aeQi1ifXNsAA',
    'pm_1MOz5SHYPl3GVlyhaJxpI60E'
  );
  console.log(paymentMethod);
});

// List of all products
app.get('/products', (req: any, res: any, next: any) => {
  stripe.products
    .list({
      limit: 3,
    })
    .then((products: any) => {
      console.log(products);
    });
});

//CHECK-OUT SESSION

app.post('/create-checkout-session', async (req: any, res: any) => {
  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price: 'price_1MONgFHYPl3GVlyhFlfJRP0K',
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${domain}/success.html`,

    cancel_url: `${domain}/cancel.html`,
  });

  res.redirect(303, session.url);
});

//WEBHOOKS
const endpointSecret = 'whsec_51YlJ41SOieIqohyoPSK251w3BlAY9b7';

app.post(
  '/webhooks',
  express.raw({ type: 'application/json' }),
  (request: any, response: any) => {
    const sig = request.headers['stripe-signature'];
    console.log(sig);
    console.log(request.body);

    let event;

    try {
      event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
    } catch (err) {
      console.log('event failed');
      response.status(400).send(`Webhook Error:`);
      //   ${err.message}
      return;
    }

    let session = '';
    // Handle the event
    switch (event.type) {
      case 'checkout.session.async_payment_failed':
        session = event.data.object;
        console.log(session);
        console.log('failed');

        // Then define and call a function to handle the event checkout.session.async_payment_failed
        break;
      case 'checkout.session.completed':
        session = event.data.object;
        console.log(session);
        console.log('completed');

        // Then define and call a function to handle the event checkout.session.completed
        break;
      // ... handle other event types
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    response.send();
  }
);

app.listen(8080);
