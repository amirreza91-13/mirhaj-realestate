const { get, run, all } = require('../../database/db');

// POST /api/reviews
function addReview(req, res) {
  try {
    const { agent_id, rating, comment } = req.body;
    if (!agent_id || !rating) return res.status(400).json({ success: false, message: 'مشاور و امتیاز الزامی است' });
    if (rating < 1 || rating > 5) return res.status(400).json({ success: false, message: 'امتیاز باید بین ۱ تا ۵ باشد' });
    if (parseInt(agent_id) === req.user.id) return res.status(400).json({ success: false, message: 'نمی‌توانید به خودتان امتیاز بدهید' });

    const agent = get(`SELECT id FROM users WHERE id = ${parseInt(agent_id)} AND role IN ('agent','manager')`);
    if (!agent) return res.status(404).json({ success: false, message: 'مشاور یافت نشد' });

    const existing = get(`SELECT id FROM reviews WHERE reviewer_id = ${req.user.id} AND agent_id = ${parseInt(agent_id)}`);
    if (existing) {
      run(`UPDATE reviews SET rating = ?, comment = ?, updated_at = datetime('now') WHERE id = ${existing.id}`,
        [parseInt(rating), comment || null]);
      return res.json({ success: true, message: 'امتیاز بروزرسانی شد' });
    }

    run(`INSERT INTO reviews (reviewer_id, agent_id, rating, comment, created_at, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [req.user.id, parseInt(agent_id), parseInt(rating), comment || null]);

    return res.status(201).json({ success: true, message: 'امتیاز ثبت شد' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

// GET /api/reviews/agent/:agentId
function getAgentReviews(req, res) {
  try {
    const agentId = parseInt(req.params.agentId);
    const reviews = all(`
      SELECT r.*, u.full_name as reviewer_name, u.avatar as reviewer_avatar
      FROM reviews r LEFT JOIN users u ON r.reviewer_id = u.id
      WHERE r.agent_id = ${agentId}
      ORDER BY r.created_at DESC
    `);
    const stats = all(`SELECT AVG(rating) as avg_rating, COUNT(*) as total FROM reviews WHERE agent_id = ${agentId}`)[0];
    return res.json({ success: true, reviews, stats });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

// GET /api/reviews/agents
function getAgentsWithRatings(req, res) {
  try {
    const agents = all(`
      SELECT u.id, u.full_name, u.avatar, u.phone, u.role,
             ROUND(AVG(r.rating),1) as avg_rating,
             COUNT(DISTINCT r.id) as review_count,
             COUNT(DISTINCT p.id) as property_count
      FROM users u
      LEFT JOIN reviews r ON u.id = r.agent_id
      LEFT JOIN properties p ON u.id = p.owner_id AND p.active = 1
      WHERE u.role IN ('agent','manager') AND u.active = 1
      GROUP BY u.id
      ORDER BY avg_rating DESC, review_count DESC
    `);
    return res.json({ success: true, agents });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

module.exports = { addReview, getAgentReviews, getAgentsWithRatings };
