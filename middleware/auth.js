export function apiKeyAuth(req, res, next) {
  const key = req.headers["x-api-key"];
  const expected = process.env.MYBOT_API_KEY;

  // If you haven't set a key yet, fail closed.
  if (!expected) {
    return res.status(500).json({ error: "Server misconfigured: MYBOT_API_KEY not set" });
  }

  if (!key || key !== expected) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}
