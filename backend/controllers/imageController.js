const fs = require('fs');
const path = require('path');
const { get, run, all } = require('../../database/db');

// POST /api/properties/:id/images
function uploadImage(req, res) {
  try {
    const { id } = req.params;
    const property = get(`SELECT * FROM properties WHERE id = ${parseInt(id)}`);

    if (!property) {
      // Remove uploaded file if property not found
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: 'آگهی یافت نشد' });
    }

    // Permission check
    const isOwner = property.owner_id === req.user.id;
    const isManagerOrAgent = ['manager', 'agent'].includes(req.user.role);
    if (!isOwner && !isManagerOrAgent) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(403).json({ success: false, message: 'دسترسی غیرمجاز' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'فایل تصویر انتخاب نشده' });
    }

    // Max 3 images
    const imageCount = all(`SELECT COUNT(*) as count FROM property_images WHERE property_id = ${parseInt(id)}`);
    if (imageCount[0]?.count >= 3) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'حداکثر ۳ تصویر برای هر آگهی مجاز است' });
    }

    // First image is primary
    const isPrimary = imageCount[0]?.count === 0 ? 1 : 0;
    const filepath = `uploads/${req.file.filename}`;

    const result = run(
      `INSERT INTO property_images (property_id, filename, filepath, is_primary, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`,
      [parseInt(id), req.file.filename, filepath, isPrimary]
    );

    const image = get(`SELECT * FROM property_images WHERE id = ${result.lastInsertRowid}`);
    return res.status(201).json({ success: true, message: 'تصویر با موفقیت آپلود شد', image });
  } catch (err) {
    console.error('Upload image error:', err);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

// DELETE /api/images/:id
function deleteImage(req, res) {
  try {
    const { id } = req.params;
    const image = get(`SELECT * FROM property_images WHERE id = ${parseInt(id)}`);

    if (!image) {
      return res.status(404).json({ success: false, message: 'تصویر یافت نشد' });
    }

    const property = get(`SELECT * FROM properties WHERE id = ${image.property_id}`);
    const isOwner = property && property.owner_id === req.user.id;
    const isManagerOrAgent = ['manager', 'agent'].includes(req.user.role);

    if (!isOwner && !isManagerOrAgent) {
      return res.status(403).json({ success: false, message: 'دسترسی غیرمجاز' });
    }

    // Delete file from filesystem
    const fullPath = path.join(__dirname, '../../', image.filepath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    run(`DELETE FROM property_images WHERE id = ${parseInt(id)}`);

    // If deleted image was primary, set next image as primary
    if (image.is_primary) {
      const nextImage = get(`SELECT id FROM property_images WHERE property_id = ${image.property_id} LIMIT 1`);
      if (nextImage) {
        run(`UPDATE property_images SET is_primary = 1 WHERE id = ${nextImage.id}`);
      }
    }

    return res.json({ success: true, message: 'تصویر با موفقیت حذف شد' });
  } catch (err) {
    console.error('Delete image error:', err);
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

// PUT /api/images/:id/primary
function setPrimaryImage(req, res) {
  try {
    const { id } = req.params;
    const image = get(`SELECT * FROM property_images WHERE id = ${parseInt(id)}`);

    if (!image) {
      return res.status(404).json({ success: false, message: 'تصویر یافت نشد' });
    }

    const property = get(`SELECT * FROM properties WHERE id = ${image.property_id}`);
    const isOwner = property && property.owner_id === req.user.id;
    const isManagerOrAgent = ['manager', 'agent'].includes(req.user.role);

    if (!isOwner && !isManagerOrAgent) {
      return res.status(403).json({ success: false, message: 'دسترسی غیرمجاز' });
    }

    run(`UPDATE property_images SET is_primary = 0 WHERE property_id = ${image.property_id}`);
    run(`UPDATE property_images SET is_primary = 1 WHERE id = ${parseInt(id)}`);

    return res.json({ success: true, message: 'تصویر اصلی تغییر کرد' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

module.exports = { uploadImage, deleteImage, setPrimaryImage };
