const SERVICE_MAP = {
    instagram: {
        followers: 1192,
        likes: 784,
        comments: 31,
        shares: 49,
        views: 10,
        repost: 505,
        photo_views: 1027
    },

    facebook: {
        followers: 1283,
        views: 1119,
        shares: 460,
        comments: 406
    }
};

module.exports = async (req, res) => {
    try {
        const apiKey = process.env.WAVE_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                success: false,
                message: "WAVE_API_KEY is missing"
            });
        }

        const action = req.query.action || "balance";

        // Return our Service Mapping
        if (action === "mapping") {
            return res.status(200).json({
                success: true,
                services: SERVICE_MAP
            });
        }

        const params = new URLSearchParams();

        params.append("key", apiKey);
        params.append("action", action);

        // Search Provider Services
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

        const response = await fetch(
            "https://wavesmmpanel.com/api/v2",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: params.toString()
            }
        );

        const data = await response.json();

        return res.status(200).json({
            success: true,
            provider: data
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Provider API request failed",
            error: error.message
        });
    }
};
