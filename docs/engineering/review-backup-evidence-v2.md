# Evol Review backup evidence v2

Version 2 extends, and does not replace, the v1 contract. Version 1 remains
byte-compatible and valid for its original integrity contract, but cannot
authorize migrations 0143–0146. Version 2 is structural only in Slice B1a: it
defines schemas, profiles, canonical bytes and an acyclic evidence graph. It does
not contact storage, decrypt data, create claims, or promote a database.

## Canonical bytes

Every document is UTF-8 JSON with recursively sorted object keys, no duplicate
or unknown keys, canonical UTC timestamps (`YYYY-MM-DDTHH:mm:ss.sssZ`), and
exactly one trailing LF. A content identifier is lowercase SHA-256 over those
exact bytes. Detached signatures, when implemented by B1b, sign those bytes and
must use the document's declared key purpose.

Canonicalization accepts only the JSON data model. It rejects non-finite numbers,
negative zero, undefined values, functions, symbols, bigint values, cycles,
non-plain objects, and sparse or decorated arrays. Unicode is not normalized:
identity is defined by the original UTF-8 code points and canonical bytes.

## Acyclic graph

`O` is the operation intent. `D1` and `D2` are ciphertext descriptors. `H1` and
`H2` are historical retention proofs. `R` is the restore proof, `A` the human
approval, and `M` the final manifest.

```text
O -> D1,D2
O+D1 -> H1             O+D2 -> H2
O+D1+D2+H1+H2 -> R
O+R+H1+H2 -> A
O+D1+D2+H1+H2+R+A -> M
```

No child references `M`; therefore `M` can bind every predecessor without a
hash cycle. PRE provider observations occur after `M` and are recorded by a v2
claim. POST observations are recorded by a v2 receipt. The schemas define those
records, but B1a creates no executable claim or receipt path.

## Frozen profiles

- encryption: `age-x25519-v1`;
- retention: `s3-object-lock-compliance-v1`;
- digest: `sha256`;
- signatures: `ed25519`;
- minimum retention after POST: 259200 seconds;
- proposed maximum promotion duration: 1800 seconds;
- provider-observation TTL: 300 seconds.

The 1800-second limit and provider/account topology require operational approval
before use. Age passphrase, plugin recipients, unknown profiles and S3 Object
Lock GOVERNANCE mode are not accepted.

## Security properties

Ciphertext integrity and confidentiality come from authenticated age encryption;
recoverability additionally requires restoring the exact authenticated plaintext
into PostgreSQL 17. Historical retention evidence is auditable but never replaces
a fresh authenticated provider query at PRE and POST. Two object versions prove
distinct immutable identities, not physical-media independence.

Human approval binds the operation intent, restore proof, retention proofs, RPO,
RTO, exclusions, residual risks and execution window. Its key purpose is distinct
from all technical purposes. Unknown, revoked, expired and test-only keys remain
fail-closed responsibilities for B1b.

B1a rejects reuse of one `key_id` across incompatible purposes, including reuse
of the human-approval identifier for a technical signature. Distinct identifiers
do not prove distinct public keys: B1b must verify actual public-key fingerprints
and trust-registry authorization for each purpose. Ciphertext descriptors and
retention proofs use the same normalized `object_identity` field constraints.

## Slice boundary

B1a supplies declarative contracts and a pure graph validator only. Operational
signature verification belongs to B1b; age/S3 adapters belong to B1c. No private
or operational public key is included here.
