
const Sequelize = require('sequelize');
var DataTypes = require('sequelize/lib/data-types');
require('dotenv').config()

class Controller {

    #hostname;
    #user;
    #pass;
    #db;
    #db_dialect
    #port;
    #sequelize;
    #User;
    #Account;


    constructor() {

        this.#hostname = process.env.DB_HOST;
        this.#user = process.env.DB_USER;
        this.#pass = process.env.DB_PASSWORD;
        this.#db = process.env.DB_DATABASE;
        this.#port = process.env.DB_PORT;
        this.#db_dialect = process.env.DB_DIALECT;


        this.#sequelize = new Sequelize(
            this.#db, this.#user, this.#pass,
            {
                host: this.#hostname,
                dialect: this.#db_dialect,
                pool: {
                    max: 10,
                    min: 0,
                    acquire: 30000,
                    idle: 10000
                },
                logging: false
            }
        );

        // authenticate
        this.#sequelize.authenticate().then(() => {
            console.log('Database connection has been established successfully.');
        }).catch((error) => {
            console.error('Unable to connect to the database: ', error);
        });

        // define the user model
        this.#User = this.#sequelize.define('user', {
            username: {
                type: DataTypes.STRING,
                allowNull: false
            },
            password: {
                type: DataTypes.STRING,
                allowNull: false
            },
            walletAddress: {
                type: DataTypes.STRING,
                allowNull: true,
                defaultValue: null
            },
            walletPrivateKey: {
                type: DataTypes.STRING,
                allowNull: true,
                defaultValue: null
            }
        });

        this.#Account = this.#sequelize.define('accounts', {
            account: {
                type: DataTypes.FLOAT,
                allowNull: false
            },
            ethereumBalance: {
                type: DataTypes.DECIMAL(20, 8),
                allowNull: false,
                defaultValue: 0
            }
        });


        // one-to-one association
        this.#User.hasOne(this.#Account);
        this.#Account.belongsTo(this.#User);

        // Sync database on startup
        this.#sequelize.sync({ alter: true }).then(() => {
            console.log('Database schema synchronized successfully.');
        }).catch((error) => {
            console.error('Error syncing database:', error);
        });
    }

    // insert a user
    async insert(user, pword) {
        await this.#User.create({
            username: user,
            password: pword,
            account: { account: 0 }
        }, {
            include: this.#Account
        },
        ).then(() => {
            console.log(`User ${user} added.`);
        });
    };

    // retrieve user (username only)
    async findUser(user) {
        let result = await this.#User.findOne({
            where: {
                username: user
            },
            raw: true
        }).catch((error) => {
            console.log('Failed to retrieve data', error);
        });

        if (!result) {
            console.log('No user detected!');
            return { detected: false, res: null };
        }
        else {
            console.log(`User retrieved: ${result.username}`);
            return { detected: true, res: result };
        }

    };


    // retrieve user
    async select(user) {
        let result = await this.#User.findOne({
            where: {
                username: user
            },
            raw: true
        }).catch((error) => {
            console.log('Failed to retrieve data', error);
        });

        if (!result) {
            console.log('No user detected!');
            return {
                detected: false,
                res: null,
                password: null
            };
        }
        else {
            console.log(`User retrieved: ${result.username}`);
            return {
                detected: true,
                res: result,
                username: result.username,
                password: result.password,
                userid: result.id
            };
        }

    };

    async getAccount(userId) {
        let result = await this.#Account.findOne({
            where: {
                userId: userId
            },
            raw: true
        }).then((result) => {
            return result;
        })
            .catch((error) => {
                console.log('Failed to retrieve data', error);
            });

        if (!result) {
            console.log('ACCOUNT: No user detected! User ID ' + userId);
            return { detected: false, res: null };
        }
        else {
            console.log(`ACOUNT: User retrieved with ID: ${result.userId}`);
            return {
                detected: true,
                savings: result.account
            };
        }
    }

    async updateAccount(userId, amount) {
        const result = await this.#Account.update(
            { account: amount },
            {
                where: {
                    userId: userId
                }
            }
        ).then((result) => {
            console.log('ACCOUNT: Account amount updated');
            return result;
        }).catch((error) => {
            console.log('Account cannot be updated', error);
        });

        if (!result) {
            console.log('Account cannot be updated.');
            return { detected: false, res: null };
        }
        else {
            console.log(`Account updated. New amount: ${result.account}`);
            return { detected: true, res: result };
        }

        /*
        let userAccount = await this.#User.findOne({
            where: {
                username: user
            },
            include: {
                model: this.#Account
            },
            raw: true
        }).catch((error) => {
            console.log('Failed to retrieve data', error);
        });
        */

    }

    // Save wallet address for a user
    async saveWallet(userid, walletAddress, walletPrivateKey) {
        try {
            const result = await this.#User.update(
                { 
                    walletAddress: walletAddress,
                    walletPrivateKey: walletPrivateKey
                },
                { where: { id: userid } }
            );
            console.log(`Wallet saved for user ${userid}`);
            return { success: true, result: result };
        } catch (error) {
            console.log('Error saving wallet', error);
            return { success: false, error: error };
        }
    }

    // Get wallet address for a user
    async getWallet(userid) {
        try {
            const result = await this.#User.findOne({
                where: { id: userid },
                raw: true
            });
            if (result) {
                return { 
                    success: true, 
                    walletAddress: result.walletAddress,
                    walletExists: result.walletAddress !== null
                };
            } else {
                return { success: false, error: 'User not found' };
            }
        } catch (error) {
            console.log('Error retrieving wallet', error);
            return { success: false, error: error };
        }
    }

    // Get wallet credentials for server-side signing
    async getWalletCredentials(userid) {
        try {
            const result = await this.#User.findOne({
                where: { id: userid },
                raw: true
            });
            if (result) {
                return {
                    success: true,
                    walletAddress: result.walletAddress,
                    walletPrivateKey: result.walletPrivateKey,
                    walletExists: result.walletAddress !== null
                };
            }
            return { success: false, error: 'User not found' };
        } catch (error) {
            console.log('Error retrieving wallet credentials', error);
            return { success: false, error: error };
        }
    }

    // Get user by wallet address
    async getUserByWallet(walletAddress) {
        try {
            const result = await this.#User.findOne({
                where: { walletAddress: walletAddress },
                raw: true
            });
            if (result) {
                return { success: true, user: result };
            } else {
                return { success: false, error: 'User not found' };
            }
        } catch (error) {
            console.log('Error finding user by wallet', error);
            return { success: false, error: error };
        }
    }

    // Update ethereum balance
    async updateEthereumBalance(userid, balance) {
        try {
            const result = await this.#Account.update(
                { ethereumBalance: balance },
                { where: { userId: userid } }
            );
            console.log(`Ethereum balance updated for user ${userid}`);
            return { success: true, result: result };
        } catch (error) {
            console.log('Error updating ethereum balance', error);
            return { success: false, error: error };
        }
    }

    // Get ethereum balance
    async getEthereumBalance(userid) {
        try {
            const result = await this.#Account.findOne({
                where: { userId: userid },
                raw: true
            });
            if (result) {
                return { success: true, balance: result.ethereumBalance };
            } else {
                return { success: false, error: 'Account not found' };
            }
        } catch (error) {
            console.log('Error retrieving ethereum balance', error);
            return { success: false, error: error };
        }
    }

}


module.exports = Controller;
