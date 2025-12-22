import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtOrDeviceAuthGuard } from '../auth/guards/jwt-or-device-auth.guard';
import { PlacesService } from './places.service';

@ApiTags('places')
@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Get('autocomplete')
  @UseGuards(JwtOrDeviceAuthGuard) // Allow either JWT (admin) or Device auth
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get address autocomplete suggestions from Google Places API' })
  async autocomplete(
    @Query('input') input: string,
    @Query('sessionToken') sessionToken?: string,
  ) {
    if (!input || input.trim().length < 3) {
      return { predictions: [] };
    }

    return this.placesService.autocomplete(input.trim(), sessionToken);
  }

  @Get('details')
  @UseGuards(JwtOrDeviceAuthGuard) // Allow either JWT (admin) or Device auth
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get place details from Google Places API' })
  async getPlaceDetails(
    @Query('placeId') placeId: string,
    @Query('sessionToken') sessionToken?: string,
  ) {
    if (!placeId) {
      throw new Error('placeId is required');
    }

    return this.placesService.getPlaceDetails(placeId, sessionToken);
  }
}

