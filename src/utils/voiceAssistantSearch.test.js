import { BUSINESS_SEARCH_FIELDS, buildSearchKeywords, rowMatchesKeywords } from "./voiceAssistantSearch";

describe("voice assistant code-side search", () => {
  test("turns a natural-language request into a short keyword query", () => {
    expect(buildSearchKeywords("Ayudame a registrar los pedidos de Elim")).toBe("elim");
  });

  test("keeps a phone number searchable as digits", () => {
    expect(buildSearchKeywords("918-247-313")).toBe("918247313");
    expect(rowMatchesKeywords({ name: "Elim S.A.", phone: "+51 918-247-313" }, BUSINESS_SEARCH_FIELDS.clients.search, "918247313")).toBe(true);
  });

  test("applies mapped fields and excludes unrelated API records", () => {
    expect(rowMatchesKeywords({ name: "Coca Cola", sku: "CC-01" }, BUSINESS_SEARCH_FIELDS.products.search, "sku CC-01")).toBe(true);
    expect(rowMatchesKeywords({ name: "Inca Kola", sku: "IK-01" }, BUSINESS_SEARCH_FIELDS.products.search, "CC-01")).toBe(false);
  });
});
