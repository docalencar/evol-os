"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

import { publishDevelopmentTemplateAction } from "../actions/publish-development-template-action"

type PublishDevelopmentTemplateButtonProps = {
  /** Container selector. The version being published is resolved server-side. */
  templateId: string
}

/**
 * Publishing is irreversible in the frozen lifecycle — there is no
 * published -> draft edge — so the control says what it will do, and the
 * refusal paths (incomplete draft, not an administrator, already published)
 * all come back as product messages from the boundary rather than as silence.
 */
export function PublishDevelopmentTemplateButton({
  templateId,
}: PublishDevelopmentTemplateButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handlePublish() {
    startTransition(async () => {
      const result = await publishDevelopmentTemplateAction(templateId)

      if (!result.success) {
        toast.error(result.message)
        return
      }

      toast.success(result.message)
      // The mutation's answer is a claim; the refreshed server render is the
      // proof. It is also what flips this page to its published, immutable
      // shape rather than leaving stale authoring controls on screen.
      router.refresh()
    })
  }

  return (
    <Button onClick={handlePublish} disabled={isPending}>
      {isPending ? "Publicando..." : "Publicar versão"}
    </Button>
  )
}
