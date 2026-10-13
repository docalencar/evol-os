#!/usr/bin/env node
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { loadRegistry, verifyAndClaim, writeReceipt } from "./review-backup-evidence-core.mjs"
const root=dirname(fileURLToPath(import.meta.url)),workspace=resolve(root,"../../.."),registry=loadRegistry(join(root,"keys.json")),projectRef="rwfvxvbzaosgcyfxdjpt"
const req=n=>{if(!process.env[n])throw Error(`${n} required`);return process.env[n]}
try {
  const [cmd,...a]=process.argv.slice(2)
  if(cmd==="verify-and-claim"){
    if(a.length!==7)throw Error("usage: verify-and-claim MANIFEST SIG PROOF SIG COPY_A COPY_B RUNNER_SHA")
    const r=verifyAndClaim({manifest:a[0],manifestSig:a[1],proof:a[2],proofSig:a[3],bundles:[a[4],a[5]],workspace,runnerSha:a[6],registry,expected:{sourceCommit:req("EXPECTED_SOURCE_COMMIT"),operationId:req("EXPECTED_OPERATION_ID"),ledgerFrom:req("EXPECTED_LEDGER_FROM"),ledgerTo:req("EXPECTED_LEDGER_TO"),migrations:JSON.parse(req("EXPECTED_MIGRATION_SHA256"))}})
    console.log("BACKUP_EVIDENCE=CLAIMED");console.log(`EVIDENCE_ID=${r.evidenceId}`)
  } else if(cmd==="receipt"){
    if(a.length!==5)throw Error("usage: receipt EVIDENCE_ID OPERATION_ID RESULT MANIFEST MANIFEST_SIG")
    console.log(writeReceipt({workspace,projectRef,evidenceId:a[0],operationId:a[1],result:a[2],manifest:a[3],manifestSig:a[4],registry}))
  } else throw Error("unknown command")
} catch(e){console.error(`BACKUP_EVIDENCE=FAIL: ${e.message}`);process.exit(1)}
