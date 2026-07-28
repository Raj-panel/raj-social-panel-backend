const PROVIDER_API = "https://wavesmmpanel.com/api/v2";

/**
 * Raj Social Panel
 * Provider API Proxy
 *
 * Supported Actions:
 * 1. balance
 * 2. services
 * 3. search
 * 4. order
 * 5. status
 */

module.exports = async (req, res) => {
    // ==========================================
    // CORS
    // ==========================================
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, OPTIONS"
    );
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type"
    );

    // OPTIONS request
    if (req.method === "OPTIONS") {
        return res.status(200).json({
            success: true
        });
    }

    try {
        // ==========================================
        // GET PROVIDER API KEY
        // Vercel Environment Variable
        // ==========================================
        const apiKey = process.env.WAVE_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                success: false,
                message: "WAVE_API_KEY is missing in Vercel Environment Variables"
            });
        }

        // ==========================================
        // READ REQUEST DATA
        // ==========================================
        const query = req.query || {};
        const body =
            typeof req.body === "object" && req.body !== null
                ? req.body
                : {};

        // ==========================================
        // GET ACTION
        // ==========================================
        const action =
            query.action ||
            body.action ||
            "balance";

        // ==========================================
        // PROVIDER REQUEST HELPER
        // ==========================================
        async function providerRequest(params) {

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

            const text = await response.text();

            let data;

            try {
                data = JSON.parse(text);
            } catch (error) {
                return {
                    httpError: true,
                    status: response.status,
                    raw: text
                };
            }

            return {
                httpError: !response.ok,
                status: response.status,
                data
            };
        }

        // ==========================================
        // 1. BALANCE
        //
        // Example:
        // /api?action=balance
        // ==========================================
        if (action === "balance") {

            const params = new URLSearchParams();

            params.append("key", apiKey);
            params.append("action", "balance");

            const result =
                await providerRequest(params);

            if (result.httpError) {
                return res.status(502).json({
                    success: false,
                    message:
                        "Provider API returned an HTTP error",
                    status: result.status,
                    provider: result.raw || result.data
                });
            }

            if (result.data?.error) {
                return res.status(400).json({
                    success: false,
                    message: result.data.error
                });
            }

            return res.status(200).json({
                success: true,
                provider: result.data
            });
        }

        // ==========================================
        // 2. SERVICES
        //
        // Example:
        // /api?action=services
        // ==========================================
        if (action === "services") {

            const params = new URLSearchParams();

            params.append("key", apiKey);
            params.append("action", "services");

            const result =
                await providerRequest(params);

            if (result.httpError) {
                return res.status(502).json({
                    success: false,
                    message:
                        "Provider API returned an HTTP error",
                    status: result.status,
                    provider: result.raw || result.data
                });
            }

            if (result.data?.error) {
                return res.status(400).json({
                    success: false,
                    message: result.data.error
                });
            }

            return res.status(200).json({
                success: true,
                services: result.data
            });
        }

        // ==========================================
        // 3. SEARCH SERVICES
        //
        // Example:
        // /api?action=search&query=Instagram
        // ==========================================
        if (action === "search") {

            const searchQuery =
                query.query ||
                body.query;

            if (!searchQuery) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Please provide a search term",
                    example:
                        "/api?action=search&query=Instagram"
                });
            }

            // Get all services
            const serviceParams =
                new URLSearchParams();

            serviceParams.append(
                "key",
                apiKey
            );

            serviceParams.append(
                "action",
                "services"
            );

            const result =
                await providerRequest(
                    serviceParams
                );

            if (result.httpError) {
                return res.status(502).json({
                    success: false,
                    message:
                        "Unable to fetch provider services",
                    status: result.status
                });
            }

            if (result.data?.error) {
                return res.status(400).json({
                    success: false,
                    message: result.data.error
                });
            }

            // ==========================================
            // SEARCH SERVICES LOCALLY
            // ==========================================
            const searchTerm =
                String(searchQuery)
                    .toLowerCase()
                    .trim();

            const allServices =
                Array.isArray(result.data)
                    ? result.data
                    : [];

            const filteredServices =
                allServices.filter(
                    (service) => {

                        const serviceId =
                            String(
                                service.service || ""
                            ).toLowerCase();

                        const serviceName =
                            String(
                                service.name || ""
                            ).toLowerCase();

                        const category =
                            String(
                                service.category || ""
                            ).toLowerCase();

                        return (
                            serviceId.includes(
                                searchTerm
                            ) ||

                            serviceName.includes(
                                searchTerm
                            ) ||

                            category.includes(
                                searchTerm
                            )
                        );
                    }
                );

            return res.status(200).json({
                success: true,
                query: searchQuery,
                count:
                    filteredServices.length,
                services:
                    filteredServices
            });
        }

        // ==========================================
        // 4. ADD ORDER
        //
        // Example:
        // /api?action=order
        // &service=784
        // &link=https://instagram.com/p/xxxx
        // &quantity=100
        // ==========================================
        if (action === "order") {

            const service =
                query.service ||
                body.service;

            const link =
                query.link ||
                body.link;

            const quantity =
                query.quantity ||
                body.quantity;

            // ==========================================
            // VALIDATE SERVICE
            // ==========================================
            if (!service) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Service ID is required"
                });
            }

            // ==========================================
            // VALIDATE LINK
            // ==========================================
            if (!link) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Target link is required"
                });
            }

            // ==========================================
            // VALIDATE QUANTITY
            // ==========================================
            if (
                quantity === undefined ||
                quantity === null ||
                quantity === ""
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Quantity is required"
                });
            }

            // ==========================================
            // CONVERT QUANTITY
            // ==========================================
            const numericQuantity =
                Number(quantity);

            // ==========================================
            // CHECK QUANTITY
            // ==========================================
            if (
                !Number.isFinite(
                    numericQuantity
                ) ||
                numericQuantity <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid quantity"
                });
            }

            // ==========================================
            // PROVIDER ORDER REQUEST
            // ==========================================
            const orderParams =
                new URLSearchParams();

            orderParams.append(
                "key",
                apiKey
            );

            orderParams.append(
                "action",
                "add"
            );

            orderParams.append(
                "service",
                String(service)
            );

            orderParams.append(
                "link",
                String(link)
            );

            orderParams.append(
                "quantity",
                String(numericQuantity)
            );

            // ==========================================
            // SEND ORDER TO PROVIDER
            // ==========================================
            const result =
                await providerRequest(
                    orderParams
                );

            // ==========================================
            // PROVIDER HTTP ERROR
            // ==========================================
            if (result.httpError) {
                return res.status(502).json({
                    success: false,
                    message:
                        "Provider API returned an HTTP error",
                    status: result.status,
                    provider:
                        result.raw ||
                        result.data
                });
            }

            // ==========================================
            // PROVIDER ERROR
            // ==========================================
            if (result.data?.error) {
                return res.status(400).json({
                    success: false,
                    message:
                        result.data.error,
                    provider:
                        result.data
                });
            }

            // ==========================================
            // ORDER SUCCESS
            // ==========================================
            return res.status(200).json({
                success: true,
                message:
                    "Order successfully submitted to provider",
                order:
                    result.data
            });
        }

        // ==========================================
        // 5. ORDER STATUS
        //
        // Example:
        // /api?action=status&order=12345
        // ==========================================
        if (action === "status") {

            const order =
                query.order ||
                body.order;

            // ==========================================
            // VALIDATE ORDER ID
            // ==========================================
            if (!order) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Provider order ID is required"
                });
            }

            // ==========================================
            // STATUS REQUEST
            // ==========================================
            const statusParams =
                new URLSearchParams();

            statusParams.append(
                "key",
                apiKey
            );

            statusParams.append(
                "action",
                "status"
            );

            statusParams.append(
                "order",
                String(order)
            );

            // ==========================================
            // SEND STATUS REQUEST
            // ==========================================
            const result =
                await providerRequest(
                    statusParams
                );

            // ==========================================
            // PROVIDER HTTP ERROR
            // ==========================================
            if (result.httpError) {
                return res.status(502).json({
                    success: false,
                    message:
                        "Provider API returned an HTTP error",
                    status: result.status,
                    provider:
                        result.raw ||
                        result.data
                });
            }

            // ==========================================
            // PROVIDER ERROR
            // ==========================================
            if (result.data?.error) {
                return res.status(400).json({
                    success: false,
                    message:
                        result.data.error,
                    provider:
                        result.data
                });
            }

            // ==========================================
            // STATUS SUCCESS
            // ==========================================
            return res.status(200).json({
                success: true,
                message:
                    "Order status fetched successfully",
                order:
                    result.data
            });
        }

        // ==========================================
        // INVALID ACTION
        // ==========================================
        return res.status(400).json({
            success: false,
            message:
                "Invalid action",
            availableActions: [
                "balance",
                "services",
                "search",
                "order",
                "status"
            ]
        });

    } catch (error) {

        // ==========================================
        // SERVER ERROR
        // ==========================================
        console.error(
            "Raj Social Panel API Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Internal server error",
            error:
                error.message
        });
    }
};
