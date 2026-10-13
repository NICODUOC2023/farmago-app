import * as Location from 'expo-location';

/**
 * Acceso a la ubicación del dispositivo.
 *
 * La ubicación se usa SOLO en primer plano y de forma efímera: se mantiene en
 * memoria para la búsqueda y nunca se persiste ni se envía a Supabase.
 */

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type LocationErrorCode =
  | 'permission_denied'
  | 'services_disabled'
  | 'timeout'
  | 'unavailable';

export class LocationError extends Error {
  readonly code: LocationErrorCode;

  constructor(code: LocationErrorCode, message: string) {
    super(message);
    this.name = 'LocationError';
    this.code = code;
  }
}

const POSITION_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new LocationError('timeout', 'No pudimos obtener tu ubicación a tiempo.'));
    }, ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Solicita el permiso de ubicación en primer plano.
 * Devuelve `true` si fue concedido.
 */
export async function requestForegroundPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === Location.PermissionStatus.GRANTED;
}

/**
 * Devuelve la posición actual del usuario.
 *
 * Lanza `LocationError` con un código estable para que la UI pueda mostrar el
 * mensaje adecuado (permiso denegado, GPS apagado, timeout, etc.).
 */
export async function getCurrentCoordinates(): Promise<Coordinates> {
  const granted = await requestForegroundPermission();
  if (!granted) {
    throw new LocationError(
      'permission_denied',
      'Necesitamos tu ubicación para buscar farmacias cercanas. Podés habilitarla desde los ajustes.',
    );
  }

  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    throw new LocationError(
      'services_disabled',
      'Los servicios de ubicación están desactivados en tu dispositivo.',
    );
  }

  try {
    const position = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      POSITION_TIMEOUT_MS,
    );

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch (error) {
    if (error instanceof LocationError) {
      throw error;
    }
    throw new LocationError('unavailable', 'No pudimos obtener tu ubicación. Intentá de nuevo.');
  }
}
