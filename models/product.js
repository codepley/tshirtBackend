const mongoose = require('mongoose');

const productSchema = mongoose.Schema({
    name: {
        type: String,
        required: [true, 'please provide product name'],
        trim: true,
        maxlength: [120, 'product name should be less than 120 characters']
    },
    price: {
        type: Number,
        required: [true, 'please provide product price'],
        maxlength: [5, 'product price should be less than 5 digits']
    },
    description: {
        type: String,
        required: [true, 'please provide product description'],
    },
    photos: [
        {
            id: {
                type: String,
                required: true
            },
            secure_url: {
                type: String,
                required: true
            }
        }
    ],
    category: {
        type: String,
        required: [true, 'please select categories from - short-sleeves, long-sleeves, sweat-shirts, hoodies'],
        enum: {
            values: ['shortsleeves','longsleeves','sweatshirt','hoodies'],
            message: 'please select categories from only - short-sleeves, long-sleeves, sweat-shirts, hoodies'
        }
    },
    stock: {
        type: Number,
        required: [true, 'please add a number in stock']
    },
    brand: {
        type: String,
        required: [true, 'please provide a brand'],
    },
    ratings: {
        type: Number,
        default: 0
    },
    numberOfReviews: {
        type: Number,
        default: 0
    },
    reviews: [
        {
            user: {
                type: mongoose.Schema.ObjectId,
                ref: 'User',
                required: true
            },
            name: {
                type: String,
                required: true
            },
            rating: {
                type: Number,
                required: true
            },
            comment: {
                type: String,
                required: true
            }
        }
    ],
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Product', productSchema);