import { Injectable } from '@nestjs/common';
import { IntegrationTokenCryptoService } from 'src/integrations/shared';

/**
 * Legacy DI token for the Linear module — delegates to shared integration crypto.
 */
@Injectable()
export class LinearTokenCryptoService extends IntegrationTokenCryptoService {}
