import { MapBackdrop } from '@/components/maps/MapBackdrop';
import { Pharmacy } from '@/data/mock';

type Props = {
  pharmacies?: Pharmacy[];
  selectedId?: string;
  onSelectPharmacy?: (id: string) => void;
};

// react-native-maps no corre en web: mostramos el placeholder pastel.
export function GoogleMap(_: Props) {
  return <MapBackdrop />;
}