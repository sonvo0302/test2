const express = require('express')
const User = require('../models/user')
const router = express.Router()
const auth = require('../middleware/auth')
const bcrypt = require('bcryptjs')

router.post('/register', async (req, res) => {
    // Create a new user
    try {
        const user = new User(req.body)
        await user.save()
        const token = await user.generateAuthToken()
        res.status(201).send({ token: token, user: user })
    } catch (error) {
        res.status(400).json(error)
    }
})
router.get('/user', auth, async (req, res) => {
    res.send('Hello')
})

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body
        const user = await User.findByCredentials(email, password)
        if (!user) {
            return res.status(401).send({ error: 'Login failed! Check authentication credentials' })
        }
        const token = await user.generateAuthToken()
        res.status(200).json({
            token: token,
            user: user
        })
    } catch (error) {
        res.status(400).json(error)
    }
})

router.post('/logout', auth, async (req, res) => {
    try {
        const id = req.user._id
        console.log(id);
        User.findById(id, function (err, user) {
            if (err) throw err;
            const condition = { _id: user._id }
            const dataForUpdate = { token: null }
            User.findOneAndUpdate(condition, dataForUpdate, { new: true }).exec().then((result) => {
                res.status(200).json({
                    message: 'Logout successfully'
                })
            })
        })
    } catch (error) {
        res.status(500).json({ error: err });
    }
})
router.put('/update/:id', auth, async (req, res) => {
    const id = req.params.id;
    User.findById(id, async function (err, user) {

        bcrypt.compare(req.body.currentPassword, user.password, (err, isMatch) => {
            if (isMatch) {
                if (req.body.new_password.length <= 7 || req.body.new_password <= 50) {
                    res.status(401).json({
                        message: 'Password must be more then 7 characters '
                    })
                } else {
                    bcrypt.hash(req.body.new_password, 8, (error, hash) => {
                        if (error) throw error;
                        const hasedPassword = hash;
                        const condition = { _id: id };
                        const dataForUpdate = {
                            password: hasedPassword,
                            updatedDate: Date.now().toString()
                        };
                        User.findOneAndUpdate(condition, dataForUpdate, { new: true }).exec().then((result) => {
                            if (result) {
                                res.status(200).json({
                                    user: result,
                                    request: {
                                        type: 'GET',
                                        url: 'http://localhost:4000/user/' + result._id
                                    }
                                });
                            } else {
                                res.status(404).json({ message: 'There was a problem updating user' });
                            }
                        });

                    });
                }
            } else {

                let condition = { _id: id };
                User.findOne(condition, { new: true }).exec().then((result) => {
                    if (result) {
                        res.status(401).json({
                            message: 'Current Password Incorrect, No update password',
                            user: result,
                            request: {
                                type: 'GET',
                                url: 'http://localhost:4000/user/' + result._id
                            }
                        });
                    } else {
                        res.status(404).json({ message: 'There was a problem updating user' });
                    }
                });

            }
        });

        // } else {
        //     return res.status(401).json({
        //         msg: "Incorrect password.",
        //         success: false
        //     });
        // }
        // let user_info;
        // user_info = await User_Info.findOne({ user: user._id }).exec();
        // user_info.name = req.body.name;
        // user_info.save();
    });
});
router.delete('/delete/:id', async (req, res) => {
    User.findByIdAndRemove(req.params.id, function (err, user) {
        if (err) return res.status(500).send('There was a problem deleting the user.');
        res.status(200).send('User: ' + user.name + ' was deleted.');
    });
})
module.exports = router