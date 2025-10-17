# ClickHouse Database Management Scripts

This document explains the different ClickHouse management scripts and when to use each one.

---

## 📜 Available Scripts

### 1. `npm run clickhouse:init`
**File:** `scripts/init-clickhouse.js`

**What it does:**
- Creates database and tables **if they don't exist**
- Safe operation - won't drop existing data
- Uses `CREATE TABLE IF NOT EXISTS`

**Use when:**
- ✅ First time setup
- ✅ Tables don't exist yet
- ✅ You want to be safe (no data loss)
- ✅ After running `clickhouse:clean`

**Example:**
```bash
npm run clickhouse:init
```

---

### 2. `npm run clickhouse:clean` 🆕
**File:** `scripts/clean-clickhouse.js`

**What it does:**
- **Drops all tables** (deletes everything)
- Does NOT recreate tables
- Includes double confirmation prompts
- Gives you flexibility to recreate manually

**Use when:**
- ✅ Want a clean slate
- ✅ Planning to create custom schema manually
- ✅ Need to drop tables without opinionated recreation
- ✅ Testing different schema designs

**Example:**
```bash
npm run clickhouse:clean
# Then either:
npm run clickhouse:init              # Recreate with default schema
# Or manually create your custom schema
```

**Safety Features:**
- ⚠️ Asks for confirmation (yes/no)
- ⚠️ Requires typing "DELETE" to confirm
- ⚠️ Shows what will be deleted before proceeding

---

### 3. `npm run clickhouse:migrate`
**File:** `scripts/migrate-clickhouse.js`

**What it does:**
- **Drops all tables** (deletes everything)
- **Recreates tables** with the current schema (30+ columns)
- All-in-one operation (opinionated)

**Use when:**
- ✅ Updating schema with new columns
- ✅ Want exact current schema
- ✅ Quick reset to "known good" state
- ✅ Development environment (don't use in production!)

**Example:**
```bash
npm run clickhouse:migrate
# Tables are dropped and recreated automatically
```

---

### 4. `npm run clickhouse:seed`
**File:** `scripts/seed-data.js`

**What it does:**
- Adds sample/test data to existing tables
- Safe operation - doesn't delete anything
- Creates fake tracking events and links

**Use when:**
- ✅ Need test data for development
- ✅ Want to see how the dashboard looks with data
- ✅ Testing analytics features

**Example:**
```bash
npm run clickhouse:seed
```

---

## 🔄 Common Workflows

### **First Time Setup:**
```bash
# 1. Start ClickHouse
docker compose up -d

# 2. Create tables
npm run clickhouse:init

# 3. (Optional) Add test data
npm run clickhouse:seed

# 4. Start app
npm run dev
```

---

### **Update Schema (Development):**
```bash
# Option A: Drop and recreate automatically
npm run clickhouse:migrate

# Option B: Drop, then recreate manually
npm run clickhouse:clean
npm run clickhouse:init
```

---

### **Custom Schema Workflow:**
```bash
# 1. Clean database
npm run clickhouse:clean

# 2. Create your custom schema
clickhouse-client --query "CREATE TABLE analytics.my_custom_table (...)"

# 3. Start app
npm run dev
```

---

### **After Restarting Computer:**
```bash
# 1. Start ClickHouse
docker compose up -d

# 2. Start app (tables already exist)
npm run dev
```

---

## ⚖️ Comparison Table

| Script | Drops Tables? | Creates Tables? | Safe? | Use Case |
|--------|---------------|-----------------|-------|----------|
| **init** | ❌ No | ✅ If not exists | ✅ Yes | First time setup |
| **clean** 🆕 | ✅ Yes | ❌ No | ⚠️ With confirmation | Clean slate, flexibility |
| **migrate** | ✅ Yes | ✅ With current schema | ⚠️ No confirmation | Schema updates (dev) |
| **seed** | ❌ No | ❌ No | ✅ Yes | Add test data |

---

## 🎯 Design Philosophy

The scripts follow the **separation of concerns** principle:

1. **`init`** = CREATE (safe, idempotent)
2. **`clean`** = DROP (destructive, flexible)
3. **`migrate`** = DROP + CREATE (destructive, opinionated)
4. **`seed`** = INSERT (safe, additive)

This gives developers maximum flexibility:
- Want to drop only? Use `clean`
- Want to drop and recreate? Use `migrate`
- Want to create if needed? Use `init`
- Want to add data? Use `seed`

---

## ⚠️ Production Warning

**Never use `clean` or `migrate` in production!**

These scripts are for **development only**. In production:
- Use proper database migrations
- Backup data before schema changes
- Use `ALTER TABLE` for non-breaking changes

---

## 🔧 Script Internals

### Connection (All Scripts)
```javascript
const clickhouse = createClient({
  url: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
  database: process.env.CLICKHOUSE_DATABASE || 'analytics',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
});
```

### Clean Operation
```javascript
// Drops tables only
DROP TABLE IF EXISTS analytics.tracking_events
DROP TABLE IF EXISTS analytics.tracking_codes
```

### Migrate Operation
```javascript
// Drops and recreates
DROP TABLE IF EXISTS analytics.tracking_events
CREATE TABLE analytics.tracking_events (...)
```

### Init Operation
```javascript
// Creates only if not exists
CREATE TABLE IF NOT EXISTS analytics.tracking_events (...)
```

---

## 💡 Tips

1. **Always confirm twice** before running `clean` or `migrate`
2. **Use `init` for safe operations** - it won't break anything
3. **Run `clean` before custom schemas** - gives you a blank slate
4. **Use `seed` for realistic test data** - makes development easier
5. **Check ClickHouse is running** (`docker compose ps`) before running scripts

---

## 🐛 Troubleshooting

### "Connection refused" error
```bash
# ClickHouse is not running
docker compose up -d
```

### "Table already exists" error
```bash
# Drop existing tables first
npm run clickhouse:clean
npm run clickhouse:init
```

### "ENCRYPTION_SECRET not set" error
```bash
# Generate and add to .env.local
npm run generate:secret
```

---

## 📚 Related Documentation

- [Integration Summary](./INTEGRATION_SUMMARY.md)
- [Quick Start Guide](./QUICK_START.md)
- [System Architecture](./SYSTEM_ARCHITECTURE.md)

