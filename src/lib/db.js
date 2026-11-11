import { MongoClient, ObjectId } from 'mongodb';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hood_games';

let client;
let clientPromise;
let useFallback = false;

// Memory & Local File Fallback Engine
class FallbackCollection {
  constructor(name, getStore, saveStore) {
    this.name = name;
    this.getStore = getStore;
    this.saveStore = saveStore;
  }

  _getItems() {
    const store = this.getStore();
    if (!store[this.name]) {
      store[this.name] = [];
    }
    return store[this.name];
  }

  async countDocuments(query = {}) {
    const items = await this.find(query).toArray();
    return items.length;
  }

  async findOne(query = {}) {
    const items = this._getItems();
    return items.find((item) => this._matches(item, query)) || null;
  }

  find(query = {}) {
    const items = this._getItems();
    let results = items.filter((item) => this._matches(item, query));

    const createCursor = (data) => ({
      sort: (sortSpec) => {
        const [field, direction] = Object.entries(sortSpec || {})[0] || [];
        if (field) {
          data.sort((a, b) => {
            const toComparable = (v) => {
              if (v === null || v === undefined) return 0;
              if (v instanceof Date) return v.getTime();
              if (typeof v === 'string') {
                const parsed = Date.parse(v);
                if (!isNaN(parsed) && v.length >= 10 && (v.includes('-') || v.includes(':'))) {
                  return parsed;
                }
                return v.toLowerCase();
              }
              if (typeof v === 'number') return v;
              return v;
            };
            const valA = toComparable(a[field]);
            const valB = toComparable(b[field]);
            if (valA < valB) return direction === -1 ? 1 : -1;
            if (valA > valB) return direction === -1 ? -1 : 1;
            return 0;
          });
        }
        return createCursor(data);
      },
      skip: (n) => {
        data = data.slice(n);
        return createCursor(data);
      },
      limit: (n) => {
        data = data.slice(0, n);
        return createCursor(data);
      },
      toArray: async () => data,
    });

    return createCursor([...results]);
  }

  async insertOne(doc) {
    const store = this.getStore();
    if (!store[this.name]) store[this.name] = [];
    const item = {
      _id: doc._id || new ObjectId().toString(),
      ...doc,
      createdAt: doc.createdAt || new Date(),
      updatedAt: doc.updatedAt || new Date(),
    };
    store[this.name].push(item);
    this.saveStore();
    return { insertedId: item._id, acknowledged: true };
  }

  async insertMany(docs) {
    const store = this.getStore();
    if (!store[this.name]) store[this.name] = [];
    const insertedIds = {};
    docs.forEach((doc, idx) => {
      const item = {
        _id: doc._id || new ObjectId().toString(),
        ...doc,
        createdAt: doc.createdAt || new Date(),
        updatedAt: doc.updatedAt || new Date(),
      };
      store[this.name].push(item);
      insertedIds[idx] = item._id;
    });
    this.saveStore();
    return { insertedIds, acknowledged: true };
  }

  async updateOne(query, update, options = {}) {
    const store = this.getStore();
    if (!store[this.name]) store[this.name] = [];
    const index = store[this.name].findIndex((item) => this._matches(item, query));

    if (index !== -1) {
      const item = store[this.name][index];
      if (update.$set) {
        Object.assign(item, update.$set);
      }
      if (update.$inc) {
        for (const [k, v] of Object.entries(update.$inc)) {
          item[k] = (Number(item[k]) || 0) + Number(v);
        }
      }
      if (update.$push) {
        for (const [k, v] of Object.entries(update.$push)) {
          if (!Array.isArray(item[k])) item[k] = [];
          if (v && v.$each && Array.isArray(v.$each)) {
            item[k].push(...v.$each);
          } else {
            item[k].push(v);
          }
        }
      }
      if (update.$unset) {
        for (const k of Object.keys(update.$unset)) {
          delete item[k];
        }
      }
      item.updatedAt = new Date();
      store[this.name][index] = item;
      this.saveStore();
      return { matchedCount: 1, modifiedCount: 1, acknowledged: true };
    } else if (options.upsert) {
      const newItem = {
        _id: new ObjectId().toString(),
        ...(query._id ? { _id: String(query._id) } : {}),
        ...query,
        ...(update.$set || {}),
        ...(update.$setOnInsert || {}),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store[this.name].push(newItem);
      this.saveStore();
      return { matchedCount: 0, modifiedCount: 0, upsertedId: newItem._id, acknowledged: true };
    }
    return { matchedCount: 0, modifiedCount: 0, acknowledged: true };
  }

  async updateMany(query, update) {
    const store = this.getStore();
    if (!store[this.name]) return { matchedCount: 0, modifiedCount: 0 };
    let count = 0;
    store[this.name].forEach((item) => {
      if (this._matches(item, query)) {
        if (update.$set) Object.assign(item, update.$set);
        item.updatedAt = new Date();
        count++;
      }
    });
    if (count > 0) this.saveStore();
    return { matchedCount: count, modifiedCount: count, acknowledged: true };
  }

  async deleteOne(query) {
    const store = this.getStore();
    if (!store[this.name]) return { deletedCount: 0 };
    const index = store[this.name].findIndex((item) => this._matches(item, query));
    if (index !== -1) {
      store[this.name].splice(index, 1);
      this.saveStore();
      return { deletedCount: 1, acknowledged: true };
    }
    return { deletedCount: 0, acknowledged: true };
  }

  async deleteMany(query) {
    const store = this.getStore();
    if (!store[this.name]) return { deletedCount: 0 };
    const initial = store[this.name].length;
    store[this.name] = store[this.name].filter((item) => !this._matches(item, query));
    const deletedCount = initial - store[this.name].length;
    if (deletedCount > 0) this.saveStore();
    return { deletedCount, acknowledged: true };
  }

  async createIndex() {
    return 'index_created';
  }

  _matches(item, query) {
    for (const [key, val] of Object.entries(query)) {
      if (key === '$or' && Array.isArray(val)) {
        if (!val.some((subQuery) => this._matches(item, subQuery))) return false;
        continue;
      }
      if (key === '$and' && Array.isArray(val)) {
        if (!val.every((subQuery) => this._matches(item, subQuery))) return false;
        continue;
      }
      const itemVal = item[key];
      if (val instanceof RegExp) {
        if (!val.test(String(itemVal || ''))) return false;
      } else if (
        key === '_id' ||
        (val && typeof val === 'object' && (val._bsontype === 'ObjectID' || val.constructor?.name === 'ObjectId'))
      ) {
        if (String(itemVal) !== String(val)) return false;
      } else if (typeof val === 'object' && val !== null) {
        if (val.$regex) {
          const re = new RegExp(val.$regex, val.$options || '');
          if (!re.test(String(itemVal || ''))) return false;
        } else if (val.$in && Array.isArray(val.$in)) {
          if (!val.$in.map(String).includes(String(itemVal))) return false;
        } else if (val.$nin && Array.isArray(val.$nin)) {
          if (val.$nin.map(String).includes(String(itemVal))) return false;
        } else if (val.$gte !== undefined && itemVal < val.$gte) {
          return false;
        } else if (val.$lte !== undefined && itemVal > val.$lte) {
          return false;
        } else if (val.$gt !== undefined && itemVal <= val.$gt) {
          return false;
        } else if (val.$lt !== undefined && itemVal >= val.$lt) {
          return false;
        } else if (val.$ne !== undefined && String(itemVal) === String(val.$ne)) {
          return false;
        }
      } else if (key === '_id') {
        if (String(itemVal) !== String(val)) return false;
      } else if (itemVal !== val) {
        return false;
      }
    }
    return true;
  }
}

class FallbackDb {
  constructor() {
    this.storePath = path.join(process.cwd(), '.hood_store.json');
    this.memoryStore = {};
    this.loadStore();
  }

  loadStore() {
    try {
      if (fs.existsSync(this.storePath)) {
        this.memoryStore = JSON.parse(fs.readFileSync(this.storePath, 'utf8'));
      }
    } catch {
      this.memoryStore = {};
    }
  }

  saveStore() {
    try {
      fs.writeFileSync(this.storePath, JSON.stringify(this.memoryStore, null, 2), 'utf8');
    } catch (err) {
      console.warn('Fallback store write notice:', err.message);
    }
  }

  collection(name) {
    return new FallbackCollection(name, () => this.memoryStore, () => this.saveStore());
  }
}

let fallbackDbInstance = null;

function allowJsonFallback() {
  return (
    process.env.NODE_ENV !== 'production' ||
    process.env.ALLOW_JSON_FALLBACK === 'true'
  );
}

export async function getDb() {
  if (useFallback) {
    if (!allowJsonFallback()) {
      throw new Error(
        'MongoDB is not connected. Set MONGODB_URI in .env on the server (production does not use local JSON fallback).'
      );
    }
    if (!fallbackDbInstance) fallbackDbInstance = new FallbackDb();
    return fallbackDbInstance;
  }

  try {
    if (!clientPromise) {
      client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 10000,
        maxPoolSize: 40,
        minPoolSize: 2,
        maxIdleTimeMS: 60_000,
        compressors: ['zlib'],
      });
      clientPromise = client.connect();
    }
    const connectedClient = await clientPromise;
    const dbName = process.env.MONGODB_DB_NAME || 'hood_games';
    return connectedClient.db(dbName);
  } catch (err) {
    if (!allowJsonFallback()) {
      console.error('MongoDB connection failed (production):', err.message);
      throw err;
    }
    console.warn('⚠️ MongoDB unavailable, using local .hood_store.json:', err.message);
    useFallback = true;
    if (!fallbackDbInstance) fallbackDbInstance = new FallbackDb();
    return fallbackDbInstance;
  }
}

export async function pingMongo() {
  const db = await getDb();
  if (useFallback) return { ok: false, mode: 'json_fallback' };
  await db.command({ ping: 1 });
  return { ok: true, mode: 'mongodb' };
}

export async function initDb() {
  return await getDb();
}
