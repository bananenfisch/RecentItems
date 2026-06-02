/**
* Simple promise based mutex
*/
const ByteArray = imports.byteArray;


const FallbackMirrorMapping = {
  '(': ')',
  ')': '(',
  '[': ']',
  ']': '[',
  '{': '}',
  '}': '{',
  '<': '>',
  '>': '<',
  '«': '»',
  '»': '«'
};
export default class MirrorMapping {
  constructor(filePath) {
    this._loadMirrorMapping(filePath);
  }
  _parseBidiMirroring(fileContent) {
    const mapping = {};
    // Split the content into lines
    const lines = fileContent.split(/\r?\n/);
    for (const line of lines) {
      // Remove comments and trim whitespace
      const commentIndex = line.indexOf('#');
      const lineWithoutComment = commentIndex >= 0 ? line.slice(0, commentIndex) : line;
      const trimmed = lineWithoutComment.trim();
      if (!trimmed) continue; // Skip empty lines

      // Each valid line should be in the format: <srcHex>; <destHex>
      const parts = trimmed.split(';');
      if (parts.length < 2) continue;
      
      const srcHex = parts[0].trim();
      const destHex = parts[1].trim();

      // Convert hex to actual characters
      const srcChar = String.fromCodePoint(parseInt(srcHex, 16));
      const destChar = String.fromCodePoint(parseInt(destHex, 16));
      
      mapping[srcChar] = destChar;
      // If needed, you can also store the reverse mapping:
      mapping[destChar] = srcChar;
    }
    return mapping;
  }

  async _loadMirrorMapping(filePath) {
    this.mirrorMapping = FallbackMirrorMapping;
    try {
      let file = Gio.File.new_for_path(filePath);
      this.mirrorMapping = this.parseBidiMirroring(ByteArray.toString(await file.load_contents_async(null, null, null)));
    } catch (e) {
      console.error("Unable to load the mirror map");
    }
  }

  replaceChars(text) {
    let result = "";
    for (const char of text) {
      // If the character exists in the mapping, replace it; otherwise, keep the original.
      result += this.mirrorMapping[char] || char;
    }
    return result;
  }
  
  destroy() {
    this.mirrorMapping = {};
  }
}