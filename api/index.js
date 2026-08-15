// api/index.js
// Minimal CommonJS Vercel Serverless Function
module.exports = (req, res) => {
  res.status(200).json({ ok: true, message: "Hello from api/index.js" });
};
