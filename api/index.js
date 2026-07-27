const PROVIDER_API = "https://wavesmmpanel.com/api/v2";

module.exports = async (req, res) => {
    try {
        // ==============================
        // Provider API Key
        // Vercel Environment Variable
        // ==============================
        const apiKey = process.env.WAVE_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                success: false,
                message: "WAVE_API_KEY is missing"
            });
        }

        // ==============================
        // Get Action
        // ==============================
        const action = req.query.action || req.body?.action || "balance";

        // ==============================
        // Create Provider Request Params
        // ==============================
        const params = new URLSearchParams();

        params.append("key", apiKey);

        // ==========================================
        // 1. BALANCE
        // /api?action=balance
        // ==========================================
        if (action === "balance") {

            params.append("action", "balance");
        }

        // ==========================================
        // 2. SERVICES
        // /api?action=services
        // ==========================================
        else if (action === "services") {

            params.append("action", "services");
        }

        // ==========================================
        // 3. SEARCH
        // /api?action=search&query=instagram
        // ==========================================
        else if (action === "search") {

            const query =
                req.query.query ||
                req.body?.query;

            if (!query) {
                return res.status(400).json({
                    success: false,
                    message: "Please provide a search term"
                });
            }

            params.append("action", "search");
            params.append("query", query);
        }

        // ==========================================
        // 4. ADD ORDER
        // /api?action=order
        //
        // Required:
        // service
        // link
        // quantity
        //
        // Example:
        // ?action=order
        // &service=784
        // &link=https://instagram.com/p/xxxx
        // &quantity=100
        // ==========================================
        else if (action === "order") {

            const service =
                req.query.service ||
                req.body?.service;

            const link =
                req.query.link ||
                req.body?.link;

            const quantity =
                req.query.quantity ||
                req.body?.quantity;

            // Validate Service ID
            if (!service) {
                return res.status(400).json({
                    success: false,
                    message: "Service ID is required"
                });
            }

            // Validate Link
            if (!link) {
                return res.status(400).json({
                    success: false,
                    message: "Target link is required"
                });
            }

            // Validate Quantity
            if (!quantity) {
                return res.status(400).json({
                    success: false,
                    message: "Quantity is required"
                });
            }

            // Validate Quantity Number
            const numericQuantity = Number(quantity);

            if (
                !Number.isFinite(numericQuantity) ||
                numericQuantity <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid quantity"
                });
            }

            // Provider API action
            params.append("action", "add");

            // Provider Service ID
            params.append("service", service);

            // Target URL
            params.append("link", link);

            // Quantity
            params.append(
                "quantity",
                String(numericQuantity)
            );
        }

        // ==========================================
        // 5. ORDER STATUS
        // /api?action=status&order=12345
        // ==========================================
        else if (action === "status") {

            const order =
                req.query.order ||
                req.body?.order;

            if (!order) {
                return res.status(400).json({
                    success: false,
                    message: "Provider order ID is required"
                });
            }

            params.append("action", "status");
            params.append("order", order);
        }

        // ==========================================
        // INVALID ACTION
        // ==========================================
        else {

            return res.status(400).json({
                success: false,
                message: "Invalid action",
                availableActions: [
                    "balance",
                    "services",
                    "search",
                    "order",
                    "status"
                ]
            });
        }

        // ==========================================
        // Send Request To Provider
        // ==========================================
        const response = await fetch(
            PROVIDER_API,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded"
                },

                body: params.toString()
            }
        );

        // ==========================================
        // Provider HTTP Error
        // ==========================================
        if (!response.ok) {
            return res.status(502).json({
                success: false,
                message: "Provider API returned an HTTP error",
                status: response.status
            });
        }

        // ==========================================
        // Read Provider Response
        // ==========================================
        const data = await response.json();

        // ==========================================
        // Provider Error
        // ==========================================
        if (data.error) {
            return res.status(400).json({
                success: false,
                message: data.error
            });
        }

        // ==========================================
        // ORDER SUCCESS
        // ==========================================
        if (action === "order") {

            return res.status(200).json({
                success: true,
                message: "Order successfully submitted to provider",
                provider: data
            });
        }

        // ==========================================
        // STATUS SUCCESS
        // ==========================================
        if (action === "status") {

            return res.status(200).json({
                success: true,
                message: "Order status fetched successfully",
                provider: data
            });
        }

        // ==========================================
        // GENERAL SUCCESS
        // ==========================================
        return res.status(200).json({
            success: true,
            provider: data
        });

    } catch (error) {

        console.error(
            "Provider API Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Provider API request failed",
            error: error.message
        });
    }
};
