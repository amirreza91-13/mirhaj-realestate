const path = require('path');
const fs = require('fs');

// sql.js setup - saves to file
const initSqlJs = require('sql.js');

const DB_PATH = path.join(__dirname, 'mirhaj.db');

let db = null;

// Save database to file
function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

// Auto-save every 30 seconds
setInterval(saveDatabase, 30000);

// Save on process exit
process.on('exit', saveDatabase);
process.on('SIGINT', () => { saveDatabase(); process.exit(); });
process.on('SIGTERM', () => { saveDatabase(); process.exit(); });

async function initializeDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log('✅ دیتابیس موجود بارگذاری شد');
  } else {
    db = new SQL.Database();
    console.log('✅ دیتابیس جدید ساخته شد');
  }

  createTables();
  seedData();
  saveDatabase();

  return db;
}

function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      location TEXT,
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('manager', 'agent', 'user')),
      avatar INTEGER NOT NULL DEFAULT 1 CHECK(avatar BETWEEN 1 AND 5),
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL DEFAULT 'village' CHECK(type IN ('city', 'village')),
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS properties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      property_type TEXT NOT NULL CHECK(property_type IN ('apartment','villa','land','commercial','workshop','storage','garden','other')),
      deed_type TEXT NOT NULL CHECK(deed_type IN ('single_page','mangooledar','gholanome','mobayeeh','sabz','zard','other')),
      location_id INTEGER NOT NULL,
      area REAL NOT NULL,
      total_price REAL NOT NULL,
      price_per_meter REAL,
      rooms INTEGER NOT NULL DEFAULT 0,
      bathrooms INTEGER NOT NULL DEFAULT 0,
      building_age INTEGER,
      floor INTEGER,
      direction TEXT,
      parking INTEGER NOT NULL DEFAULT 0,
      storage INTEGER NOT NULL DEFAULT 0,
      elevator INTEGER NOT NULL DEFAULT 0,
      description TEXT,
      map_lat REAL,
      map_lng REAL,
      owner_id INTEGER NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (location_id) REFERENCES locations(id),
      FOREIGN KEY (owner_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS property_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      filepath TEXT NOT NULL,
      is_primary INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id INTEGER,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS registration_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      full_name TEXT NOT NULL,
      ip TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Indexes
  db.run(`CREATE INDEX IF NOT EXISTS idx_properties_location ON properties(location_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_properties_owner ON properties(owner_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(property_type)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_properties_active ON properties(active)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_property_images_property ON property_images(property_id)`);

  // Messages table
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      property_id INTEGER,
      subject TEXT,
      body TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (receiver_id) REFERENCES users(id),
      FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)`);
  // Notifications table
  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'info',
      title TEXT NOT NULL,
      body TEXT,
      link TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`);
  // Bookmarks table
  db.run(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      property_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, property_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id)`);

  // Reviews table
  db.run(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reviewer_id INTEGER NOT NULL,
      agent_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(reviewer_id, agent_id),
      FOREIGN KEY (reviewer_id) REFERENCES users(id),
      FOREIGN KEY (agent_id) REFERENCES users(id)
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_reviews_agent ON reviews(agent_id)`);

  // Add label column to properties if not exists
  try { db.run(`ALTER TABLE properties ADD COLUMN label TEXT DEFAULT NULL`); } catch(e) {}
  // Fix deed_type constraint - SQLite doesn't support ALTER CONSTRAINT so we handle in app level
  // Add view_count column to properties if not exists
  try { db.run(`ALTER TABLE properties ADD COLUMN view_count INTEGER DEFAULT 0`); } catch(e) {}

  console.log('✅ جداول دیتابیس ساخته شدند');
}

function seedData() {
  // Seed locations
  const locationCount = db.exec(`SELECT COUNT(*) as count FROM locations`);
  if (locationCount[0].values[0][0] === 0) {
    const cities = ['نصرآباد', 'محمدآباد', 'نیک‌آباد'];
    const villages = [
      'حسین‌آباد', 'پیکان', 'قرنه', 'سیان',
      'آذرخواران', 'حیدرآباد', 'رحیم‌آباد',
      'سعادت‌آباد', 'گنج‌آباد'
    ];

    cities.forEach(name => {
      db.run(`INSERT INTO locations (name, type) VALUES (?, ?)`, [name, 'city']);
    });
    villages.forEach(name => {
      db.run(`INSERT INTO locations (name, type) VALUES (?, ?)`, [name, 'village']);
    });
    console.log('✅ لوکیشن‌ها اضافه شدند');
  }

  // Seed manager account
  const managerCount = db.exec(`SELECT COUNT(*) as count FROM users WHERE role = 'manager'`);
  if (managerCount[0].values[0][0] === 0) {
    const bcrypt = require('bcrypt');
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.run(
      `INSERT INTO users (username, password, full_name, role, avatar) VALUES (?, ?, ?, ?, ?)`,
      ['admin', hashedPassword, 'مدیر کل', 'manager', 1]
    );
    console.log('✅ اکانت مدیر ساخته شد - username: admin | password: admin123');
  }

  // Seed sample properties
  const propCount = db.exec(`SELECT COUNT(*) as count FROM properties`);
  if (propCount[0].values[0][0] === 0) {
    const adminUser = db.exec(`SELECT id FROM users WHERE username = 'admin'`);
    if (adminUser[0] && adminUser[0].values.length > 0) {
      const adminId = adminUser[0].values[0][0];

      const sampleProperties = [
        {
          title: 'آپارتمان دو خوابه در نصرآباد',
          property_type: 'apartment',
          deed_type: 'single_page',
          location_id: 1,
          area: 85,
          total_price: 2500000000,
          rooms: 2,
          bathrooms: 1,
          building_age: 5,
          floor: 2,
          parking: 1,
          description: 'آپارتمان تمیز و نورگیر در موقعیت عالی'
        },
        {
          title: 'زمین مسکونی در محمدآباد',
          property_type: 'land',
          deed_type: 'mangooledar',
          location_id: 2,
          area: 200,
          total_price: 1200000000,
          rooms: 0,
          bathrooms: 0,
          description: 'زمین مناسب برای ساخت ویلا'
        },
        {
          title: 'ویلا باغ در حسین‌آباد',
          property_type: 'villa',
          deed_type: 'single_page',
          location_id: 4,
          area: 300,
          total_price: 4500000000,
          rooms: 3,
          bathrooms: 2,
          building_age: 10,
          parking: 1,
          storage: 1,
          description: 'ویلای دلباز با باغ بزرگ و دید عالی'
        }
      ];

      sampleProperties.forEach(p => {
        const ppm = p.total_price / p.area;
        db.run(
          `INSERT INTO properties 
           (title, property_type, deed_type, location_id, area, total_price, price_per_meter, rooms, bathrooms, building_age, floor, parking, storage, elevator, description, owner_id, active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            p.title, p.property_type, p.deed_type, p.location_id,
            p.area, p.total_price, ppm,
            p.rooms || 0, p.bathrooms || 0,
            p.building_age || null, p.floor || null,
            p.parking || 0, p.storage || 0, p.elevator || 0,
            p.description || null, adminId
          ]
        );
      });
      console.log('✅ نمونه آگهی‌ها اضافه شدند');
    }
  }

  saveDatabase();
}

// Query helpers
function all(sql, params = []) {
  try {
    const result = db.exec(sql.replace(/\?/g, () => {
      const val = params.shift();
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'number') return val;
      return `'${String(val).replace(/'/g, "''")}'`;
    }));
    if (!result || result.length === 0) return [];
    const { columns, values } = result[0];
    return values.map(row => {
      const obj = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });
  } catch (err) {
    console.error('DB all error:', err.message, sql);
    return [];
  }
}

function get(sql, params = []) {
  const rows = all(sql, params);
  return rows[0] || null;
}

function run(sql, params = []) {
  try {
    const paramsCopy = [...params];
    db.run(sql.replace(/\?/g, () => {
      const val = paramsCopy.shift();
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'number') return val;
      return `'${String(val).replace(/'/g, "''")}'`;
    }));
    // Get last insert rowid
    const result = db.exec('SELECT last_insert_rowid() as id');
    const lastId = result[0]?.values[0][0] || 0;
    saveDatabase();
    return { lastInsertRowid: lastId, changes: 1 };
  } catch (err) {
    console.error('DB run error:', err.message, sql);
    throw err;
  }
}

module.exports = { initializeDatabase, all, get, run, saveDatabase };
