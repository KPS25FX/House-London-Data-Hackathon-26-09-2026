CREATE TABLE seat (code TEXT PRIMARY KEY, name TEXT, borough TEXT, json TEXT NOT NULL);
CREATE TABLE borough (lad TEXT PRIMARY KEY, name TEXT UNIQUE, json TEXT NOT NULL);
CREATE TABLE msoa (code TEXT PRIMARY KEY, name TEXT, pcon TEXT REFERENCES seat(code), lad TEXT,
  dwellings REAL, built REAL, ptal REAL, bf REAL, raw REAL);
CREATE TABLE indicator (key TEXT PRIMARY KEY, label TEXT, side TEXT NOT NULL, unit TEXT, source TEXT, forest_key TEXT);
CREATE TABLE seat_indicator (code TEXT REFERENCES seat(code), key TEXT REFERENCES indicator(key),
  num REAL, txt TEXT, PRIMARY KEY (code, key));
CREATE TABLE policy (id TEXT PRIMARY KEY, title TEXT, kind TEXT, lever TEXT, holder TEXT, scope TEXT,
  evidence TEXT, tags TEXT, text TEXT, src TEXT);
CREATE TABLE policy_effect (policy_id TEXT REFERENCES policy(id), ord INTEGER, outcome TEXT, direction TEXT,
  certainty TEXT, note TEXT, who TEXT, PRIMARY KEY (policy_id, ord));
CREATE TABLE postcode (outward TEXT, inward TEXT, code TEXT, PRIMARY KEY (outward, inward));
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
