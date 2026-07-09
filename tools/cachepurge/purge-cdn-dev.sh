#!/usr/bin/env bash
#
# Purga la caché del CDN gestionado de Adobe (publish) que hace de proxy hacia EDS.
# Úsalo después de cada deploy de EDS para que el dominio de Adobe muestre la última
# versión del frontend sin esperar el TTL (max-age=7200 => hasta 2h).
#
# Requiere la variable de entorno CDN_PURGE_KEY con el valor en texto plano
# (el mismo secreto que configuraste como purgeKey1/purgeKey2 en cdn.yaml).
#
# Uso:
#   export CDN_PURGE_KEY=<tu_clave>
#   ./purge-cdn.sh                 # flush total (X-AEM-Purge: all)
#   ./purge-cdn.sh /path/a/purgar  # purga una sola ruta (soft)
#
set -euo pipefail


HOST="${CDN_PURGE_HOST:-https://publish-p47002-e1212860.adobeaemcloud.com}"

if [[ -z "${CDN_PURGE_KEY:-}" ]]; then
  echo "ERROR: define CDN_PURGE_KEY con el valor en texto plano de la clave de purge." >&2
  exit 1
fi

if [[ $# -eq 0 ]]; then
  echo "Flush total del CDN en ${HOST} ..."
  curl -fsS -X PURGE "${HOST}/" \
    -H "X-AEM-Purge-Key: ${CDN_PURGE_KEY}" \
    -H "X-AEM-Purge: all"
  echo
else
  for path in "$@"; do
    echo "Purge soft de ${HOST}${path} ..."
    curl -fsS -X PURGE "${HOST}${path}" \
      -H "X-AEM-Purge-Key: ${CDN_PURGE_KEY}" \
      -H "X-AEM-Purge: soft"
    echo
  done
fi

echo "Listo."
