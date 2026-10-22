# MAX API trust chain

`russian-trusted-ca.pem` contains the official Russian Trusted Root CA and
Russian Trusted Sub CA, downloaded over verified HTTPS on 2026-10-22 from:

- https://gu-st.ru/content/lending/russian_trusted_root_ca_pem.crt
- https://gu-st.ru/content/lending/russian_trusted_sub_ca_pem.crt

Official installation page: https://www.gosuslugi.ru/crt

SHA-256 certificate fingerprints (not file hashes):

- Root (expires 2032-02-27): `D26D2D0231B7C39F92CC738512BA54103519E4405D68B5BD703E9788CA8ECF31`
- Sub (expires 2027-03-06): `BBBDE2103E790B999EC62BD03CF625A5A2E7C316E10AFE6A490EEDEAD8B3FD9B`

The MAX adapter passes these CAs together with standard roots to Bun fetch's
request-local `tls.ca`. Verification remains enabled. No global trust store or
environment variables are modified. Refresh this bundle from official sources
when the issuing chain rotates; do not disable verification on failure.
