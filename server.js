const express = require("express");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Raj Social Panel Backend is running!"
    });
});

// Check Wave SMM API connection
app.get("/api", async (req, res) => {
    try {
        const response = await fetch("https://wavesmmpanel.com/api/v2", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                key: process.env.WAVE_API_KEY,
                action: "balance"
            })
        });

        const data = await response.json();

        res.json({
            success: true,
            provider: data
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
