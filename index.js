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
    const orderCollection = db.collection("orders");

    // User Registration
    app.post("/register", async (req, res) => {
      const { name, email, password } = req.body;

      // Check if email already exists
      try {
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
        await collection.insertOne({
          name,
          email,
          password: hashedPassword,
          role: "user",
        });

        res.status(201).json({
          success: true,
          message: "User registered successfully",
        });
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Too many request !!! Try after reloading",
        });
      }
    });

    // User Login
    app.post("/login", async (req, res) => {
      const { email, password } = req.body;

      // Find user by email
      try {
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
        const token = jwt.sign(
          { email: user?.email, name: user?.name, role: user?.role },
          process.env.JWT_SECRET,
          {
            expiresIn: process.env.EXPIRES_IN,
          }
        );

        res.json({
          success: true,
          message: "Login successful",
          token,
        });
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Too many request !!! Try after reloading",
        });
      }
    });

    // ==============================================================
    // WRITE YOUR CODE HERE

    app.post("/products", async (req, res) => {
      const products = req.body;
      try {
        const result = await productCollection.insertOne(products);
        return res.status(200).json({
          success: true,
          message: "Product created successfully!!!",
          result,
        });
      } catch (error) {
        return res.status(404).json({
          success: false,
          message: "something went wrong",
          result,
        });
      }
    });

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

    app.delete("/products/:id", async (req, res) => {
      try {
        const id = req.params.id;
        console.log(id);
        const result = await productCollection.findOneAndDelete({
          _id: new ObjectId(id),
        });
        console.log(result);
        return res.status(200).json({
          success: true,
          message: "A Product is deleted successfully!!!",
          result,
        });
      } catch (error) {
        return res.status(404).json({
          success: false,
          message: "Something went wrong!!",
        });
      }
    });
    app.put("/products/:id", async (req, res) => {
      const id = req.params.id;
      const updatedProduct = req.body;
      try {
        const result = await productCollection.findOneAndUpdate(
          { _id: new ObjectId(id) },
          { $set: updatedProduct }
        );
        console.log(result);
        return res.status(200).json({
          success: true,
          message: "A Product is updated successfully!!!",
          result,
        });
      } catch (error) {
        // Handle other errors
        console.error("Error updating product:", error);
        return res.status(500).json({
          success: false,
          message: "Something went wrong!!!",
          error: error.message,
        });
      }
    });
    app.get("/products/filter", async (req, res) => {
      const query = req.query;

      let filter = {};
      if (query.rating) {
        filter.rating = Number(query.rating);
      }
      if (query.category) {
        filter.category = query.category;
      }
      if (query.price) {
        const [minPrice, maxPrice] = query.price.split("-");
        filter.price = {
          $gte: parseFloat(minPrice),
          $lte: parseFloat(maxPrice),
        };
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
    app.get("/products/filter/flash-sales", async (req, res) => {
      try {
        const result = await productCollection
          .find({ flashSale: true })
          .toArray();
        return res.status(200).json({
          success: true,
          message: "Flash Sales Products fetched successfully",
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
    app.get("/products/filter/top-rated", async (req, res) => {
      try {
        const result = await productCollection
          .find({ topRated: true })
          .toArray();
        return res.status(200).json({
          success: true,
          message: "Top Rated Products fetched successfully",
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
    // orders section
    app.post("/orders", async (req, res) => {
      const order = req.body;
      const orderInfo = {
        ...order,
        status: "pending",
        invoiceDate: new Date(),
        invoiceNumber:
          Date.now().toString().slice(-8) + Math.floor(Math.random() * 10),
      };

      // console.log(orderInfo);
      const result = await orderCollection.insertOne(orderInfo);

      return res.status(200).json({
        success: true,
        message: "Order placed successfully!!!",
        result,
      });
    });
    app.patch("/orders/:id", async (req, res) => {
      const id = req.params.id;
      try {
        const result = await orderCollection.findOneAndUpdate(
          { _id: new ObjectId(id) },
          { $set: { status: "delivered" } } // Update the status to "delivered"
        );

        return res.status(200).json({
          success: true,
          message: "Order updated successfully!!!",
          result,
        });
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "something went wrong!!!",
          result,
        });
      }
    });
    app.get("/my-orders/:email", async (req, res) => {
      const { email } = req.params;
      try {
        const result = await orderCollection.find({ email }).toArray();

        return res.status(200).json({
          success: true,
          message: "My orders fetched successfully!!!",
          result,
        });
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "something went wrong!!!",
          result,
        });
      }
    });
    app.get("/orders/:id", async (req, res) => {
      const id = req.params.id;
      try {
        const result = await orderCollection.findOne({
          _id: new ObjectId(id),
        });

        return res.status(200).json({
          success: true,
          message: "Single Order fetched successfully!!!",
          result,
        });
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "something went wrong!!!",
          result,
        });
      }
    });
    app.delete("/orders/:id", async (req, res) => {
      const id = req.params.id;
      try {
        const result = await orderCollection.findOneAndDelete({
          _id: new ObjectId(id),
        });

        return res.status(200).json({
          success: true,
          message: "Order deleted successfully!!!",
          result,
        });
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "something went wrong!!!",
          result,
        });
      }
    });
    app.get("/orders", async (req, res) => {
      const result = await orderCollection.find().toArray();

      return res.status(200).json({
        success: true,
        message: "Orders get successfully!!!",
        result,
      });
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
