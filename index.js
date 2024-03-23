const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection URL
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("trenzyshirt");
    const collection = db.collection("users");
    const productCollection = db.collection("products");

    // User Registration
    app.post("/api/v1/register", async (req, res) => {
      const { name, email, password } = req.body;

      // Check if email already exists
      const existingUser = await collection.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user into the database
      await collection.insertOne({ name, email, password: hashedPassword });

      res.status(201).json({
        success: true,
        message: "User registered successfully",
      });
    });

    // User Login
    app.post("/api/v1/login", async (req, res) => {
      const { email, password } = req.body;

      // Find user by email
      const user = await collection.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Compare hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Generate JWT token
      const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
        expiresIn: process.env.EXPIRES_IN,
      });

      res.json({
        success: true,
        message: "Login successful",
        token,
      });
    });

    // ==============================================================
    // WRITE YOUR CODE HERE

    app.post("/products", async (req, res) => {
      const products = req.body;
      const result = await productCollection.insertOne(products);
      return res.send(result);
    });
    // ==============================================================
    app.get("/products", async (req, res) => {
      try {
        const result = await productCollection.find().toArray();
        return res.status(200).json({
          success: true,
          message: "All Product fetched successfully",
          result,
        });
      } catch (error) {
        return res.send({ message: "Error server" });
      }
    });
    // ==============================================================
    app.get("/products/filter", async (req, res) => {
      const query = req.query;
      let filter = {};

      // Handle filtering by rating
      if (query.rating) {
        const rating = parseFloat(query.rating);
        filter.rating = { $lte: rating };
      }

      // Handle filtering by price range
      if (query.price) {
        const [minPrice, maxPrice] = query.price.split("-");
        filter.price = {
          $gte: parseFloat(minPrice),
          $lte: parseFloat(maxPrice),
        };
      }

      // Handle filtering by flash sale
      if (query.flashSale) {
        const flashSale = query.flashSale === "true";
        filter.flashSale = flashSale;
      }

      // Handle filtering by top rated
      if (query.topRated) {
        const topRated = query.topRated === "true";
        filter.topRated = topRated;
      }

      try {
        // Fetch products based on the constructed filter
        const result = await productCollection.find(filter).toArray();

        // Return the result
        return res.status(200).json({
          success: true,
          message: "Products fetched successfully",
          result: result,
        });
      } catch (error) {
        // Handle any errors that may occur
        console.error("Error fetching products:", error);
        return res.status(500).json({
          success: false,
          message: "An error occurred while fetching products",
          error: error.message,
        });
      }
    });

    // ==============================================================
    app.get("/products/:id", async (req, res) => {
      try {
        const { id } = req.params;

        // Check if the id parameter is a valid ObjectId string
        if (!ObjectId.isValid(id)) {
          return res
            .status(400)
            .json({ success: false, error: "Invalid product ID" });
        }

        const result = await productCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!result) {
          return res
            .status(404)
            .json({ success: false, error: "Product not found" });
        }

        return res.status(200).json({
          success: true,
          message: "Product fetched successfully",
          result,
        });
      } catch (error) {
        console.error("Error:", error);
        return res
          .status(500)
          .json({ success: false, error: "Internal server error" });
      }
    });
    // ==============================================================
    app.get("*", async (req, res) => {
      return res.status(404).json({ error: "Api Not Found" });
    });
    // ==============================================================

    // Start the server
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } finally {
  }
}

run().catch(console.dir);

// Test route
app.get("/", (req, res) => {
  const serverStatus = {
    message: "Server is running smoothly",
    timestamp: new Date(),
  };
  res.json(serverStatus);
});
