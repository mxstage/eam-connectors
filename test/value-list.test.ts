// 値の一覧（getlist）と、部品の中に置き直した ConnectionProvider。
import { describe, expect, it } from "vitest";
import { MaximoClient } from "../src/maximo/client.ts";
import { fetchValueList, ValueListService, type ConnectionProvider } from "../src/maximo/valueList.ts";
import { createFakeMaximo, sampleSeed } from "../src/testing/index.ts";

function setup() {
  const fake = createFakeMaximo(sampleSeed());
  const client = new MaximoClient({ baseUrl: fake.baseUrl, apiKey: () => fake.apiKey, via: "direct", fetchImpl: fake.fetch, sleep: async () => {} });
  let current: { info: { baseUrl: string }; client: MaximoClient } | null = { info: { baseUrl: fake.baseUrl }, client };
  const provider: ConnectionProvider = { current: () => current, subscribe: () => () => undefined };
  return { fake, client, provider, disconnect: () => (current = null) };
}

describe("値の一覧", () => {
  it("getlist の値を取り、同じ列では取り直さない", async () => {
    const { fake, client, provider } = setup();
    const wo = fake.find("mxapiwo", (r) => r.attrs.wonum === "WO1001")!;
    const href = fake.hrefOf("MXAPIWO", wo.uid);
    const items = await fetchValueList(client, href, "STATUS");
    expect(items.map((i) => i.value)).toContain("APPR");
    const service = new ValueListService({ connection: provider });
    const first = await service.load({ os: "MXAPIWO", col: "STATUS", href, attr: "STATUS" });
    expect(first.status).toBe("ready");
    const before = fake.state.requests.length;
    await service.load({ os: "MXAPIWO", col: "STATUS", href, attr: "STATUS" });
    expect(fake.state.requests.length).toBe(before);
    expect(service.peek("MXAPIWO", "STATUS")?.status).toBe("ready");
  });

  it("未接続・別の接続先のシートでは取らない", async () => {
    const { provider, disconnect } = setup();
    const service = new ValueListService({ connection: provider });
    expect(await service.load({ os: "MXAPIWO", col: "STATUS", href: "x", attr: "STATUS", baseUrl: "https://other.example" })).toEqual({ status: "none" });
    disconnect();
    expect(await service.load({ os: "MXAPIWO", col: "STATUS", href: "x", attr: "STATUS" })).toEqual({ status: "none" });
  });
});
