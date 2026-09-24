// Estilo pastel consistente con la paleta de la app. Solo aplica en Android
// (react-native-maps ignora customMapStyle en iOS / Apple Maps).
export const PASTEL_MAP_STYLE = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#E9E6FA' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#D9E9FA' }],
  },
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{ color: '#F3F1FD' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#F9E9F1' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#C4F1DC' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#E2DFFF' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#D6D2F8' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#CCC7F2' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#8B87A8' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#EDEBFB' }],
  },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#D6D2F8' }],
  },
];