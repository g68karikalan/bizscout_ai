import { BusinessLeadCandidate } from '../types/index.js';

export interface SearchFilters {
  minRating?: number;
  minReviews?: number;
  hasPhone?: boolean;
  hasWebsite?: boolean;
  onlyOpen?: boolean;
}

export interface SearchParams {
  city: string;
  state?: string;
  country: string;
  category: string;
  limit: number;
  filters?: SearchFilters;
}

/**
 * Provider abstraction for business discovery.
 * Implement this interface to add new business data providers
 * (e.g., Yelp, Justdial, Yellow Pages, etc.)
 */
export interface BusinessDiscoveryProvider {
  readonly providerName: string;
  searchBusinesses(params: SearchParams): Promise<BusinessLeadCandidate[]>;
}
