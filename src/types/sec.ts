export interface Stock {
  ticker: string;
  name: string;
  cik: string;
  cikPadded: string;
  exchange: string;
}

export interface FilingDocument {
  name: string;
  type: string;
  sequence: number;
}

export interface Filing {
  accessionNumber: string;
  formType: string;
  description: string;
  filingDate: string;
  documents: FilingDocument[];
}

export interface FilingSearchParams {
  cik: string;
  from?: string;
  to?: string;
  types?: string[];
}

export interface FilingCategory {
  label: string;
  types: string[];
  description: string;
}

export const FILING_CATEGORIES: FilingCategory[] = [
  {
    label: "年报",
    types: ["10-K", "10-K/A", "20-F"],
    description: "Annual Reports",
  },
  {
    label: "季报",
    types: ["10-Q", "10-Q/A"],
    description: "Quarterly Reports",
  },
  {
    label: "重大事件",
    types: ["8-K", "8-K/A"],
    description: "Current Reports",
  },
  {
    label: "内部人交易(减持/增持)",
    types: ["4"],
    description: "Insider Trading",
  },
  {
    label: "持股变动",
    types: ["13G", "13G/A", "13D", "13D/A"],
    description: "Beneficial Ownership",
  },
  {
    label: "专门披露",
    types: ["SD", "SD/A"],
    description: "Specialized Disclosure",
  },
  {
    label: "其他",
    types: ["6-K", "11-K", "15-15D", "25", "S-1", "S-8", "DEF 14A"],
    description: "Other Filings",
  },
];
