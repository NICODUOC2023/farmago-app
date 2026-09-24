import { MapBackdrop } from '@/components/maps/MapBackdrop';
import { Pharmacy } from '@/data/mock';

type Props = {
  pharmacies?: Pharmacy[];
  selectedId?: string;
  onSelectPharmacy?: (id: string) => void;
};

// TODO(mapa): por ahora se muestra el placeholder pastel para poder correr la
// app en Expo Go sin módulos nativos. Para activar un mapa real, reutilizá el
// switcher de proveedores (GoogleMap / MapboxMap) que quedó en
// src/components/maps — Mapbox requiere development build, no Expo Go.
export function AppMap(_props: Props) {
  return <MapBackdrop />;
}