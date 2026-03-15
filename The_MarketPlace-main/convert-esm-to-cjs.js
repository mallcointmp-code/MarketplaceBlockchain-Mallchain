const fs = require("fs");
const path = require("path");

const projectDir = path.join(__dirname, "backend"); // adjust if needed

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach((f) => {
    const fullPath = path.join(dir, f);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath, callback);
    } else {
      callback(fullPath);
    }
  });
}

function convertFile(filePath) {
  if (!filePath.endsWith(".js")) return;

  let content = fs.readFileSync(filePath, "utf8");

  // Skip files that are already CommonJS
  if (/require\(|module\.exports/.test(content)) return;

  let changed = false;

  // 1️⃣ Convert named imports first: import { X, Y } from '...';
  content = content.replace(
    /import\s+{([^}]+)}\s+from\s+['"](.+)['"];?/g,
    (match, imports, modPath) => {
      changed = true;
      return `const { ${imports.trim()} } = require('${modPath}');`;
    }
  );

  // 2️⃣ Convert default imports: import X from '...';
  content = content.replace(
    /import\s+([^\s{}]+)\s+from\s+['"](.+)['"];?/g,
    (match, varName, modPath) => {
      changed = true;
      return `const ${varName} = require('${modPath}');`;
    }
  );

  // 3️⃣ Convert export default
  content = content.replace(/export\s+default\s+/g, "module.exports = ");

  // 4️⃣ Convert named exports like export const X = ...;
  const namedExports = [];
  content = content.replace(/export\s+const\s+([^\s=]+)\s*=/g, (match, name) => {
    changed = true;
    namedExports.push(name);
    return `const ${name} =`;
  });

  // 5️⃣ Convert export function declarations: export function foo() {...}
  content = content.replace(/export\s+function\s+([^\s(]+)\s*\(/g, (match, name) => {
    changed = true;
    namedExports.push(name);
    return `function ${name}(`;
  });

  // 6️⃣ Append named exports if any
  if (namedExports.length > 0) {
    content += `\nmodule.exports = { ${namedExports.join(", ")} };`;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log("Converted:", filePath);
  }
}

walkDir(projectDir, convertFile);
console.log("✅ Conversion finished!");
