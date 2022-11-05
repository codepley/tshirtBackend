const User = require('../models/user');
const BigPromise = require('../middlewares/bigPromise');
const CustomError = require('../utils/customError');
const cookieToken = require('../utils/cookieToken');
const cloudinary = require('cloudinary');
const mailHelper = require('../utils/emailHelper');
const crypto = require('crypto');

exports.signup = BigPromise(async(req, res, next) => {
    // let result;

    if(!req.files){
        return next(new CustomError('photo is required for signup', 400))
    }

    const { name, email, password } = req.body;

    if(!email || !name || !password) {
        return next(new CustomError('Name, Email and Password are required', 400));
    }

    let file = req.files.photo;

    const result = await cloudinary.v2.uploader.upload(file.tempFilePath, {
        folder: 'users',
        width: 150,
        crop: 'scale'
    })

    const user = await User.create({
        name,
        email,
        password,
        photo: {
            id: result.public_id,
            secure_url: result.secure_url
        }
    })
    
    cookieToken(user, res);
});

exports.login = BigPromise(async(req, res, next) => {
    const {email, password} = req.body;

    // check for presence of email and password
    if(!email || !password){
        return next(new CustomError('please provide email and password', 400));
    }

    const user = await User.findOne({email}).select('+password');

    // check if user data is present in DB
    if(!user){
        return next(new CustomError('Email or Password does not match!', 400));
    }

    // Validate the password with stored password
    const isPasswordCorrect = await user.isValidPassword(password);

    // if password do not match
    if(!isPasswordCorrect){
        return next(new CustomError('Email or Password does not match!', 400));
    }

    // if all goes good we send the token
    cookieToken(user, res);

} );

exports.logout = BigPromise(async(req, res, next) => {
    res.cookie('token', null, {
        expires: new Date(Date.now()),
        httpOnly: true
    })

    res.status(200).json({
        success: true,
        message: "Logout Success"
    });
});

exports.forgotPassword = BigPromise(async(req, res, next) => {
    const {email} = req.body;

    const user = await User.findOne({email});

    if(!user){
        return next(new CustomError('You are not registered', 400));
    }

    const forgotToken = await user.getForgotPasswordToken();

    await user.save({validateBeforeSave: false});

    const myUrl = `${req.protocol}://${req.get("host")}/api/v1/password/reset/${forgotToken}`;

    const message = `Copy paste this link in your URL and hit enter \n\n ${myUrl}`;

    try {
        await mailHelper({
            email: user.email,
            message,
            subject: 'T-Store - Reset Your Password'
        });

        res.status(200).json({
            success: true,
            message: 'Email sent successfully'
        })
        console.log("from try block:- " + user.forgotPasswordExpiry);
    } catch (error) {
        user.forgotPasswordToken = undefined;
        user.forgotPasswordExpiry = undefined;
        await user.save({validateBeforeSave: false});

        return next(new CustomError(error.message, 500));
    }

});

exports.passwordReset = BigPromise(async(req, res, next) => {
    const token = req.params.token;

    const encryToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
        encryToken, 
        forgotPasswordExpiry: {$gt: Date.now()}
    });

    console.log(user);

    if(!user){
        return next(new CustomError('Token is invalid or expired', 400))
    }

    if(req.body.password !== req.body.confirmPassword){
        return next(new CustomError('Password and confirm password does not match', 400))
    }

    user.password = req.body.password;
    
    user.forgotPasswordToken = undefined
    user.forgotPasswordExpiry = undefined

    await user.save();

    // send a json response or send token
    cookieToken(user, res);

});

exports.getLoggedInUserDetails = BigPromise(async(req, res, next) => {
    const user = await User.findById(req.user.id);
    // console.log(req.user)

    res.status(200).json({
        success: true,
        user
    })
});

exports.changePassword = BigPromise(async(req, res, next) => {
    const {oldPassword, newPassword} = req.body;

    const userId = req.user.id;

    const user = await User.findById(userId).select('+password');

    const isCorrectOldPassword = user.isValidPassword(oldPassword);

    if(!isCorrectOldPassword){
        return next(new CustomError('Incorrect Old Password', 400));
    }

    user.password = newPassword;

    await user.save()

    cookieToken(user, res);

});

exports.updateUserDetails = BigPromise(async(req, res, next) => {
    const newUser = {
        name: req.body.name,
        email: req.body.email
    };

    if(req.files){
        const user = await User.findById(req.user.id);

        const imageId = user.photo.id;
        const resp = await cloudinary.v2.uploader.destroy(imageId);

        const result = await cloudinary.v2.uploader.upload(req.files.photo.tempFilePath, {
            folder: 'users',
            width: 150,
            crop: 'scale'
        })

        newData.photo = {
            id: result.public_id,
            secure_url: result.secure_url
        }
    }


    const user = await User.findByIdAndUpdate(req.user.id, newUser, {
        new: true,
        runValidators: true,
        useFindAndModify: false
    });

    res.status(200).json({
        success: true,
    });
});

exports.adminAllUser = BigPromise(async(req, res, next) => {
    const users = await User.find();

    res.status(200).json({
        success: true,
        users
    })
});

exports.adminUpdateOneUserDetails = BigPromise(async(req, res, next) => {
    const newUser = {
        name: req.body.name,
        email: req.body.email,
        role: req.body.role
    };

    const user = await User.findByIdAndUpdate(req.params.id, newUser, {
        new: true,
        runValidators: true,
        useFindAndModify: false
    });

    res.status(200).json({
        success: true,
        user
    });
});

exports.adminDeleteOneUser = BigPromise(async(req, res, next) => {
    const user = User.findById(req.params.id);

    if(!user){
        return next(new CustomError('User does not exist', 401));
    }

    const imageId = user.photo.id;
    await cloudinary.v2.uploader.destroy(imageId);
    await user.remove();

    res.status(200).json({
        success: true,
        message: 'User Deleted'
    })
});



exports.adminGetOneUser = BigPromise(async(req, res, next) => {
    const user = await User.findById(req.params.id);

    if(!user){
        next(new CustomError('No user found', 400));
    }

    res.status(200).json({
        success: true,
        user
    })
});

exports.managerAllUser = BigPromise(async(req, res, next) => {
    const users = await User.find({role: 'user'});

    res.status(200).json({
        success: true,
        users
    })
});
