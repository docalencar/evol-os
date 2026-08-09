import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { shortCircuit: true, url: "server-only:test" }
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url === "server-only:test") {
      return { format: "module", shortCircuit: true, source: "export {}" }
    }
    return nextLoad(url, context)
  },
})

const loadTemplate = () => import("./render-tenant-invitation-email")

test("renders a functional Portuguese invitation with HTML and text fallback", async () => {
  const { renderTenantInvitationEmail } = await loadTemplate()
  const invitationUrl = "https://app.evol.test/invite/token-value"
  const rendered = renderTenantInvitationEmail({
    companyName: "Empresa Exemplo",
    inviterName: "Maria",
    intendedRole: "manager",
    expiresAt: "2026-08-16T12:00:00.000Z",
    invitationUrl,
  })

  assert.equal(rendered.subject, "Convite para acessar Empresa Exemplo no Evol OS")
  assert.match(rendered.html, /<a href="https:\/\/app\.evol\.test\/invite\/token-value">Acessar convite<\/a>/)
  assert.match(rendered.html, /Maria convidou você/)
  assert.match(rendered.html, /Perfil de acesso: Gestor/)
  assert.match(rendered.text, /Acesse o convite: https:\/\/app\.evol\.test\/invite\/token-value/)
  assert.match(rendered.text, /Se você não esperava este convite/)
})

test("escapes every human value interpolated into HTML", async () => {
  const { renderTenantInvitationEmail } = await loadTemplate()
  const rendered = renderTenantInvitationEmail({
    companyName: `<Empresa & "Filhos">'`,
    inviterName: `<Maria & "João">'`,
    expiresAt: `<amanhã & "depois">'`,
    invitationUrl: "https://app.evol.test/invite/token?a=1&b=2",
  })

  assert.match(rendered.html, /&lt;Empresa &amp; &quot;Filhos&quot;&gt;&#39;/)
  assert.match(rendered.html, /&lt;Maria &amp; &quot;João&quot;&gt;&#39;/)
  assert.match(rendered.html, /&lt;amanhã &amp; &quot;depois&quot;&gt;&#39;/)
  assert.match(rendered.html, /token\?a=1&amp;b=2/)
  assert.doesNotMatch(rendered.html, /<Empresa|<Maria|<amanhã/)
})

test("does not render internal delivery or persistence identifiers", async () => {
  const { renderTenantInvitationEmail } = await loadTemplate()
  const rendered = renderTenantInvitationEmail({
    companyName: "Empresa Exemplo",
    expiresAt: "2026-08-16T12:00:00.000Z",
    invitationUrl: "https://app.evol.test/invite/token-value",
  })
  const content = `${rendered.subject}\n${rendered.html}\n${rendered.text}`

  assert.doesNotMatch(content, /companyId|personId|actorUserId|invitationId/)
  assert.doesNotMatch(content, /generation|digest|providerMessageId|correlationId/)
})
