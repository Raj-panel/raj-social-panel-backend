const express = require("express");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;

// Home
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Raj Social Panel Backend is running!"
    });
});

// Provider API Test
app.get("/api", async (req, res) => {
    try {
        const apiKey = process.env.WAVE_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                success: false,
                message: "WAVE_API_KEY is missing"
            });
        }

        const response = await fetch("https://wavesmmpanel.com/api/v2", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
                key: apiKey,
                action: "balance"
            })
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
