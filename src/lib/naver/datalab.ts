import { fetchNaverApi } from "./client";

export interface DataLabRequest {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  timeUnit: "date" | "week" | "month";
  keywordGroups: {
    groupName: string;
    keywords: string[];
  }[];
}

export interface DataLabResponse {
  startDate: string;
  endDate: string;
  timeUnit: string;
  results: {
    title: string;
    keywords: string[];
    data: { period: string; ratio: number }[];
  }[];
}

export interface SearchTrendResult {
  keyword: string;
  ratio: number;
  trend: "up" | "down" | "stable";
}

export async function getSearchTrends(
  keywords: string[],
  startDate: string,
  endDate: string
): Promise<SearchTrendResult[]> {
  const endpoint = `/search-trend/v1/search`;

  const body: DataLabRequest = {
    startDate,
    endDate,
    timeUnit: "week",
    keywordGroups: keywords.map(kw => ({
      groupName: kw,
      keywords: [kw],
    })),
  };

  const response = await fetchNaverApi<DataLabResponse>(endpoint, "POST", body);

  if (!response.results) {
    return [];
  }

  return response.results.map((result) => {
    const dataPoints = result.data;
    if (!dataPoints || dataPoints.length === 0) {
      return { keyword: result.title, ratio: 0, trend: "stable" };
    }

    const latestRatio = dataPoints[dataPoints.length - 1].ratio;
    let trend: "up" | "down" | "stable" = "stable";

    if (dataPoints.length > 1) {
      const prevRatio = dataPoints[dataPoints.length - 2].ratio;
      if (latestRatio > prevRatio + 5) trend = "up";
      else if (latestRatio < prevRatio - 5) trend = "down";
    }

    return {
      keyword: result.title,
      ratio: latestRatio,
      trend,
    };
  });
}
