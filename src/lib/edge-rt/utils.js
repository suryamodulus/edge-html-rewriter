function getEscaper(regex, map) {
  return function escape(data) {
    var match;
    var lastIdx = 0;
    var result = '';
    while ((match = regex.exec(data))) {
      if (lastIdx !== match.index) {
        result += data.substring(lastIdx, match.index);
      }
      // We know that this chararcter will be in the map.
      result += map.get(match[0].charCodeAt(0));
      // Every match will be of length 1
      lastIdx = match.index + 1;
    }
    return result + data.substring(lastIdx);
  };
}

export const escapeAttribute = getEscaper(
  /["&\u00A0]/g,
  new Map([
    [34, '&quot;'],
    [38, '&amp;'],
    [160, '&nbsp;'],
  ]),
);

export const escapeText = getEscaper(
  /[&<>\u00A0]/g,
  new Map([
    [38, '&amp;'],
    [60, '&lt;'],
    [62, '&gt;'],
    [160, '&nbsp;'],
  ]),
);
