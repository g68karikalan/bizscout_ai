import axios from 'axios';
import { BusinessDiscoveryProvider, SearchParams } from './BusinessDiscoveryProvider.js';
import { BusinessLeadCandidate } from '../types/index.js';
import { ProviderError } from '../errors/AppError.js';

interface GooglePlaceResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  geometry?: { location: { lat: number; lng: number } };
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: { open_now?: boolean };
  types?: string[];
  url?: string;
}

interface GooglePlacesSearchResponse {
  results: GooglePlaceResult[];
  status: string;
  error_message?: string;
}

export class GooglePlacesProvider implements BusinessDiscoveryProvider {
  readonly providerName = 'google_places';
  private readonly apiKey: string;
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api/place';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async searchBusinesses(params: SearchParams): Promise<BusinessLeadCandidate[]> {
    const locationQuery = [params.city, params.state, params.country]
      .filter(Boolean)
      .join(', ');
    const query = `${params.category} in ${locationQuery}`;

    try {
      // Text search for businesses
      const searchResp = await axios.get<GooglePlacesSearchResponse>(
        `${this.baseUrl}/textsearch/json`,
        {
          params: {
            query,
            key: this.apiKey,
          },
          timeout: 10000,
        }
      );

      if (searchResp.data.status !== 'OK' && searchResp.data.status !== 'ZERO_RESULTS') {
        throw new ProviderError(
          'Google Places',
          searchResp.data.error_message || searchResp.data.status
        );
      }

      const places = searchResp.data.results.slice(0, params.limit);
      const candidates: BusinessLeadCandidate[] = [];

      for (const place of places) {
        const candidate = this.normalizePlace(place, params);
        candidates.push(candidate);
      }

      return candidates;
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      const msg = error instanceof Error ? error.message : 'Unknown error';
      throw new ProviderError('Google Places', msg);
    }
  }

  private normalizePlace(
    place: GooglePlaceResult,
    params: SearchParams
  ): BusinessLeadCandidate {
    const addressParts = (place.formatted_address || '').split(',').map((p) => p.trim());
    
    return {
      externalId: `gp_${place.place_id}`,
      name: place.name,
      category: params.category,
      address: place.formatted_address || '',
      city: params.city,
      state: params.state || '',
      country: params.country,
      latitude: place.geometry?.location.lat,
      longitude: place.geometry?.location.lng,
      phone: place.international_phone_number || place.formatted_phone_number,
      website: place.website,
      rating: place.rating,
      reviewCount: place.user_ratings_total,
      mapsUrl: place.url,
      openingStatus: place.opening_hours?.open_now ? 'Open' : 'Closed',
      source: 'google_places',
    };
  }
}
