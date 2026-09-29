# E-P1 — Minimum Executive Decision Contract

Status: **FROZEN / LOCAL CONTRACT**
Baseline: `e403469b80bbe77f41ffc4a7c53c4b097d6491f6`

## Purpose

Executive consolidates factual, already-authorized signals for organizational
decision-making. It does not invent unavailable Jornada 6 capabilities and does
not weaken the authorization contracts of owning domains.

## Actors and access

The minimum Executive actor set is `owner`, `admin`, and `hr`. This is the exact
intersection supported by the mandatory administrative sources, including the
E-DB1 assessment summary and company competency intelligence. `manager` and
`employee` are denied by the Executive route itself. Hiding navigation is
presentation only and is never authorization.

Actor and tenant identity are derived from the authenticated server session.
No request parameter, browser filter, role label, or foreign company identifier
can grant Executive access.

## Factual capabilities

The locally supported minimum consists of:

- factual Workforce Health derived from canonical company People, Assessment,
  Development, competency evidence, and competency-gap reads;
- a Decision Feed composed from existing owning-domain sources;
- explicit Planning context when its canonical reads succeed and resolve an
  unambiguous workspace/scenario;
- destination links whose owning domain reauthorizes independently.

The Decision Feed may degrade by source. A failed source remains visible as
`partial`/`unavailable`; it is never converted into zero, healthy, or an empty
success. Legitimate absence and source failure are distinct facts.

Executive must use existing trusted People management reads. Direct
`public.people` access is not an Executive boundary.

## Explicitly unavailable capabilities

The following remain unavailable until separately contracted and implemented:

- turnover;
- climate;
- aggregated performance;
- potential and Nine Box;
- succession;
- strategic plans.

Organization Planning is not strategic-plan management. The existing
`TalentOverview` heuristic is not a potential or Nine Box contract. No label in
Executive may present either as completed.

## Privacy and failure contract

- Every source remains tenant-scoped and retains its owning-domain privacy.
- A same-tenant role that is not an Executive actor is denied at the route.
- A foreign-tenant actor cannot select or infer another tenant's Executive data.
- Provider failures expose only a safe source label; raw database errors are not
  rendered.
- A provider failure does not erase successful factual items from other sources.
- Failure to read Planning context is represented separately from a company that
  legitimately has no unambiguous Planning context.

## Local E-P1 proof

E-P1 proves locally:

1. the actor matrix and independent route guard;
2. role-aware normal navigation;
3. factual Workforce Health remains wired;
4. Decision Feed partial results and visible failure state;
5. trusted People boundary use rather than direct table access;
6. explicit unavailable presentation for unfinished Jornada 6 capabilities;
7. existing Executive, Decision Feed, authorization, navigation, Workforce
   Health, type, lint, and build gates remain green.

## Future hosted journey

E-E2E must freeze fixtures and execute this journey in canonical Review:

1. an authorized `owner`, `admin`, or `hr` authenticates;
2. the actor reaches Executive through normal navigation;
3. Executive renders factual Workforce Health from run-owned canonical facts;
4. Executive renders factual Decision Feed items and follows an owning-domain
   destination that independently reauthorizes;
5. one controlled source degradation is represented as partial/unavailable,
   while successful sources remain visible and no zero/healthy/empty substitute
   appears;
6. a same-tenant `manager` or `employee` is denied by the route and does not see
   the navigation entry;
7. a foreign authenticated actor receives a generic, non-oracular denial and no
   tenant identity or content is exposed;
8. durable run evidence captures actor/tenant identity, factual source inputs,
   resulting presentation, degraded-source state, denials, and teardown;
9. run-owned fixtures reach the canonical `RETIRED` terminal state.

Only E-E2E can prove deployment identity, real hosted session transitions,
Review tenant isolation, rendered route behavior, provider degradation in the
deployed application, and durable hosted evidence. E-P1 does not claim those
proofs and does not execute Review.

## Out of scope

No migration, schema, RPC, grant, turnover, climate, performance formula,
potential score, Nine Box, succession, strategic-planning lifecycle, hosted run,
Production access, or Legacy access belongs to E-P1.
