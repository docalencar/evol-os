/**
 * The first-scenario affordance.
 *
 * Run 260922165410-439b90 failed on a workspace that had a baseline and zero
 * scenarios: the empty state told the user to create one while rendering no
 * control to do it, because every `CreateScenarioDialog` in the product lived
 * inside an EXISTING scenario's card and took its identifiers from that
 * scenario. Branching worked; bootstrapping did not.
 *
 * No unit test caught it because every test rendered the list with scenarios
 * already present — the only state in which the affordance existed.
 */

import assert from "node:assert/strict"
import test from "node:test"

import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import { ScenarioList } from "./scenario-list"

Object.assign(globalThis, { React })

const baseline = { workspaceId: "workspace-1", snapshotId: "snapshot-1" }

const scenario = {
  id: "scenario-1",
  name: "Expansão regional",
  description: "Alternativa de estrutura.",
  status: "draft",
  version: 1,
  workspaceId: "workspace-1",
  baseSnapshotId: "snapshot-1",
  updatedAt: new Date("2026-09-22T00:00:00Z"),
}

test("an empty list offers the first-scenario affordance when a baseline exists", () => {
  const html = renderToStaticMarkup(<ScenarioList scenarios={[]} baseline={baseline} />)
  assert.match(html, /Nenhum cenário criado/)
  assert.match(html, /Novo Cenário/)
})

test("the instruction is never offered without the means to follow it", () => {
  // Without a baseline there is nothing to branch from, so the empty state
  // keeps its previous instruction-only form rather than rendering a control
  // that could not resolve a workspace or a base snapshot.
  const html = renderToStaticMarkup(<ScenarioList scenarios={[]} baseline={null} />)
  assert.match(html, /Nenhum cenário criado/)
  assert.doesNotMatch(html, /Novo Cenário/)
})

test("a populated list is unchanged by the affordance", () => {
  // Branching stays exactly where it was: on each scenario's own card.
  const html = renderToStaticMarkup(<ScenarioList scenarios={[scenario]} baseline={baseline} />)
  assert.match(html, /Expansão regional/)
  assert.doesNotMatch(html, /Nenhum cenário criado/)
})
