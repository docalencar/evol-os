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

## Detached signatures and trust registry

A signed v2 document is accompanied by one canonical detached-signature envelope.
The envelope identifies its `key_id`, exact `key_purpose`, lowercase SHA-256 of
the payload, and the frozen `ed25519` profile. `signature_base64` is the strict
Base64 representation of the 64-byte Ed25519 signature. The signature covers the
payload's exact canonical UTF-8 bytes, including the final LF. The envelope is a
binding contract; it neither substitutes for cryptographic verification nor
authorizes the key for the declared purpose.

Operation intent, both historical retention proofs, restore proof, human approval
and final manifest require signatures. Ciphertext descriptors remain authenticated
transitively by their hashes in the signed evidence graph; they do not acquire a
new signature surface in B1b-1.

The sole operational v2 trust registry is the versioned
`scripts/review/backup-evidence/v2/trust-registry.json`. It starts with no keys, so
all operational evidence fails closed until a separately governed public key is
approved. No CLI option, environment variable, manifest field or alternate path
may replace it. Public keys are separate PEM files; private keys and operational
test keys never belong in the repository.

Each future registry entry authorizes one `key_id` and public-key fingerprint for
exactly one purpose. Key identifiers are unique across the registry. The runtime
must calculate SHA-256 of the loaded SPKI DER and compare it with
`public_key_spki_sha256`; a distinct identifier is not proof of a distinct key.
The fingerprint authorized for `HUMAN_RISK_APPROVAL` must differ from every
technical-key fingerprint. Reuse across those boundaries fails closed.

`ACTIVE` entries have no `revoked_at`; `REVOKED` entries require it. Revocation is
absolute and retroactive for operational verification: a revoked key is refused
even when a document predates `revoked_at`. `test_only` keys are always refused by
the operational entrypoint. Verification also requires canonical timestamps,
`not_before <= issued_at < expires_at <= not_after`, and current validity of the
document and key. No arbitrary maximum validity duration is introduced here.
Operational clock authority, acceptable clock skew and any future maximum validity
limits remain pending explicit approval.

JSON Schema cannot express uniqueness by one property across array entries. The
registry schema rejects byte-equivalent duplicate entries with `uniqueItems`; the
B1b-3 runtime additionally rejects every repeated `key_id` and enforces the
cross-entry fingerprint separation above before accepting a registry.

## B1b-3 offline trust-registry runtime

B1b-3 implements an offline cryptographic core. It is not an operational
entrypoint and does not authorize promotion, backup creation, provider access or
database mutation. Its public interfaces are:

- `loadOfflineTrustRegistry(registryPath)`: test/offline loader for a canonical
  registry and its public-key files. It validates the complete registry before
  returning an opaque state; it is not an operational trust-path override.
- `loadCanonicalTrustRegistry()`: zero-argument loader for the sole repository
  registry, `trust-registry.json`. The published registry remains empty.
- `verifySignedDocumentOffline(options)`: verifies canonical payload and envelope
  bytes using an already validated opaque registry state and a mandatory explicit
  verification instant.
- `verifyWithCanonicalTrustRegistry(options)`: binds verification to the
  zero-argument canonical loader and accepts no registry path or trust-store
  override. With the published empty registry, every signed document fails
  closed as an unknown `key_id`.

The verifier maps each signed document type to its published schema and purpose;
the caller cannot choose either. It reconciles payload, detached envelope and
registry identity, verifies lowercase SHA-256 over the exact canonical payload
bytes (including the final LF), requires a strict 64-byte Base64 Ed25519
signature, and calls `crypto.verify(null, ...)` over those original bytes.

Every registry entry is schema-validated and semantically validated before any
key is resolved. Public keys are read by descriptor with no-follow where the
platform supports it, must be regular non-symlink files contained by the trust
directory, must parse as Ed25519 SPKI, and must match the declared SHA-256 of the
SPKI DER. Duplicate `key_id`, invalid key windows and human/technical fingerprint
reuse invalidate the whole registry. Technical purposes may share a fingerprint,
as already allowed by the contract. `REVOKED` and `test_only` keys are always
refused for verification.

The offline temporal contract is exact and has no skew:

```text
not_before <= issued_at < expires_at <= not_after
issued_at <= verificationInstant < expires_at
```

`verificationInstant` is mandatory. The core never calls `Date.now()` and does
not select an operational clock. Clock authority, permitted operational skew and
key custody remain separate governance decisions. Schema reference cycles remain
deterministic rejections; B1b-3 does not add recursive-schema evaluation.

Tests generate synthetic Ed25519 keys only inside disposable external temporary
directories. Those keys and the offline registry loader are test evidence, not
operational trust. No PEM, private key or non-empty operational registry is
committed, and no runtime is activated by this slice.
