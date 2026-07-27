const https = require("https");

module.exports = (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed"
    });
  }

  const apiKey = process.env.WAVE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      success: false,
      message: "WAVE_API_KEY is not configured"
    });
  }

  const postData = new URLSearchParams({
    key: apiKey,
    action: "balance"
  }).toString();

  const options = {
    hostname: "wavesmmpanel.com",
    path: "/api/v2",
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(postData)
    }
  };

  const request = https.request(options, (response) => {
    let data = "";

    response.on("data", (chunk) => {
      data += chunk;
    });

    response.on("end", () => {
      try {
        const result = JSON.parse(data);

        return res.status(response.statusCode || 200).json({
          success: true,
          provider: result
        });
      } catch (error) {
        return res.status(502).json({
          success: false,
          message: "Invalid response from provider",
          raw: data
        });
      }
    });
  });

  request.on("error", (error) => {
    return res.status(500).json({
      success: false,
      message: "Provider connection failed",
      error: error.message
    });
  });

  request.write(postData);
  request.end();
};
