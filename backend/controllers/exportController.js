const { all } = require('../../database/db');

// GET /api/export/properties
function exportPropertiesExcel(req, res) {
  try {
    const properties = all(`
      SELECT 
        p.id,
        p.title,
        CASE p.property_type
          WHEN 'apartment'  THEN 'آپارتمان'
          WHEN 'villa'      THEN 'ویلا'
          WHEN 'land'       THEN 'زمین'
          WHEN 'commercial' THEN 'تجاری'
          WHEN 'workshop'   THEN 'کارگاه'
          WHEN 'storage'    THEN 'انباری'
          WHEN 'garden'     THEN 'باغ'
          ELSE 'سایر'
        END as property_type,
        CASE p.deed_type
          WHEN 'single_page'  THEN 'تک برگ'
          WHEN 'mangooledar'  THEN 'منقوله دار'
          ELSE 'سایر'
        END as deed_type,
        l.name as location,
        p.area,
        p.total_price,
        p.price_per_meter,
        p.rooms,
        p.bathrooms,
        p.building_age,
        p.floor,
        p.direction,
        CASE p.parking  WHEN 1 THEN 'دارد' ELSE 'ندارد' END as parking,
        CASE p.storage  WHEN 1 THEN 'دارد' ELSE 'ندارد' END as storage,
        CASE p.elevator WHEN 1 THEN 'دارد' ELSE 'ندارد' END as elevator,
        CASE p.active   WHEN 1 THEN 'فعال' ELSE 'غیرفعال' END as status,
        u.full_name as owner_name,
        u.phone as owner_phone,
        p.description,
        p.created_at
      FROM properties p
      LEFT JOIN locations l ON p.location_id = l.id
      LEFT JOIN users u ON p.owner_id = u.id
      ORDER BY p.created_at DESC
    `);

    // Build CSV with BOM for Excel Persian support
    const headers = [
      'شناسه', 'عنوان', 'نوع ملک', 'نوع سند', 'منطقه',
      'متراژ', 'قیمت کل', 'قیمت هر متر', 'اتاق', 'سرویس',
      'سن بنا', 'طبقه', 'جهت', 'پارکینگ', 'انباری', 'آسانسور',
      'وضعیت', 'نام مالک', 'تلفن مالک', 'توضیحات', 'تاریخ ثبت'
    ];

    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    const rows = properties.map(p => [
      p.id, p.title, p.property_type, p.deed_type, p.location,
      p.area, p.total_price, p.price_per_meter, p.rooms, p.bathrooms,
      p.building_age, p.floor, p.direction, p.parking, p.storage, p.elevator,
      p.status, p.owner_name, p.owner_phone, p.description, p.created_at
    ].map(escapeCSV).join(','));

    const csv = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
    const date = new Date().toISOString().split('T')[0];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="mirhaj_properties_${date}.csv"`);
    res.send(csv);

  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ success: false, message: 'خطا در صدور گزارش' });
  }
}

// GET /api/export/users
function exportUsersExcel(req, res) {
  try {
    const users = all(`
      SELECT
        id,
        username,
        full_name,
        CASE role
          WHEN 'manager' THEN 'مدیر کل'
          WHEN 'agent'   THEN 'مشاور'
          ELSE 'کاربر عادی'
        END as role,
        phone, email, location,
        CASE active WHEN 1 THEN 'فعال' ELSE 'غیرفعال' END as status,
        created_at
      FROM users ORDER BY created_at DESC
    `);

    const headers = ['شناسه','نام کاربری','نام کامل','نقش','تلفن','ایمیل','محل سکونت','وضعیت','تاریخ عضویت'];

    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    const rows = users.map(u => [
      u.id, u.username, u.full_name, u.role,
      u.phone, u.email, u.location, u.status, u.created_at
    ].map(escapeCSV).join(','));

    const csv = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
    const date = new Date().toISOString().split('T')[0];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="mirhaj_users_${date}.csv"`);
    res.send(csv);

  } catch (err) {
    res.status(500).json({ success: false, message: 'خطا در صدور گزارش' });
  }
}

// GET /api/export/summary - خلاصه آماری JSON
function exportSummary(req, res) {
  try {
    const totalProps    = all(`SELECT COUNT(*) as c FROM properties`)[0]?.c || 0;
    const activeProps   = all(`SELECT COUNT(*) as c FROM properties WHERE active=1`)[0]?.c || 0;
    const totalUsers    = all(`SELECT COUNT(*) as c FROM users`)[0]?.c || 0;
    const totalAgents   = all(`SELECT COUNT(*) as c FROM users WHERE role='agent'`)[0]?.c || 0;

    const byType = all(`
      SELECT property_type, COUNT(*) as count
      FROM properties GROUP BY property_type ORDER BY count DESC
    `);

    const byLocation = all(`
      SELECT l.name, COUNT(*) as count
      FROM properties p LEFT JOIN locations l ON p.location_id=l.id
      GROUP BY p.location_id ORDER BY count DESC
    `);

    const priceStats = all(`
      SELECT
        MIN(total_price) as min_price,
        MAX(total_price) as max_price,
        AVG(total_price) as avg_price
      FROM properties WHERE active=1
    `)[0];

    res.json({
      success: true,
      summary: {
        totalProps, activeProps, totalUsers, totalAgents,
        byType, byLocation, priceStats
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطای سرور' });
  }
}

module.exports = { exportPropertiesExcel, exportUsersExcel, exportSummary };
