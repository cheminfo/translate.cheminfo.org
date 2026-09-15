import { expect, test } from 'vitest';

import {
  encodeMarker,
  hasMarker,
  markText,
  readMarkers,
  stripMarkers,
} from '../marker.ts';

test('an id is written in base 4 with the invisible operators, closed by a word joiner', () => {
  expect(encodeMarker(0)).toBe('⁡⁠');
  expect(encodeMarker(3)).toBe('⁤⁠');
  expect(encodeMarker(5)).toBe('⁢⁢⁠');
  expect(encodeMarker(16)).toBe('⁢⁡⁡⁠');
});

test('every id reads back as itself', () => {
  const ids = [0, 1, 3, 4, 15, 255, 4096, 1_000_003];
  const text = ids.map((id) => markText(`message ${id}`, id)).join(' ');
  expect(readMarkers(text)).toStrictEqual(ids);
});

test('markers are read in the order they appear in the text', () => {
  const text = `${markText('Name', 7)}: ${markText('Value', 2)}`;
  expect(readMarkers(text)).toStrictEqual([7, 2]);
});

test('a text without a marker yields no id', () => {
  expect(readMarkers('Plain text')).toStrictEqual([]);
  expect(hasMarker('Plain text')).toBe(false);
});

test('hasMarker answers the same when asked twice', () => {
  const text = markText('Share', 12);
  expect(hasMarker(text)).toBe(true);
  expect(hasMarker(text)).toBe(true);
});

test('stripping the markers leaves exactly the visible text', () => {
  const text = `${markText('Name', 7)}: ${markText('Value', 1234)}`;
  expect(stripMarkers(text)).toBe('Name: Value');
});

test('an id that is not a non-negative integer is refused', () => {
  expect(() => encodeMarker(-1)).toThrow(RangeError);
  expect(() => encodeMarker(1.5)).toThrow(
    'a marker id is a non-negative integer, got 1.5',
  );
});
