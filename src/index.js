const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Example endpoint to fetch data from Supabase
app.get("/data", async (req, res) => {
  try {
    console.log("Supabase URL:", process.env.SUPABASE_URL);
    console.log("Attempting to fetch data from names table...");

    // Test the connection first
    const { data: connectionTest, error: connectionError } = await supabase
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

    // Proceed with the actual query
    const { data, error } = await supabase.from("names").select("*");

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
