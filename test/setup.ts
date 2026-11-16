// 文言は日本語に固定して始める（MX Stage の tests/app/setup.ts と同じ。英語を確かめる試験は中で setLocale("en") にする）
import { beforeEach } from "vitest";
import { setLocale } from "../src/i18n.ts";

setLocale("ja");

beforeEach(() => {
  setLocale("ja");
});
