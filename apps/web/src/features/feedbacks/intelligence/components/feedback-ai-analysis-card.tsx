"use client"

import {
  useState,
  useTransition,
} from "react"
import {
  BrainCircuit,
  CheckCircle2,
  ListChecks,
  MessageSquareText,
  RefreshCw,
  Sparkles,
  Tags,
  Target,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

import {
  generateFeedbackAiAnalysisAction,
} from "../actions"

import type {
  FeedbackAiAnalysis,
  FeedbackAiTone,
} from "../types"

type FeedbackAiAnalysisCardProps = {
  threadId: string
}

type AnalysisListProps = {
  title: string
  emptyMessage: string
  items: string[]
  icon: React.ReactNode
}

const toneLabels: Record<
  FeedbackAiTone,
  string
> = {
  positive: "Positivo",
  constructive: "Construtivo",
  neutral: "Neutro",
  attention: "Requer atenção",
}

const toneClassNames: Record<
  FeedbackAiTone,
  string
> = {
  positive:
    "bg-emerald-50 text-emerald-700",
  constructive:
    "bg-blue-50 text-blue-700",
  neutral:
    "bg-slate-100 text-slate-700",
  attention:
    "bg-amber-50 text-amber-700",
}

function AnalysisList({
  title,
  emptyMessage,
  items,
  icon,
}: AnalysisListProps) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-center gap-2">
        <span className="text-slate-500">
          {icon}
        </span>

        <h4 className="text-sm font-semibold text-slate-900">
          {title}
        </h4>
      </div>

      {items.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {items.map((item, index) => (
            <li
              key={`${item}-${index}`}
              className="flex items-start gap-2 text-sm text-slate-600"
            >
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />

              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-500">
          {emptyMessage}
        </p>
      )}
    </div>
  )
}

export function FeedbackAiAnalysisCard({
  threadId,
}: FeedbackAiAnalysisCardProps) {
  const [
    analysis,
    setAnalysis,
  ] = useState<FeedbackAiAnalysis | null>(
    null
  )

  const [
    provider,
    setProvider,
  ] = useState<string | null>(null)

  const [
    model,
    setModel,
  ] = useState<string | null>(null)

  const [
    isPending,
    startTransition,
  ] = useTransition()

  function handleGenerateAnalysis() {
    startTransition(async () => {
      const result =
        await generateFeedbackAiAnalysisAction({
          threadId,
        })

      if (
        !result.success ||
        !result.data
      ) {
        toast.error(
          result.message ||
            "Não foi possível gerar a análise."
        )
        return
      }

      setAnalysis(result.data.analysis)
      setProvider(result.data.provider)
      setModel(result.data.model)

      toast.success(result.message)
    })
  }

  if (!analysis) {
    return (
      <Card className="p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-violet-50 p-2 text-violet-700">
              <BrainCircuit className="h-5 w-5" />
            </div>

            <div>
              <h3 className="font-semibold text-slate-900">
                Análise inteligente
              </h3>

              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Gere um resumo estruturado da
                conversa, incluindo tom, temas,
                competências, acordos e próximos
                passos.
              </p>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleGenerateAnalysis}
            disabled={isPending}
          >
            {isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}

            {isPending
              ? "Gerando análise..."
              : "Gerar análise"}
          </Button>
        </div>

        <div className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-600">
            A análise utiliza somente as
            informações presentes nesta conversa
            e não substitui a avaliação humana.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-violet-50 p-2 text-violet-700">
            <BrainCircuit className="h-5 w-5" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-slate-900">
                Análise inteligente
              </h3>

              <Badge
                className={
                  toneClassNames[
                    analysis.tone
                  ]
                }
              >
                {
                  toneLabels[
                    analysis.tone
                  ]
                }
              </Badge>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Síntese gerada a partir das
              mensagens desta conversa.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleGenerateAnalysis}
          disabled={isPending}
        >
          <RefreshCw
            className={
              isPending
                ? "h-4 w-4 animate-spin"
                : "h-4 w-4"
            }
          />

          {isPending
            ? "Atualizando..."
            : "Atualizar análise"}
        </Button>
      </div>

      <div className="mt-6 rounded-lg border border-violet-100 bg-violet-50/50 p-5">
        <div className="flex items-center gap-2">
          <MessageSquareText className="h-4 w-4 text-violet-700" />

          <h4 className="text-sm font-semibold text-slate-900">
            Resumo
          </h4>
        </div>

        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
          {analysis.summary}
        </p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <AnalysisList
          title="Temas identificados"
          emptyMessage="Nenhum tema foi identificado."
          items={analysis.themes}
          icon={
            <Tags className="h-4 w-4" />
          }
        />

        <AnalysisList
          title="Competências relacionadas"
          emptyMessage="Nenhuma competência foi identificada."
          items={analysis.competencies}
          icon={
            <Target className="h-4 w-4" />
          }
        />

        <AnalysisList
          title="Acordos registrados"
          emptyMessage="Nenhum acordo foi identificado."
          items={analysis.agreements}
          icon={
            <CheckCircle2 className="h-4 w-4" />
          }
        />

        <AnalysisList
          title="Próximos passos"
          emptyMessage="Nenhum próximo passo foi identificado."
          items={analysis.nextSteps}
          icon={
            <ListChecks className="h-4 w-4" />
          }
        />
      </div>

      {provider || model ? (
        <p className="mt-5 text-xs text-slate-400">
          Gerado por{" "}
          {provider ?? "provedor de IA"}
          {model
            ? ` · Modelo ${model}`
            : ""}
        </p>
      ) : null}
    </Card>
  )
}
