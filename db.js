/**
 * db.js
 * Simple JSON file-based database utility
 * Handles read/write operations with error handling
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.json');

/**
 * Read the entire database
 * @returns {Object} The parsed database object
 */
function read() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('DB read error:', err.message);
    // Return empty structure if file doesn't exist or is corrupt
    return { ingredients: [], products: [], sales: [] };
  }
}

/**
 * Write data to the database
 * @param {Object} data - The full database object to write
 */
function write(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('DB write error:', err.message);
    throw new Error('Failed to write to database');
  }
}

module.exports = { read, write };
