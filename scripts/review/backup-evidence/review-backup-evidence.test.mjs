import assert from "node:assert/strict"
import { test } from "node:test"
import { createHash, generateKeyPairSync, sign } from "node:crypto"
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, renameSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { spawnSync } from "node:child_process"
import { canonical, canonicalAuthority, loadRegistry, verifyAndClaim, writeReceipt } from "./review-backup-evidence-core.mjs"
const now=Date.parse("2026-10-12T12:00:00.000Z"), hash=b=>createHash("sha256").update(b).digest("hex")
const expected={sourceCommit:"f".repeat(40),operationId:"review-0143-0146",ledgerFrom:"0142",ledgerTo:"0146",migrations:{"0143":"b".repeat(64)}}
function fixture(){
  const w=mkdtempSync(join(tmpdir(),"backup-evidence-"));chmodSync(w,0o700);assert.equal(spawnSync("git",["init","-q",w]).status,0)
  const copies=[join(w,"copy-a"),join(w,"copy-b")],trust=join(w,"trust");for(const d of [...copies,trust]){mkdirSync(d);chmodSync(d,0o700)}
  const {publicKey,privateKey}=generateKeyPairSync("ed25519");writeFileSync(join(trust,"public.pem"),publicKey.export({type:"spki",format:"pem"}))
  writeFileSync(join(trust,"keys.json"),canonical({keys:{k1:{public_key:"public.pem",revoked:false,test_only:false}},revoked_key_ids:[]})+"\n")
  const contents={"database.dump":"synthetic dump","roles.sql":"create role authenticated;","inventory.json":"{}\n","migration-ledger.json":"[\"0142\"]\n"}
  const artifacts=Object.entries(contents).map(([path,value])=>{const b=Buffer.from(value);for(const d of copies)writeFileSync(join(d,path),b);return {path,sha256:hash(b),size_bytes:b.length}})
  const proof={acl_pass:true,artifact_sha256:artifacts[0].sha256,contract_version:1,data_pass:true,evidence_id:"11111111-1111-4111-8111-111111111111",fingerprint:"a".repeat(64),key_id:"k1",ledger_max:"0142",postgres_major:17,proof_id:"22222222-2222-4222-8222-222222222222",restore_duration_seconds:12,restored_at:"2026-10-12T11:10:00.000Z",rls_pass:true,schema_pass:true,teardown_pass:true}
  const manifest={approved_rpo_seconds:14400,approved_rto_seconds:28800,artifacts,backup_type:"postgres_logical_bundle",captured_at:"2026-10-12T10:00:00.000Z",contract_version:1,environment:"review",evidence_id:proof.evidence_id,expires_at:"2026-10-13T11:30:00.000Z",external_exclusions:["storage_objects"],issued_at:"2026-10-12T11:30:00.000Z",key_id:"k1",ledger_from:"0142",ledger_to:"0146",migration_sha256:expected.migrations,operation_id:expected.operationId,postgres_major:17,project_ref:"rwfvxvbzaosgcyfxdjpt",restore_proof_sha256:"",source_commit:expected.sourceCommit}
  const put=(name,value)=>{const raw=canonical(value)+"\n";writeFileSync(join(w,`${name}.json`),raw);writeFileSync(join(w,`${name}.sig`),sign(null,Buffer.from(raw),privateKey).toString("base64")+"\n");return raw}
  const proofRaw=put("proof",proof);manifest.restore_proof_sha256=hash(Buffer.from(proofRaw));put("manifest",manifest)
  return {w,copies,trust,privateKey,manifest,proof,put}
}
function run(f,bundles=f.copies){return verifyAndClaim({manifest:join(f.w,"manifest.json"),manifestSig:join(f.w,"manifest.sig"),proof:join(f.w,"proof.json"),proofSig:join(f.w,"proof.sig"),bundles,workspace:f.w,runnerSha:"c".repeat(64),expected,registry:loadRegistry(join(f.trust,"keys.json")),now})}
function receipt(f,evidenceId=f.manifest.evidence_id,operationId=expected.operationId){return writeReceipt({workspace:f.w,projectRef:f.manifest.project_ref,evidenceId,operationId,result:"UNKNOWN_REMOTE_OUTCOME",manifest:join(f.w,"manifest.json"),manifestSig:join(f.w,"manifest.sig"),registry:loadRegistry(join(f.trust,"keys.json")),now})}
function alteredClaim(f,mutate){run(f);const a=canonicalAuthority(f.w,f.manifest.project_ref,f.manifest.operation_id),path=join(a.real,`${f.manifest.evidence_id}.claimed.json`),claim=JSON.parse(readFileSync(path));mutate(claim);writeFileSync(path,canonical(claim)+"\n");assert.throws(()=>receipt(f),/claim|timestamp|missing|unknown/)}
function rejects(name,mutate,pattern){test(name,()=>{const f=fixture();mutate(f);assert.throws(()=>run(f),pattern)})}
test("signed evidence is verified and consumed atomically",()=>{const f=fixture(),r=run(f);assert.equal(r.evidenceId,f.manifest.evidence_id);assert.throws(()=>run(f),/consumed/);const path=receipt(f);assert.ok(readFileSync(path));assert.throws(()=>receipt(f),/exclusive/)})
for(const [name,mutate] of [
  ["invalid claimed_at",c=>c.claimed_at="not-a-timestamp"],
  ["noncanonical claimed_at",c=>c.claimed_at="2026-10-12T12:00:00Z"],
  ["missing claim field",c=>delete c.runner_sha256],
  ["extra claim field",c=>c.extra=true],
  ["invalid claim hash",c=>c.runner_sha256="bad"],
  ["divergent manifest hash",c=>c.manifest_sha256="0".repeat(64)],
  ["divergent migration hashes",c=>c.migration_sha256={"0143":"0".repeat(64)}],
  ["divergent source SHA",c=>c.source_commit="0".repeat(40)],
  ["divergent operation ID",c=>c.operation_id="other-operation"],
  ["divergent evidence ID",c=>c.evidence_id="33333333-3333-4333-8333-333333333333"],
  ["divergent authority identity",c=>c.authority_ino="0"]
])test(name,()=>alteredClaim(fixture(),mutate))
test("corrupt claim blocks receipt",()=>{const f=fixture();run(f);const a=canonicalAuthority(f.w,f.manifest.project_ref,f.manifest.operation_id);writeFileSync(join(a.real,`${f.manifest.evidence_id}.claimed.json`),"corrupt");assert.throws(()=>receipt(f),/invalid JSON/)})
for(const [name,key,value,pattern] of [["negative RPO","approved_rpo_seconds",-1,/RPO/],["string boolean",null,null,/schema_pass/],["extra field","extra",1,/unknown/],["validity over 24h","expires_at","2026-10-13T11:30:00.001Z",/freshness/]])rejects(name,f=>{if(name==="string boolean"){f.proof.schema_pass="true";const raw=f.put("proof",f.proof);f.manifest.restore_proof_sha256=hash(Buffer.from(raw))}else f.manifest[key]=value;f.put("manifest",f.manifest)},pattern)
rejects("key binding mismatch",f=>{f.proof.key_id="other";const raw=f.put("proof",f.proof);f.manifest.restore_proof_sha256=hash(Buffer.from(raw));f.put("manifest",f.manifest)},/key_id/)
rejects("proof must bind database dump",f=>{f.proof.artifact_sha256=f.manifest.artifacts.find(a=>a.path==="roles.sql").sha256;const raw=f.put("proof",f.proof);f.manifest.restore_proof_sha256=hash(Buffer.from(raw));f.put("manifest",f.manifest)},/restore proof binding/)
rejects("missing required field",f=>{delete f.manifest.external_exclusions;f.put("manifest",f.manifest)},/missing external_exclusions/)
rejects("empty required string",f=>{f.manifest.ledger_to="";f.put("manifest",f.manifest)},/binding shape/)
rejects("unknown nested artifact field",f=>{f.manifest.artifacts[0].extra=true;f.put("manifest",f.manifest)},/unknown/)
rejects("second copy corruption",f=>writeFileSync(join(f.copies[1],"database.dump"),"corrupt"),/artifact mismatch/)
rejects("artifact symlink",f=>{const p=join(f.copies[0],"database.dump");writeFileSync(join(f.w,"outside"),"synthetic dump");unlinkSync(p);symlinkSync(join(f.w,"outside"),p)},/non-symlink/)
rejects("artifact traversal",f=>{f.manifest.artifacts[0].path="x/../database.dump";f.put("manifest",f.manifest)},/artifact shape/)
rejects("artifact FIFO",f=>{const p=join(f.copies[0],"database.dump");unlinkSync(p);assert.equal(spawnSync("mkfifo",[p]).status,0)},/regular non-symlink/)
rejects("unreadable artifact",f=>chmodSync(join(f.copies[0],"database.dump"),0o000),/EACCES|read failed/)
rejects("claim corruption blocks",f=>{const a=canonicalAuthority(f.w,f.manifest.project_ref,f.manifest.operation_id);writeFileSync(join(a.real,`${f.manifest.evidence_id}.claimed.json`),"bad")},/consumed/)
test("alternate bundle cannot replay",()=>{const f=fixture();run(f);const alt=[join(f.w,"alt-a"),join(f.w,"alt-b")];for(let i=0;i<2;i++){mkdirSync(alt[i],{mode:0o700});for(const a of f.manifest.artifacts)writeFileSync(join(alt[i],a.path),readFileSync(join(f.copies[i],a.path)))}assert.throws(()=>run(f,alt),/consumed/)})
test("canonical authority rejects directory swap",()=>{const f=fixture(),a=canonicalAuthority(f.w,f.manifest.project_ref,f.manifest.operation_id),moved=`${a.real}.moved`;renameSync(a.real,moved);symlinkSync(moved,a.real);assert.throws(()=>run(f),/real directory required/)})
test("workspace must be repository top level",()=>{const f=fixture(),sub=join(f.w,"sub");mkdirSync(sub);assert.throws(()=>verifyAndClaim({manifest:join(f.w,"manifest.json"),manifestSig:join(f.w,"manifest.sig"),proof:join(f.w,"proof.json"),proofSig:join(f.w,"proof.sig"),bundles:f.copies,workspace:sub,runnerSha:"c".repeat(64),expected,registry:loadRegistry(join(f.trust,"keys.json")),now}),/workspace identity mismatch/)})
test("revocation blocks",()=>{const f=fixture(),r=JSON.parse(readFileSync(join(f.trust,"keys.json")));r.revoked_key_ids=["k1"];writeFileSync(join(f.trust,"keys.json"),canonical(r)+"\n");assert.throws(()=>run(f),/revoked/)})
test("operational entrypoint ignores injected trust store and test key",()=>{const f=fixture(),cli=resolve(import.meta.dirname,"review-backup-evidence.mjs"),r=spawnSync(process.execPath,[cli,"verify-and-claim",join(f.w,"manifest.json"),join(f.w,"manifest.sig"),join(f.w,"proof.json"),join(f.w,"proof.sig"),...f.copies,"c".repeat(64)],{encoding:"utf8",env:{...process.env,BACKUP_EVIDENCE_KEYS:join(f.trust,"keys.json"),ALLOW_TEST_KEY:"1",EXPECTED_SOURCE_COMMIT:expected.sourceCommit,EXPECTED_OPERATION_ID:expected.operationId,EXPECTED_LEDGER_FROM:expected.ledgerFrom,EXPECTED_LEDGER_TO:expected.ledgerTo,EXPECTED_MIGRATION_SHA256:JSON.stringify(expected.migrations)}});assert.notEqual(r.status,0);assert.match(r.stderr,/unknown key_id/)})
test("test_only key is always refused",()=>{const f=fixture(),r=JSON.parse(readFileSync(join(f.trust,"keys.json")));r.keys.k1.test_only=true;writeFileSync(join(f.trust,"keys.json"),canonical(r)+"\n");assert.throws(()=>run(f),/test key refused/)})
