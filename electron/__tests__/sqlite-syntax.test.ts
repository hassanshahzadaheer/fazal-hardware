import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('SQLite syntax in Electron handlers', () => {
  it('uses single-quoted SQLite time literals', () => {
    const mainSource = fs.readFileSync(path.resolve(__dirname, '../main.ts'), 'utf8');

    expect(mainSource).not.toContain('datetime("now")');
  });
});
