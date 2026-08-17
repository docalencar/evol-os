import assert from "node:assert/strict"
import test from "node:test"

import type { FeedbackThreadDetail } from "../../types/feedback"
import { presentFeedbackThread } from "./present-feedback-thread"

const thread: FeedbackThreadDetail = {
  id: "11111111-1111-4111-8111-111111111111",
  companyId: "22222222-2222-4222-8222-222222222222",
  senderEmployeeId: "33333333-3333-4333-8333-333333333333",
  receiverEmployeeId: "44444444-4444-4444-8444-444444444444",
  senderName: "Remetente",
  receiverName: "Destinatário",
  type: "feedback",
  status: "open",
  priority: "normal",
  visibility: "hr",
  title: "Conversa",
  requiresFollowUp: false,
  followUpAt: null,
  acknowledgedAt: null,
  closedAt: null,
  createdAt: new Date("2026-08-16T12:00:00Z"),
  updatedAt: new Date("2026-08-16T12:00:00Z"),
}

test("presents DB-authorized HR observers without participant mutation authority", () => {
  const viewModel = presentFeedbackThread({
    thread,
    messages: [],
    currentEmployeeId: "55555555-5555-4555-8555-555555555555",
  })

  assert.equal(viewModel.currentUserRole, "hr_observer")
  assert.equal(viewModel.sender.name, "Remetente")
  assert.equal(viewModel.receiver.name, "Destinatário")
  assert.equal(viewModel.canReply, false)
  assert.equal(viewModel.canAcknowledge, false)
  assert.equal(viewModel.canClose, false)
  assert.equal(viewModel.canArchive, false)
})
