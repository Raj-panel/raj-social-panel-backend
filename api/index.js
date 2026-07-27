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
          resolve(JSON.parse(data));
        } catch (error) {
          reject(new Error("Invalid provider response"));
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

  const serviceId = req.query.service;

  if (!serviceId) {
    return res.status(400).json({
      success: false,
      message: "Please provide a service ID"
    });
  }

  try {
    const postData = new URLSearchParams({
      key: apiKey,
      action: "services"
    }).toString();

    const services = await callWaveAPI(postData);

    if (!Array.isArray(services)) {
      return res.status(502).json({
        success: false,
        message: "Unexpected provider response"
      });
    }

    const service = services.find(
      (item) => String(item.service) === String(serviceId)
    );

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found"
      });
    }

    return res.status(200).json({
      success: true,
      service: service
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Provider API request failed",
      error: error.message
    });
  }
};
