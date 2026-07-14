# Runbook — AEM Edge Delivery Services con Universal Editor y Bitbucket (BYO Git)

**Proyecto:** Mango Assets Hub
**Organización:** Anseris
**Fecha del montaje:** 14 de julio de 2026
**Autor del runbook:** Ignacio Mancilla

Este documento describe, paso a paso, cómo se montó la instancia de Edge Delivery Services (EDS)
sobre Adobe Experience Cloud, con **AEM as a Cloud Service como fuente de contenido**,
**Universal Editor** como editor, y **Bitbucket** como repositorio de código vía **Bring Your Own Git**.

Está escrito para poder **rehacerlo desde cero**, **cambiar de entorno** o **volver a un paso concreto**
sin tener que reconstruir el razonamiento.

---

## 1. Arquitectura: qué habla con qué

```
   ┌──────────────┐   push    ┌───────────────┐   sync    ┌──────────┐
   │  Bitbucket   ├──────────►│ Cloud Manager ├──────────►│ code bus │
   │  (código)    │  webhook  │    (BYOG)     │           │   (EDS)  │
   └──────────────┘           └───────────────┘           └────┬─────┘
                                                               │
   ┌──────────────┐  publish  ┌───────────────┐                │
   │   AEM CS     ├──────────►│  content bus  ├────────────────┼──────► .aem.page
   │ (contenido)  │ techacct  │     (EDS)     │                │        .aem.live
   │ Universal Ed.│           └───────────────┘                │
   └──────────────┘                                            │
                                                               ▼
                                                    Sitio renderizado
```

- **El código** (CSS, JS, blocks) vive en Bitbucket. NO se ejecuta en AEM: es 100% client-side.
- **El contenido** vive en AEM as a Cloud Service y se edita con Universal Editor.
- **`fstab.yaml`** en el repo le dice a EDS dónde está el contenido.
- **`paths.json`** mapea el path de AEM (`/content/<site>`) a la raíz del sitio.
- **El code bus** de EDS se alimenta desde Bitbucket a través de Cloud Manager (BYOG),
  no directamente por el bot de GitHub.

---

## 2. Inventario de valores (el estado actual)

Guarda esta tabla. Todo lo demás se deriva de aquí.

| Concepto | Valor |
|---|---|
| **Programa Cloud Manager** | `47002` — *Anseris EMEA Partner Sandbox* |
| **Entorno AEM Author** | `https://author-p47002-e2179869.adobeaemcloud.com` |
| **Org de aem.live** | `anseris-products` |
| **Site de aem.live** | `eds-mango-assets-hub-ans` |
| **URL preview** | `https://main--eds-mango-assets-hub-ans--anseris-products.aem.page` |
| **URL live** | `https://main--eds-mango-assets-hub-ans--anseris-products.aem.live` |
| **Repo de código (real)** | Bitbucket · `anseris-products/eds-mango-assets-hub` |
| **Repo de bootstrap (cascarón)** | GitHub · `anseris-products/eds-mango-assets-hub-ans` |
| **Repository ID en Cloud Manager** | `268060` |
| **Path de contenido en AEM** | `/content/eds-mango-assets-hub-ans` |
| **Admin de aem.live** | `ignacio.mancilla@anseris.es` |
| **Cuenta técnica** | `32edf9e8-47ab-414d-8ce9-2f7c9849f9cb@techacct.adobe.com` |
| **Client ID (Cloud Manager API)** | `814ff9e54f93415281c8f25578a6...` (Adobe Developer Console) |

> **Regla de oro del naming:** `org` y `site` de aem.live construyen la URL como
> `https://main--<site>--<org>.aem.page`. El `site` debe coincidir con el **Site name** que
> le pongas al sitio en AEM (define `/content/<site>`), y ese path debe coincidir con `paths.json`.
> Si estos tres no cuadran, tendrás un 404 permanente sin mensaje de error útil.

---

## 3. Decisiones de arquitectura (y por qué)

### 3.1 ¿Por qué BYO Git y no GitHub directo?

EDS soporta **nativamente solo GitHub** (el bot *AEM Code Sync* es una GitHub App).
Como el código de Anseris vive en Bitbucket, se usó **Bring Your Own Git**, que enruta el
código a través de Cloud Manager. Vendors soportados por BYOG:

- GitHub Enterprise (self-hosted)
- **Bitbucket (solo cloud)** ← nuestro caso
- GitLab (cloud y self-hosted)
- Azure DevOps (cloud)

### 3.2 ¿Por qué hay que tocar GitHub igualmente?

Dos requisitos de Adobe que no se pueden esquivar:

1. **El nombre de la org de aem.live debe existir como org de github.com controlada por ti.**
   Es una medida anti-secuestro de namespace. No alojas código ahí, pero la org debe existir.

2. **BYOG exige que la org/site ya esté registrada en el config service con un usuario admin.**
   La única forma limpia de conseguir ese admin es el flujo de AEM Code Sync sobre un repo de GitHub.

### 3.3 NO uses el "one-click" de Cloud Manager

Cloud Manager ofrece crear un sitio EDS con un clic. **No lo uses en este flujo.**
Está documentado por Adobe: si creas el sitio así, **no quedas como admin** de la org de aem.live,
y las llamadas al Admin API que BYOG necesita (`code.json`, secret `cm-byog`) te devolverán 403.
Te quedas atascado a mitad de camino sin forma de salir.

---

## 4. Prerequisitos y accesos

Antes de empezar, confirma que tienes **todo** esto. Si falta uno, para.

| Acceso | Para qué | Bloqueo típico |
|---|---|---|
| Admin en **Cloud Manager** (programa) | Onboardear repo externo y sitio EDS | Rol insuficiente en la org IMS |
| Admin en el repo de **Bitbucket** | Crear el repository access token y el webhook | — |
| **Adobe Developer Console** | Generar el Client ID de la Cloud Manager API | Tu usuario no es *System Administrator* ni *Developer* en la org IMS → pídeselo al admin |
| Crear **orgs y repos en GitHub** | Reservar el namespace + bootstrap | Políticas de TI |
| Acceso al **AEM Author** | Crear el sitio, cuenta técnica | El programa debe tener licencia EDS |
| **AEM Sidekick** instalado | Autoría y autenticación | — |
| **Node/npm** | Desarrollo local (`aem up`) | — |

**Check rápido de licencia EDS:** en el Author, ve a **Sites → Create**. Si NO aparece
**"Site from template"**, el programa no tiene EDS habilitado. Pídelo por soporte antes de seguir.

---

## 5. FASE 1 — Token de acceso en Bitbucket

> Tiene que ser un **Repository access token**, NO uno de workspace.
> Los de workspace y project son **feature de pago (Premium)**; los de repositorio están en todos los planes.

1. Bitbucket → **repo** `eds-mango-assets-hub` → **Repository settings**
2. Sección **Security** → **Access tokens** → **Create access token**
3. Nombre: `cloud-manager-byog`
4. Permisos **exactos** que exige Cloud Manager:

   | Scope | Nivel |
   |---|---|
   | Repositories | **Read** |
   | Pull requests | **Write** |
   | Webhooks | **Read and write** |

5. **Cópialo al crearlo** — solo se muestra una vez.

> **Caduca a los 365 días** (política del workspace). Cuando expire, el sync de código
> dejará de funcionar **sin avisar**. Ponlo en el calendario.

---

## 6. FASE 2 — Onboardear el repo en Cloud Manager

1. [my.cloudmanager.adobe.com](https://my.cloudmanager.adobe.com/) → org correcta
2. **My Programs** → programa `47002`
3. Menú lateral → **Program** → **Repositories**
4. **Add Repository** → **Private Repository**
5. Rellena:

   | Campo | Valor |
   |---|---|
   | Repository Name | `eds-mango-assets-hub` |
   | Repository URL | `https://bitbucket.org/anseris-products/eds-mango-assets-hub.git` |
   | Repository Type | **Bitbucket** (se autodetecta) |

   > La URL debe ser **HTTPS y terminar en `.git`**. No sirve el `git@bitbucket.org:` del remote SSH.

6. **Save** → se abre **Private Repository Ownership Validation**
7. **Add new Access Token** → pega el token de la Fase 1 → **Validate**

**Checkpoint:** en el menú `•••` del repo debe aparecer la opción **Config Webhook**.
Si no aparece, la validación de ownership no pasó (revisa los scopes del token).

---

## 7. FASE 3 — Webhook Bitbucket → Cloud Manager

### 7.1 Generar el Client ID (Cloud Manager API)

1. [developer.adobe.com/console](https://developer.adobe.com/console) — **misma org IMS** que Cloud Manager
2. **Create new project** → **Add API** → **Cloud Manager API**
3. Credencial: **OAuth Server-to-Server**
4. Product profile: **Deployment Manager – Cloud Service** (o Business Owner)
5. Copia el **API KEY (CLIENT ID)**

### 7.2 Generar el webhook en Cloud Manager

1. **Repositories** → `•••` → **Config Webhook**
2. Copia la **Webhook URL**
3. **Generate** el **Webhook Secret** → cópialo
4. **Close**

### 7.3 Los dos valores que TODO EL MUNDO confunde

Son **distintos** y van en **sitios distintos**:

| Dónde va | Qué valor | De dónde sale |
|---|---|---|
| `api_key=` **en la URL** | **Client ID** | Adobe Developer Console |
| Campo **Secret** del webhook | **Webhook Secret** | Cloud Manager (Config Webhook → Generate) |

La Webhook URL viene con un `api_key` de relleno. **Tienes que sustituirlo** por tu Client ID.

URL final, con la forma:
```
https://cloudmanager.adobe.io/api/program/47002/repository/268060/events?api_key=<CLIENT_ID>
```

> De esta URL salen dos valores que necesitarás en la Fase 6:
> **program-id = `47002`** y **repository-id = `268060`**.

### 7.4 Registrar el webhook en Bitbucket

**Repository settings → Workflow → Webhooks → Add webhook**

| Campo | Valor |
|---|---|
| Title | `Adobe Cloud Manager` |
| URL | la Webhook URL **con el `api_key` sustituido** |
| Secret | el **Webhook Secret** de Cloud Manager |
| Status | Active |

**Triggers** (los 5 que exige Adobe):
- Repository → **Push**
- Pull request → **Created**
- Pull request → **Updated**
- Pull request → **Merged**
- Pull request → **Comment created**

### 7.5 Verificar

Activa **Enable History** en el webhook, haz un push y mira **View request logs**:

| Código | Significado |
|---|---|
| **200** | Correcto |
| **400** `INVALID_SIGNATURE` | El campo **Secret** está vacío o no coincide |
| **401** | El `api_key` no es un Client ID válido |

> **Cómo diagnosticar el 400:** mira los headers de la petición en *View details*.
> Si **no existe** la cabecera `X-Hub-Signature`, es que el Secret está vacío —
> Bitbucket solo firma cuando hay secret configurado.
>
> Cuidado: Cloud Manager valida la **firma antes que la api_key**, así que un `api_key`
> incorrecto también devuelve 400 y te hace perseguir el error equivocado. Deja ambos bien.

---

## 8. FASE 4 — Bootstrap de la org en aem.live

Objetivo: registrar `org` + `site` en el config service de Adobe **y quedar como admin**.

### 8.1 Crear la org de GitHub

1. https://github.com/organizations/plan → plan **Free**
2. Organization account name: **`anseris-products`** ← debe ser idéntico al `org` de aem.live

### 8.2 Crear el repo de bootstrap

En la org: **New repository** → `eds-mango-assets-hub-ans` → **completamente vacío**
(sin README, sin .gitignore, sin license).

### 8.3 Añadir SOLO el fstab.yaml

No hace falta duplicar el código. Code Sync solo necesita leer `fstab.yaml`.
Créalo desde la web de GitHub (**Add file → Create new file**):

`fstab.yaml`:
```yaml
mountpoints:
  /:
    url: "https://author-p47002-e2179869.adobeaemcloud.com/bin/franklin.delivery/anseris-products/eds-mango-assets-hub-ans/main"
    type: "markup"
    suffix: ".html"
```

Estructura de la URL:
```
https://<aem-author>/bin/franklin.delivery/<org>/<site>/main
```

### 8.4 Instalar AEM Code Sync

https://github.com/apps/aem-code-sync → **Configure** → org `anseris-products`
→ **Only select repositories** → `eds-mango-assets-hub-ans` → **Save**

> **El orden importa:** el `fstab.yaml` correcto debe estar YA en `main` antes de instalar
> Code Sync. El bot lo lee en el momento de la instalación.

### 8.5 Checkpoint crítico: el admin

La pantalla de confirmación debe decir:

```
Set up AEM for anseris-products / eds-mango-assets-hub-ans.
Made ignacio.mancilla@anseris.es an admin.
Started AEM Code Sync for selected GitHub repositories.
```

**Si dice** *"We were not able to determine the user that installed AEM Code Sync"*
→ NO quedaste como admin. Sigue el enlace al User Admin Tool y añádete a mano con rol **Admin**,
usando **el email con el que entras a Adobe/AEM** (no necesariamente el de GitHub).

Verifica siempre en:
```
https://tools.aem.live/tools/user-admin/index.html?org=anseris-products&site=eds-mango-assets-hub-ans
```
→ **Fetch Users** → tu email debe salir como **Admin**.

**Sin admin, todo lo que viene después falla con 403.**

---

## 9. FASE 5 — Añadir el site a Cloud Manager y verificar ownership

1. [experience.adobe.com](https://experience.adobe.com) → **Experience Manager** → **Cloud Manager** → programa `47002`
2. **Program Overview** → pestaña **Edge Delivery** → **Add Edge Delivery site**
3. Rellena:

   | Campo | Valor |
   |---|---|
   | Site Name | `eds-mango-assets-hub-ans` |
   | Edge Delivery origin | `https://main--eds-mango-assets-hub-ans--anseris-products.aem.live` |

4. **Add** → se abre **Verify repository ownership**

### Verificación de ownership

Cloud Manager te pide subir un archivo challenge al repo asociado al site.
**En este punto ese repo es el de GitHub** (el `code.json` con BYOG todavía no se ha lanzado),
y Cloud Manager lo lee **sirviéndolo desde el sitio live** — por eso Code Sync debe seguir activo.

1. Mira el campo **Repository URL** del diálogo para confirmar a qué repo apunta
2. En **GitHub**, rama `main`, crea el archivo:

   ```
   well-known/adobe/cloudmanager-challenge.txt
   ```

   > **SIN punto al principio.** Es `well-known/`, no `.well-known/`.

3. Pega dentro el código del challenge → commit a `main`
4. Espera ~1 min (Code Sync propaga) → **Verify**

**Checkpoint:** el site aparece con **Status: Verified** (círculo verde).
Solo entonces se habilita la opción **Bring Your Own Git**.

---

## 10. FASE 6 — Activar BYO Git y configurar el Admin API

### 10.1 Bring Your Own Git en Cloud Manager

1. En la fila del site → `•••` → **Bring Your Own Git**
2. Selecciona el repo de Bitbucket `eds-mango-assets-hub`
3. **Copia el secret que devuelve** — solo se muestra una vez.
   Si reconfiguras el site, se genera uno nuevo y hay que volver a registrarlo.

### 10.2 Obtener el auth token del Admin API

1. Abre `https://admin.hlx.page/login/anseris-products/eds-mango-assets-hub-ans/main`
2. Autentícate → te redirige a `/profile`
3. DevTools → **Application → Cookies → `https://admin.hlx.page`** → copia la cookie **`auth_token`**

> Es un token de sesión (caduca en ~24h). Para automatización permanente, crea API Keys propias:
> `POST https://admin.hlx.page/config/{org}/sites/{site}/apiKeys.json`

### 10.3 Las dos llamadas

```bash
export AUTH='<auth_token>'
export CM_SECRET='<secret de Cloud Manager>'

# 1) Apuntar el código a Bitbucket vía Cloud Manager
curl -i -X POST https://admin.hlx.page/config/anseris-products/sites/eds-mango-assets-hub-ans/code.json \
  -H 'content-type: application/json' \
  -H "x-auth-token: $AUTH" \
  --data '{
    "source": {
      "url": "https://cm-repo.adobe.io/api",
      "raw_url": "https://cm-repo.adobe.io/api/raw",
      "owner": "47002",
      "repo": "268060",
      "type": "byogit",
      "secretId": "cm-byog"
    }
  }'

# 2) Registrar el secret
curl -i -X POST https://admin.hlx.page/config/anseris-products/sites/eds-mango-assets-hub-ans/secrets/cm-byog.json \
  -H 'content-type: application/json' \
  -H "x-auth-token: $AUTH" \
  --data "{\"value\": \"$CM_SECRET\"}"
```

> `owner` = **program-id** (`47002`), `repo` = **repository-id** (`268060`).
> Son los **IDs numéricos**, no los nombres. Salen de la URL del webhook.

### 10.4 Anomalía conocida (no es un error)

Al hacer `GET` de la config, verás:

```json
"code": { "source": { "type": "github", ... } }
```

**Aunque enviaste `"byogit"`.** No lo intentes "arreglar": es una etiqueta interna sin efecto.
Lo que manda es lo que resuelve el job de sync, y ahí sí aparece correctamente:

```json
"type": "bitbucket", "installationId": "byogit"
```

Perseguir este `type: github` es una pérdida de tiempo. Verifica funcionalmente, no por el JSON.

---

## 11. FASE 7 — Primer sync de código

1. Cloud Manager → `•••` del site → **Sync Code** → rama `main`
2. Verifica el job:

```bash
curl -s -H "x-auth-token: $AUTH" \
  https://admin.hlx.page/job/anseris-products/eds-mango-assets-hub-ans/main/code

# Y el detalle del último job:
curl -s -H "x-auth-token: $AUTH" \
  https://admin.hlx.page/job/anseris-products/eds-mango-assets-hub-ans/main/code/<job-name>/details
```

**Lo que hay que ver en `/details`:**

```json
"type": "bitbucket",
"installationId": "byogit",
"phase": "completed",
"sha": "<tu commit>",
"progress": { "failed": 0 }
```

> Un **404 en la home a estas alturas es normal**: el código está, pero aún no hay contenido.

---

## 12. FASE 8 — Crear el sitio en AEM

1. Descarga el site template: https://github.com/adobe-rnd/aem-boilerplate-xwalk/releases
2. Author → **Sites → Create → Site from template**
3. **Import** → sube el `.zip` (solo hace falta una vez; luego se reutiliza)
4. Selecciona la plantilla → **Next**
5. Rellena:

   | Campo | Valor |
   |---|---|
   | Site title | `Mango Assets Hub` (libre) |
   | **Site name** | **`eds-mango-assets-hub-ans`** ← crítico |
   | Project URL | `https://main--eds-mango-assets-hub-ans--anseris-products.aem.page` |

   > **El Site name define `/content/<site-name>` en AEM**, y debe coincidir con `paths.json`.
   > Si no coinciden, el contenido queda en un path que EDS no mapea → **404 permanente**.

6. **Create** → navega al `index.html` del sitio → **Edit** → se abre el Universal Editor

### Archivos del repo que dependen de esto

`fstab.yaml`:
```yaml
mountpoints:
  /:
    url: "https://author-p47002-e2179869.adobeaemcloud.com/bin/franklin.delivery/anseris-products/eds-mango-assets-hub-ans/main"
    type: "markup"
    suffix: ".html"
```

`paths.json`:
```json
{
  "paths": {
    "mappings": ["/content/eds-mango-assets-hub-ans/:/"],
    "includes": ["/content/eds-mango-assets-hub-ans/"]
  }
}
```

---

## 13. FASE 9 — Cuenta técnica (sin esto no se publica)

AEM genera una cuenta técnica de solo lectura por instancia. Hay que darle permiso de publicación.

1. Author → **Tools → Cloud Services → Edge Delivery Services Configuration**
2. Selecciona la config creada automáticamente para tu sitio → **Properties**
3. Pestaña **Authentication** → copia el **technical account ID**
   (`<id>@techacct.adobe.com`)
4. Ve a `https://tools.aem.live/tools/user-admin/index.html?org=anseris-products&site=eds-mango-assets-hub-ans`
5. **Fetch Users** → **confirma primero que tú sales como Admin**
   (si te añades usuarios sin ser admin, te bloqueas fuera de tu propia configuración)
6. **Add User(s)** → pega el `@techacct.adobe.com` → rol **Config Admin**

Tarda 1–2 minutos en propagar.

---

## 14. FASE 10 — Publicar

Universal Editor → botón **Publish** → destino **Live** → **Publish**

### El botón "Preview" NO funciona en este entorno

Si eliges **Preview** sale:

```
URL: .../bin/replicate
400 - Error: Replication triggered, but no agent found!
```

**Causa:** el botón *Preview* del Universal Editor intenta replicar al **Preview tier de AEM**
(una instancia aparte, replicación clásica vía `/bin/replicate`), que **no está aprovisionado**
en este entorno sandbox. No es un fallo del montaje de EDS.

**Solución:** publica con **Live**. EDS hace **preview y live en la misma operación**
(se ve en los timestamps: preview a las :24, live a las :25). `.aem.page` es tu preview de EDS,
y se rellena igual.

Si algún día necesitas que el botón Preview funcione, hay que pedir el aprovisionamiento
del **Preview service** en el entorno. Para EDS no es necesario.

---

## 15. Verificaciones finales

### 15.1 ¿Está el contenido publicado en EDS?

```bash
curl -s -H "x-auth-token: $AUTH" \
  https://admin.hlx.page/status/anseris-products/eds-mango-assets-hub-ans/main/index
```

Lo que confirma que todo está bien:

```json
"preview": { "status": 200 },
"live":    { "status": 200 },
"lastModifiedBy": "<...>@techacct.adobe.com"   ← escribió la cuenta técnica
"sourceLocation": "markup:https://author-p47002-e2179869.../bin/franklin.delivery/..."
```

> Este endpoint es **la fuente de verdad**. Distingue entre "publicó a EDS" y
> "replicó al Publish clásico de AEM", que se parecen desde la UI pero no son lo mismo.

### 15.2 ¿Propaga el código automáticamente?

1. Haz un cambio visible en `styles/styles.css`
2. `git push origin main` — **sin tocar Cloud Manager**
3. Verifica que aparece un **job nuevo**:

```bash
curl -s -H "x-auth-token: $AUTH" \
  https://admin.hlx.page/job/anseris-products/eds-mango-assets-hub-ans/main/code
```

4. Comprueba el archivo servido:

```bash
curl -s --compressed https://main--eds-mango-assets-hub-ans--anseris-products.aem.page/styles/styles.css | head -2
```

> Usa **`--compressed`**. Sin ese flag, curl te devuelve la respuesta comprimida (brotli)
> y verás basura binaria — parece un error y no lo es.

---

## 16. Troubleshooting: errores reales que nos encontramos

| Síntoma | Causa real | Solución |
|---|---|---|
| Bitbucket: *"Workspace-level access tokens are a Premium feature"* | Estabas en **Workspace settings** | Usa **Repository settings → Security → Access tokens**. Los de repo están en todos los planes. |
| Webhook → **400** `INVALID_SIGNATURE` | El campo **Secret** del webhook estaba vacío. Sin secret, Bitbucket no manda `X-Hub-Signature` | Pega el Webhook Secret de Cloud Manager. Si lo perdiste, regenéralo (invalida el anterior). |
| Webhook → **401** | El `api_key` de la URL no es el Client ID | Sustitúyelo por el Client ID del Developer Console |
| `code.json` devuelve `"type": "github"` | Etiqueta interna. Sin efecto | **Ignóralo.** Verifica con el job de sync (`"type": "bitbucket"`) |
| Home → **404** tras el sync | Código sincronizado pero **sin contenido** | Crea el sitio en AEM y publica |
| **404 permanente** aunque publiques | `Site name` de AEM ≠ `paths.json` | Alinea `/content/<site>` con el mapping de `paths.json` |
| Publish → *"no agent found"* en Preview | Preview tier de AEM no aprovisionado | Publica con **Live** (hace preview + live) |
| Sync → `Unable to fetch hlxignore: 401` | El secret `cm-byog` es incorrecto | Repite la llamada 2 de la Fase 6.3 |
| Admin API → **403** | No eres admin de la org de aem.live | User Admin Tool → añádete como **Admin** |
| Admin API → **401** | El `auth_token` caducó | Vuelve a hacer login en `admin.hlx.page/login/...` |
| `curl` de un CSS devuelve binario | Falta `--compressed` | Añade el flag |

---

## 17. Cómo cambiar de entorno (p. ej. Sandbox → Producción)

Este montaje está sobre un **programa Sandbox** (`47002`). Para llevarlo a producción:

### Lo que hay que rehacer

1. **Programa de producción con licencia EDS** (Cloud Manager)
2. **Actualizar `fstab.yaml`** con el nuevo Author:
   ```
   https://author-pXXXXX-eYYYYY.adobeaemcloud.com/bin/franklin.delivery/<org>/<site>/main
   ```
   > O, si el site ya está en el config service, cámbialo sin tocar el repo:
   > ```bash
   > curl -X POST https://admin.hlx.page/config/<org>/sites/<site>/content.json \
   >   -H 'content-type: application/json' -H "x-auth-token: $AUTH" \
   >   --data '{"source":{"url":"https://author-pXXXXX-eYYYYY.../bin/franklin.delivery/<org>/<site>/main","type":"markup","suffix":".html"}}'
   > ```
   > También puedes usar la UI: https://tools.aem.live/tools/site-admin/index.html

3. **Onboardear el repo de Bitbucket** en el nuevo programa (Fases 2 y 3).
   Ojo: el `repository-id` **será distinto** → hay que rehacer el `code.json`.
4. **Nuevo webhook** (nueva URL con el nuevo program-id) → nuevo Secret en Bitbucket
5. **Add Edge Delivery Site** + verificación de ownership en el nuevo programa
6. **Nueva cuenta técnica** (es única por instancia de AEM) → rol Config Admin
7. **Recrear el sitio** en el nuevo Author desde el site template

### Lo que NO hay que rehacer

- La org de GitHub `anseris-products` (se mantiene)
- La org de aem.live (a menos que cambies de namespace)
- El código en Bitbucket

> **Un repo onboardeado en Cloud Manager solo puede estar enlazado a un site a la vez.**
> Si conectas el mismo repo a otro site, la configuración original (incluido el secret) **se revoca**.
> Para usar un repo con varios sites, hay que usar la feature **[repoless](https://www.aem.live/docs/repoless)**.

---

## 18. Mantenimiento

| Elemento | Vence / Riesgo | Acción |
|---|---|---|
| **Repository access token de Bitbucket** | **365 días** | Rotar antes de que expire. Al expirar, el sync de código **falla en silencio**. |
| **Webhook secret** | No expira, pero se invalida si reconfiguras BYOG en Cloud Manager | Re-registrar en Bitbucket |
| **auth_token del Admin API** | ~24h | Solo para uso manual. Para automatización, crear API Keys |
| **Programa Sandbox** | **Hiberna por inactividad y puede reciclarse** | No dependas de él para nada crítico |
| **Org de GitHub `anseris-products`** | — | **NO BORRAR.** Adobe exige que exista. |
| **Repo de bootstrap en GitHub** | — | Archivarlo con un README explicativo. No es el repo real. |

### Limpieza opcional (una vez el config service está activo)

Adobe recomienda eliminar del repo los archivos de configuración legacy, ya que la config
del servicio los sobrescribe:

- `fstab.yaml`
- `robots.txt`
- `tools/sidekick/config.json`
- `helix-query.yaml`
- `helix-sitemap.yaml`

> No los borres hasta estar seguro de que la config del servicio es correcta y estable.

---

## 19. Desarrollo local

```bash
npm install -g @adobe/aem-cli
cd ~/Repositories/eds-mango-assets-hub
aem up          # abre http://localhost:3000/
```

Los cambios en `blocks/*.css` y `blocks/*.js` se reflejan al instante.
Al hacer `git push origin main`, el webhook propaga automáticamente a:

- Preview: `https://main--eds-mango-assets-hub-ans--anseris-products.aem.page/`
- Producción: `https://main--eds-mango-assets-hub-ans--anseris-products.aem.live/`

---

## 20. Referencias

- [Set Up AEM Sites as a Content Source (aem.live)](https://www.aem.live/developer/ue-tutorial)
- [Bring Your Own Git (aem.live)](https://www.aem.live/developer/byo-git)
- [Setting up the configuration service](https://www.aem.live/docs/config-service-setup)
- [Admin API Keys](https://www.aem.live/docs/admin-apikeys)
- [Admin API reference](https://www.aem.live/docs/admin.html)
- [Add external repositories in Cloud Manager](https://experienceleague.adobe.com/en/docs/experience-manager-cloud-manager/content/managing-code/external-repositories)
- [Add an Edge Delivery site to Cloud Manager](https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/implementing/using-cloud-manager/edge-delivery-sites/add-edge-delivery-site)
- [Creating Blocks for the Universal Editor](https://www.aem.live/developer/universal-editor-blocks)
- [Repository access tokens (Bitbucket)](https://support.atlassian.com/bitbucket-cloud/docs/repository-access-tokens/)
- [aem-boilerplate-xwalk](https://github.com/adobe-rnd/aem-boilerplate-xwalk)
- [Discord de la comunidad AEM](https://discord.gg/aem-live)
