const http = require('http')
const fs = require('fs')
const bcrypt = require('bcrypt');
const Web3Utils = require('./web3Utils');

const port = 3000
const express = require('express');
const cookieParser = require('cookie-parser');
const sessions = require('express-session');
const Database = require('./login.contr');

const app = express();
const web3 = new Web3Utils();

const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));
// Serve ethers.js from node_modules
app.use('/ethers-5.umd.min.js', express.static(path.join(__dirname, 'node_modules/ethers/dist/ethers.umd.min.js')));
app.use(express.json());


// creating 24 hrs from milliseconds
const oneDay = 1000 * 60 * 60 * 24;

// sessions middleware
app.use(sessions({
    secret: 'thisismysecretkey123',
    saveUninitialized: true,
    cookie: {maxAge: oneDay},
    resave: false
}));

// parse the incoming data
app.use(express.urlencoded({ extended: true}));

// serving public file
//app.use(express.static(__dirname + '/public'));

//app.set('views', __dirname + '/public');
//app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');

// cookie parser middleware
app.use(cookieParser());


// middleware to stop browser caching
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
})




///////////////////////////////////////////////////////
///////////////// ROUTES //////////////////////////////
///////////////////////////////////////////////////////



const database = new Database();
const port2 = 8080;
var session = null;


// home
app.get('/', (req, res) => {

    // check if a session exists
    session = req.session;
    console.log(session.userid);
    if (session.userid) {
        
       // res.send(`<h1>Welcome, ${session.userid}!<h1>\n
        res.redirect('/bank');

    }
    else {
        // homepage
        //res.sendFile('public/index.html', {root:__dirname});
        res.render('index');
    }
});


// send login page
app.get('/login', (req, res) => {
    res.render('login2');
});

// send signup page
app.get('/signup', (req, res) => {
    res.render('signup2');
})


// receive user credentials from front to back.
// authenticates users
app.post('/loginUser', async (req, res) => {

    const username = req.body.username;
    const password = req.body.password;

    //// debug
    console.log(`username: ${username} and ${password}`);

    // find username
    const user = await database.findUser(username);

    // if user's creds was not detected
    if (!user.detected) {
        console.log('Did not find user');
        res.status(404).send('User not found');
        return;
    }
    // if username exists
    else {
        console.log('User found');

        // get password of the user
        const creds = await database.select(username);
        const hashedPassword = creds.password;

        // compare/check encrypted password
        if (await bcrypt.compare(password, hashedPassword)) {
            
            // get account info
            const account = await database.getAccount(creds.userid);
            const accountSavings = account.savings;

            // save session
            session = req.session;
            session.userid = creds.userid;
            session.username = creds.username;
            session.savings = accountSavings;
            console.log(req.session);

           res.status(300).send();
           // no redirect
           // res.redirect('/bank');
        }
        else {
            console.log('Invalid password');
            res.status(403).send('Invalid password');
            return;
        }
    }
});


// post stuff from front to end
// add user to db
app.post('/signupUser', async (req, res) => {

    const parcel = req.body;
    console.log(`User: ${parcel.username}\nPass: ${parcel.password}`);

    // check db if username already exists
    const cred = await database.findUser(parcel.username);

    // if user is already in the db
    if (cred.detected) {
        console.log('User already in the db');
        // send error status
        res.status(404).send('User already exists');
    }
    else {
        console.log('User not in db');

        // encrypt password before storing to db
        bcrypt.hash(parcel.password, 10)
            .then((hash) => {
                database.insert(parcel.username, hash);
            }).catch((error) => {
                console.log('Could not store credentials', error);
                res.status(404).send();
                return;
            });

        // send OK status
        res.status(300).send();
    }
});

// logout
// update new account value before exiting
app.get('/logout', async (req, res) => {

    console.log('Current amount before logout: ' + session.savings)

    // update account first before destroying session
    const result = await database.updateAccount(session.userid, session.savings)
    req.session.destroy();
    res.redirect('/');
})

// send bank page
app.get('/bank', (req, res) => {

    if (!session.userid) {
        res.redirect('/login');
        return;
    }
    

    res.render('bank', {session: session});
});

// send wallet page
app.get('/wallet', (req, res) => {

    if (!session.userid) {
        res.redirect('/login');
        return;
    }

    res.render('wallet', {session: session});
});

// send transfer page
app.get('/transfer', (req, res) => {

    if (!session.userid) {
        res.redirect('/login');
        return;
    }

    res.render('transfer', {session: session});
})

// send coin flip game page
app.get('/coinflip', (req, res) => {
    if (!session.userid) {
        res.redirect('/login');
        return;
    }

    res.render('coinflip', { session: session });
});

// get current session
app.get('/getSession', (req, res) => {
    const userCred = {
        username: session.username, 
        userid: session.userid,
        savings: session.savings
    }
    res.json(userCred);
})

// update amount in the account table
app.post('/updateSession', (req, res) => {
    
    session.savings = req.body.currentAmount;
    console.log('NEW UPDATED AMOUNT: ' + session.savings);
    res.status(300).send('New amount transmitted');
})


///////////////////////////////////////////////////////
///////////////// WEB3 ROUTES ///////////////////////
///////////////////////////////////////////////////////

// Create a new wallet address for the user
app.post('/createWallet', async (req, res) => {
    if (!session.userid) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
    }

    try {
        const newWallet = web3.generateWalletAddress();
        
        if (!newWallet.success) {
            res.status(500).json(newWallet);
            return;
        }

        // Save wallet credentials to database (educational project use only)
        const savedWallet = await database.saveWallet(
            session.userid,
            newWallet.address,
            newWallet.privateKey
        );

        if (savedWallet.success) {
            res.json({
                success: true,
                address: newWallet.address,
                message: 'Wallet generated and saved successfully.'
            });
        } else {
            res.status(500).json({ success: false, error: 'Failed to save wallet' });
        }
    } catch (error) {
        console.error('Error creating wallet:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get user's wallet address
app.get('/getWallet', async (req, res) => {
    if (!session.userid) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
    }

    try {
        const wallet = await database.getWallet(session.userid);
        res.json(wallet);
    } catch (error) {
        console.error('Error getting wallet:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get wallet balance
app.get('/getWalletBalance', async (req, res) => {
    if (!session.userid) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
    }

    try {
        const wallet = await database.getWallet(session.userid);
        
        if (!wallet.success || !wallet.walletAddress) {
            res.status(400).json({ success: false, error: 'No wallet associated with user' });
            return;
        }

        const balance = await web3.getWalletBalance(wallet.walletAddress);
        
        if (!balance.success) {
            // Return network error with helpful message
            console.error('Web3 balance fetch failed:', balance.error);
            if (balance.code === 'NETWORK_ERROR') {
                res.status(503).json({ 
                    success: false, 
                    error: 'Network error - RPC not responding. Please check your .env RPC_URL setting or ensure local blockchain is running.' 
                });
                return;
            }
        }
        
        if (balance.success) {
            // Update balance in database
            await database.updateEthereumBalance(session.userid, parseFloat(balance.balanceEther));
        }

        res.json(balance);
    } catch (error) {
        console.error('Error getting wallet balance:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to fetch wallet balance' 
        });
    }
});

// Send ether to another address or registered user
app.post('/sendEther', async (req, res) => {
    if (!session.userid) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
    }

    try {
        const { senderAddress, recipientInput, amount } = req.body;

        if (!senderAddress || !recipientInput || !amount) {
            res.status(400).json({ success: false, error: 'Sender, recipient and amount are required' });
            return;
        }

        const senderWallet = await database.getWalletCredentials(session.userid);
        if (!senderWallet.success || !senderWallet.walletExists || !senderWallet.walletPrivateKey) {
            res.status(400).json({ success: false, error: 'Current user wallet/private key is not configured' });
            return;
        }

        if (senderAddress.toLowerCase() !== senderWallet.walletAddress.toLowerCase()) {
            res.status(400).json({ success: false, error: 'Sender address must match your logged-in wallet address' });
            return;
        }

        // Resolve recipient to wallet address
        let recipientAddress = recipientInput;
        
        if (!web3.isValidAddress(recipientInput)) {
            // Try to find user by username
            const recipientUser = await database.findUser(recipientInput);
            if (recipientUser.detected) {
                const recipientWallet = await database.getWallet(recipientUser.res.id);
                if (recipientWallet.walletExists) {
                    recipientAddress = recipientWallet.walletAddress;
                } else {
                    res.status(400).json({ success: false, error: 'Recipient user has no wallet address' });
                    return;
                }
            } else {
                res.status(400).json({ success: false, error: 'Invalid recipient address or username' });
                return;
            }
        }

        const txResult = await web3.sendEther(senderWallet.walletPrivateKey, recipientAddress, amount);
        if (!txResult.success) {
            res.status(400).json(txResult);
            return;
        }

        res.json({
            success: true,
            message: 'ETH transfer confirmed!',
            transactionHash: txResult.transactionHash,
            from: txResult.from,
            to: txResult.to,
            amount: txResult.amount,
            blockNumber: txResult.blockNumber
        });

        // Update balance in DB
        setTimeout(async () => {
            const balance = await web3.getWalletBalance(senderWallet.walletAddress);
            if (balance.success) {
                await database.updateEthereumBalance(session.userid, parseFloat(balance.balanceEther));
            }
        }, 2000);

    } catch (error) {
        console.error('Error sending ether:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get transaction history
app.get('/getTransactionHistory', async (req, res) => {
    if (!session.userid) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
    }

    try {
        const wallet = await database.getWallet(session.userid);
        
        if (!wallet.success || !wallet.walletAddress) {
            res.status(400).json({ success: false, error: 'No wallet associated with user' });
            return;
        }

        const history = await web3.getTransactionHistory(wallet.walletAddress);
        res.json(history);
    } catch (error) {
        console.error('Error getting transaction history:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Validate Ethereum address
app.post('/validateAddress', (req, res) => {
    const { address } = req.body;
    const isValid = web3.isValidAddress(address);
    res.json({ valid: isValid, address: address });
});

async function getHouseWalletInfo() {
    const housePrivateKey = process.env.HOUSE_WALLET_PRIVATE_KEY;
    if (!housePrivateKey) {
        return { success: false, error: 'HOUSE_WALLET_PRIVATE_KEY is missing in .env' };
    }

    let houseAddress = process.env.HOUSE_WALLET_ADDRESS;
    if (!houseAddress) {
        const derivedHouse = web3.getAddressFromPrivateKey(housePrivateKey);
        if (!derivedHouse.success) {
            return { success: false, error: 'Invalid HOUSE_WALLET_PRIVATE_KEY' };
        }
        houseAddress = derivedHouse.address;
    }

    if (!web3.isValidAddress(houseAddress)) {
        return { success: false, error: 'HOUSE_WALLET_ADDRESS is invalid' };
    }

    return { success: true, housePrivateKey, houseAddress };
}

app.get('/coinflipConfig', async (req, res) => {
    if (!session.userid) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
    }

    try {
        const houseWallet = await getHouseWalletInfo();
        if (!houseWallet.success) {
            res.status(500).json(houseWallet);
            return;
        }

        const houseBalance = await web3.getWalletBalance(houseWallet.houseAddress);
        if (!houseBalance.success) {
            res.status(400).json(houseBalance);
            return;
        }

        res.json({
            success: true,
            houseAddress: houseWallet.houseAddress,
            houseBalanceEther: houseBalance.balanceEther,
            maxBetEther: houseBalance.balanceEther
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Coin flip bet game
app.post('/coinflipBet', async (req, res) => {
    if (!session.userid) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
    }

    try {
        const { choice, amount } = req.body;
        const normalizedChoice = String(choice || '').toLowerCase();
        const amountNumber = Number(amount);

        if (!['heads', 'tails'].includes(normalizedChoice)) {
            res.status(400).json({ success: false, error: 'Choice must be heads or tails' });
            return;
        }

        if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
            res.status(400).json({ success: false, error: 'Amount must be greater than zero' });
            return;
        }

        const userWallet = await database.getWalletCredentials(session.userid);
        if (!userWallet.success || !userWallet.walletExists || !userWallet.walletPrivateKey) {
            res.status(400).json({ success: false, error: 'Current user wallet/private key is not configured' });
            return;
        }

        const houseWallet = await getHouseWalletInfo();
        if (!houseWallet.success) {
            res.status(500).json(houseWallet);
            return;
        }
        const { housePrivateKey, houseAddress } = houseWallet;

        const houseBalance = await web3.getWalletBalance(houseAddress);
        if (!houseBalance.success) {
            res.status(400).json({ success: false, error: houseBalance.error });
            return;
        }

        if (Number(houseBalance.balanceEther) < amountNumber) {
            res.status(400).json({
                success: false,
                error: `Bet exceeds house max payout. Max allowed: ${Number(houseBalance.balanceEther).toFixed(6)} ETH`,
                maxBetEther: houseBalance.balanceEther
            });
            return;
        }

        const flip = Math.random() < 0.5 ? 'heads' : 'tails';
        const userWon = flip === normalizedChoice;

        let txResult;
        if (userWon) {
            // House pays user on win
            txResult = await web3.sendEther(housePrivateKey, userWallet.walletAddress, amountNumber);
        } else {
            // User pays house on loss
            txResult = await web3.sendEther(userWallet.walletPrivateKey, houseAddress, amountNumber);
        }

        if (!txResult.success) {
            res.status(400).json({
                success: false,
                error: txResult.error,
                flip: flip,
                userWon: userWon
            });
            return;
        }

        res.json({
            success: true,
            flip: flip,
            userWon: userWon,
            amount: amountNumber,
            from: txResult.from,
            to: txResult.to,
            transactionHash: txResult.transactionHash,
            blockNumber: txResult.blockNumber,
            message: userWon ? 'You won! House paid your wallet.' : 'You lost. Your wallet paid the house.'
        });

        setTimeout(async () => {
            const balance = await web3.getWalletBalance(userWallet.walletAddress);
            if (balance.success) {
                await database.updateEthereumBalance(session.userid, parseFloat(balance.balanceEther));
            }
        }, 2000);
    } catch (error) {
        console.error('Error in coin flip bet:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});


// run server
app.listen(port2, function(error) {
    if (error) {
        console.log('Error: ', error);
    }
    else {
        console.log('Listening to port: ' + port2);
    }
})
