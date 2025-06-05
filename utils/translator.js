const translate = require('@vitalets/google-translate-api');

async function translateIfNeeded(text) {
  try {
    const res = await translate(text, { to: 'pt' });
    if (res.from.language.iso !== 'pt') {
      return res.text;
    }
  } catch (e) {
    // ignore errors and return original text
  }
  return text;
}

module.exports = { translateIfNeeded };
