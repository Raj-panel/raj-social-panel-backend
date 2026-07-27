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

const API_URL = "https://wavesmmpanel.com/api/v2";

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

        // Show our mapped Service IDs
        if (action === "mapping") {
            return res.status(200).json({
                success: true,
                services: SERVICE_MAP
            });
        }

        // Get Provider Services and return only our selected IDs
        if (action === "verify-services") {

            const params = new URLSearchParams();
            params.append("key", apiKey);
            params.append("action", "services");

            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: params.toString()
            });

            const providerData = await response.json();

            if (!Array.isArray(providerData)) {
                return res.status(200).json({
                    success: false,
                    message: "Provider did not return a service list",
                    provider: providerData
                });
            }

            const selectedIds = Object.values(SERVICE_MAP)
                .flatMap(platform => Object.values(platform));

            const selectedServices = providerData.filter(service =>
                selectedIds.includes(Number(service.service))
            );

            return res.status(200).json({
                success: true,
                count: selectedServices.length,
                services: selectedServices
            });
        }

        // Create Provider Order
        if (action === "add") {
            const platform = req.query.platform;
            const service = req.query.service;
            const link = req.query.link;
            const quantity = Number(req.query.quantity);

            if (!platform || !service || !link || !quantity) {
                return res.status(400).json({
                    success: false,
                    message: "platform, service, link and quantity are required"
                });
            }

            if (!SERVICE_MAP[platform] ||
                !SERVICE_MAP[platform][service]) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid platform or service"
                });
            }

            const providerServiceId =
                SERVICE_MAP[platform][service];

            const params = new URLSearchParams();

            params.append("key", apiKey);
            params.append("action", "add");
            params.append("service", providerServiceId);
            params.append("link", link);
            params.append("quantity", quantity);

            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded"
                },
                body: params.toString()
            });

            const data = await response.json();

            return res.status(200).json({
                success: true,
                provider: data
            });
        }

        // Provider API actions
        const params = new URLSearchParams();

        params.append("key", apiKey);
        params.append("action", action);

        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type":
                    "application/x-www-form-urlencoded"
            },
            body: params.toString()
        });

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
