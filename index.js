import express from 'express';
import dotenv from 'dotenv';
import mysql from 'mysql2';
import path from 'path';
import bcrypt from 'bcryptjs';

const app = express();
const port = 3000;
app.set('view engine', 'hbs');
app.use(express.static(path.join(__dirname, './public')));
app.use(express.urlencoded({extended: 'false'}));
app.use(express.json());
dotenv.config();


const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE,
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

app.post("/register", (req, res) => {
    const { name, email, password } = req.body

    const [results] = db.query(`select * from users where email = '${email}'`)
    if (results.length) {
        // Account already exists
    }

    db.execute(`insert into users(name, email, password) values('${name}', '${email}', '${bcrypt.hashSync(password)}')`)
    // notify of account creation
})

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});