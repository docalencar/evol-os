import { DataTable } from "@/components/shared/data-table"
import { Badge } from "@/components/ui/badge"

import {
  ASSESSMENT_QUESTION_TYPE_LABELS,
} from "../../constants/assessment-question-options"

import type { AssessmentQuestion } from "../../types/assessment-question"

import { ArchiveAssessmentQuestionButton } from "./archive-assessment-question-button"
import { AssessmentQuestionEditDialog } from "./assessment-question-edit-dialog"

type Props = {
  companyId: string
  questions: AssessmentQuestion[]
}

export function AssessmentQuestionTable({
  companyId,
  questions,
}: Props) {
  return (
    <DataTable
      title="Perguntas"
      data={questions}
      rowKey={(question) => question.id}
      emptyMessage="Nenhuma pergunta cadastrada."
      columns={[
        {
          key: "question",
          header: "Pergunta",
          render: (question) => (
            <div>
              <p className="font-medium">
                {question.question}
              </p>

              {question.help_text && (
                <p className="text-sm text-muted-foreground">
                  {question.help_text}
                </p>
              )}
            </div>
          ),
        },
        {
          key: "type",
          header: "Tipo",
          render: (question) => (
            <Badge>
              {
                ASSESSMENT_QUESTION_TYPE_LABELS[
                  question.question_type
                ]
              }
            </Badge>
          ),
        },
        {
          key: "weight",
          header: "Peso",
          render: (question) => question.weight,
        },
        {
          key: "actions",
          header: "Ações",
          render: (question) => (
            <div className="flex gap-2">
              <AssessmentQuestionEditDialog
                companyId={companyId}
                question={question}
              />

              <ArchiveAssessmentQuestionButton
                companyId={companyId}
                assessmentQuestionId={question.id}
              />
            </div>
          ),
        },
      ]}
    />
  )
}
