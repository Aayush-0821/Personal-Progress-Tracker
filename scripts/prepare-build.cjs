const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const buildDir = path.join(root, "dist", "app");

// Clean previous staging directory
fs.rmSync(buildDir, { recursive: true, force: true });

// Create the structure required by index.html:
//
// app/
// ├── src/
// │   ├── index.html
// │   └── style.css
// └── dist/
//     └── src/
//         └── renderer.js

const htmlDir = path.join(buildDir, "src");
const rendererDir = path.join(buildDir, "dist", "src");
const assetsDir = path.join(buildDir, "assets");

fs.mkdirSync(htmlDir, { recursive: true });
fs.mkdirSync(rendererDir, { recursive: true });
fs.mkdirSync(assetsDir, { recursive: true });

// Copy HTML
fs.copyFileSync(
  path.join(root, "src", "index.html"),
  path.join(htmlDir, "index.html")
);

// Copy CSS
fs.copyFileSync(
  path.join(root, "src", "style.css"),
  path.join(htmlDir, "style.css")
);

// Copy compiled renderer
fs.copyFileSync(
  path.join(root, "dist", "src", "renderer.js"),
  path.join(rendererDir, "renderer.js")
);

// Copy icon
fs.copyFileSync(
  path.join(root, "assets", "icon.ico"),
  path.join(assetsDir, "icon.ico")
);

console.log("Production files prepared:");
console.log(buildDir);