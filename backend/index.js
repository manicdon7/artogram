const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require("dotenv").config();
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const app = express();
const port = 5000;
const Razorpay = require('razorpay');
const admin = require('firebase-admin');

app.use(cors('https://artogrampec.vercel.app/'));
const allowedOrigins = [
  'https://artogrampec.vercel.app',
  'http://localhost:3000'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
const dburi = process.env.dbURI;
mongoose.connect(dburi, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB database');
});


const productSchema = new mongoose.Schema({
  userEmail: String,
  productName: String,
  productType: String,
  imageUrl: String,
  price: Number,
  description: String,
  phonenumber: String,
  upiid : String,
});

const Product = mongoose.model('Product', productSchema);


const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String
});
const User = mongoose.model('User', userSchema);


const razorpay = new Razorpay({
  key_id: process.env.keyid,
  key_secret: process.env.keysecret
});

app.get("/", async (req, res) => {
  res.json({ message: "API's are working!" });
})

app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user instance
    const newUser = new User({
      name,
      email,
      password: hashedPassword
    });

    // Save the user to the database
    await newUser.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});


app.post('/api/login', async (req, res) => {
  const { name, password } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ name });
    if (!user) {
      console.log('User not found');
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log('Invalid password');
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Password is valid, user is authenticated
    console.log('Login successful');
    res.status(200).json({ message: 'Login successful' });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { userEmail, productName, productType, imageUrl, price, description, phonenumber, upiid } = req.body;
    const product = new Product({
      userEmail,
      productName,
      productType,
      imageUrl,
      price,
      description,
      phonenumber,
      upiid
    });
    await product.save();
    res.status(201).json({ message: 'Product created successfully' });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/generate-payment-link', async (req, res) => {
  try {
    const { amount, currency, description, phonenumber, customer } = req.body;
    const options = {
      amount: amount,
      currency,
      description,
      phonenumber,
      customer,
    };
    const paymentLink = await razorpay.paymentLink.create(options);

    res.status(200).json({ paymentLink });
  } catch (error) {
    console.error('Error generating payment link:', error);
    res.status(500).json({ error: 'Failed to generate payment link' });
  }
});


app.post('/api/posts/email', async (req, res) => {
  const { email } = req.body;
  try {
    const posts = await Product.find({ userEmail: email });
    res.json({ posts });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

app.delete('/api/posts/delete', async (req, res) => {
  const { _id } = req.body;

  try {
      const post = await Product.findById(_id);
      if (!post) {
          return res.status(404).json({ error: 'Post not found' });
      }
      await Product.findByIdAndDelete(_id);

      res.json({ message: 'Post deleted successfully' });
  } catch (error) {
      console.error('Error deleting post:', error);
      res.status(500).json({ error: 'Failed to delete post' });
  }
});




app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});
