const https = require("https");

function callWaveAPI(postData) {
  return new Promise((resolve, reject) => {
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
          resolve({
            statusCode: response.statusCode,
            data: JSON.parse(data)
          });
        } catch (error) {
          reject(new Error("Invalid response from WaveSMMPanel"));
        }
      });
    });

    request.on("error", reject);

    request.write(postData);
    request.end();
  });
}

module.exports = async (req, res) => {
  const apiKey = process.env.WAVE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      success: false,
      message: "WAVE_API_KEY is not configured"
    });
  }

  const action = req.query.action || "balance";

  try {
    if (action === "balance") {
      const postData = new URLSearchParams({
        key: apiKey,
        action: "balance"
      }).toString();

      const result = await callWaveAPI(postData);

      return res.status(200).json({
        success: true,
        action: "balance",
        provider: result.data
      });
    }

    if (action === "services") {
      const postData = new URLSearchParams({
        key: apiKey,
        action: "services"
      }).toString();

      const result = await callWaveAPI(postData);

      return res.status(200).json({
        success: true,
        action: "services",
        provider: result.data
      });
    }

    return res.status(400).json({
      success: false,
      message: "Invalid action. Use ?action=balance or ?action=services"
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "WaveSMMPanel API request failed",
      error: error.message
    });
  }
};
