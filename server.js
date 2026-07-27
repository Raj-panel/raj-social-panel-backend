const express = require("express");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;
const API_URL = "https://wavesmmpanel.com/api/v2";

// Home
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Raj Social Panel Backend is running!"
    });
});

// Wave SMM API
app.get("/api", async (req, res) => {
    try {
        const apiKey = process.env.WAVE_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                success: false,
                message: "WAVE_API_KEY is missing in Vercel Environment Variables"
            });
        }

        const action = req.query.action || "balance";

        const params = new URLSearchParams();
        params.append("key", apiKey);
        params.append("action", action);

        // Search services
        if (action === "search") {
            const query = req.query.query;

            if (!query) {
                return res.status(400).json({
                    success: false,
                    message: "Please provide a search term"
                });
            }

            params.append("query", query);
        }

        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: params.toString()
        });

        const data = await response.json();

        res.json({
            success: true,
            provider: data
        });

    } catch (error) {
        console.error("Provider API Error:", error);

        res.status(500).json({
            success: false,
            message: "Provider API request failed",
            error: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
