import { describe, expect, it } from "vitest";
import { readPaging } from "./paging";

describe("readPaging", () => {
  it("valores inválidos caen a los de omisión y take tiene tope", () => {
    expect(readPaging(new URLSearchParams("skip=abc&take=x"))).toEqual({ skip: 0, take: 50 });
    expect(readPaging(new URLSearchParams("skip=-5&take=1000"))).toEqual({ skip: 0, take: 100 });
    expect(readPaging(new URLSearchParams("skip=20&take=10"))).toEqual({ skip: 20, take: 10 });
    expect(readPaging(new URLSearchParams("take=0"))).toEqual({ skip: 0, take: 1 });
  });
});
