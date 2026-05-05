import { http, HttpResponse } from "msw";

export const ODATA = "https://1c.acme.ru/InfoBase/odata/standard.odata";

/**
 * 1С entity sets contain Cyrillic — fetch() percent-encodes them before they
 * reach MSW, so handler paths must use the percent-encoded form to match. We
 * keep encoded literals here (rather than encodeURIComponent in code) so the
 * test code is grep-able by route.
 */
const SALE = "Document_%D0%A0%D0%B5%D0%B0%D0%BB%D0%B8%D0%B7%D0%B0%D1%86%D0%B8%D1%8F%D0%A2%D0%BE%D0%B2%D0%B0%D1%80%D0%BE%D0%B2%D0%A3%D1%81%D0%BB%D1%83%D0%B3"; // Document_РеализацияТоваровУслуг
const PURCHASE = "Document_%D0%9F%D0%BE%D1%81%D1%82%D1%83%D0%BF%D0%BB%D0%B5%D0%BD%D0%B8%D0%B5%D0%A2%D0%BE%D0%B2%D0%B0%D1%80%D0%BE%D0%B2%D0%A3%D1%81%D0%BB%D1%83%D0%B3"; // Document_ПоступлениеТоваровУслуг
const PAYMENT_IN = "Document_%D0%9F%D0%BE%D1%81%D1%82%D1%83%D0%BF%D0%BB%D0%B5%D0%BD%D0%B8%D0%B5%D0%9D%D0%B0%D0%A0%D0%B0%D1%81%D1%87%D0%B5%D1%82%D0%BD%D1%8B%D0%B9%D0%A1%D1%87%D0%B5%D1%82"; // Document_ПоступлениеНаРасчетныйСчет
const PAYMENT_OUT = "Document_%D0%A1%D0%BF%D0%B8%D1%81%D0%B0%D0%BD%D0%B8%D0%B5%D0%A1%D0%A0%D0%B0%D1%81%D1%87%D0%B5%D1%82%D0%BD%D0%BE%D0%B3%D0%BE%D0%A1%D1%87%D0%B5%D1%82%D0%B0"; // Document_СписаниеСРасчетногоСчета
const CONTRACTORS = "Catalog_%D0%9A%D0%BE%D0%BD%D1%82%D1%80%D0%B0%D0%B3%D0%B5%D0%BD%D1%82%D1%8B"; // Catalog_Контрагенты
const BALANCE_REG = "AccountingRegister_%D0%A5%D0%BE%D0%B7%D1%80%D0%B0%D1%81%D1%87%D0%B5%D1%82%D0%BD%D1%8B%D0%B9"; // AccountingRegister_Хозрасчетный

export const handlers = [
  http.get(`${ODATA}/${SALE}`, ({ request }) => {
    const url = new URL(request.url);
    const top = Number(url.searchParams.get("$top") ?? "100");
    const all = [
      {
        Ref_Key: "doc-1",
        Number: "00001",
        Date: "2026-04-15T00:00:00",
        СуммаДокумента: 150000.0,
        Контрагент_Key: "ctr-1",
      },
      {
        Ref_Key: "doc-2",
        Number: "00002",
        Date: "2026-04-20T00:00:00",
        СуммаДокумента: 75000.0,
        Контрагент_Key: "ctr-2",
      },
    ];
    return HttpResponse.json({
      "odata.metadata": "x",
      value: all.slice(0, top),
    });
  }),

  http.get(`${ODATA}/${PURCHASE}`, () => {
    return HttpResponse.json({
      "odata.metadata": "x",
      value: [
        {
          Ref_Key: "p-1",
          Number: "PUR-001",
          Date: "2026-03-10T00:00:00",
          СуммаДокумента: 50000.0,
          Контрагент_Key: "ctr-3",
        },
      ],
    });
  }),

  http.get(`${ODATA}/${PAYMENT_IN}`, () => {
    return HttpResponse.json({
      "odata.metadata": "x",
      value: [
        {
          Ref_Key: "pin-1",
          Number: "PIN-001",
          Date: "2026-04-01T00:00:00",
          СуммаДокумента: 200000.0,
        },
      ],
    });
  }),

  http.get(`${ODATA}/${PAYMENT_OUT}`, () => {
    return HttpResponse.json({
      "odata.metadata": "x",
      value: [
        {
          Ref_Key: "pout-1",
          Number: "POUT-001",
          Date: "2026-04-02T00:00:00",
          СуммаДокумента: 30000.0,
        },
      ],
    });
  }),

  http.get(`${ODATA}/${CONTRACTORS}`, ({ request }) => {
    const url = new URL(request.url);
    const filter = url.searchParams.get("$filter") ?? "";
    const innMatch = filter.match(/ИНН eq '(\d+)'/);
    const inn = innMatch?.[1];
    const nameMatch = filter.match(/substringof\('([^']+)'/);
    const name = nameMatch?.[1];
    return HttpResponse.json({
      "odata.metadata": "x",
      value: [
        {
          Ref_Key: "ctr-1",
          Description: name
            ? `ООО ${name} и партнёры`
            : "ООО Иванов и партнёры",
          ИНН: inn ?? "7707083893",
          КПП: "770701001",
        },
      ],
    });
  }),

  http.get(`${ODATA}/${BALANCE_REG}/Balance`, () => {
    return HttpResponse.json({
      "odata.metadata": "x",
      value: [
        { Счёт_Key: "01", Сумма: 1500000.0 },
        { Счёт_Key: "51", Сумма: 850000.0 },
      ],
    });
  }),

  // synthetic error endpoints
  http.get(`${ODATA}/Document_401`, () => {
    return HttpResponse.json({ error: "auth" }, { status: 401 });
  }),
  http.get(`${ODATA}/Document_404`, () => {
    return HttpResponse.json({ error: "nope" }, { status: 404 });
  }),
];
