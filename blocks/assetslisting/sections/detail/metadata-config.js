/*
 * Declarative config for the detail panel's "Metadatos" tab: the ordered list of
 * metadata keys to surface and their display labels. The backend returns a
 * generic metadata bag keyed by JCR property name; the panel renders only the
 * keys listed here that are present on the asset, hiding the rest.
 *
 * To surface a new metadata field, add an entry here — no backend change is
 * needed as long as the property lives on the asset's metadata node.
 */

const METADATA_FIELDS = [
  { key: 'dc:creator', label: 'Autor' },
  { key: 'dc:rights', label: 'Derechos' },
  { key: 'dc:language', label: 'Idioma' },
  { key: 'xmp:CreatorTool', label: 'Creado con' },
  { key: 'photoshop:ColorMode', label: 'Modo de color' },
  { key: 'tiff:Make', label: 'Cámara' },
  { key: 'tiff:Model', label: 'Modelo' },
  { key: 'exif:FNumber', label: 'Apertura' },
  { key: 'exif:ExposureTime', label: 'Exposición' },
  { key: 'exif:ISOSpeedRatings', label: 'ISO' },
  { key: 'exif:FocalLength', label: 'Distancia focal' },
  { key: 'xmpRights:UsageTerms', label: 'Términos de uso' },
];

export default METADATA_FIELDS;
