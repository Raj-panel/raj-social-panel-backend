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
        } catch {
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

  const search = req.query.search;

  if (!search) {
    return res.status(400).json({
      success: false,
      message: "Please provide a search term"
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

    const searchWords = search
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    const results = services.filter((service) => {
      const text = [
        service.service,
        service.name,
        service.category,
        service.type,
        service.description
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchWords.every((word) => text.includes(word));
    });

    return res.status(200).json({
      success: true,
      search: search,
      count: results.length,
      services: results.slice(0, 50)
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Provider API request failed",
      error: error.message
    });
  }
};
