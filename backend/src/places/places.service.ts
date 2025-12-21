import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface AutocompletePrediction {
  description: string;
  place_id: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface PlaceDetails {
  formatted_address: string;
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}

@Injectable()
export class PlacesService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api/place';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GOOGLE_PLACES_API_KEY') || '';
    if (!this.apiKey) {
      console.warn('[PlacesService] GOOGLE_PLACES_API_KEY not set. Address autocomplete will be disabled.');
    }
  }

  async autocomplete(input: string, sessionToken?: string): Promise<{ predictions: AutocompletePrediction[] }> {
    if (!this.apiKey) {
      return { predictions: [] };
    }

    try {
      const params: any = {
        input,
        key: this.apiKey,
        types: 'address', // Only return addresses
      };

      if (sessionToken) {
        params.sessiontoken = sessionToken;
      }

      const response = await axios.get(`${this.baseUrl}/autocomplete/json`, {
        params,
        timeout: 5000,
      });

      if (response.data.status === 'OK' || response.data.status === 'ZERO_RESULTS') {
        return {
          predictions: response.data.predictions || [],
        };
      }

      console.error('[PlacesService] Google Places API error:', response.data.status, response.data.error_message);
      return { predictions: [] };
    } catch (error) {
      console.error('[PlacesService] Error calling Google Places API:', error.message);
      return { predictions: [] };
    }
  }

  async getPlaceDetails(placeId: string, sessionToken?: string): Promise<PlaceDetails | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const params: any = {
        place_id: placeId,
        key: this.apiKey,
        fields: 'formatted_address,address_components',
      };

      if (sessionToken) {
        params.sessiontoken = sessionToken;
      }

      const response = await axios.get(`${this.baseUrl}/details/json`, {
        params,
        timeout: 5000,
      });

      if (response.data.status === 'OK' && response.data.result) {
        return response.data.result;
      }

      console.error('[PlacesService] Google Places API error:', response.data.status, response.data.error_message);
      return null;
    } catch (error) {
      console.error('[PlacesService] Error calling Google Places API:', error.message);
      return null;
    }
  }
}

