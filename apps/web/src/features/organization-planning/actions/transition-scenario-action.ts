"use server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import type { ActionResult } from "@/lib/actions"
import { successResult } from "@/lib/actions"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"
import { createPlanningLifecycleRepository,type PlanningLifecycleReadback } from "../repositories/planning-lifecycle-repository"
import { planningActionErrorMessage } from "./planning-action-error"
const inputSchema=z.object({scenarioId:z.string().uuid(),transition:z.enum(["submit","approve","reject","revise"]),expectedVersion:z.number().int().positive(),idempotencyKey:z.string().uuid(),reason:z.string().trim().min(1).max(500).nullable().optional()}).superRefine((value,context)=>{if(value.transition==="reject"&&!value.reason)context.addIssue({code:"custom",message:"Informe o motivo da rejeição.",path:["reason"]})})
export async function transitionScenarioAction(input:z.input<typeof inputSchema>):Promise<ActionResult<PlanningLifecycleReadback>>{const parsed=inputSchema.safeParse(input);if(!parsed.success)return{success:false,message:parsed.error.issues[0]?.message??"Dados inválidos."};try{await getCurrentCompanyContext();const result=await(await createPlanningLifecycleRepository()).transition(parsed.data);revalidatePath("/app/organization/planning/timeline");revalidatePath(`/app/organization/planning/${input.scenarioId}`);return successResult(lifecycleMessage(parsed.data.transition),result)}catch(error){return{success:false,message:planningActionErrorMessage(error)}}}
function lifecycleMessage(transition:string){return({submit:"Cenário enviado para aprovação.",approve:"Cenário aprovado.",reject:"Cenário rejeitado.",revise:"Cenário devolvido para revisão."} as Record<string,string>)[transition]??"Cenário atualizado."}
