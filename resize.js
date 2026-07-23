const { Jimp } = require("jimp");

async function run() {
  try {
    const image = await Jimp.read("C:\\Users\\neete\\.gemini\\antigravity-ide\\brain\\bb52217c-b609-410a-855a-ca224c47d80a\\pwa_icon_1784793678248.png");
    
    // Resize to 192x192
    const icon192 = image.clone();
    icon192.resize({ w: 192, h: 192 });
    await icon192.write("public/icons/icon-192.png");
    console.log("Wrote 192x192");

    // Resize to 512x512
    const icon512 = image.clone();
    icon512.resize({ w: 512, h: 512 });
    await icon512.write("public/icons/icon-512.png");
    console.log("Wrote 512x512");
  } catch(e) {
    console.error(e);
  }
}

run();
