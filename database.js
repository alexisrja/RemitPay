const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

class Database {
    constructor() {
        this.db = new sqlite3.Database(path.join(__dirname, 'remitpay.db'), (err) => {
            if (err) {
                console.error('Error al conectar con la base de datos:', err.message);
            } else {
                console.log('✅ Conectado a la base de datos SQLite');
                this.initializeTables();
            }
        });
    }

    initializeTables() {
        // Tabla de usuarios
        this.db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                first_name VARCHAR(50) NOT NULL,
                last_name VARCHAR(50) NOT NULL,
                phone VARCHAR(20),
                country VARCHAR(50),
                wallet_address VARCHAR(255),
                profile_image VARCHAR(255),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) {
                console.error('Error creando tabla users:', err.message);
            } else {
                console.log('📊 Tabla users creada/verificada');
            }
        });

        // Tabla de transacciones (opcional para el futuro)
        this.db.run(`
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                sender_wallet VARCHAR(255) NOT NULL,
                receiver_wallet VARCHAR(255) NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                currency VARCHAR(10) NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                transaction_id VARCHAR(255),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `, (err) => {
            if (err) {
                console.error('Error creando tabla transactions:', err.message);
            } else {
                console.log('📊 Tabla transactions creada/verificada');
            }
        });
    }

    // Métodos para usuarios
    async createUser(userData) {
        return new Promise((resolve, reject) => {
            const { username, email, password, firstName, lastName, phone, country } = userData;
            
            // Hash de la contraseña
            bcrypt.hash(password, 10, (err, hashedPassword) => {
                if (err) {
                    reject(err);
                    return;
                }

                const sql = `
                    INSERT INTO users (username, email, password, first_name, last_name, phone, country)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `;
                
                this.db.run(sql, [username, email, hashedPassword, firstName, lastName, phone, country], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ id: this.lastID, username, email, firstName, lastName });
                    }
                });
            });
        });
    }

    async getUserByEmail(email) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM users WHERE email = ?`;
            this.db.get(sql, [email], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async getUserByUsername(username) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM users WHERE username = ?`;
            this.db.get(sql, [username], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async getUserById(id) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM users WHERE id = ?`;
            this.db.get(sql, [id], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async updateUser(id, userData) {
        return new Promise((resolve, reject) => {
            const { firstName, lastName, phone, country, walletAddress, profileImage } = userData;
            
            const sql = `
                UPDATE users 
                SET first_name = ?, last_name = ?, phone = ?, country = ?, 
                    wallet_address = ?, profile_image = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            
            this.db.run(sql, [firstName, lastName, phone, country, walletAddress, profileImage, id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    }

    async validatePassword(email, password) {
        return new Promise(async (resolve, reject) => {
            try {
                const user = await this.getUserByEmail(email);
                if (!user) {
                    resolve(false);
                    return;
                }

                bcrypt.compare(password, user.password, (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result ? user : false);
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    // Método para cerrar la conexión
    close() {
        this.db.close((err) => {
            if (err) {
                console.error('Error cerrando la base de datos:', err.message);
            } else {
                console.log('🔒 Conexión a la base de datos cerrada');
            }
        });
    }
}

module.exports = Database;