import express from 'express';
import dotenv from 'dotenv';
import mysql from 'mysql2';

const app = express();
const port = 3000;

dotenv.config();

const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed!' + err.stack);
        return;
    }
    console.log('Connected to database.');
});

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});