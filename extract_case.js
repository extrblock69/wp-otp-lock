const fs = require('fs');
const content = fs.readFileSync('venom_deob.js', 'utf8');
const startMatch = content.match(/case\s+"temp-cod":/);
if (startMatch) {
    const startIndex = startMatch.index;
    // Find the next break; or end of switch
    const sub = content.substring(startIndex);
    const endMatch = sub.match(/break;/);
    if (endMatch) {
        console.log(sub.substring(0, endMatch.index + 6));
    } else {
        console.log(sub.substring(0, 1000));
    }
} else {
    console.log("Not found");
}
