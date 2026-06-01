const fs = require('fs');
const file = process.argv[2];
const content = fs.readFileSync(file, 'utf8');

const arrFuncMatch = content.match(/function (_0x[a-f0-9]+)\(\)\{const _0x[a-f0-9]+=\[(.*?)\];.*?return _0x[a-f0-9]+\(\);}/s);
if (!arrFuncMatch) { console.error("No arr func"); process.exit(1); }
const arrFuncName = arrFuncMatch[1];
const arrFunc = arrFuncMatch[0];

const iifeMatch = content.match(/\(function\(_0x[a-f0-9]+,_0x[a-f0-9]+\)\{.*?\}\(_0x[a-f0-9]+,0x[a-f0-9]+\)\);/s);
if (!iifeMatch) { console.error("No iife"); process.exit(1); }
let iife = iifeMatch[0];

// The IIFE might refer to the lookup function which isn't defined yet.
// We can define a dummy lookup function because it's only used for the rotation check usually.
const lookupMatch = content.match(/function (_0x[a-f0-9]+)\(_0x[a-f0-9]+,_0x[a-f0-9]+\)\{const _0x[a-f0-9]+=\1\(\);.*?_0x[a-f0-9]+=_0x[a-f0-9]+-0x([a-f0-9]+);.*?\}/s);
// Wait, the lookup function in venom.js is:
/*
function _0x4b4d(_0x256fa9,_0x4ca5f1){const _0x36b3e2=_0x36b3();return _0x4b4d=function(_0x4b4d5f,_0x4aa521){_0x4b4d5f=_0x4b4d5f-0x175;let _0xd241bd=_0x36b3e2[_0x4b4d5f];return _0xd241bd;},_0x4b4d(_0x256fa9,_0x4ca5f1);}
*/
const lookupNameMatch = content.match(/const _0x[a-f0-9]+=_0x([a-f0-9]+);/); // Sometimes it's assigned to a const
const lookupFuncName = content.match(/function (_0x[a-f0-9]+)\(_0x[a-f0-9]+,_0x[a-f0-9]+\)\{const _0x[a-f0-9]+=(_0x[a-f0-9]+)\(\);/)[1];
const offsetMatch = content.match(/_0x[a-f0-9]+-0x([a-f0-9]+);/);
const offset = parseInt(offsetMatch[1], 16);

// Let's just create a full script to eval safely
let script = arrFunc + "\n";
script += `function ${lookupFuncName}(a, b) {
    const arr = ${arrFuncName}();
    return ${lookupFuncName} = function(c, d) {
        c = c - ${offset};
        return arr[c];
    }, ${lookupFuncName}(a, b);
}\n`;
script += iife + "\n";
script += `const finalArr = ${arrFuncName}();
for(let i=0; i<finalArr.length; i++) {
    console.log((i + ${offset}).toString(16) + ": " + finalArr[i]);
}`;

try {
    eval(script);
} catch (e) {
    console.error(e);
}
