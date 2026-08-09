import "server-only"

import type { TenantMembershipRole } from "../../application/contracts"

import { escapeHtml } from "./escape-html"

export type RenderTenantInvitationEmailInput = Readonly<{
  companyName: string
  inviterName?: string
  intendedRole?: TenantMembershipRole
  expiresAt: string
  invitationUrl: string
}>

export type RenderedTenantInvitationEmail = Readonly<{
  subject: string
  html: string
  text: string
}>

const ROLE_LABELS: Readonly<Record<TenantMembershipRole, string>> = {
  owner: "Proprietário",
  admin: "Administrador",
  hr: "Recursos Humanos",
  manager: "Gestor",
  employee: "Colaborador",
}

export function renderTenantInvitationEmail(
  input: RenderTenantInvitationEmailInput,
): RenderedTenantInvitationEmail {
  const escapedCompanyName = escapeHtml(input.companyName)
  const escapedInvitationUrl = escapeHtml(input.invitationUrl)
  const escapedExpiresAt = escapeHtml(input.expiresAt)
  const inviterHtml = input.inviterName
    ? `<p>${escapeHtml(input.inviterName)} convidou você.</p>`
    : ""
  const inviterText = input.inviterName
    ? `${input.inviterName} convidou você.\n\n`
    : ""
  const roleLabel = input.intendedRole
    ? ROLE_LABELS[input.intendedRole]
    : undefined
  const roleHtml = roleLabel ? `<p>Perfil de acesso: ${roleLabel}.</p>` : ""
  const roleText = roleLabel ? `Perfil de acesso: ${roleLabel}.\n\n` : ""

  return {
    subject: `Convite para acessar ${input.companyName} no Evol OS`,
    html: [
      "<p>Você recebeu um convite para acessar uma empresa no Evol OS.</p>",
      `<p>Empresa: <strong>${escapedCompanyName}</strong></p>`,
      inviterHtml,
      roleHtml,
      `<p>Este convite expira em ${escapedExpiresAt}.</p>`,
      `<p><a href="${escapedInvitationUrl}">Acessar convite</a></p>`,
      "<p>Se você não esperava este convite, pode ignorar esta mensagem.</p>",
    ].join(""),
    text: [
      "Você recebeu um convite para acessar uma empresa no Evol OS.",
      "",
      `Empresa: ${input.companyName}`,
      "",
      inviterText + roleText + `Este convite expira em ${input.expiresAt}.`,
      "",
      `Acesse o convite: ${input.invitationUrl}`,
      "",
      "Se você não esperava este convite, pode ignorar esta mensagem.",
    ].join("\n"),
  }
}
