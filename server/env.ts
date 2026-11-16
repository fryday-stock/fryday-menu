/// <reference types="@cloudflare/workers-types" />

/** الربط (bindings) والأسرار من إعدادات Cloudflare Pages — ماكو أي سر بالكود */
export interface Env {
  /** قاعدة البيانات D1 */
  DB: D1Database;
  /** تخزين الصور R2 */
  MEDIA?: R2Bucket;
  /** كلمة سر اللوحة (hash) — يدخلها أحمد بنفسه بإعدادات Cloudflare */
  ADMIN_PASSWORD_HASH?: string;
  /** بديل أبسط: كلمة السر نفسها كـ secret مشفّر (إذا ما يريد hash) */
  ADMIN_PASSWORD?: string;
  ASSETS?: Fetcher;
}

export type Ctx = EventContext<Env, string, Record<string, unknown>>;
