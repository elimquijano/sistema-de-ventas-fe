import {
  formatDate,
  getCurrentPeruDate,
  PERU_TIME_ZONE,
} from "./formatters";

describe("Peru timezone date formatting", () => {
  const utcDateAlreadyNextDay = new Date("2026-09-14T02:30:00.000Z");

  test("gets the current calendar date in Lima instead of UTC", () => {
    expect(getCurrentPeruDate(utcDateAlreadyNextDay)).toBe("2026-09-13");
  });

  test("formats timestamps using Lima time", () => {
    expect(
      formatDate(
        utcDateAlreadyNextDay,
        "DD/MM/YYYY HH:mm",
        PERU_TIME_ZONE,
      ),
    ).toBe("13/09/2026 21:30");
  });

  test("keeps date-only values on the selected calendar day", () => {
    expect(formatDate("2026-09-13", "DD/MM/YYYY", PERU_TIME_ZONE)).toBe(
      "13/09/2026",
    );
  });
});
