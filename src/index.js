const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");
require("dotenv").config();

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, "../public")));

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Authentication middleware
const authenticateUser = async (req, res, next) => {
  console.log("Auth middleware triggered");
  console.log("Headers:", req.headers);

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    console.log("No authorization header present");
    return res.status(401).json({
      error: "Authentication required",
      message: "Please provide a valid authentication token",
    });
  }

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Invalid token format",
      message: "Authorization header must start with 'Bearer'",
    });
  }

  try {
    // Get the token from the Authorization header
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        error: "Invalid token",
        message: "Token is empty",
      });
    }

    // Verify the user's token with Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error) {
      console.error("Token verification error:", error);
      return res.status(401).json({
        error: "Invalid token",
        message: "The provided token is invalid or has expired",
      });
    }

    if (!user) {
      return res.status(401).json({
        error: "User not found",
        message: "No user associated with this token",
      });
    }

    // Add the user to the request object
    req.user = user;

    // Add user ID to request logs
    console.log(`Authenticated request from user: ${user.id}`);

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(500).json({
      error: "Authentication failed",
      message: "An error occurred during authentication",
    });
  }
};

// Routes
// Health check endpoint (unprotected)
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Test auth endpoint
app.get("/test-auth", authenticateUser, (req, res) => {
  res.json({
    message: "Authentication successful",
    user: req.user,
    headers: req.headers,
  });
});

// Protected endpoint to fetch data from Supabase
app.get("/data", authenticateUser, async (req, res) => {
  console.log("Data endpoint accessed");
  console.log("User:", req.user);

  if (!req.user) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "You must be authenticated to access this endpoint",
    });
  }

  try {
    console.log("Supabase URL:", process.env.SUPABASE_URL);
    console.log("Attempting to fetch data from names table...");

    // Get the user's access token
    const accessToken = req.headers.authorization.replace("Bearer ", "");

    // Create a new Supabase client with the user's token
    const userClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }
    );

    // Test the connection first with the user's client
    const { data: connectionTest, error: connectionError } = await userClient
      .from("names")
      .select("count");
    if (connectionError) {
      console.error("Connection test failed:", connectionError);
      return res.status(500).json({
        error: "Connection test failed",
        details: connectionError,
      });
    }
    console.log("Connection test successful:", connectionTest);

    // Proceed with the actual query using the user's client
    const { data, error } = await userClient.from("names").select("*");

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({
        error: error.message,
        details: error.details,
        hint: error.hint,
      });
    }

    if (!data || data.length === 0) {
      console.log("No data found in names table");
      return res.json({
        message: "No data found in table",
        data: [],
        tableQueried: "names",
      });
    }

    console.log("Successfully retrieved data:", data);
    res.json(data);
  } catch (error) {
    console.error("Unexpected error:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
