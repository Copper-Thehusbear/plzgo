const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'places_data.json');
const outputPath = path.join(__dirname, 'places_data.csv');

if (!fs.existsSync(inputPath)) {
  console.error('❌ Error: places_data.json not found!');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

if (data.length === 0) {
  console.log('No data to convert.');
  process.exit(0);
}

// Function to flatten nested objects and handle arrays
function flatten(obj, prefix = '') {
  let result = {};
  for (let key in obj) {
    const newKey = prefix ? `${prefix}_${key}` : key;
    if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key]) && !(obj[key] instanceof Date)) {
      // It's a nested object, but not an array
      Object.assign(result, flatten(obj[key], newKey));
    } else if (Array.isArray(obj[key])) {
      // It's an array, join it with a semicolon
      result[newKey] = obj[key].join('; ');
    } else {
      // It's a primitive value
      result[newKey] = obj[key];
    }
  }
  return result;
}

const flattenedData = data.map(item => flatten(item));

// Collect all unique keys for headers
const allKeys = new Set();
flattenedData.forEach(item => {
  Object.keys(item).forEach(key => allKeys.add(key));
});
const headers = Array.from(allKeys);

// Create CSV rows
const csvRows = [];
csvRows.push(headers.join(',')); // Header row

for (const item of flattenedData) {
  const row = headers.map(header => {
    let val = item[header] === undefined || item[header] === null ? '' : item[header];
    // Escape quotes and wrap in quotes if contains comma or newline
    val = val.toString().replace(/"/g, '""');
    if (val.includes(',') || val.includes('\n') || val.includes('"')) {
      val = `"${val}"`;
    }
    return val;
  });
  csvRows.push(row.join(','));
}

fs.writeFileSync(outputPath, csvRows.join('\n'), 'utf8');
console.log(`\n✅ Success! Converted to CSV:`);
console.log(`📍 ${outputPath}\n`);
