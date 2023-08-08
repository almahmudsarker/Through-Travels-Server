const express = require('express')
const app = express()
const morgan = require('morgan')
const cors = require('cors')
const jwt = require('jsonwebtoken')
require('dotenv').config()
const port = process.env.PORT || 5000

// middleware
const corsOptions = {
  origin: '*',
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json())
app.use(morgan('dev'))

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mv9nczj.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

// Validate jwt 
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "Unauthorized Access" }) 
  }
  const token = authorization.split(' ')[1]
  // token verify
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if(err){
      return res.status(401).send({error: true, message: 'Unauthorized Access'})
    }
    req.decoded = decoded
    next()
  })
}

async function run() {
  try {
    const usersCollection = client.db('throughTravelsDb').collection('users')
    const placesCollection = client.db('throughTravelsDb').collection('places')
    const bookingsCollection = client.db('throughTravelsDb').collection('bookings')


    // Generate jwt token
    app.post('/jwt', async ( req, res )=> {
      const email = req.body
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "7d",
      })
      res.send({token})
    })

    // Svae user email & Role to database
    app.put('/users/:email', async(req, res) => {
      const email = req.params.email
      const user = req.body
      const query = {email: email}
      const options = {upsert: true}
      const updateDoc = {
        $set: user,
      }
      const result = await usersCollection.updateOne(query, updateDoc, options)
      res.send(result)
    })

    // Get all places
    app.get('/places', async(req, res) => {
      const result = await placesCollection.find().toArray()
      res.send(result)
    })

    //Delete place
    app.delete('/places/:id', async(req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await placesCollection.deleteOne(query)
      res.send(result)
    })

    // Get all places for host by email
    app.get('/places/:email', verifyJWT, async(req, res) => {
      const decodedEmail = req.decoded.email
      const email = req.params.email
      if(email !== decodedEmail){
        return res
          .status(403)
          .send({ error: true, message: "Forbidden Access" })
      }
      const query = { 'host.email': email }
      const place = await placesCollection.find(query).toArray()
      res.send(place)
    })

    // Get a single place by id
    app.get('/place/:id', async(req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const place = await placesCollection.findOne(query)
      res.send(place)
    })

    // save a place to database
    app.post('/places', async(req, res) => {
      const place = req.body
      const result = await placesCollection.insertOne(place)
      res.send(result)
    })
   
    //update place booking status
    app.patch('/places/status/:id', async (req, res) => {
      const id = req.params.id
      const status = req.body.status
      const query = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: { 
          booked: status,
         },
      }
      const update = await placesCollection.updateOne(query, updateDoc)
      res.send(update)
    })

    // Get bookings for guest
    app.get('/bookings', async (req, res) => {
      const email = req.query.email
      if(!email){
        res.send([])
      }
      const query = {'guest.email': email}
      const result = await bookingsCollection.find(query).toArray()
      res.send(result)
    })

    // Get bookings for host
    app.get('/bookings/host', async (req, res) => {
      const email = req.query.email
      if(!email){
        res.send([])
      }
      const query = { host: email }
      const result = await bookingsCollection.find(query).toArray()
      res.send(result)
    })

    // save a bookings to database
    app.post('/bookings', async(req, res) => {
      const booking = req.body
      const result = await bookingsCollection.insertOne(booking)
      res.send(result)
    })

    //delete a booking
    app.delete('/bookings/:id', async(req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await bookingsCollection.deleteOne(query)
      res.send(result)
    })

    // get user
    app.get('/users/:email', async(req, res) => {
      const email = req.params.email
      const query = { email: email }
      const user = await usersCollection.findOne(query)
      res.send(user)
    })

    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 })
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    )
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir)

app.get('/', (req, res) => {
  res.send('Through-Travels Server is running..')
})

app.listen(port, () => {
  console.log(`Through-Travels is running on port ${port}`);
})
