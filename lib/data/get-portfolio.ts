import { loadPortfolio } from "@/lib/data/portfolio-service";

export async function getPortfolioPayload() {
  return loadPortfolio(false);
}
