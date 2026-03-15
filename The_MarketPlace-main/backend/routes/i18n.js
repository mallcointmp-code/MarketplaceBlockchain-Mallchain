const express = require("express");

let currentLocale = "en";
let locales = [];
let translations = {};

function configure(options = {}) {
  locales = options.locales || locales;
  // Optionally load translation files from directory if present
  if (options.directory) {
    try {
      const fs = require("fs");
      for (const lang of locales) {
        const p = require("path").join(options.directory, lang + ".json");
        if (fs.existsSync(p)) {
          try {
            translations[lang] = JSON.parse(fs.readFileSync(p, "utf8"));
          } catch (err) {
            translations[lang] = {};
          }
        } else {
          translations[lang] = {};
        }
      }
    } catch (e) {
      // ignore file loading errors — keep translations empty
    }
  }
}

function changeLanguage(lang) {
  if (lang) currentLocale = lang;
}

function translate(key, ...args) {
  const map = translations[currentLocale] || {};
  const parts = key.split(".");
  let v = map;
  for (const p of parts) {
    if (v && typeof v === "object" && p in v) v = v[p];
    else { v = null; break; }
  }
  if (v == null) return key;
  if (typeof v === "string" && args && args.length) {
    return v.replace(/%s/g, () => args.shift());
  }
  return v;
}

// Attach a convenience helper to Express response prototype
if (express && express.response && !express.response.__) {
  express.response.__ = function (key, ...args) {
    return translate(key, ...args);
  };
}

module.exports = {
  configure,
  changeLanguage,
  translate
};
