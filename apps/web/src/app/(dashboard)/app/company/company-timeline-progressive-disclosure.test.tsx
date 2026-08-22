import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import { EntityTimelineSection } from "../../../../features/timeline/components/entity-timeline-section"

Object.assign(globalThis, { React })

const page = readFileSync(
  new URL("./page.tsx", import.meta.url),
  "utf8"
)
const timelineComponent = readFileSync(
  new URL(
    "../../../../features/timeline/components/entity-timeline-section.tsx",
    import.meta.url
  ),
  "utf8"
)

const items = Array.from({ length: 7 }, (_, index) => ({
  title: `Evento ${index + 1}`,
  description: `Descrição preservada ${index + 1}`,
  actorLabel: "Usuário",
  occurredAtLabel: `0${index + 1}/08/2026 10:00`,
  moduleLabel: "Organização",
  activityTypeLabel: "Cargo Atualizado",
}))

test("Timeline defaults to four recent items and discloses the remaining loaded set", () => {
  const html = renderToStaticMarkup(
    <EntityTimelineSection
      title="Atividade recente"
      initialVisibleCount={4}
      items={items}
    />
  )
  const disclosureStart = html.indexOf("<details")

  assert.ok(disclosureStart > 0)
  assert.doesNotMatch(html.slice(disclosureStart, html.indexOf(">", disclosureStart)), /\sopen/)

  for (const item of items.slice(0, 4)) {
    assert.ok(html.indexOf(item.title) < disclosureStart)
  }
  for (const item of items.slice(4)) {
    assert.ok(html.indexOf(item.title) > disclosureStart)
  }

  assert.match(html, /Ver mais atividades/)
  assert.match(html, /Mostrar menos/)
})

test("expanded loaded content preserves event order and every existing field", () => {
  const html = renderToStaticMarkup(
    <EntityTimelineSection initialVisibleCount={4} items={items} />
  )
  let previousIndex = -1

  for (const item of items) {
    const itemIndex = html.indexOf(item.title)
    assert.ok(itemIndex > previousIndex)
    assert.match(html, new RegExp(item.description))
    previousIndex = itemIndex
  }

  assert.equal((html.match(/<article/g) ?? []).length, items.length)
})

test("Company keeps management navigation ahead of the compact recent activity", () => {
  const timelineIndex = page.indexOf('title="Atividade recente"')

  assert.ok(page.indexOf('href="/app/company/teams"') < timelineIndex)
  assert.ok(page.indexOf('href="/app/company/positions"') < timelineIndex)
  assert.ok(page.indexOf('href="/app/company/seniority"') < timelineIndex)
  assert.match(page, /initialVisibleCount=\{4\}/)
  assert.match(page, /getManagementCompanyTimeline\(companyId, 20\)/)
})

test("slice stays app-only and does not claim full-history access", () => {
  assert.doesNotMatch(page, /histórico completo/i)
  assert.doesNotMatch(
    timelineComponent,
    /\.from\(|\.rpc\(|createServerDatabase|SupabaseClient|nextCursor/
  )
})
