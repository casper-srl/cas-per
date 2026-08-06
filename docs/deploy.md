# Deploy Cas-Per

Pull request e push eseguono sempre build Astro, verifica delle route campione, scansione anti-segreti e build Docker.

Il flusso di rilascio mantiene il modello versionato concordato con Marco:

1. un push su `main` pubblica l'immagine `main`/`sha`/`latest`;
2. il deploy parte soltanto se la versione in `package.json` non ha ancora il tag `v<versione>`;
3. il job attende l'approvazione del GitHub Environment `production`;
4. dopo Portainer e gli smoke test, la pipeline crea il tag e la GitHub Release;
5. un tag `v*` o un avvio manuale può ridistribuire una versione già esistente.

Sviluppo locale, CI e immagine Docker richiedono Node 24 (minimo supportato `22.12.0`).

## Configurazione amministrativa richiesta

Nel GitHub Environment `production` configurare:

- secret `BWS_ACCESS_TOKEN`: token della machine identity Bitwarden limitata al progetto `casper-deploy`;
- variable `BWS_PORTAINER_WEBHOOK_SECRET_ID`: ID del nuovo segreto Bitwarden che contiene il webhook;
- variable `PRODUCTION_BASE_URL`: `https://www.cas-per.it`;
- almeno un required reviewer.

L'azione Bitwarden usa per impostazione predefinita il cloud USA. Se l'organizzazione viene creata su `vault.bitwarden.eu`, aggiungere `cloud_region: eu` allo step `Load deploy secret from Bitwarden`.

Il webhook precedentemente versionato deve essere revocato. Il nuovo webhook deve puntare al servizio Portainer corretto e non deve mai essere copiato nei log o nel repository.

Proteggere `main` con pull request obbligatoria, una review, check `Build`, conversazioni risolte e force-push disabilitato.

## Verifica

L'immagine incorpora `PUBLIC_BUILD_SHA`. Gli identificatori pubblici di misurazione sono versionati in `src/data/marketingTracking.json`; gli override `PUBLIC_*` servono solo per collaudi locali. La build verifica l'ordine dei consensi e l'assenza di tracker duplicati con `npm run check:tracking`.

Prima del deploy deve essere completata anche la checklist in `docs/tracking-consent.md`: il contenitore GTM pubblico attuale non è ancora pronto per il nuovo modello di consenso.

Dopo il webhook la pipeline attende fino a tre minuti e verifica:

- `/`;
- `/lp/monitor-structure-demo/email/`;
- `/promo-case-funerarie/` seguendo il redirect;
- `/version.json`, che deve contenere esattamente il commit in deploy.

Se Portainer restituisce un errore, una route fallisce o il commit non coincide, il deploy diventa rosso e tag/release non vengono creati.
