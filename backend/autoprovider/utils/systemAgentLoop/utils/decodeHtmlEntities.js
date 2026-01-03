const namedEntities = {
  lt: "<",
  gt: ">",
  amp: "&",
  quot: '"',
  apos: "'",
};

const decodeHtmlEntities = (text) => {
  if (typeof text !== "string") {
    return text;
  }

  return text.replace(
    /&(#x?[0-9a-fA-F]+|lt|gt|amp|quot|apos);/g,
    (match, entity) => {
      if (entity in namedEntities) {
        return namedEntities[entity];
      }

      if (entity.startsWith("#x") || entity.startsWith("#X")) {
        const codePoint = parseInt(entity.slice(2), 16);
        if (!Number.isNaN(codePoint)) {
          return String.fromCharCode(codePoint);
        }
        return match;
      }

      if (entity.startsWith("#")) {
        const codePoint = parseInt(entity.slice(1), 10);
        if (!Number.isNaN(codePoint)) {
          return String.fromCharCode(codePoint);
        }
        return match;
      }

      return match;
    }
  );
};

module.exports = decodeHtmlEntities;
