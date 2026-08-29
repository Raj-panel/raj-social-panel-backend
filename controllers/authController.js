// controllers/authController.js

// উদাহরণস্বরূপ User Registration Controller
exports.registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // প্রাথমিক রেসপন্স (STEP 2 এবং পরবর্তী ধাপে আমরা আসল Auth Logic & DB Integration সম্পন্ন করব)
    res.status(200).json({
      success: true,
      message: "User registered successfully",
      data: { username, email }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message
    });
  }
};