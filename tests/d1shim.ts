/** D1 مزيّف فوق node:sqlite — حتى نختبر منطق السيرفر بدون Cloudflare */
import { DatabaseSync } from 'node:sqlite';

type Val = string | number | null;

class Stmt {
  constructor(private db: DatabaseSync, private sql: string, private args: Val[] = []) {}
  bind(...args: unknown[]) {
    for (const a of args) if (a === undefined) throw new Error('D1_TYPE_ERROR: undefined bind in ' + this.sql.slice(0, 60));
    return new Stmt(this.db, this.sql, args.map((a) => (typeof a === 'boolean' ? (a ? 1 : 0) : (a as Val))));
  }
  private exec() {
    const st = this.db.prepare(this.sql);
    if (/^\s*(SELECT|WITH)|RETURNING/i.test(this.sql)) return { rows: st.all(...this.args) as Record<string, unknown>[], changes: 0, last: 0 };
    const r = st.run(...this.args);
    return { rows: [], changes: Number(r.changes), last: Number(r.lastInsertRowid) };
  }
  async first<T>(col?: string): Promise<T | null> {
    const row = this.exec().rows[0];
    if (!row) return null;
    return (col ? row[col] : { ...row }) as T;
  }
  async all<T>() {
    const r = this.exec();
    return { results: r.rows.map((x) => ({ ...x })) as T[], success: true, meta: { changes: r.changes, last_row_id: r.last } };
  }
  async run() {
    const r = this.exec();
    return { results: [], success: true, meta: { changes: r.changes, last_row_id: r.last } };
  }
  _execSync() { return this.exec(); }
}

export function makeD1() {
  const db = new DatabaseSync(':memory:');
  return {
    prepare: (sql: string) => new Stmt(db, sql),
    async batch(stmts: Stmt[]) {
      db.exec('BEGIN');
      try {
        const out = stmts.map((s) => { const r = s._execSync(); return { results: r.rows, success: true, meta: { changes: r.changes, last_row_id: r.last } }; });
        db.exec('COMMIT');
        return out;
      } catch (e) { db.exec('ROLLBACK'); throw e; }
    },
    raw: db,
  } as unknown as D1Database & { raw: DatabaseSync };
}
