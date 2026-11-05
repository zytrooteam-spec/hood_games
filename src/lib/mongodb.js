import { ObjectId } from 'mongodb';
import { getDb, initDb } from './db';

export function toObjectId(id) {
  if (!id) return id;
  if (typeof id === 'object' && (id._bsontype === 'ObjectID' || id.constructor?.name === 'ObjectId')) {
    return id;
  }
  const str = String(id).trim();
  if (/^[0-9a-fA-F]{24}$/.test(str)) {
    try {
      return new ObjectId(str);
    } catch {
      return str;
    }
  }
  return str;
}

export function toIdQuery(id) {
  if (!id) return { _id: null };
  if (typeof id === 'object' && (id._bsontype === 'ObjectID' || id.constructor?.name === 'ObjectId')) {
    return { _id: id };
  }
  const str = String(id).trim();
  if (/^[0-9a-fA-F]{24}$/.test(str)) {
    try {
      return { $or: [{ _id: new ObjectId(str) }, { _id: str }] };
    } catch {
      return { _id: str };
    }
  }
  return { _id: str };
}

export function isValidHexId(id) {
  if (!id) return false;
  return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id.trim());
}

export { getDb, initDb, ObjectId };
export default getDb;
