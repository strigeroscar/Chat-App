import { config } from 'dotenv'
import pkg from 'pg'

const { Client } = pkg

import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const app = express()
//Dotenv
config()

//Middlewares
app.use(bodyParser.json())
app.use(
    bodyParser.urlencoded({
        extended: true
    })
)

app.use(cors())
app.use(express.json())
app.use((request, response, next) => {
    response.header('Access-Control-Allow-Origin', '*')
    response.header('Access-Control-Allow-Headers', 'Content-Type')
    next()
})

//Implementing the Database

const client = new Client({
    database: process.env.DATABASE,
    host: process.env.HOST,
    password: process.env.PASSWORD,
    port: process.env.PORT,
    user: process.env.USER
})

client.connect(function (err) {
    if (err) throw err
    console.log('Database Connected')
})

// Routes
app.get('/', (req, res) => {
    res.json('Svejsan')
})

//Users GET
app.get('/users', async (req, res) => {
    try {
        const result = await client.query('SELECT * FROM users')
        res.json(result.rows)
    } catch (err) {
        console.error(err)
        res.sendStatus(500)
    }
})

/* NOT IN USE
app.post('/users/create-account', async (req, res) => {
    const { username, password } = req.body
    try {
        await client.query(
            'INSERT INTO users (username, password) VALUES ($1, $2)',
            [username, password]
        )
        res.sendStatus(201)
    } catch (err) {
        console.error(err)
        res.sendStatus(500)
    }
})
*/
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Endpoint to retrieve all messages
app.get('/messages', async (req, res) => {
    try {
        const query = 'SELECT * FROM messages'//sql query för att hämta alla meddelanden
        const result = await client.query(query);
        const messages = result.rows;//hämtar all rader från resultatet
        res.status(200).json({ messages });
    } catch (err) {
        console.error(err)
        res.sendStatus(500)
    }
})
app.get('/messages/:id', async (req, res) => {
    try {
      const { id } = req.params;//hämtar conversations IDet från url med hjälp av req.params
      const query = 'SELECT * FROM messages WHERE conversation_id = $1';//sql query för att hämta meddelanden med ett specifict conversations id
      const result = await client.query(query, [id]);//
      const messages = result.rows;//hämtar raderna från resultatet
      res.status(200).json({ messages });
    } catch (err) {
      console.error(err);
      res.sendStatus(500);
    }
  });
app.get('/users/:id', async (req, res) => {
    const userId = req.params.id;//hämtar userid från req.params aka urlen

    try {
      const query = 'SELECT username FROM users WHERE user_id = $1';//sql query för att hämta användarnamn med det specifika idet
      const values = [userId];
      const result = await client.query(query, values);

      if (result.rows.length > 0) {
        const user = result.rows[0];//hämtar första raden från resultatet
        res.status(200).json({ username: user.username });
      } else {
        res.status(404).json({ message: 'User not found' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error fetching user' });
    }
  });
app.post('/messages', async (req, res) => {
    const { conversation_id ,sender_id, content } = req.body; // hämtar conversation_id ,sender_id, content från req.body

    try {
        if(!content){
            return res.status(400).json({ error: 'Please fill in all fields' });
        }
      const query = 'INSERT INTO messages (conversation_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *';//sql för att sckicka in ett nytt meddelande till databasen
      const values = [conversation_id, sender_id, content];//en array av värden att användas av i queryn
      const result = await client.query(query, values);//
      const newMessage = result.rows[0];//hämtar första raden från query resultatet
      res.status(201).json({ message: 'Message sent successfully', message: newMessage });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error sending message' });
    }
})
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Endpoint to create a new conversation
app.post('/conversations', async (req, res) => {
    try {
        const { user1_id, user2_id } = req.body

        // Insert the conversation into the database
        const query =
            'INSERT INTO conversations (user1_id, user2_id) VALUES ($1, $2) RETURNING conversation_id'
        const result = await client.query(query, [user1_id, user2_id])

        const conversationId = result.rows[0].id

        res.status(201).json({
            message: 'Conversation created successfully',
            conversationId
        })
    } catch (error) {
        console.error('Error creating conversation', error)
        res.status(500).json({
            error: 'An error occurred while creating conversation'
        })
    }
})

// // Endpoint to create a new message
// app.post('/messages', async (req, res) => {
//     const { conversation_id, sender_id, content } = req.body
//     try {
//         await client.query(
//             'INSERT INTO messages (conversation_id, sender_id, content) VALUES ($1, $2, $3)',
//             [conversation_id, sender_id, content]
//         )
//         res.status(201).send('Message sent!')
//     } catch (err) {
//         console.error(err)
//         res.sendStatus(500)
//     }
// })

// API endpoint to delete a message by ID
app.delete('/messages/:id', async (req, res) => {
    const id = req.params.id
    try {
        await client.query('DELETE FROM messages WHERE id = $1', [id])
        res.sendStatus(200)
    } catch (err) {
        console.error(err)
        res.sendStatus(500)
    }
})

// Implementing user authentication routes

// Registration endpoint
app.post('/register', async (req, res) => {
    const { username, password } = req.body

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10)

    try {
        // Insert the user into the database
        const query = 'INSERT INTO users (username, password) VALUES ($1, $2)'
        await client.query(query, [username, hashedPassword])

        res.status(201).json({ message: 'User registered successfully' })
    } catch (error) {
        console.error('Error registering user', error)
        res.status(500).json({
            error: 'An error occurred while registering user'
        })
    }
})

/*Login endpoint WITHOUT JWT token
app.post('/login', async (req, res) => {
    const { username, password } = req.body

    try {
        // Retrieve the user from the database
        const query = 'SELECT * FROM users WHERE username = $1'
        const result = await client.query(query, [username])

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' })
        }

        // Compare the provided password with the stored hashed password
        const user = result.rows[0]
        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' })
        }

        res.json({ message: 'Login successful', user })
    } catch (error) {
        console.error('Error logging in user', error)
        res.status(500).json({ error: 'An error occurred while logging in user'});
    }
})
*/

// Login endpoint WITH JWT token
app.post('/login', async (req, res) => {
    const { username, password } = req.body

    try {
        // Retrieve the user from the database
        const query = 'SELECT * FROM users WHERE username = $1'
        const result = await client.query(query, [username])

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' })
        }

        // Compare the provided password with the stored hashed password
        const user = result.rows[0]
        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' })
        }

        // Generate a JWT token
        const token = jwt.sign({ userId: user.user_id }, process.env.JWT_SECRET)

        res.json({ message: 'Login successful', user, token })
    } catch (error) {
        console.error('Error logging in user', error)
        res.status(500).json({
            error: 'An error occurred while logging in user'
        })
    }
})


// Middleware to verify user authentication WITH JWT token
const authenticateUser = (req, res, next) => {
    // Check if user is authenticated
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Unauthenticated' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        req.user = user;
        next();
    });
}

// Fetch conversations endpoint
app.get('/conversations', authenticateUser, async (req, res) => {
    const userId  = req.user.userId;

    try {
        // Retrieve conversations for the user from the database
        const query = `
            SELECT c.conversation_id, u.username AS user_username
            FROM conversations AS c
            INNER JOIN users AS u ON (u.user_id = CASE WHEN c.user1_id = $1 THEN c.user2_id ELSE c.user1_id END)
            WHERE c.user1_id = $1 OR c.user2_id = $1
        `;
        const result = await client.query(query, [userId])

        res.json(result.rows)
    } catch (error) {
        console.error('Error fetching conversations', error)
        res.status(500).json({ error: 'An error occurred while fetching conversations' });
    }
});


/* Middleware to verify user authentication WITHOUT JWT TOKEN
const authenticateUser = (req, res, next) => {
    // Check if user is authenticated (e.g., by verifying session, token, etc.)
    // For simplicity, we'll assume a user is authenticated if the request contains a valid user object

    if (!req.body.user) {
        return res.status(401).json({ error: 'Unauthenticated' })
    }

    next();
};

// Fetch conversations endpoint
app.get('/conversations', authenticateUser, async (req, res) => {
    const { userId } = req.body.user;

    try {
        // Retrieve conversations for the user from the database
        const query = `
        SELECT c.conversation_id, u.username AS user_username
        FROM conversations AS c
        INNER JOIN users AS u ON (u.user_id = CASE WHEN c.user1_id = $1 THEN c.user2_id ELSE c.user1_id END)
        WHERE c.user1_id = $1 OR c.user2_id = $1
      `
        const result = await client.query(query, [userId])

        res.json(result.rows)
    } catch (error) {
        console.error('Error fetching conversations', error)
        res.status(500).json({ error: 'An error occurred while fetching conversations' });
    }
});
*/

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err)
    res.status(500).json({ error: 'Internal server error' })
})

/*--------- VARIANT With Token-----------
const authenticate = async (req, res, next) => {
    const token = req.query.token
    if (!token) {
        return res.status(401).send('Token is missing')
    }

    const tokenRow = await client.query(
        'SELECT * FROM tokens WHERE token = $1',
        [token]
    )

    if (!tokenRow.rows[0]) {
        return res.status(401).send('Invalid token')
    }

    req.userId = tokenRow.rows[0].user_id
    next()
}

app.post('/messages', async (req, res) => {
    const token = req.query.token
    if (!token) {
        return res.status(401).send('Invalid token')
    }

    const tokenData = await client.query(
        'SELECT * FROM tokens WHERE token = $1',
        [token]
    )
    if (!tokenData.rows[0]) {
        return res.status(401).send('Invalid token')
    }

    const senderId = tokenData.rows[0].user_id
    const { recipient_id, content } = req.body

    if (!recipient_id || !content) {
        return res.status(400).send('recipient id and content is missing')
    }

    const message = {
        sender_id: senderId,
        recipient_id,
        content
    }

    try {
        const result = await client.query(
            `INSERT INTO messages (sender_id, recipient_id, content) VALUES ($1, $2, $3) RETURNING id`,
            [message.sender_id, message.recipient_id, message.content]
        )
        message.id = result.rows[0].id
        res.status(201).json(message)
    } catch (error) {
        console.error(error)
        res.status(500).send('Server error')
    }
})

app.post('/login', async (req, res) => {
    if (!req.body.username) {
        return res.status(400).send('Username is missing')
    }

    const user = await client.query(
        'SELECT * FROM users WHERE username = $1',
        [req.body.username]
    )

    if (!user.rows[0] || user.rows[0].password !== req.body.password) {
        return res.status(401).send('Unauthorized')
    }

    const token = uuidv4()
    await client.query('INSERT INTO tokens (user_id, token) VALUES ($1, $2)', [
        user.rows[0].id,
        token
    ])

    res.status(201).json({ token })
})

app.post('/logout', authenticate, async (req, res) => {
    const token = req.query.token
    await client.query('DELETE FROM tokens WHERE token = $1', [token])
    res.status(200).send('Logged out succesfully')
})

app.get('/messages', authenticate, async (req, res) => {
    const messages = await client.query(
        'SELECT * FROM messages WHERE sender_id = $1 OR recipient_id = $2 ORDER BY created',
        [req.userId, req.userId]
    )
    console.log(messages.rows)
    res.send(messages.rows)
})
-----------------END of VARIANT with Token----------------------------*/

app.listen(8800, () => {
    console.log('Server is running')
})
