"use client"

import {
  useRef,
  useState,
  useTransition,
} from "react"
import { Send } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

import {
  replyFeedbackAction,
} from "../actions"

type FeedbackReplyFormProps = {
  threadId: string
  canReply: boolean
}

export function FeedbackReplyForm({
  threadId,
  canReply,
}: FeedbackReplyFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [content, setContent] = useState("")
  const [isPending, startTransition] =
    useTransition()

  function handleSubmit(
    formData: FormData
  ) {
    const messageContent = String(
      formData.get("content") ?? ""
    ).trim()

    if (!messageContent) {
      toast.error(
        "Escreva uma mensagem antes de enviar."
      )
      return
    }

    startTransition(async () => {
      const result =
        await replyFeedbackAction({
          threadId,
          content: messageContent,
        })

      if (!result.success) {
        toast.error(result.message)
        return
      }

      setContent("")
      formRef.current?.reset()

      toast.success(result.message)
    })
  }

  if (!canReply) {
    return (
      <Card className="p-5">
        <p className="text-sm text-slate-600">
          Esta conversa não aceita novas
          respostas porque foi encerrada ou
          arquivada.
        </p>
      </Card>
    )
  }

  return (
    <Card className="p-5">
      <form
        ref={formRef}
        action={handleSubmit}
        className="space-y-4"
      >
        <div>
          <label
            htmlFor="feedback-reply-content"
            className="text-sm font-medium text-slate-900"
          >
            Responder à conversa
          </label>

          <p className="mt-1 text-sm text-slate-500">
            Escreva uma resposta objetiva e
            respeitosa.
          </p>
        </div>

        <Textarea
          id="feedback-reply-content"
          name="content"
          value={content}
          onChange={(event) =>
            setContent(event.target.value)
          }
          disabled={isPending}
          placeholder="Digite sua mensagem..."
          className="min-h-32"
        />

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={
              isPending ||
              content.trim().length === 0
            }
          >
            <Send className="h-4 w-4" />

            {isPending
              ? "Enviando..."
              : "Enviar resposta"}
          </Button>
        </div>
      </form>
    </Card>
  )
}
