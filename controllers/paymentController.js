const BigPromise = require("../middlewares/bigPromise");
const stripe = require('stripe')(process.env.STRIPE_SECRET);

exports.sendStripeKey = BigPromise(async(req, res, next) => {
    res.status(200).json({
        success: true,
        stripeKey: process.env.STRIPE_API_KEY
    })
});

exports.captureStripePayment = BigPromise(async(req, res, next) => {
    const paymentIntent = await stripe.paymentIntents.create({
        amount: req.body.amount,
        currency: 'inr',

        // optional
        metadata: {integration_check: 'accept_a_payment'}
    });

    res.status(200).json({
        success: true,
        amount: req.body.amount,
        client_secret: paymentIntent.client_secret,
        // optionally we can send id also
    })
});

exports.sendRazorpayKey = BigPromise(async(req, res, next) => {
    res.status(200).json({
        success: true,
        stripeKey: process.env.RAZORPAY_API_KEY
    })
});

exports.captureRazorpayPayment = BigPromise(async(req, res, next) => {
    var instance = new Razorpay({ 
        key_id: RAZORPAY_API_KEY, 
        key_secret: RAZORPAY_SECRET_KEY 
    })

    var options = {
        amount: req.body.amount,
        currency: "INR",
    }

    const myOrder = await instance.orders.create(options)

    res.status(200).json({
        success: true,
        amount: req.body.amount,
        order: myOrder
    })

});