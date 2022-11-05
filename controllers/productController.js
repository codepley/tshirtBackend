const Product = require('../models/product');
const BigPromise = require('../middlewares/bigPromise');
const CustomError = require('../utils/customError');
const cloudinary = require('cloudinary');
const WhereClause = require('../utils/whereClause');

exports.addProduct = BigPromise(async(req, res, next) => {
    // images
    const imageArray = []

    if(!req.files){
        return next(new CustomError('Images are required', 401));
    }

    if(req.files){
        for (let index = 0; index < req.files.photos.length; index++) {
            let result = await cloudinary.v2.uploader.upload(req.files.photos[index].tempFilePath, {
                folder: 'products' 
            });

            imageArray.push({
                id: result.public_id,
                secure_url: result.secure_url
            })
        }
    }

    req.body.photos = imageArray;
    req.body.user = req.user.id;

    const product = await Product.create(req.body);

    res.status(200).json({
        success: true,
        product
    })
});

exports.getAllProduct = BigPromise(async(req, res, next) => {
    const resultPerPage = 6;
    const totalCountProduct = await Product.countDocuments();

    const productsObj = new WhereClause(Product.find(), req.query).search().filter();
    let products = await productsObj.base
    const filteredProductNumber = products.length;

    productsObj.pager(resultPerPage);
    products = await productsObj.base.clone();

    res.status(200).json({
        success: true,
        products,
        filteredProductNumber,
        totalCountProduct
    })
});

exports.getOneProduct = BigPromise(async(req, res, next) => {
    const product = await Product.findById(req.params.id);

    if(!product){
        next(new CustomError('Invalid Product Id', 400));
    }

    res.status(200).json({
        success: true,
        product
    })
});

exports.addReview = BigPromise(async(req, res, next) => {
    const { rating, comment, productId } = req.body;

    const review = {
        user: req.user._id,
        name: req.user.name,
        rating: Number(rating),
        comment
    }

    const product = await Product.findById(productId);

    const alreadyReviewed = product.review.find((rev) => {
        rev.user.toString() === req.user._id.toString();
    })

    if(alreadyReviewed){
        product.reviews.forEach((review) => {
            if(review.user.toString() === req.user._id.toString()){
                review.comment = comment;
                review.rating = rating;
            }
        });
    } else {
        product.reviews.push(review);
        product.numberOfReviews = product.reviews.length
    }

    // adjust rating
    product.ratings = product.reviews.reduce((acc, item) => item.rating + acc, 0) / products.review.length;

    // save
    await product.save({validateBeforeSave: false})

    res.status(200).json({
        success: true,
    })

});

exports.deleteReview = BigPromise(async(req, res, next) => {
    const { productId } = req.body;

    const product = await Product.findById(productId);

    const reviews = product.reviews.filter(
        (rev) => rev.user.toString() === req.user._id.toString()
    )

    const numberOfReviews = reviews.length

    // adjust rating
    product.ratings = product.reviews.reduce((acc, item) => item.rating + acc, 0) / products.review.length;

    // save
    await Product.findByIdAndUpdate(
        productId,
        {
            reviews,
            ratings,
            numberOfReviews
        },
        {
            new: true,
            runValidators: true,
            useFindAndModify: false
        }
    )

    res.status(200).json({
        success: true,
    })

});

exports.getOnlyReviewForOneProduct = BigPromise(async(req, res, next) => {
    const product = await Product.findById(req.query.productId);

    res.status(200).json({
        success: true,
        reviews: product.reviews,
    })
});


// admin only controllers
exports.adminGetAllProduct = BigPromise(async(req, res, next) => {
    const products = await Product.find();

    res.status(200).json({
        success: true,
        products
    })
});

exports.adminUpdateOneProduct = BigPromise(async(req, res, next) => {
    let product = await Product.findById(req.params.id);

    if(!product){
        next(new CustomError('Invalid Product Id', 400));
    }

    let imagesArray = [];

    if(req.files){
        // destroy existing images
        for (let index = 0; index < product.photos.length; index++) {
            const result = await cloudinary.v2.uploader.destroy(product.photos[index].id);
        }

        // add new images
        for (let index = 0; index < req.files.photos.length; index++) {
            const result = await cloudinary.v2.uploader.upload(req.files.photos[index].tempFilePath, {
                folder: 'products'
            });            

            imagesArray.push({
                id: result.public_id,
                secure_url: result.secure_url
            })
        }

        req.body.photos = imagesArray;
    }


    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
        useFindAndModify: false
    })

    res.status(200).json({
        success: true,
        product
    })
});

exports.adminDeleteOneProduct = BigPromise(async(req, res, next) => {
    const product = await Product.findById(req.params.id);

    if(!product){
        next(new CustomError('Invalid Product Id', 400));
    }

    for (let index = 0; index < product.photos.length; index++) {
        await cloudinary.v2.uploader.destroy(product.photos[index].id);
    }

    await product.remove();

    res.status(200).json({
        success: true,
        message: "Product deleted successfully"
    })
});